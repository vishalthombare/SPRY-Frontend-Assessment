from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.database import get_db_session
from app.core.security import create_access_token, create_refresh_token
from app.main import app
from app.models.auth_otp_challenge import AuthOtpChallenge
from app.models.user import User
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.email_service import EmailDeliveryError
from app.modules.auth.otp_service import IssuedOtp, OtpResendError, OtpVerificationError
from app.modules.auth.service import EmailAlreadyRegisteredError

client = TestClient(app)


def test_register_creates_standard_user_without_tokens_or_password() -> None:
    administrator = _user(is_2fa_enabled=False)
    administrator.is_superuser = True
    user = User(
        id=12,
        email="new.user@example.com",
        full_name="New User",
        password_hash="must-not-be-returned",
        is_superuser=False,
        is_2fa_enabled=True,
        created_date=datetime.now(UTC),
    )

    async def override_user():
        return administrator

    app.dependency_overrides[get_current_user] = override_user
    try:
        with patch(
            "app.modules.auth.router.register_user",
            new_callable=AsyncMock,
            return_value=user,
        ) as register_user:
            response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": "NEW.USER@example.com",
                    "full_name": "New User",
                    "password": "secure-password",
                    "is_2fa_enabled": True,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    assert response.json()["message"] == "User registered successfully."
    assert response.json()["status"] == 201
    body = response.json()["response"]
    assert body["email"] == "new.user@example.com"
    assert body["is_2fa_enabled"] is True
    assert "password" not in body
    assert "password_hash" not in body
    assert "access_token" not in body
    call = register_user.await_args
    assert call is not None
    assert call.kwargs["email"] == "NEW.USER@example.com"
    assert call.kwargs["password"] == "secure-password"
    assert call.kwargs["created_by"] == administrator.id


def test_register_rejects_duplicate_email() -> None:
    administrator = _user(is_2fa_enabled=False)
    administrator.is_superuser = True

    async def override_user():
        return administrator

    app.dependency_overrides[get_current_user] = override_user
    try:
        with patch(
            "app.modules.auth.router.register_user",
            new_callable=AsyncMock,
            side_effect=EmailAlreadyRegisteredError(),
        ):
            response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": "existing@example.com",
                    "full_name": "Existing User",
                    "password": "secure-password",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 409
    assert response.json() == {
        "message": "An account with this email already exists.",
        "response": None,
        "status": 409,
    }


def test_register_validates_required_fields() -> None:
    administrator = _user(is_2fa_enabled=False)
    administrator.is_superuser = True

    async def override_user():
        return administrator

    app.dependency_overrides[get_current_user] = override_user
    try:
        response = client.post(
            "/api/v1/auth/register",
            json={"email": "invalid", "full_name": " ", "password": "short"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
    error_fields = {error["field"] for error in response.json()["response"]["errors"]}
    assert error_fields == {"email", "full_name", "password"}


def test_register_requires_access_token() -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new.user@example.com",
            "full_name": "New User",
            "password": "secure-password",
        },
    )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_register_rejects_non_superuser_access_token() -> None:
    standard_user = _user(is_2fa_enabled=False)
    standard_user.id = 99

    async def override_user():
        return standard_user

    app.dependency_overrides[get_current_user] = override_user
    try:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "new.user@example.com",
                "full_name": "New User",
                "password": "secure-password",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
    assert response.json()["message"] == "Administrator access is required to register users."


def test_me_requires_bearer_token() -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json()["status"] == 401
    assert response.json()["response"] is None
    assert response.headers["www-authenticate"] == "Bearer"


def test_login_rejects_invalid_credentials() -> None:
    with patch(
        "app.modules.auth.router.authenticate_user",
        new_callable=AsyncMock,
        return_value=None,
    ):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "reviewer@example.com", "password": "wrong-password"},
        )

    assert response.status_code == 401
    assert response.json() == {
        "message": "Invalid email or password.",
        "response": None,
        "status": 401,
    }


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
        "app.modules.auth.router.authenticate_user",
        new_callable=AsyncMock,
        return_value=user,
    ):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "reviewer@example.com", "password": "secure-password"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == 200
    assert body["message"] == "Signed in successfully."
    assert body["response"]["requires_otp"] is False
    assert body["response"]["token_type"] == "bearer"
    assert body["response"]["access_token"]
    assert body["response"]["refresh_token"]
    assert body["response"]["user"]["id"] == 7
    assert body["response"]["user"]["is_superuser"] is True
    assert "password_hash" not in body["response"]["user"]


