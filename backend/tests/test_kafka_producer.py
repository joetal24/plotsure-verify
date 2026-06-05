"""Tests for the Kafka producer (publish_fraud_check, fallback, close)."""
from unittest.mock import AsyncMock, MagicMock

import pytest
from kafka.errors import KafkaError

from app.services import kafka_producer
from app.services.fraud_detection import FraudScoreResult
from tests.conftest import MockSupabaseQuery

LOW_SCORE = FraudScoreResult(
    fraud_score=0.1, risk_level="LOW", anomaly_flags=[], ml_anomaly_score=0.05
)

HIGH_SCORE = FraudScoreResult(
    fraud_score=0.7,
    risk_level="HIGH",
    anomaly_flags=["asking_price_extremely_high"],
    ml_anomaly_score=0.65,
)

MESSAGE_KWARGS = dict(
    verification_id="test-vid-001",
    plot_id="VOL 123 FOL 456",
    owner_name="Nakato Joyce",
    national_id="CM12345678",
    amount=250_000_000.0,
    date="2026-05-29T10:00:00",
    source="plotsure",
)


@pytest.fixture(autouse=True)
def reset_producer():
    kafka_producer._producer = None
    yield
    kafka_producer._producer = None


class TestSerialize:
    """Tests for _serialize helper."""

    def test_serialize(self):
        result = kafka_producer._serialize({"key": "value"})
        assert result == b'{"key": "value"}'


class TestGetProducer:
    """Tests for _get_producer()."""

    def test_creates_producer_on_first_call(self, mocker):
        mock_kp = mocker.patch("app.services.kafka_producer.KafkaProducer")
        result = kafka_producer._get_producer()
        assert result is not None
        mock_kp.assert_called_once()

    def test_returns_existing_producer(self, mocker):
        mock_producer = MagicMock()
        kafka_producer._producer = mock_producer
        mocker.patch("app.services.kafka_producer.KafkaProducer")

        result = kafka_producer._get_producer()
        assert result is mock_producer

    def test_connection_failure_returns_none(self, mocker):
        mocker.patch(
            "app.services.kafka_producer.KafkaProducer",
            side_effect=Exception("Broker unreachable"),
        )
        result = kafka_producer._get_producer()
        assert result is None
        assert kafka_producer._producer is None


class TestPublishFraudCheck:
    """Tests for publish_fraud_check()."""

    def test_publishes_successfully(self, mocker):
        mock_producer = MagicMock()
        mock_future = MagicMock()
        mock_future.get.return_value = None
        mock_producer.send.return_value = mock_future
        kafka_producer._producer = mock_producer

        result = kafka_producer.publish_fraud_check(**MESSAGE_KWARGS)

        assert result is True
        mock_producer.send.assert_called_once()
        sent = mock_producer.send.call_args[1]["value"]
        assert sent["version"] == "1.0"
        assert sent["verification_id"] == "test-vid-001"

    def test_kafka_error_falls_back(self, mocker, mock_supabase):
        mock_producer = MagicMock()
        mock_producer.send.side_effect = KafkaError("Broker error")
        kafka_producer._producer = mock_producer

        mock_gs = mocker.patch("app.services.kafka_producer.graph_service")
        mock_gs.get_ownership_chain = AsyncMock(
            return_value={"plot_ref": "VOL 123 FOL 456", "ownership": []}
        )
        mocker.patch(
            "app.services.kafka_producer.score_fraud",
            return_value=LOW_SCORE,
        )

        result = kafka_producer.publish_fraud_check(**MESSAGE_KWARGS)
        assert result is False

    def test_no_producer_falls_back(self, mocker, mock_supabase):
        mocker.patch(
            "app.services.kafka_producer.KafkaProducer",
            return_value=None,
        )
        mock_gs = mocker.patch("app.services.kafka_producer.graph_service")
        mock_gs.get_ownership_chain = AsyncMock(
            return_value={"plot_ref": "VOL 123 FOL 456", "ownership": []}
        )
        mocker.patch(
            "app.services.kafka_producer.score_fraud",
            return_value=LOW_SCORE,
        )

        result = kafka_producer.publish_fraud_check(**MESSAGE_KWARGS)
        assert result is False

    def test_sync_fallback_neo4j_error(self, mocker, mock_supabase):
        mocker.patch(
            "app.services.kafka_producer.KafkaProducer",
            side_effect=Exception("Broker unreachable"),
        )
        mock_gs = mocker.patch("app.services.kafka_producer.graph_service")
        mock_gs.get_ownership_chain = AsyncMock(
            side_effect=Exception("Neo4j error"),
        )
        mocker.patch(
            "app.services.kafka_producer.score_fraud",
            return_value=LOW_SCORE,
        )

        result = kafka_producer.publish_fraud_check(**MESSAGE_KWARGS)
        assert result is False

    def test_sync_fallback_neo4j_and_ml_flagged(self, mocker, mock_supabase):
        mocker.patch(
            "app.services.kafka_producer.KafkaProducer",
            side_effect=Exception("Broker unreachable"),
        )
        mock_gs = mocker.patch("app.services.kafka_producer.graph_service")
        mock_gs.get_ownership_chain = AsyncMock(
            return_value={
                "plot_ref": "VOL 123 FOL 456",
                "ownership": [
                    {"person": "Alice", "from_date": "2020-01-01"},
                    {"person": "Alice", "from_date": "2022-01-01"},
                ],
            },
        )
        mocker.patch(
            "app.services.kafka_producer.score_fraud",
            return_value=HIGH_SCORE,
        )

        result = kafka_producer.publish_fraud_check(**MESSAGE_KWARGS)
        assert result is False

    def test_sync_fallback_ml_error(self, mocker, mock_supabase):
        mocker.patch(
            "app.services.kafka_producer.KafkaProducer",
            side_effect=Exception("Broker unreachable"),
        )
        mock_gs = mocker.patch("app.services.kafka_producer.graph_service")
        mock_gs.get_ownership_chain = AsyncMock(
            return_value={"plot_ref": "VOL 123 FOL 456", "ownership": []},
        )
        mocker.patch(
            "app.services.kafka_producer.score_fraud",
            side_effect=Exception("ML model error"),
        )

        result = kafka_producer.publish_fraud_check(**MESSAGE_KWARGS)
        assert result is False

    def test_sync_fallback_supabase_update_exception(self, mocker, mock_supabase):
        mocker.patch(
            "app.services.kafka_producer.KafkaProducer",
            side_effect=Exception("Broker unreachable"),
        )
        mock_gs = mocker.patch("app.services.kafka_producer.graph_service")
        mock_gs.get_ownership_chain = AsyncMock(
            return_value={"plot_ref": "VOL 123 FOL 456", "ownership": []},
        )
        mocker.patch(
            "app.services.kafka_producer.score_fraud",
            return_value=LOW_SCORE,
        )
        mock_supabase.table.return_value = MockSupabaseQuery([])
        mock_supabase.table.side_effect = Exception("DB timeout")

        with pytest.raises(Exception, match="DB timeout"):
            kafka_producer.publish_fraud_check(**MESSAGE_KWARGS)


