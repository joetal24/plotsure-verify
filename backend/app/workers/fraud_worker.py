"""
Fraud detection worker — consumes fraud.check.queue from Kafka,
runs Neo4j circular ownership check + IsolationForest ML prediction,
combines both into a final risk score, and updates Supabase.

Runs as a standalone process:
    python -m app.workers.fraud_worker
"""
import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Optional

from kafka import KafkaConsumer
from kafka.errors import KafkaError

from app.config import settings
from app.database import get_supabase
from app.services.fraud_detection import score_fraud
from app.services.graph import graph_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("fraud_worker")


def process_message(message: dict) -> None:
    """Process a single fraud check message with idempotency guarantee."""
    start_ms = time.time()
    verification_id = message["verification_id"]
    plot_id = message["plot_id"]
    owner_name = message.get("owner_name", "")
    national_id = message.get("national_id", "")
    amount = message.get("amount", 0.0)

    db = get_supabase()
    now = datetime.utcnow().isoformat()

    # ── Idempotency check: skip if already processed ──
    existing = (
        db.table("searches")
        .select("fraud_status")
        .eq("id", verification_id)
        .single()
        .execute()
    )
    if existing.data and existing.data.get("fraud_status") in ("verified", "flagged", "failed"):
        elapsed = (time.time() - start_ms) * 1000
        logger.info(
            "Skipped duplicate — verification_id=%s plot_id=%s status=%s processing_time_ms=%.0f",
            verification_id,
            plot_id,
            existing.data["fraud_status"],
            elapsed,
        )
        return

    # ── Mark as processing ──
    db.table("searches").update({
        "fraud_status": "processing",
        "updated_at": now,
    }).eq("id", verification_id).execute()

    neo4j_flagged = False
    ml_flagged = False
    fraud_details: dict = {}

    # ── Stage 1: Neo4j circular ownership check ──
    try:
        loop = asyncio.new_event_loop()
        chain = loop.run_until_complete(graph_service.get_ownership_chain(plot_id))
        loop.close()
        ownership = chain.get("ownership", [])

        persons_seen: dict[str, str] = {}
        circular_owners: list[str] = []
        for record in ownership:
            person = record.get("person", "")
            if person in persons_seen:
                circular_owners.append(person)
            persons_seen[person] = record.get("from_date", "")

        neo4j_flagged = len(circular_owners) > 0
        fraud_details["neo4j"] = {
            "ownership_count": len(ownership),
            "circular_owners": list(set(circular_owners)),
        }
        if neo4j_flagged:
            fraud_details["neo4j"]["flagged"] = True
            logger.warning(
                "Circular ownership detected — plot_id=%s owners=%s",
                plot_id,
                circular_owners,
            )
    except Exception as exc:
        logger.error("Neo4j check failed — plot_id=%s error=%s", plot_id, exc)
        fraud_details["neo4j"] = {"error": str(exc)}

    # ── Stage 2: IsolationForest ML check ──
    try:
        # Sync Neo4j graph first so the ML has fresh data
        try:
            loop = asyncio.new_event_loop()
            loop.run_until_complete(
                graph_service.sync_verification(
                    plot_ref=plot_id,
                    owner=owner_name,
                    district="",
                    land_type="",
                    created_at=now,
                )
            )
            loop.close()
        except Exception:
            pass

        result = score_fraud(
            plot_size=0,
            asking_price=amount,
            district="",
            land_type="",
            verification_count=0,
            days_since_last_transfer=365,
        )
        ml_flagged = result.fraud_score >= 0.4
        fraud_details["ml"] = {
            "score": result.fraud_score,
            "risk_level": result.risk_level,
            "anomaly_flags": result.anomaly_flags,
        }
        if ml_flagged:
            logger.warning(
                "ML anomaly detected — plot_id=%s score=%.2f",
                plot_id,
                result.fraud_score,
            )
    except Exception as exc:
        logger.error("ML check failed — plot_id=%s error=%s", plot_id, exc)
        fraud_details["ml"] = {"error": str(exc)}

    # ── Combine both signals into final risk ──
    if neo4j_flagged and ml_flagged:
        risk_level = "HIGH"
        fraud_status = "flagged"
    elif neo4j_flagged or ml_flagged:
        risk_level = "MEDIUM"
        fraud_status = "flagged"
    else:
        risk_level = "LOW"
        fraud_status = "verified"

    # ── Update Supabase ──
    try:
        db.table("searches").update({
            "fraud_status": fraud_status,
            "neo4j_result": json.dumps(fraud_details),
            "fraud_risk_level": risk_level,
        }).eq("id", verification_id).execute()
    except Exception as exc:
        logger.error("Supabase update failed — verification_id=%s error=%s", verification_id, exc)

    elapsed = (time.time() - start_ms) * 1000
    logger.info(
        "Processed — verification_id=%s plot_id=%s risk_level=%s status=%s processing_time_ms=%.0f",
        verification_id,
        plot_id,
        risk_level,
        fraud_status,
        elapsed,
    )


def consume() -> None:
    """Main consumer loop."""
    kafka_servers = settings.KAFKA_BOOTSTRAP_SERVERS
    if not kafka_servers or kafka_servers == "localhost:9092":
        logger.warning(
            "Kafka not configured (KAFKA_BOOTSTRAP_SERVERS not set) — "
            "fraud worker cannot start. Set the env var to enable async processing."
        )
        return

    consumer: Optional[KafkaConsumer] = None
    try:
        consumer = KafkaConsumer(
            settings.KAFKA_TOPIC_FRAUD_CHECK,
            bootstrap_servers=kafka_servers,
            group_id=settings.KAFKA_GROUP_ID,
            value_deserializer=lambda v: json.loads(v.decode()),
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            session_timeout_ms=30000,
            heartbeat_interval_ms=10000,
        )
        logger.info(
            "Fraud worker started — consuming from %s (group=%s)",
            settings.KAFKA_TOPIC_FRAUD_CHECK,
            settings.KAFKA_GROUP_ID,
        )

        for raw in consumer:
            try:
                process_message(raw.value)
            except Exception as exc:
                logger.error(
                    "Failed to process message — verification_id=%s error=%s",
                    raw.value.get("verification_id", "unknown"),
                    exc,
                )
                # Publish to DLQ
                _publish_dlq(raw.value, exc)

    except KeyboardInterrupt:
        logger.info("Fraud worker stopped by user")
    except Exception as exc:
        logger.error("Fraud worker crashed: %s", exc)
    finally:
        if consumer is not None:
            consumer.close()


def _publish_dlq(message: dict, error: Exception) -> None:
    """Publish a failed message to the dead letter queue."""
    from kafka import KafkaProducer
    try:
        dlq_producer = KafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            client_id="plotsure-dlq-producer",
            value_serializer=lambda v: json.dumps(v).encode(),
        )
        dlq_payload = {
            "original_message": message,
            "error": str(error),
            "failed_at": datetime.utcnow().isoformat(),
        }
        dlq_producer.send(settings.KAFKA_TOPIC_DEAD_LETTER, value=dlq_payload)
        dlq_producer.flush()
        dlq_producer.close()
        logger.info(
            "Published to DLQ — verification_id=%s",
            message.get("verification_id", "unknown"),
        )
    except Exception as dlq_exc:
        logger.error("Failed to publish to DLQ: %s", dlq_exc)


def main() -> None:
    consume()


if __name__ == "__main__":
    main()
