"""Tests for verification endpoints (POST /verify, GET /verify/{id}, GET /verify/{id}/status)."""
import time
from unittest.mock import patch

from tests.conftest import MockSupabaseQuery


class TestVerifyPlot:
    def test_valid_verify(self, client, override_auth, mock_supabase, auth_headers):
        with patch("app.routers.verify.publish_fraud_check"):
            response = client.post(
                "/verify",
                json={
                    "search_method": "title",
                    "volume": "123",
                    "folio": "456",
                    "land_type": "Freehold",
                    "plot_size": 10,
                },
                headers=auth_headers,
            )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "preliminary_verified"
        assert "verification_id" in data
        assert "processing_time_ms" in data
        assert data["processing_time_ms"] > 0

    def test_under_500ms(self, client, override_auth, mock_supabase, auth_headers):
        with patch("app.routers.verify.publish_fraud_check"):
            start = time.time()
            response = client.post(
                "/verify",
                json={
                    "search_method": "title",
                    "volume": "789",
                    "folio": "101",
                    "land_type": "Freehold",
                    "plot_size": 15,
                },
                headers=auth_headers,
            )
        elapsed = (time.time() - start) * 1000
        assert response.status_code == 200
        assert elapsed < 500, f"Response took {elapsed:.1f}ms (exceeded 500ms)"

    def test_returns_401_without_auth(self, client):
        response = client.post(
            "/verify",
            json={
                "search_method": "title",
                "volume": "123",
                "folio": "456",
                "land_type": "Freehold",
                "plot_size": 10,
            },
        )
        assert response.status_code == 401

    def test_invalid_body(self, client, override_auth, auth_headers):
        response = client.post("/verify", json={}, headers=auth_headers)
        assert response.status_code == 422

    def test_cache_hit(self, client, override_auth, mock_supabase, auth_headers):
        existing = {
            "id": "cached-id-123",
            "plot_reference": "VOL 111 FOL 222",
            "created_at": "2026-05-29T10:00:00",
            "fraud_status": "pending",
        }
        mock_supabase.table.return_value = MockSupabaseQuery([existing])
        with patch("app.routers.verify.publish_fraud_check"):
            response = client.post(
                "/verify",
                json={
                    "search_method": "title",
                    "volume": "111",
                    "folio": "222",
                    "land_type": "Freehold",
                    "plot_size": 10,
                },
                headers=auth_headers,
            )
        assert response.status_code == 200
        data = response.json()
        assert data["verification_id"] == "cached-id-123"
        assert data["status"] == "preliminary_verified"


class TestGetVerification:
    def test_get_success(self, client, override_auth, mock_supabase, seed_verification, auth_headers):
        response = client.get(
            f"/verify/{seed_verification['id']}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == seed_verification["id"]
        assert data["plot_reference"] == seed_verification["plot_reference"]
        assert data["owner"] == seed_verification["owner"]

    def test_404_for_fake_id(self, client, override_auth, mock_supabase, auth_headers):
        response = client.get("/verify/fake-id", headers=auth_headers)
        assert response.status_code == 404

    def test_returns_401_without_auth(self, client):
        response = client.get("/verify/some-id")
        assert response.status_code == 401


class TestGetVerificationStatus:
    def test_status_processing(self, client, override_auth, seed_verification, auth_headers):
        response = client.get(
            f"/verify/{seed_verification['id']}/status",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["verification_id"] == seed_verification["id"]
        assert data["status"] == "processing"
        assert "created_at" in data

    def test_status_flagged(self, client, override_auth, mock_supabase, auth_headers):
        flagged = {
            "id": "flagged-id",
            "fraud_status": "flagged",
            "neo4j_result": {"neo4j": {"flagged": True}},
            "created_at": "2026-05-29T10:00:00",
        }
        mock_supabase.table.return_value = MockSupabaseQuery([flagged])
        response = client.get(
            f"/verify/{flagged['id']}/status",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "flagged"
        assert data["fraud_details"] is not None

    def test_status_verified(self, client, override_auth, mock_supabase, auth_headers):
        verified = {
            "id": "verified-id",
            "fraud_status": "verified",
            "fraud_details": None,
            "created_at": "2026-05-29T10:00:00",
            "updated_at": "2026-05-29T10:03:00",
        }
        mock_supabase.table.return_value = MockSupabaseQuery([verified])
        response = client.get(
            f"/verify/{verified['id']}/status",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "verified"
        assert data["fraud_details"] is None

    def test_status_404(self, client, override_auth, mock_supabase, auth_headers):
        mock_supabase.table.return_value = MockSupabaseQuery([])
        response = client.get("/verify/nonexistent/status", headers=auth_headers)
        assert response.status_code == 404
