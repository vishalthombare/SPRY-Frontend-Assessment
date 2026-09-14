"""Behavioral coverage for global and endpoint-specific request throttling."""

import logging
from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.database import get_db_session
from app.core.rate_limit import InMemoryRateLimiter, RateLimit
from app.main import create_app
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.modules.auth.dependencies import get_current_user


def build_client(**overrides: object) -> tuple[TestClient, object]:
    """Create an isolated application so rate buckets never leak between tests."""
    settings = get_settings().model_copy(
        update={
            "rate_limit_enabled": True,
            "global_rate_limit": "1000/minute",
            **overrides,
        }
    )
    application = create_app(settings=settings)
    return TestClient(application), application


@pytest.mark.asyncio
async def test_fixed_window_expires_and_accepts_requests_again() -> None:
    now = 1_000.0
    limiter = InMemoryRateLimiter(clock=lambda: now)
    limit = RateLimit(requests=1, window_seconds=60)

    assert await limiter.check("test", "client", limit) is None
    assert await limiter.check("test", "client", limit) == 60
    now += 60
    assert await limiter.check("test", "client", limit) is None


@pytest.mark.asyncio
async def test_different_client_keys_have_independent_windows() -> None:
    limiter = InMemoryRateLimiter()
    limit = RateLimit(requests=1, window_seconds=60)

    assert await limiter.check("test", "client-a", limit) is None
    assert await limiter.check("test", "client-b", limit) is None
    assert await limiter.check("test", "client-a", limit) is not None


def test_global_limit_returns_standard_429_and_retry_after() -> None:
    client, _ = build_client(global_rate_limit="1/minute")
    headers = {"Origin": "http://localhost:4200"}

    assert client.get("/api/v1/not-found", headers=headers).status_code == 404
    response = client.get("/api/v1/not-found", headers=headers)

    assert response.status_code == 429
    assert int(response.headers["retry-after"]) > 0
    assert response.headers["access-control-allow-origin"] == "http://localhost:4200"
    assert response.json() == {
        "success": False,
        "message": "Too many requests. Please try again later.",
        "response": None,
        "status": 429,
    }


def test_health_and_cors_options_are_excluded_from_global_limit() -> None:
    client, _ = build_client(global_rate_limit="1/minute")

    for _ in range(3):
        assert client.get("/api/v1/health").status_code == 200
    for _ in range(3):
        response = client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "http://localhost:4200",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert response.status_code == 200


def test_rate_limiting_can_be_disabled() -> None:
    client, _ = build_client(rate_limit_enabled=False, global_rate_limit="1/minute")

    for _ in range(3):
        assert client.get("/api/v1/not-found").status_code == 404


def test_login_limit_preserves_success_and_invalid_credential_statuses() -> None:
    successful_client, _ = build_client(login_rate_limit="2/minute")
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
        "app.modules.auth.router.authenticate_user", new_callable=AsyncMock, return_value=user
    ):
        assert (
            successful_client.post(
                "/api/v1/auth/login",
                json={"email": "reviewer@example.com", "password": "secure-password"},
            ).status_code
            == 200
        )

    invalid_client, _ = build_client(login_rate_limit="2/minute")
    with patch(
        "app.modules.auth.router.authenticate_user", new_callable=AsyncMock, return_value=None
    ):
        response = invalid_client.post(
            "/api/v1/auth/login",
            json={"email": "unknown@example.com", "password": "wrong-password"},
        )
    assert response.status_code == 401


def test_login_limit_uses_normalized_email_and_does_not_reveal_accounts() -> None:
    client, _ = build_client(login_rate_limit="1/minute")
    with patch(
        "app.modules.auth.router.authenticate_user", new_callable=AsyncMock, return_value=None
    ):
        first = client.post(
            "/api/v1/auth/login",
            json={"email": "reviewer@example.com", "password": "wrong-password"},
        )
        blocked = client.post(
            "/api/v1/auth/login",
            json={"email": "REVIEWER@example.com", "password": "wrong-password"},
        )

    assert first.status_code == 401
    assert blocked.status_code == 429
    assert "email" not in blocked.text.lower()


def test_refresh_limit_is_applied_per_client() -> None:
    client, _ = build_client(refresh_rate_limit="1/minute")

    first = client.post("/api/v1/auth/refresh", json={"refresh_token": "invalid"})
    blocked = client.post("/api/v1/auth/refresh", json={"refresh_token": "another-invalid"})

    assert first.status_code == 401
    assert blocked.status_code == 429


def test_logout_limit_is_applied_per_authenticated_user() -> None:
    client, application = build_client(logout_rate_limit="1/minute")
    user = User(
        id=9,
        email="reviewer@example.com",
        full_name="Review User",
        password_hash="not-returned",
        is_superuser=True,
        auth_version=0,
        created_date=datetime.now(UTC),
    )
    session = AsyncMock()

    async def override_user() -> User:
        return user

    async def override_session():
        yield session

    application.dependency_overrides[get_current_user] = override_user
    application.dependency_overrides[get_db_session] = override_session
    try:
        assert client.post("/api/v1/auth/logout").status_code == 200
        blocked = client.post("/api/v1/auth/logout")
    finally:
        application.dependency_overrides.clear()

    assert blocked.status_code == 429


def test_task_mutations_share_one_per_user_limit() -> None:
    client, application = build_client(task_write_rate_limit="1/minute")
    now = datetime.now(UTC)
    user = User(
        id=11,
        email="reviewer@example.com",
        full_name="Review User",
        password_hash="not-returned",
        is_superuser=True,
        auth_version=0,
        created_date=now,
    )
    task = Task(
        id=1,
        user_id=user.id,
        title="Rate limit",
        description=None,
        status=TaskStatus.PENDING,
        due_date=date.today(),
        created_date=now,
        updated_date=now,
    )
    session = AsyncMock()

    async def override_user() -> User:
        return user

    async def override_session():
        yield session

    application.dependency_overrides[get_current_user] = override_user
    application.dependency_overrides[get_db_session] = override_session
    payload = {"title": "Rate limit", "due_date": date.today().isoformat()}
    try:
        with patch(
            "app.modules.tasks.router.task_service.create_task",
            new_callable=AsyncMock,
            return_value=task,
        ):
            assert client.post("/api/v1/tasks", json=payload).status_code == 201
            blocked = client.post("/api/v1/tasks", json=payload)
    finally:
        application.dependency_overrides.clear()

    assert blocked.status_code == 429


def test_rate_limiter_does_not_log_sensitive_values(caplog: pytest.LogCaptureFixture) -> None:
    client, _ = build_client(login_rate_limit="1/minute")
    caplog.set_level(logging.DEBUG, logger="app")
    secret = "never-log-this-password"
    with patch(
        "app.modules.auth.router.authenticate_user", new_callable=AsyncMock, return_value=None
    ):
        client.post(
            "/api/v1/auth/login",
            json={"email": "private@example.com", "password": secret},
        )

    assert secret not in caplog.text
    assert "private@example.com" not in caplog.text
