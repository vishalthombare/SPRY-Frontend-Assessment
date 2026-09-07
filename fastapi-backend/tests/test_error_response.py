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
    assert body["response"]["errors"] == [
        {
            "field": "email",
            "message": (
                "value is not a valid email address: An email address must have an @-sign."
            ),
            "code": "value_error",
        },
        {
            "field": "password",
            "message": "String should have at least 8 characters",
            "code": "string_too_short",
        },
    ]
    assert "input" not in body["response"]["errors"][0]
