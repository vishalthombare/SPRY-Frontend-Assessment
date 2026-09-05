from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app


def test_health_check() -> None:
    response = TestClient(app).get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "message": None,
        "response": {"status": "ok"},
        "status": 200,
    }


def test_database_health_check() -> None:
    with patch(
        "app.api.v1.health.check_database_connection",
        new_callable=AsyncMock,
    ) as connection_check:
        response = TestClient(app).get("/api/v1/health/database")

    assert response.status_code == 200
    assert response.json() == {
        "message": None,
        "response": {"status": "ok"},
        "status": 200,
    }
    connection_check.assert_awaited_once()
