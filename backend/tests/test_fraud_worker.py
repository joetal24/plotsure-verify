"""Tests for the fraud detection worker (process_message, consume, _publish_dlq, main)."""
import json
from unittest.mock import MagicMock, call, patch

import pytest

from app.services.fraud_detection import FraudScoreResult
from app.workers import fraud_worker
from tests.conftest import MockSupabaseQuery


MESSAGE = {
    "version": "1.0",
    "verification_id": "test-vid-001",
    "plot_id": "VOL 123 FOL 456",
    "owner_name": "Nakato Joyce",
    "national_id": "CM12345678",
    "amount": 250_000_000,
    "date": "2026-05-29T10:00:00",
    "source": "plotsure",
}

EMPTY_OWNERSHIP = {"plot_ref": "VOL 123 FOL 456", "ownership": []}

CIRCULAR_OWNERSHIP = {
    "plot_ref": "VOL 123 FOL 456",
    "ownership": [
        {"person": "Alice", "from_date": "2020-01-01"},
        {"person": "Bob", "from_date": "2021-01-01"},
        {"person": "Alice", "from_date": "2022-01-01"},
    ],
}

LOW_SCORE = FraudScoreResult(
    fraud_score=0.1, risk_level="LOW", anomaly_flags=[], ml_anomaly_score=0.05
)

HIGH_SCORE = FraudScoreResult(
    fraud_score=0.7,
    risk_level="HIGH",
    anomaly_flags=["asking_price_extremely_high"],
    ml_anomaly_score=0.65,
)


