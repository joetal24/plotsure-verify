"""
Kafka producer for the async fraud detection pipeline.
Publishes fraud check events to Redpanda/Kafka.
Falls back to synchronous fraud check if Kafka is unavailable.
"""
import json
import logging
import time
from typing import Optional

from kafka import KafkaProducer
from kafka.errors import KafkaError

from app.config import settings
from app.database import get_supabase
from app.services.fraud_detection import score_fraud
from app.services.graph import graph_service

logger = logging.getLogger(__name__)

_producer: Optional[KafkaProducer] = None


def _serialize(value: dict) -> bytes:
    return json.dumps(value).encode("utf-8")


def _get_producer() -> Optional[KafkaProducer]:
    global _producer
    if _producer is None:
        kafka_servers = settings.KAFKA_BOOTSTRAP_SERVERS
        if not kafka_servers or kafka_servers == "localhost:9092":
            logger.warning(
                "Kafka not configured (KAFKA_BOOTSTRAP_SERVERS not set) — "
                "fraud checks will run synchronously"
            )
            return None
        try:
            _producer = KafkaProducer(
                bootstrap_servers=kafka_servers,
                client_id="plotsure-producer",
                value_serializer=_serialize,
                max_block_ms=3000,
                request_timeout_ms=5000,
            )
            logger.info("Kafka producer connected — %s", kafka_servers)
        except Exception as exc:
            logger.warning("Kafka producer failed to connect: %s — falling back to sync", exc)
            _producer = None
    return _producer


def publish_fraud_check(
    verification_id: str,
    plot_id: str,
    owner_name: str,
    national_id: str = "",
    amount: float = 0.0,
    date: str = "",
    source: str = "plotsure",
) -> bool:
    """
    Publish a fraud check event to Kafka.

    Returns True if published successfully, False if fallback was used.
    If Kafka is unavailable, runs the fraud check synchronously as fallback.
    """
    message = {
        "version": "1.0",
        "verification_id": verification_id,
        "plot_id": plot_id,
        "owner_name": owner_name,
        "national_id": national_id,
        "amount": amount,
        "date": date,
        "source": source,
    }

    producer = _get_producer()

    if producer is not None:
        try:
            future = producer.send(settings.KAFKA_TOPIC_FRAUD_CHECK, value=message)
            future.get(timeout=5)
            logger.info(
                "Published fraud check — verification_id=%s plot_id=%s",
                verification_id,
                plot_id,
            )
            return True
        except KafkaError as exc:
            logger.warning(
                "Kafka send failed for %s: %s — falling back to sync",
                verification_id,
                exc,
            )

    # Fallback: run fraud check synchronously
    logger.info("Running sync fraud check fallback for %s", verification_id)
    _run_sync_fraud_check(verification_id, plot_id, owner_name, national_id, amount, date)
    return False


def _run_sync_fraud_check(
    verification_id: str,
    plot_id: str,
    owner_name: str,
    national_id: str,
    amount: float,
    date: str,
) -> None:
    """Run Neo4j + ML checks synchronously and update Supabase."""
    import asyncio
    from datetime import datetime

    db = get_supabase()
    now = datetime.utcnow().isoformat()

    # Mark processing
    db.table("searches").update({
        "fraud_status": "processing",
    }).eq("id", verification_id).execute()

    neo4j_flagged = False
    ml_flagged = False
    fraud_details = {}

    # Neo4j check
    try:
        loop = asyncio.new_event_loop()
        chain = loop.run_until_complete(graph_service.get_ownership_chain(plot_id))
        loop.close()
        ownership = chain.get("ownership", [])
        persons_seen = {}
        circular_owners = []
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
    except Exception as exc:
        logger.error("Neo4j check failed for %s: %s", plot_id, exc)
        fraud_details["neo4j"] = {"error": str(exc)}

    # ML check
    try:
        ml_score = score_fraud(
            plot_size=0,
            asking_price=amount,
            district="",
            land_type="",
            verification_count=0,
            days_since_last_transfer=365,
        )
        ml_flagged = ml_score.fraud_score >= 0.4
        fraud_details["ml"] = {
            "score": ml_score.fraud_score,
            "risk_level": ml_score.risk_level,
            "anomaly_flags": ml_score.anomaly_flags,
        }
    except Exception as exc:
        logger.error("ML fraud check failed for %s: %s", plot_id, exc)
        fraud_details["ml"] = {"error": str(exc)}

    # Combine results
    if neo4j_flagged and ml_flagged:
        risk_level = "HIGH"
        fraud_status = "flagged"
    elif neo4j_flagged or ml_flagged:
        risk_level = "MEDIUM"
        fraud_status = "flagged"
    else:
        risk_level = "LOW"
        fraud_status = "verified"

    db.table("searches").update({
        "fraud_status": fraud_status,
        "risk_level": risk_level,
        "neo4j_result": json.dumps(fraud_details),
    }).eq("id", verification_id).execute()

    logger.info(
        "Sync fraud check complete — verification_id=%s risk_level=%s status=%s",
        verification_id,
        risk_level,
        fraud_status,
    )


def close_producer() -> None:
    global _producer
    if _producer is not None:
        _producer.close()
        _producer = None
        logger.info("Kafka producer closed")
