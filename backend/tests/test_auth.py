"""Tests for auth endpoints (POST /auth/login, POST /auth/register)."""
from unittest.mock import AsyncMock, MagicMock, patch

from tests.conftest import MOCK_USER, make_mock_async_client


class TestLogin:
    def test_success(self, client, mock_httpx_auth):
        response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "test-access-token"
        assert data["refresh_token"] == "test-refresh-token"
        assert data["user_id"] == MOCK_USER["id"]
        assert data["email"] == MOCK_USER["email"]

    def test_wrong_password(self, client):
        mock_client = make_mock_async_client(
            {"msg": "Invalid login credentials"}, status_code=400
        )
        with patch("httpx.AsyncClient", return_value=mock_client):
            response = client.post(
                "/auth/login",
                json={"email": "test@example.com", "password": "wrong"},
            )
        assert response.status_code == 401
        body = response.json()
        assert "Invalid login credentials" in body["detail"]

    def test_invalid_body(self, client):
        response = client.post("/auth/login", json={})
        assert response.status_code == 422


class TestRegister:
    def test_success(self, client, mock_httpx_auth):
        with (
            patch("app.routers.auth.settings.SUPABASE_URL", "https://test.supabase.co"),
            patch("app.routers.auth.settings.SUPABASE_SERVICE_ROLE_KEY", "test-key"),
        ):
            response = client.post(
                "/auth/register",
                json={
                    "name": "Test User",
                    "email": "test@example.com",
                    "password": "password123",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == MOCK_USER["id"]
        assert data["confirmed"] is True

    def test_success_with_admin_role(self, client, mock_httpx_auth):
        with (
            patch("app.routers.auth.settings.SUPABASE_URL", "https://test.supabase.co"),
            patch("app.routers.auth.settings.SUPABASE_SERVICE_ROLE_KEY", "test-key"),
        ):
            response = client.post(
                "/auth/register",
                json={
                    "name": "Admin User",
                    "email": "admin@example.com",
                    "password": "password123",
                    "role": "admin",
                },
            )
        assert response.status_code == 200

    def test_no_auth_config(self, client):
        with (
            patch("app.routers.auth.settings.SUPABASE_URL", ""),
            patch("app.routers.auth.settings.SUPABASE_SERVICE_ROLE_KEY", ""),
        ):
            response = client.post(
                "/auth/register",
                json={
                    "name": "Test User",
                    "email": "test@example.com",
                    "password": "password123",
                },
            )
        assert response.status_code == 500

    def test_invalid_body(self, client):
        response = client.post("/auth/register", json={})
        assert response.status_code == 422
