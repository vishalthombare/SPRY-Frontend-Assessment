from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user
from app.core.database import get_db_session
from app.core.security import create_access_token, create_refresh_token
from app.main import app
from app.models.user import User

client = TestClient(app)


def test_me_requires_bearer_token() -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_login_rejects_invalid_credentials() -> None:
    with patch(
        "app.api.v1.auth.authenticate_user",
        new_callable=AsyncMock,
        return_value=None,
    ):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "reviewer@example.com", "password": "wrong-password"},
        )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password."}


def test_login_returns_token_and_safe_user() -> None:
    user = User(
        id=7,
        email="reviewer@example.com",
        full_name="Review User",
        password_hash="not-returned",
        is_superuser=True,
        auth_version=0,
        created_date=datetime.now(UTC),
    )
    with patch(
        "app.api.v1.auth.authenticate_user",
        new_callable=AsyncMock,
        return_value=user,
    ):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "reviewer@example.com", "password": "secure-password"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["user"]["id"] == 7
    assert body["user"]["is_superuser"] is True
    assert "password_hash" not in body["user"]


def test_refresh_rotates_token_pair() -> None:
    user = User(
        id=7,
        email="reviewer@example.com",
        full_name="Review User",
        password_hash="not-returned",
        is_superuser=True,
        auth_version=2,
        created_date=datetime.now(UTC),
    )
    session = AsyncMock()
    session.scalar.return_value = user

    async def override_session():
        yield session

    app.dependency_overrides[get_db_session] = override_session
    try:
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": create_refresh_token(user.id, user.auth_version)},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["access_token"]
    assert response.json()["refresh_token"]


def test_logout_increments_auth_version() -> None:
    user = User(
        id=7,
        email="reviewer@example.com",
        full_name="Review User",
        password_hash="not-returned",
        is_superuser=True,
        auth_version=2,
        created_date=datetime.now(UTC),
    )
    session = AsyncMock()

    async def override_user():
        return user

    async def override_session():
        yield session

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db_session] = override_session
    try:
        response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {create_access_token(user.id, 2)}"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"message": "Signed out successfully."}
    assert user.auth_version == 3
    session.commit.assert_awaited_once()