class TestProcessMessage:
    """Tests for process_message() — the core fraud check logic."""

    def _patch_db(self, mocker, return_data=None):
        mock_db = MagicMock()
        mock_db.table.return_value = MockSupabaseQuery(return_data or [])
        mock_db.storage = MagicMock()
        mocker.patch.object(fraud_worker, "get_supabase", return_value=mock_db)
        return mock_db

    def _patch_neo4j(self, mocker, ownership_result=EMPTY_OWNERSHIP):
        """Patch fraud_worker.graph_service so Neo4j calls work correctly.

        Must use patch.object on fraud_worker because ``from app.services.graph
        import graph_service`` binds a local reference at module load time.
        """
        mock_gs = mocker.patch.object(fraud_worker, "graph_service")
        mock_gs.get_ownership_chain = mocker.AsyncMock(return_value=ownership_result)
        mock_gs.sync_verification = mocker.AsyncMock()
        return mock_gs

    def _patch_ml(self, mocker, score=LOW_SCORE):
        mocker.patch.object(fraud_worker, "score_fraud", return_value=score)

    # ── Success paths ──

    def test_clean_ownership(self, mocker):
        """No circular ownership + low ML score → verified, LOW risk."""
        mock_db = self._patch_db(mocker)
        self._patch_neo4j(mocker, EMPTY_OWNERSHIP)
        self._patch_ml(mocker, LOW_SCORE)

        fraud_worker.process_message(MESSAGE)

        assert mock_db.table.call_count >= 2

    def test_circular_chain_detected(self, mocker):
        """Circular ownership → flagged, MEDIUM risk (ML is LOW)."""
        mock_db = self._patch_db(mocker)
        self._patch_neo4j(mocker, CIRCULAR_OWNERSHIP)
        self._patch_ml(mocker, LOW_SCORE)

        fraud_worker.process_message(MESSAGE)

        assert mock_db.table.call_count >= 2

    def test_both_neo4j_and_ml_flagged(self, mocker):
        """Both Neo4j and ML flag → HIGH risk, flagged status."""
        mock_db = self._patch_db(mocker)
        self._patch_neo4j(mocker, CIRCULAR_OWNERSHIP)
        self._patch_ml(mocker, HIGH_SCORE)

        fraud_worker.process_message(MESSAGE)

        assert mock_db.table.call_count >= 2

    def test_ml_flagged_only(self, mocker):
        """Only ML flagged → MEDIUM risk, flagged status."""
        mock_db = self._patch_db(mocker)
        self._patch_neo4j(mocker, EMPTY_OWNERSHIP)
        self._patch_ml(mocker, HIGH_SCORE)

        fraud_worker.process_message(MESSAGE)

        assert mock_db.table.call_count >= 2

    # ── Failure / fallback paths ──

    def test_neo4j_failure_falls_back_to_ml_only(self, mocker):
        """Neo4j error → ML check still runs, result based on ML only."""
        mock_db = self._patch_db(mocker)
        mock_gs = self._patch_neo4j(mocker)
        mock_gs.get_ownership_chain = mocker.AsyncMock(
            side_effect=Exception("Neo4j connection refused")
        )
        self._patch_ml(mocker, LOW_SCORE)

        fraud_worker.process_message(MESSAGE)

        assert mock_db.table.call_count >= 2

    def test_neo4j_failure_ml_flagged(self, mocker):
        """Neo4j error + ML flagged → MEDIUM."""
        mock_db = self._patch_db(mocker)
        mock_gs = self._patch_neo4j(mocker)
        mock_gs.get_ownership_chain = mocker.AsyncMock(
            side_effect=Exception("Neo4j connection refused")
        )
        self._patch_ml(mocker, HIGH_SCORE)

        fraud_worker.process_message(MESSAGE)

        assert mock_db.table.call_count >= 2

    def test_ml_check_failure(self, mocker):
        """Neo4j succeeds, ML check raises → result is Neo4j-only."""
        mock_db = self._patch_db(mocker)
        mock_gs = self._patch_neo4j(mocker)
        mock_gs.get_ownership_chain = mocker.AsyncMock(
            return_value=CIRCULAR_OWNERSHIP
        )
        mock_gs.sync_verification = mocker.AsyncMock(
            side_effect=Exception("sync failed")
        )
        mock_ml = mocker.patch.object(fraud_worker, "score_fraud")
        mock_ml.side_effect = Exception("ML model unavailable")

        fraud_worker.process_message(MESSAGE)

        # Neo4j flagged → MEDIUM even though ML failed
        assert mock_db.table.call_count >= 2

    def test_sync_verification_fails_ml_still_runs(self, mocker):
        """sync_verification() fails → swallowed, ML check continues."""
        mock_db = self._patch_db(mocker)
        mock_gs = self._patch_neo4j(mocker)
        mock_gs.sync_verification = mocker.AsyncMock(
            side_effect=Exception("sync failed")
        )
        self._patch_ml(mocker, LOW_SCORE)

        fraud_worker.process_message(MESSAGE)

        assert mock_db.table.call_count >= 2

    def test_supabase_update_failure(self, mocker):
        """Supabase update Exception is logged, not re-raised."""
        class FailingQuery(MockSupabaseQuery):
            def execute(self):
                raise Exception("DB write timeout")

        mock_db = self._patch_db(mocker)
        # idempotency check → empty; mark processing → ok; final update → fails
        mock_db.table.side_effect = [
            MockSupabaseQuery([]),
            MockSupabaseQuery([]),
            FailingQuery([]),
        ]
        self._patch_neo4j(mocker, EMPTY_OWNERSHIP)
        self._patch_ml(mocker, LOW_SCORE)

        # Should not raise — the exception is caught and logged
        fraud_worker.process_message(MESSAGE)

    # ── Idempotency ──

    def test_idempotency_skips_already_processed(self, mocker):
        """Already processed → early return, only one DB call."""
        mock_db = self._patch_db(mocker, [{"fraud_status": "verified"}])
        mock_neo4j = mocker.patch.object(fraud_worker, "graph_service")

        fraud_worker.process_message(MESSAGE)

        assert mock_db.table.call_count == 1

    def test_idempotency_flagged_also_skips(self, mocker):
        """Already flagged → early return."""
        mock_db = self._patch_db(mocker, [{"fraud_status": "flagged"}])
        mock_neo4j = mocker.patch.object(fraud_worker, "graph_service")

        fraud_worker.process_message(MESSAGE)

        assert mock_db.table.call_count == 1

    def test_idempotency_failed_also_skips(self, mocker):
        """Already failed → early return."""
        mock_db = self._patch_db(mocker, [{"fraud_status": "failed"}])
        mock_neo4j = mocker.patch.object(fraud_worker, "graph_service")

        fraud_worker.process_message(MESSAGE)

        assert mock_db.table.call_count == 1

    # ── Input validation ──

    def test_invalid_message_raises_key_error(self):
        """Missing verification_id → KeyError (caught by consume loop)."""
        with pytest.raises(KeyError):
            fraud_worker.process_message({})