class TestSyncFraudCheck:
    """Tests for _run_sync_fraud_check()."""

    def test_sync_check_success(self, mocker, mock_supabase):
        mock_supabase.table.return_value = MockSupabaseQuery([])
        mock_gs = mocker.patch("app.services.kafka_producer.graph_service")
        mock_gs.get_ownership_chain = AsyncMock(
            return_value={"plot_ref": "VOL 123 FOL 456", "ownership": []}
        )
        mock_gs.sync_verification = AsyncMock()
        mocker.patch(
            "app.services.kafka_producer.score_fraud",
            return_value=LOW_SCORE,
        )

        kafka_producer._run_sync_fraud_check(
            verification_id="test-vid-001",
            plot_id="VOL 123 FOL 456",
            owner_name="Nakato Joyce",
            national_id="CM12345678",
            amount=250_000_000.0,
            date="2026-05-29T10:00:00",
        )

    def test_sync_check_high_risk(self, mocker, mock_supabase):
        mock_supabase.table.return_value = MockSupabaseQuery([])
        mock_gs = mocker.patch("app.services.kafka_producer.graph_service")
        mock_gs.get_ownership_chain = AsyncMock(
            return_value={
                "plot_ref": "VOL 123 FOL 456",
                "ownership": [
                    {"person": "Alice", "from_date": "2020-01-01"},
                    {"person": "Alice", "from_date": "2022-01-01"},
                ],
            }
        )
        mock_gs.sync_verification = AsyncMock()
        mocker.patch(
            "app.services.kafka_producer.score_fraud",
            return_value=HIGH_SCORE,
        )

        kafka_producer._run_sync_fraud_check(
            verification_id="test-vid-001",
            plot_id="VOL 123 FOL 456",
            owner_name="Nakato Joyce",
            national_id="CM12345678",
            amount=250_000_000.0,
            date="2026-05-29T10:00:00",
        )

    def test_sync_check_neo4j_failure(self, mocker, mock_supabase):
        mock_supabase.table.return_value = MockSupabaseQuery([])
        mock_gs = mocker.patch("app.services.kafka_producer.graph_service")
        mock_gs.get_ownership_chain = AsyncMock(
            side_effect=Exception("Neo4j error"),
        )
        mocker.patch(
            "app.services.kafka_producer.score_fraud",
            return_value=LOW_SCORE,
        )

        kafka_producer._run_sync_fraud_check(
            verification_id="test-vid-001",
            plot_id="VOL 123 FOL 456",
            owner_name="Nakato Joyce",
            national_id="CM12345678",
            amount=250_000_000.0,
            date="2026-05-29T10:00:00",
        )


class TestCloseProducer:
    """Tests for close_producer()."""

    def test_closes_existing_producer(self, mocker):
        mock_producer = MagicMock()
        kafka_producer._producer = mock_producer
        mocker.spy(kafka_producer, "close_producer")

        kafka_producer.close_producer()

        mock_producer.close.assert_called_once()
        assert kafka_producer._producer is None

    def test_noop_when_producer_is_none(self):
        kafka_producer._producer = None
        kafka_producer.close_producer()
        assert kafka_producer._producer is None

    def test_producer_created_via_get_producer_can_be_closed(self, mocker):
        mocker.patch("app.services.kafka_producer.KafkaProducer", return_value=MagicMock())
        producer = kafka_producer._get_producer()
        assert producer is not None
        assert kafka_producer._producer is not None

        kafka_producer.close_producer()
        assert kafka_producer._producer is None
