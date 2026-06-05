"""
Dead letter queue handler — consumes fraud.check.failed from Kafka,
logs all failed messages with full error details,
stores them in Supabase fraud_check_failures table for manual retry.

Runs as a standalone process:
    python -m app.workers.dlq_handler
"""
import json
import logging
from datetime import datetime

from kafka import KafkaConsumer

from app.config import settings
from app.database import get_supabase

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("dlq_handler")


def store_failure(
    verification_id: str,
    plot_id: str,
    error_message: str,
    error_details: dict,
    original_message: dict,
) -> None:
    """Store a failed fraud check in Supabase for manual retry."""
    db = get_supabase()
    record = {
        "verification_id": verification_id,
        "plot_id": plot_id,
        "error_message": error_message[:500],
        "error_details": json.dumps(error_details),
        "original_message": json.dumps(original_message),
        "created_at": datetime.utcnow().isoformat(),
    }
    try:
        db.table("fraud_check_failures").insert(record).execute()
        logger.info(
            "Stored DLQ record — verification_id=%s plot_id=%s",
            verification_id,
            plot_id,
        )
    except Exception as exc:
        logger.error(
            "Failed to store DLQ record — verification_id=%s error=%s",
            verification_id,
            exc,
        )


def consume() -> None:
    """Consume messages from the dead letter queue topic."""
    consumer: KafkaConsumer | None = None
    try:
        consumer = KafkaConsumer(
            settings.KAFKA_TOPIC_DEAD_LETTER,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=f"{settings.KAFKA_GROUP_ID}-dlq",
            value_deserializer=lambda v: json.loads(v.decode()),
            auto_offset_reset="earliest",
            enable_auto_commit=True,
        )
        logger.info(
            "DLQ handler started — consuming from %s",
            settings.KAFKA_TOPIC_DEAD_LETTER,
        )

        for raw in consumer:
            msg = raw.value
            original = msg.get("original_message", {})
            error = msg.get("error", "Unknown error")
            failed_at = msg.get("failed_at", "")

            verification_id = original.get("verification_id", "unknown")
            plot_id = original.get("plot_id", "unknown")

            logger.error(
                "DLQ received — verification_id=%s plot_id=%s error=%s failed_at=%s",
                verification_id,
                plot_id,
                error,
                failed_at,
            )

            store_failure(
                verification_id=verification_id,
                plot_id=plot_id,
                error_message=error,
                error_details={"failed_at": failed_at, "error": error},
                original_message=original,
            )

    except KeyboardInterrupt:
        logger.info("DLQ handler stopped by user")
    except Exception as exc:
        logger.error("DLQ handler crashed: %s", exc)
    finally:
        if consumer is not None:
            consumer.close()


def main() -> None:
    consume()


if __name__ == "__main__":
    main()
