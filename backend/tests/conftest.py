"""Shared test fixtures and mocks for PlotSure."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, PropertyMock, patch

import pytest
from fastapi.testclient import TestClient
from supabase import Client

from app.main import app
from app.auth import get_current_user

# ── Mock user ──
MOCK_USER: dict[str, Any] = {
    "id": "test-user-id",
    "email": "test@example.com",
    "role": "land_buyer",
    "roles": ["land_buyer"],
}


# ── Helpers to build mock Supabase chain ──
class MockSupabaseResponse:
    """Mimics the supabase-py response."""

    def __init__(self, data: list[dict] | dict | None, count: int | None = None):
        self.data = data
        self.count = count


class MockSupabaseQuery:
    """Chained mock for db.table().select().eq()...execute()."""

    def __init__(self, return_data: Any = None):
        self._return_data = return_data
        self._single_mode = False

    def select(self, *args, **kwargs) -> "MockSupabaseQuery":
        return self

    def eq(self, *args, **kwargs) -> "MockSupabaseQuery":
        return self

    def gte(self, *args, **kwargs) -> "MockSupabaseQuery":
        return self

    def order(self, *args, **kwargs) -> "MockSupabaseQuery":
        return self

    def limit(self, *args, **kwargs) -> "MockSupabaseQuery":
        return self

    def single(self, *args, **kwargs) -> "MockSupabaseQuery":
        self._single_mode = True
        return self

    def execute(self) -> MockSupabaseResponse:
        if self._single_mode and isinstance(self._return_data, list) and len(self._return_data) == 1:
            return MockSupabaseResponse(self._return_data[0])
        return MockSupabaseResponse(self._return_data)

    def insert(self, data: dict) -> "MockSupabaseQuery":
        self._last_insert_data = data
        return self

    def update(self, data: dict) -> "MockSupabaseQuery":
        return self

    def upsert(self, data: dict) -> "MockSupabaseQuery":
        self._last_upsert_data = data
        return self

    def delete(self, *args, **kwargs) -> "MockSupabaseQuery":
        return self


_GET_SUPABASE_CLIENTS = [
    "app.database.get_supabase",
    "app.routers.verify.get_supabase",
    "app.routers.admin.get_supabase",
    "app.services.kafka_producer.get_supabase",
    "app.workers.dlq_handler.get_supabase",
]


@pytest.fixture
def mock_supabase(mocker):
    """Mock get_supabase() to return a fake client with chainable query methods.

    Patches at every usage point (routers import ``from app.database import get_supabase``
    at module load time, so ``app.database.get_supabase`` alone is not enough).
    """
    mock_client = MagicMock(spec=Client)
    mock_client.table.return_value = MockSupabaseQuery([])
    for target in _GET_SUPABASE_CLIENTS:
        mocker.patch(target, return_value=mock_client)
    return mock_client


def _make_supabase_query(return_data: Any) -> MockSupabaseQuery:
    return MockSupabaseQuery(return_data)


# ── Override auth dependency ──
@pytest.fixture
def override_auth():
    """Override get_current_user to return a mock user."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_USER
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    """Return a dummy Authorization header for tests that don't need real auth."""
    return {"Authorization": "Bearer test-token"}


# ── Mock Neo4j ──
@pytest.fixture
def mock_neo4j(mocker):
    """Mock graph_service to avoid real Neo4j calls."""
    mock = mocker.patch("app.services.graph.graph_service", autospec=True)
    mock.get_ownership_chain = AsyncMock(return_value={"plot_ref": "test-plot", "ownership": []})
    mock.sync_verification = AsyncMock()
    mock.close = AsyncMock()
    return mock


# ── Mock Kafka ──
@pytest.fixture
def mock_kafka(mocker):
    """Mock KafkaProducer to avoid real broker."""
    from kafka import KafkaProducer
    mock_producer = MagicMock(spec=KafkaProducer)
    mock_future = MagicMock()
    mock_future.get.return_value = None
    mock_producer.send.return_value = mock_future

    mocker.patch("app.services.kafka_producer.KafkaProducer", return_value=mock_producer)
    mocker.patch("app.services.kafka_producer._producer", mock_producer)
    return mock_producer


# ── Mock httpx for auth tests ──
def make_mock_async_client(response_json: dict, status_code: int = 200):
    """Create an async context manager mock for httpx.AsyncClient."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.json.return_value = response_json
    mock_response.text = json.dumps(response_json)

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.post.return_value = mock_response
    mock_client.get.return_value = mock_response
    mock_client.put.return_value = mock_response
    return mock_client


@pytest.fixture
def mock_httpx_auth(mocker):
    """Mock httpx.AsyncClient for auth endpoints."""
    mock_response_data = {
        "access_token": "test-access-token",
        "refresh_token": "test-refresh-token",
        "user": {"id": MOCK_USER["id"], "email": MOCK_USER["email"]},
    }
    mock_client = make_mock_async_client(mock_response_data)
    mocker.patch("httpx.AsyncClient", return_value=mock_client)
    return mock_client


# ── Create a verification in DB ──
@pytest.fixture
def seed_verification(mock_supabase):
    """Seed a mock verification record in the fake DB."""
    record = {
        "id": "test-verification-id",
        "user_id": MOCK_USER["id"],
        "plot_reference": "VOL 123 FOL 456",
        "location": "Kampala Central",
        "owner": "Nakato Joyce",
        "title_status": "CLEAN",
        "encumbrances": [],
        "transfer_count": 1,
        "last_transfer_date": "2023-06-15",
        "risk_level": "LOW",
        "price_min": 200_000_000,
        "price_max": 300_000_000,
        "land_type": "Freehold",
        "plot_size": 10.0,
        "plot_size_unit": "Decimals",
        "fraud_score": 0.0,
        "fraud_risk_level": "LOW",
        "anomaly_flags": [],
        "ml_anomaly_score": 0.0,
        "fraud_status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    mock_supabase.table.return_value = MockSupabaseQuery([record])
    return record