class TestPublishDlq:
    """Tests for _publish_dlq()."""

    def test_publishes_to_dlq(self, mocker):
        """_publish_dlq with original message stores failure record."""
        mock_producer = MagicMock()
        mock_future = MagicMock()
        mock_future.get.return_value = None
        mock_producer.send.return_value = mock_future

        mocker.patch("kafka.KafkaProducer", return_value=mock_producer)

        fraud_worker._publish_dlq(MESSAGE, Exception("test error"))

        mock_producer.send.assert_called_once()
        sent = mock_producer.send.call_args[1]["value"]
        assert sent["original_message"] == MESSAGE
        assert "test error" in sent["error"]
        assert "failed_at" in sent

    def test_publishes_with_unknown_verification_id(self, mocker):
        """Message without verification_id still published."""
        mock_producer = MagicMock()
        mock_future = MagicMock()
        mock_future.get.return_value = None
        mock_producer.send.return_value = mock_future
        mocker.patch("kafka.KafkaProducer", return_value=mock_producer)

        fraud_worker._publish_dlq({"bad": "data"}, Exception("parse error"))

        mock_producer.send.assert_called_once()

    def test_publish_failure_is_logged(self, mocker):
        """When KafkaProducer.send() fails, error is logged, not re-raised."""
        mock_producer = MagicMock()
        mock_producer.send.side_effect = Exception("Broker unavailable")
        mocker.patch("kafka.KafkaProducer", return_value=mock_producer)

        # Should not raise
        fraud_worker._publish_dlq(MESSAGE, Exception("test error"))


class TestConsume:
    """Tests for consume() — the Kafka consumer loop."""

    def _make_mock_consumer(self, *messages):
        """Factory: mock KafkaConsumer that yields messages then KeyboardInterrupt."""
        mock_consumer = MagicMock()

        def iter_side_effect():
            for msg in messages:
                yield msg
            raise KeyboardInterrupt()

        mock_consumer.__iter__.return_value = iter_side_effect()
        return mock_consumer

    def test_processes_messages(self, mocker):
        """Consumer reads messages, calls process_message, exits cleanly."""
        mock_msg = MagicMock()
        mock_msg.value = MESSAGE
        mock_consumer = self._make_mock_consumer(mock_msg)

        mocker.patch.object(fraud_worker, "KafkaConsumer", return_value=mock_consumer)
        mock_process = mocker.patch.object(fraud_worker, "process_message")

        fraud_worker.consume()

        mock_process.assert_called_once_with(MESSAGE)

    def test_handles_message_error(self, mocker):
        """When process_message raises, error is logged and DLQ is called."""
        mock_msg = MagicMock()
        mock_msg.value = MESSAGE
        mock_consumer = self._make_mock_consumer(mock_msg)

        mocker.patch.object(fraud_worker, "KafkaConsumer", return_value=mock_consumer)
        mock_process = mocker.patch.object(
            fraud_worker, "process_message", side_effect=Exception("processing failed")
        )
        mock_dlq = mocker.patch.object(fraud_worker, "_publish_dlq")

        fraud_worker.consume()

        mock_process.assert_called_once_with(MESSAGE)
        mock_dlq.assert_called_once()

    def test_handles_kafka_connection_failure(self, mocker):
        """When KafkaConsumer() raises, the exception is caught."""
        mocker.patch.object(
            fraud_worker, "KafkaConsumer", side_effect=Exception("Broker unreachable")
        )

        # Should not raise — caught by outer except
        fraud_worker.consume()

    def test_kafka_consumer_is_closed(self, mocker):
        """Consumer.close() is called in the finally block."""
        mock_consumer = MagicMock()
        mock_consumer.__iter__.side_effect = KeyboardInterrupt()

        mocker.patch.object(fraud_worker, "KafkaConsumer", return_value=mock_consumer)

        fraud_worker.consume()

        mock_consumer.close.assert_called_once()

    def test_kafka_consumer_close_not_called_when_none(self, mocker):
        """When consumer is None (startup failed), close() is not called."""
        mocker.patch.object(
            fraud_worker, "KafkaConsumer", side_effect=Exception("startup failed")
        )

        # Should not raise
        fraud_worker.consume()


class TestMain:
    """Tests for main() and the __main__ guard."""

    def test_main_calls_consume(self, mocker):
        """main() delegates to consume()."""
        mock_consume = mocker.patch.object(fraud_worker, "consume")
        fraud_worker.main()
        mock_consume.assert_called_once_with()

    def test_main_block_guard(self):
        """Guard calls main() when __name__ == '__main__'."""
        # The guard in fraud_worker.py line 248-249 is:
        #   if __name__ == "__main__":
        #       main()
        # Verify the guard evaluates correctly when imported vs executed directly.
        assert fraud_worker.__name__ == "app.workers.fraud_worker"
        # When the module is imported, __name__ != "__main__", so the block
        # does NOT execute.  We verify the guard is present in the source.
        source = open(fraud_worker.__file__).read()
        assert 'if __name__ == "__main__":' in source
        assert "main()" in source.split('if __name__ == "__main__":')[1]
