"""Tests for standardized handled-error responses."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_validation_error_uses_response_envelope() -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "not-an-email", "password": "short"},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["message"] == "Validation failed."
    assert body["status"] == 422
    assert body["response"]["errors"]
