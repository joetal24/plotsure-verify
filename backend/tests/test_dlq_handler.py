"""Tests for the DLQ handler (store_failure, consume, main)."""
from unittest.mock import MagicMock

import pytest

from app.workers import dlq_handler
from tests.conftest import MockSupabaseQuery

MESSAGE = {
    "version": "1.0",
    "verification_id": "test-vid-001",
    "plot_id": "VOL 123 FOL 456",
    "owner_name": "Nakato Joyce",
    "error": "Processing failed",
}


class TestStoreFailure:
    """Tests for store_failure()."""

    def test_stores_successfully(self, mock_supabase):
        dlq_handler.store_failure(
            verification_id="test-vid-001",
            plot_id="VOL 123 FOL 456",
            error_message="Processing failed",
            error_details={"error": "Processing failed"},
            original_message=MESSAGE,
        )

        mock_supabase.table.assert_called_with("fraud_check_failures")
        inserted = mock_supabase.table()._last_insert_data
        assert inserted["verification_id"] == "test-vid-001"
        assert inserted["plot_id"] == "VOL 123 FOL 456"
        assert "created_at" in inserted

    def test_truncates_long_error_message(self, mock_supabase):
        long_error = "x" * 1000
        dlq_handler.store_failure(
            verification_id="test-vid-001",
            plot_id="VOL 123 FOL 456",
            error_message=long_error,
            error_details={"error": long_error},
            original_message=MESSAGE,
        )

        inserted = mock_supabase.table()._last_insert_data
        assert len(inserted["error_message"]) == 500
        assert inserted["error_message"] == "x" * 500

    def test_db_insert_failure_logged(self, mock_supabase, mocker):
        mock_logger = mocker.patch("app.workers.dlq_handler.logger")

        class FailingQuery(MockSupabaseQuery):
            def execute(self):
                raise Exception("DB error")

        mock_supabase.table.return_value = FailingQuery([])

        dlq_handler.store_failure(
            verification_id="test-vid-001",
            plot_id="VOL 123 FOL 456",
            error_message="Error",
            error_details={},
            original_message=MESSAGE,
        )

        mock_logger.error.assert_called()

    def test_stores_with_unknown_ids(self, mock_supabase):
        dlq_handler.store_failure(
            verification_id="unknown",
            plot_id="unknown",
            error_message="Error",
            error_details={},
            original_message={},
        )

        inserted = mock_supabase.table()._last_insert_data
        assert inserted["verification_id"] == "unknown"
        assert inserted["plot_id"] == "unknown"


class TestConsume:
    """Tests for consume()."""

    def _make_mock_consumer(self, *messages):
        mock_consumer = MagicMock()

        def iter_side_effect():
            for msg in messages:
                yield msg
            raise KeyboardInterrupt()

        mock_consumer.__iter__.return_value = iter_side_effect()
        return mock_consumer

    def test_processes_messages(self, mocker, mock_supabase):
        mock_msg = MagicMock()
        mock_msg.value = {
            "original_message": MESSAGE,
            "error": "Processing failed",
            "failed_at": "2026-05-29T10:00:00",
        }
        mock_consumer = self._make_mock_consumer(mock_msg)

        mocker.patch.object(dlq_handler, "KafkaConsumer", return_value=mock_consumer)
        mock_store = mocker.patch.object(dlq_handler, "store_failure")

        dlq_handler.consume()

        mock_store.assert_called_once_with(
            verification_id="test-vid-001",
            plot_id="VOL 123 FOL 456",
            error_message="Processing failed",
            error_details={"failed_at": "2026-05-29T10:00:00", "error": "Processing failed"},
            original_message=MESSAGE,
        )

    def test_handles_connection_failure(self, mocker):
        mocker.patch.object(
            dlq_handler, "KafkaConsumer",
            side_effect=Exception("Broker unreachable"),
        )

        dlq_handler.consume()

    def test_consumer_is_closed(self, mocker):
        mock_consumer = MagicMock()
        mock_consumer.__iter__.side_effect = KeyboardInterrupt()

        mocker.patch.object(dlq_handler, "KafkaConsumer", return_value=mock_consumer)

        dlq_handler.consume()

        mock_consumer.close.assert_called_once()

    def test_consumer_close_not_called_when_none(self, mocker):
        mocker.patch.object(
            dlq_handler, "KafkaConsumer",
            side_effect=Exception("startup failed"),
        )

        dlq_handler.consume()


class TestMain:
    """Tests for main() and __main__ guard."""

    def test_main_calls_consume(self, mocker):
        mock_consume = mocker.patch.object(dlq_handler, "consume")
        dlq_handler.main()
        mock_consume.assert_called_once_with()

    def test_main_block_guard(self):
        assert 'if __name__ == "__main__":' in open(dlq_handler.__file__).read()
        source = open(dlq_handler.__file__).read()
        assert "main()" in source.split('if __name__ == "__main__":')[1]
