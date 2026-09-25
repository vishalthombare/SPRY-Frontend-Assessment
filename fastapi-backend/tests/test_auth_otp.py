"""Unit tests for secure OTP challenge lifecycle behavior."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_otp_challenge import AuthOtpChallenge
from app.models.user import User
from app.modules.auth.otp_service import (
    INVALID_OTP_MESSAGE,
    IssuedOtp,
    OtpPolicy,
    OtpResendError,
    OtpVerificationError,
    create_challenge,
    hash_otp,
    mask_email,
    resend_challenge,
    verify_challenge,
    verify_otp_hash,
)

NOW = datetime(2026, 9, 24, 12, 0, tzinfo=UTC)
POLICY = OtpPolicy(hash_secret="a-secure-otp-hash-secret-with-32-chars")


def mock_session() -> MagicMock:
    session = MagicMock(spec=AsyncSession)
    session.scalar = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    return session


def user() -> User:
    return User(
        id=7,
        email="vishal@example.com",
        full_name="Vishal",
        password_hash="hash",
        is_active=True,
        is_deleted=False,
    )


def challenge(*, code: str = "123456", **changes: object) -> AuthOtpChallenge:
    challenge_id = uuid4()
    values = {
        "id": 1,
        "challenge_id": challenge_id,
        "user_id": 7,
        "otp_hash": hash_otp(code, challenge_id, POLICY.hash_secret),
        "expires_at": NOW + timedelta(minutes=5),
        "attempt_count": 0,
        "resend_count": 0,
        "last_sent_at": NOW - timedelta(minutes=2),
        "verified_at": None,
    }
    values.update(changes)
    stored = AuthOtpChallenge(**values)
    stored.user = user()
    return stored


def test_hash_verification_is_challenge_bound_and_constant_result() -> None:
    first_id = uuid4()
    second_id = uuid4()
    stored_hash = hash_otp("123456", first_id, POLICY.hash_secret)

    assert verify_otp_hash("123456", first_id, stored_hash, POLICY.hash_secret) is True
    assert verify_otp_hash("654321", first_id, stored_hash, POLICY.hash_secret) is False
    assert verify_otp_hash("123456", second_id, stored_hash, POLICY.hash_secret) is False


def test_mask_email_hides_most_of_the_local_part() -> None:
    assert mask_email("vishal@example.com") == "v*****@example.com"
    assert mask_email("a@example.com") == "a***@example.com"
    assert mask_email("invalid") == "***"


@pytest.mark.asyncio
async def test_create_challenge_stores_only_hash_and_invalidates_previous() -> None:
    session = mock_session()

    with patch("app.modules.auth.otp_service.generate_otp", return_value="123456"):
        issued = await create_challenge(session, user=user(), policy=POLICY, now=NOW)

    assert isinstance(issued, IssuedOtp)
    assert issued.code == "123456"
    assert issued.masked_email == "v*****@example.com"
    assert issued.challenge.otp_hash != issued.code
    assert issued.challenge.expires_at == NOW + timedelta(minutes=5)
    assert "123456" not in repr(issued)
    assert session.execute.await_count == 2
    session.add.assert_called_once_with(issued.challenge)
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_correct_otp_is_consumed_and_returns_user() -> None:
    session = mock_session()
    stored = challenge()
    stored.user = user()
    session.scalar.return_value = stored

    verified_user = await verify_challenge(
        session,
        challenge_id=stored.challenge_id,
        code="123456",
        policy=POLICY,
        now=NOW,
    )

    assert verified_user.id == 7
    assert stored.verified_at == NOW
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_incorrect_otp_increments_attempts_with_generic_error() -> None:
    session = mock_session()
    stored = challenge()
    session.scalar.return_value = stored

    with pytest.raises(OtpVerificationError, match=INVALID_OTP_MESSAGE):
        await verify_challenge(
            session,
            challenge_id=stored.challenge_id,
            code="000000",
            policy=POLICY,
            now=NOW,
        )

    assert stored.attempt_count == 1
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "changes",
    [
        {"expires_at": NOW},
        {"verified_at": NOW - timedelta(seconds=1)},
        {"attempt_count": POLICY.max_attempts},
    ],
)
async def test_expired_used_and_attempt_locked_challenges_share_safe_error(
    changes: dict[str, object],
) -> None:
    session = mock_session()
    stored = challenge(**changes)
    session.scalar.return_value = stored

    with pytest.raises(OtpVerificationError, match=INVALID_OTP_MESSAGE):
        await verify_challenge(
            session,
            challenge_id=stored.challenge_id,
            code="123456",
            policy=POLICY,
            now=NOW,
        )

    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_resend_enforces_cooldown() -> None:
    session = mock_session()
    stored = challenge(last_sent_at=NOW - timedelta(seconds=30))
    stored.user = user()
    session.scalar.return_value = stored

    with pytest.raises(OtpResendError) as error:
        await resend_challenge(
            session,
            challenge_id=stored.challenge_id,
            policy=POLICY,
            now=NOW,
        )

    assert error.value.retry_after_seconds == 30
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_resend_invalidates_previous_and_increments_count() -> None:
    session = mock_session()
    stored = challenge(resend_count=1)
    stored.user = user()
    session.scalar.return_value = stored

    with patch("app.modules.auth.otp_service.generate_otp", return_value="654321"):
        issued = await resend_challenge(
            session,
            challenge_id=stored.challenge_id,
            policy=POLICY,
            now=NOW,
        )

    assert issued.code == "654321"
    assert issued.challenge.challenge_id != stored.challenge_id
    assert issued.challenge.resend_count == 2
    assert issued.challenge.otp_hash != issued.code
    assert session.execute.await_count == 2
    session.add.assert_called_once_with(issued.challenge)
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_resend_limit_rejects_further_codes() -> None:
    session = mock_session()
    stored = challenge(resend_count=POLICY.max_resends)
    stored.user = user()
    session.scalar.return_value = stored

    with pytest.raises(OtpResendError):
        await resend_challenge(
            session,
            challenge_id=stored.challenge_id,
            policy=POLICY,
            now=NOW,
        )

    session.add.assert_not_called()
    session.commit.assert_not_awaited()
