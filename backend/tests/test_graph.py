"""Tests for the Neo4j GraphService (get_ownership_chain, get_person_plots, sync, transfer, close)."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.graph import GraphService


@pytest.fixture
def graph_service():
    gs = GraphService()
    gs.driver = None
    return gs


@pytest.fixture
def mock_driver():
    mock_session = MagicMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock()

    mock_result = MagicMock()
    mock_result.data = AsyncMock(return_value=[])

    mock_session.run = AsyncMock(return_value=mock_result)

    mock_driver = MagicMock()
    mock_driver.session.return_value = mock_session
    mock_driver.close = AsyncMock()
    mock_driver.__aenter__ = AsyncMock(return_value=mock_driver)
    mock_driver.__aexit__ = AsyncMock()

    return mock_driver


class TestGraphService:
    """Tests for GraphService."""

    async def test_get_ownership_chain(self, graph_service, mock_driver):
        mock_driver.session.return_value.__aenter__.return_value.run.return_value.data = AsyncMock(
            return_value=[{"person": "Alice", "from_date": "2020-01-01", "to_date": None}]
        )
        graph_service.driver = mock_driver

        result = await graph_service.get_ownership_chain("VOL 123 FOL 456")

        assert result["plot_ref"] == "VOL 123 FOL 456"
        assert len(result["ownership"]) == 1
        assert result["ownership"][0]["person"] == "Alice"

    async def test_get_ownership_chain_empty(self, graph_service, mock_driver):
        mock_driver.session.return_value.__aenter__.return_value.run.return_value.data = AsyncMock(
            return_value=[]
        )
        graph_service.driver = mock_driver

        result = await graph_service.get_ownership_chain("NONEXISTENT")

        assert result["plot_ref"] == "NONEXISTENT"
        assert result["ownership"] == []

    async def test_get_person_plots(self, graph_service, mock_driver):
        mock_driver.session.return_value.__aenter__.return_value.run.return_value.data = AsyncMock(
            return_value=[
                {"ref": "VOL 123 FOL 456", "district": "Kampala", "from_date": "2020-01-01", "to_date": None},
            ]
        )
        graph_service.driver = mock_driver

        result = await graph_service.get_person_plots("Alice")

        assert result["person"] == "Alice"
        assert len(result["plots"]) == 1

    async def test_get_person_plots_empty(self, graph_service, mock_driver):
        mock_driver.session.return_value.__aenter__.return_value.run.return_value.data = AsyncMock(
            return_value=[]
        )
        graph_service.driver = mock_driver

        result = await graph_service.get_person_plots("Unknown")

        assert result["person"] == "Unknown"
        assert result["plots"] == []

    async def test_sync_verification(self, graph_service, mock_driver):
        graph_service.driver = mock_driver

        await graph_service.sync_verification(
            plot_ref="VOL 123 FOL 456",
            owner="Alice",
            district="Kampala",
            land_type="Freehold",
            created_at="2026-05-29T10:00:00",
        )

        mock_driver.session.return_value.__aenter__.return_value.run.assert_called_once()

    async def test_create_transfer(self, graph_service, mock_driver):
        graph_service.driver = mock_driver

        await graph_service.create_transfer(
            plot_ref="VOL 123 FOL 456",
            previous_owner="Alice",
            new_owner="Bob",
            transfer_date="2026-05-29T10:00:00",
            district="Kampala",
            land_type="Freehold",
        )

        mock_driver.session.return_value.__aenter__.return_value.run.assert_called_once()

    async def test_close(self, graph_service, mock_driver):
        graph_service.driver = mock_driver

        await graph_service.close()

        mock_driver.close.assert_called_once()
        assert graph_service.driver is None

    async def test_close_when_no_driver(self, graph_service):
        graph_service.driver = None

        await graph_service.close()

        assert graph_service.driver is None

    async def test_lazy_driver_initialization(self, graph_service, mock_driver):
        with patch("app.services.graph.AsyncGraphDatabase.driver", return_value=mock_driver):
            graph_service.driver = None

            driver = await graph_service._get_driver()

            assert driver is not None
            assert graph_service.driver is not None

    async def test_get_ownership_chain_creates_driver(self, graph_service, mock_driver):
        with patch("app.services.graph.AsyncGraphDatabase.driver", return_value=mock_driver):
            graph_service.driver = None
            mock_driver.session.return_value.__aenter__.return_value.run.return_value.data = AsyncMock(
                return_value=[{"person": "Alice", "from_date": "2020-01-01", "to_date": None}]
            )

            result = await graph_service.get_ownership_chain("VOL 123 FOL 456")

            assert result["plot_ref"] == "VOL 123 FOL 456"
            assert graph_service.driver is not None