def test_two_factor_login_returns_only_challenge_and_sends_email() -> None:
    user = _user(is_2fa_enabled=True)
    issued = _issued_otp(user)
    email_service = AsyncMock()
    original_settings = app.state.settings
    app.state.settings = _otp_settings()
    try:
        with (
            patch(
                "app.modules.auth.router.authenticate_user",
                new_callable=AsyncMock,
                return_value=user,
            ),
            patch(
                "app.modules.auth.router.create_challenge",
                new_callable=AsyncMock,
                return_value=issued,
            ),
            patch(
                "app.modules.auth.router.ResendEmailService.from_settings",
                return_value=email_service,
            ),
            patch("app.modules.auth.router.create_access_token") as access_token,
            patch("app.modules.auth.router.create_refresh_token") as refresh_token,
        ):
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "twofactor@example.com", "password": "secure-password"},
            )
    finally:
        app.state.settings = original_settings

    assert response.status_code == 200
    body = response.json()["response"]
    assert body == {
        "requires_otp": True,
        "challenge_id": str(issued.challenge.challenge_id),
        "masked_email": "t********@example.com",
        "expires_in_seconds": 300,
    }
    assert "access_token" not in body
    assert "refresh_token" not in body
    access_token.assert_not_called()
    refresh_token.assert_not_called()
    email_service.send_otp.assert_awaited_once_with(
        recipient=user.email,
        code="123456",
        expires_minutes=5,
    )


def test_invalid_credentials_do_not_create_or_send_otp() -> None:
    with (
        patch(
            "app.modules.auth.router.authenticate_user",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch("app.modules.auth.router.create_challenge", new_callable=AsyncMock) as create,
        patch("app.modules.auth.router.ResendEmailService.from_settings") as email_factory,
    ):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "invalid-2fa@example.com", "password": "wrong-password"},
        )

    assert response.status_code == 401
    create.assert_not_awaited()
    email_factory.assert_not_called()


def test_email_failure_invalidates_challenge_and_issues_no_tokens() -> None:
    user = _user(is_2fa_enabled=True)
    issued = _issued_otp(user)
    email_service = AsyncMock()
    email_service.send_otp.side_effect = EmailDeliveryError()
    original_settings = app.state.settings
    app.state.settings = _otp_settings()
    try:
        with (
            patch(
                "app.modules.auth.router.authenticate_user",
                new_callable=AsyncMock,
                return_value=user,
            ),
            patch(
                "app.modules.auth.router.create_challenge",
                new_callable=AsyncMock,
                return_value=issued,
            ),
            patch(
                "app.modules.auth.router.invalidate_challenge", new_callable=AsyncMock
            ) as invalidate,
            patch(
                "app.modules.auth.router.ResendEmailService.from_settings",
                return_value=email_service,
            ),
            patch("app.modules.auth.router.create_access_token") as access_token,
            patch("app.modules.auth.router.create_refresh_token") as refresh_token,
        ):
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "delivery@example.com", "password": "secure-password"},
            )
    finally:
        app.state.settings = original_settings

    assert response.status_code == 503
    invalidate.assert_awaited_once()
    access_token.assert_not_called()
    refresh_token.assert_not_called()


def test_correct_otp_returns_existing_jwt_response() -> None:
    user = _user(is_2fa_enabled=True)
    challenge_id = uuid4()
    original_settings = app.state.settings
    app.state.settings = _otp_settings()
    try:
        with patch(
            "app.modules.auth.router.verify_challenge",
            new_callable=AsyncMock,
            return_value=user,
        ):
            response = client.post(
                "/api/v1/auth/verify-otp",
                json={"challenge_id": str(challenge_id), "otp": "123456"},
            )
    finally:
        app.state.settings = original_settings

    assert response.status_code == 200
    body = response.json()["response"]
    assert body["requires_otp"] is False
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["user"]["id"] == user.id


