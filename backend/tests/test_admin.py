"""Tests for admin retry endpoint (POST /admin/retry/{verification_id})."""
from unittest.mock import AsyncMock

import pytest

from app.auth import get_current_user
from app.main import app
from app.services.fraud_detection import FraudScoreResult
from tests.conftest import MockSupabaseQuery, MOCK_USER

MOCK_SEARCH = {
    "id": "test-vid-001",
    "plot_reference": "VOL 123 FOL 456",
    "owner": "Nakato Joyce",
    "location": "Kampala Central",
    "land_type": "Freehold",
    "plot_size": 10.0,
    "price_min": 200_000_000,
    "price_max": 300_000_000,
    "transfer_count": 1,
    "fraud_status": "failed",
    "created_at": "2026-05-29T10:00:00",
}

ADMIN_USER = {**MOCK_USER, "role": "admin", "roles": ["admin"]}

LOW_SCORE = FraudScoreResult(
    fraud_score=0.1, risk_level="LOW", anomaly_flags=[], ml_anomaly_score=0.05
)

HIGH_SCORE = FraudScoreResult(
    fraud_score=0.7,
    risk_level="HIGH",
    anomaly_flags=["asking_price_extremely_high"],
    ml_anomaly_score=0.65,
)


@pytest.fixture
def admin_auth():
    app.dependency_overrides[get_current_user] = lambda: ADMIN_USER
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def non_admin_auth():
    app.dependency_overrides[get_current_user] = lambda: MOCK_USER
    yield
    app.dependency_overrides.clear()


class TestAdminRetry:
    """Tests for POST /admin/retry/{verification_id}."""

    def test_retry_low_risk(self, client, admin_auth, mock_supabase, auth_headers, mocker):
        mock_supabase.table.return_value = MockSupabaseQuery([MOCK_SEARCH])
        mocker.patch("app.routers.admin.graph_service.get_ownership_chain",
                      AsyncMock(return_value={"plot_ref": "VOL 123 FOL 456", "ownership": []}))
        mocker.patch("app.routers.admin.score_fraud", return_value=LOW_SCORE)

        response = client.post("/admin/retry/test-vid-001", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["verification_id"] == "test-vid-001"
        assert data["status"] == "verified"

    def test_retry_high_risk(self, client, admin_auth, mock_supabase, auth_headers, mocker):
        mock_supabase.table.return_value = MockSupabaseQuery([MOCK_SEARCH])
        mocker.patch("app.routers.admin.graph_service.get_ownership_chain",
                      AsyncMock(return_value={
                          "plot_ref": "VOL 123 FOL 456",
                          "ownership": [
                              {"person": "Alice", "from_date": "2020-01-01"},
                              {"person": "Bob", "from_date": "2021-01-01"},
                              {"person": "Alice", "from_date": "2022-01-01"},
                          ],
                      }))
        mocker.patch("app.routers.admin.score_fraud", return_value=HIGH_SCORE)

        response = client.post("/admin/retry/test-vid-001", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "flagged"

    def test_retry_medium_risk(self, client, admin_auth, mock_supabase, auth_headers, mocker):
        mock_supabase.table.return_value = MockSupabaseQuery([MOCK_SEARCH])
        mocker.patch("app.routers.admin.graph_service.get_ownership_chain",
                      AsyncMock(return_value={
                          "plot_ref": "VOL 123 FOL 456",
                          "ownership": [
                              {"person": "Alice", "from_date": "2020-01-01"},
                              {"person": "Alice", "from_date": "2022-01-01"},
                          ],
                      }))
        mocker.patch("app.routers.admin.score_fraud", return_value=LOW_SCORE)

        response = client.post("/admin/retry/test-vid-001", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "flagged"

    def test_retry_403_for_non_admin(self, client, non_admin_auth, auth_headers):
        response = client.post("/admin/retry/test-vid-001", headers=auth_headers)
        assert response.status_code == 403
        assert "Admin access required" in response.text

    def test_retry_404_not_found(self, client, admin_auth, mock_supabase, auth_headers):
        mock_supabase.table.return_value = MockSupabaseQuery([])

        response = client.post("/admin/retry/nonexistent", headers=auth_headers)
        assert response.status_code == 404

    def test_retry_401_without_auth(self, client):
        response = client.post("/admin/retry/test-vid-001")
        assert response.status_code == 401

    def test_retry_neo4j_failure_500(self, client, admin_auth, mock_supabase, auth_headers, mocker):
        mock_supabase.table.return_value = MockSupabaseQuery([MOCK_SEARCH])
        mocker.patch("app.routers.admin.graph_service.get_ownership_chain",
                      AsyncMock(side_effect=Exception("Neo4j unreachable")))

        response = client.post("/admin/retry/test-vid-001", headers=auth_headers)
        assert response.status_code == 500
        assert "Neo4j" in response.text

    def test_retry_403_string_role(self, client, auth_headers):
        """Single string role (not list) still rejects non-admin."""
        app.dependency_overrides[get_current_user] = lambda: {
            "id": "user-id", "roles": "land_buyer",
        }

        response = client.post("/admin/retry/test-vid-001", headers=auth_headers)

        app.dependency_overrides.clear()
        assert response.status_code == 403