def test_incorrect_otp_returns_generic_error_without_tokens() -> None:
    original_settings = app.state.settings
    app.state.settings = _otp_settings()
    try:
        with (
            patch(
                "app.modules.auth.router.verify_challenge",
                new_callable=AsyncMock,
                side_effect=OtpVerificationError(),
            ),
            patch("app.modules.auth.router.create_access_token") as access_token,
            patch("app.modules.auth.router.create_refresh_token") as refresh_token,
        ):
            response = client.post(
                "/api/v1/auth/verify-otp",
                json={"challenge_id": str(uuid4()), "otp": "000000"},
            )
    finally:
        app.state.settings = original_settings

    assert response.status_code == 400
    assert response.json()["message"] == "Invalid or expired verification code."
    access_token.assert_not_called()
    refresh_token.assert_not_called()


def test_resend_replaces_challenge_and_sends_new_code() -> None:
    user = _user(is_2fa_enabled=True)
    issued = _issued_otp(user, resend_count=1)
    email_service = AsyncMock()
    original_settings = app.state.settings
    app.state.settings = _otp_settings()
    try:
        with (
            patch(
                "app.modules.auth.router.resend_challenge",
                new_callable=AsyncMock,
                return_value=issued,
            ),
            patch(
                "app.modules.auth.router.ResendEmailService.from_settings",
                return_value=email_service,
            ),
        ):
            response = client.post(
                "/api/v1/auth/resend-otp",
                json={"challenge_id": str(uuid4())},
            )
    finally:
        app.state.settings = original_settings

    assert response.status_code == 200
    body = response.json()["response"]
    assert body["challenge_id"] == str(issued.challenge.challenge_id)
    assert body["expires_in_seconds"] == 300
    assert body["resend_cooldown_seconds"] == 60
    email_service.send_otp.assert_awaited_once()


def test_resend_cooldown_returns_retry_after() -> None:
    original_settings = app.state.settings
    app.state.settings = _otp_settings()
    try:
        with (
            patch(
                "app.modules.auth.router.resend_challenge",
                new_callable=AsyncMock,
                side_effect=OtpResendError(42),
            ),
            patch(
                "app.modules.auth.router.ResendEmailService.from_settings",
                return_value=AsyncMock(),
            ),
        ):
            response = client.post(
                "/api/v1/auth/resend-otp",
                json={"challenge_id": str(uuid4())},
            )
    finally:
        app.state.settings = original_settings

    assert response.status_code == 429
    assert response.headers["retry-after"] == "42"


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
    assert response.json()["response"]["access_token"]
    assert response.json()["response"]["refresh_token"]


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
    assert response.json() == {
        "message": "Signed out successfully.",
        "response": None,
        "status": 200,
    }
    assert user.auth_version == 3
    session.commit.assert_awaited_once()


def _user(*, is_2fa_enabled: bool) -> User:
    return User(
        id=17,
        email="twofactor@example.com",
        full_name="Two Factor User",
        password_hash="not-returned",
        is_superuser=False,
        is_2fa_enabled=is_2fa_enabled,
        is_active=True,
        is_deleted=False,
        auth_version=3,
        created_date=datetime.now(UTC),
    )


def _issued_otp(user: User, *, resend_count: int = 0) -> IssuedOtp:
    challenge = AuthOtpChallenge(
        id=3,
        challenge_id=uuid4(),
        user_id=user.id,
        otp_hash="stored-hash",
        expires_at=datetime.now(UTC),
        attempt_count=0,
        resend_count=resend_count,
        last_sent_at=datetime.now(UTC),
    )
    return IssuedOtp(
        challenge=challenge,
        code="123456",
        recipient=user.email,
        masked_email="t********@example.com",
    )


def _otp_settings():
    return app.state.settings.model_copy(
        update={
            "otp_hash_secret": SecretStr("a-secure-otp-hash-secret-with-32-chars"),
            "resend_api_key": SecretStr("re_test_key"),
            "email_from": "SPRY <no-reply@example.com>",
        }
    )
