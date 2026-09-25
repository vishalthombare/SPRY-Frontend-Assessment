"""Secure creation, verification, and resend handling for email OTP challenges."""

import hashlib
import hmac
import secrets
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings
from app.models.auth_otp_challenge import AuthOtpChallenge
from app.models.user import User

INVALID_OTP_MESSAGE = "Invalid or expired verification code."
RESEND_OTP_MESSAGE = "Unable to resend verification code. Please try again later."


class OtpVerificationError(Exception):
    """Safe, generic failure raised for invalid, expired, or consumed OTPs."""

    def __init__(self) -> None:
        super().__init__(INVALID_OTP_MESSAGE)


class OtpResendError(Exception):
    """Safe resend failure with an optional cooldown remaining in seconds."""

    def __init__(self, retry_after_seconds: int | None = None) -> None:
        super().__init__(RESEND_OTP_MESSAGE)
        self.retry_after_seconds = retry_after_seconds


@dataclass(frozen=True, slots=True)
class OtpPolicy:
    """Security and lifecycle limits supplied by environment-backed configuration later."""

    hash_secret: str = field(repr=False)
    length: int = 6
    expires_minutes: int = 5
    max_attempts: int = 5
    resend_cooldown_seconds: int = 60
    max_resends: int = 3

    def __post_init__(self) -> None:
        # A sufficiently long server secret makes an offline brute-force attack impractical.
        if len(self.hash_secret) < 32:
            raise ValueError("OTP hash secret must contain at least 32 characters.")
        if self.length < 6:
            raise ValueError("OTP length must be at least 6 digits.")
        for value in (
            self.expires_minutes,
            self.max_attempts,
            self.resend_cooldown_seconds,
            self.max_resends,
        ):
            if value < 1:
                raise ValueError("OTP policy limits must be positive.")


@dataclass(frozen=True, slots=True)
class IssuedOtp:
    """Transient delivery data; its representation intentionally hides the plain OTP."""

    challenge: AuthOtpChallenge
    code: str = field(repr=False)
    recipient: str = field(repr=False)
    masked_email: str


def policy_from_settings(settings: Settings) -> OtpPolicy:
    """Build the OTP policy only when 2FA is used, allowing gradual configuration rollout."""
    return OtpPolicy(
        hash_secret=settings.otp_hash_secret.get_secret_value(),
        expires_minutes=settings.otp_expires_minutes,
        max_attempts=settings.otp_max_attempts,
        resend_cooldown_seconds=settings.otp_resend_cooldown_seconds,
        max_resends=settings.otp_max_resends,
    )


def generate_otp(length: int = 6) -> str:
    """Generate a cryptographically secure, zero-padded numeric OTP."""
    if length < 6:
        raise ValueError("OTP length must be at least 6 digits.")
    return f"{secrets.randbelow(10**length):0{length}d}"


def hash_otp(code: str, challenge_id: UUID, secret: str) -> str:
    """Bind an OTP to its challenge using a keyed SHA-256 digest."""
    # Including the challenge ID means identical codes produce different stored hashes.
    value = f"{challenge_id}:{code}".encode()
    return hmac.new(secret.encode(), value, hashlib.sha256).hexdigest()


def verify_otp_hash(code: str, challenge_id: UUID, stored_hash: str, secret: str) -> bool:
    """Compare OTP digests in constant time to reduce timing side channels."""
    candidate = hash_otp(code, challenge_id, secret)
    return hmac.compare_digest(candidate, stored_hash)


def mask_email(email: str) -> str:
    """Return a useful destination hint without exposing the complete address."""
    local_part, separator, domain = email.strip().partition("@")
    if not separator or not local_part or not domain:
        return "***"
    visible = local_part[0]
    return f"{visible}{'*' * max(3, len(local_part) - 1)}@{domain}"


async def create_challenge(
    session: AsyncSession,
    *,
    user: User,
    policy: OtpPolicy,
    now: datetime | None = None,
) -> IssuedOtp:
    """Invalidate prior active challenges and persist one newly generated OTP hash."""
    issued_at = now or datetime.now(UTC)
    # Serialize challenge creation per user to prevent two concurrent active codes.
    await _lock_user(session, user.id)
    await _invalidate_active_challenges(session, user.id, issued_at)

    # The opaque UUID is safe to return to the client; the numeric database PK remains private.
    challenge_id = uuid4()
    code = generate_otp(policy.length)
    challenge = AuthOtpChallenge(
        challenge_id=challenge_id,
        user_id=user.id,
        otp_hash=hash_otp(code, challenge_id, policy.hash_secret),
        expires_at=issued_at + timedelta(minutes=policy.expires_minutes),
        attempt_count=0,
        resend_count=0,
        last_sent_at=issued_at,
    )
    session.add(challenge)
    # Commit before sending email so verification can find the challenge immediately.
    await session.commit()
    return IssuedOtp(
        challenge=challenge,
        code=code,
        recipient=user.email,
        masked_email=mask_email(user.email),
    )


async def verify_challenge(
    session: AsyncSession,
    *,
    challenge_id: UUID,
    code: str,
    policy: OtpPolicy,
    now: datetime | None = None,
) -> User:
    """Consume a valid challenge once and return the user authorized for token issuance."""
    checked_at = now or datetime.now(UTC)
    # A row lock prevents concurrent requests from successfully consuming the same code twice.
    challenge = await session.scalar(
        select(AuthOtpChallenge)
        .options(selectinload(AuthOtpChallenge.user))
        .where(AuthOtpChallenge.challenge_id == challenge_id)
        .with_for_update()
    )
    # Treat every unusable state as the same public verification failure.
    if (
        challenge is None
        or challenge.verified_at is not None
        or challenge.expires_at <= checked_at
        or challenge.attempt_count >= policy.max_attempts
        or not challenge.user.is_active
        or challenge.user.is_deleted
    ):
        raise OtpVerificationError

    if not verify_otp_hash(code, challenge.challenge_id, challenge.otp_hash, policy.hash_secret):
        # Persist each failed attempt so the challenge locks after the configured maximum.
        challenge.attempt_count += 1
        await session.commit()
        raise OtpVerificationError

    # verified_at is the durable single-use marker for this challenge.
    challenge.verified_at = checked_at
    await session.commit()
    return challenge.user


async def resend_challenge(
    session: AsyncSession,
    *,
    challenge_id: UUID,
    policy: OtpPolicy,
    now: datetime | None = None,
) -> IssuedOtp:
    """Replace an eligible challenge while preserving its cumulative resend count."""
    sent_at = now or datetime.now(UTC)
    previous = await session.scalar(
        select(AuthOtpChallenge)
        .options(selectinload(AuthOtpChallenge.user))
        .where(AuthOtpChallenge.challenge_id == challenge_id)
    )
    # Missing and ineligible challenges deliberately share the same safe public error.
    if previous is None:
        raise OtpResendError

    # Always acquire the user lock before the challenge lock to avoid lock-order deadlocks.
    await _lock_user(session, previous.user_id)
    previous = await session.scalar(
        select(AuthOtpChallenge)
        .options(selectinload(AuthOtpChallenge.user))
        .where(AuthOtpChallenge.challenge_id == challenge_id)
        .with_for_update()
    )
    if (
        previous is None
        or previous.verified_at is not None
        or previous.resend_count >= policy.max_resends
    ):
        raise OtpResendError

    # The persisted send time enforces cooldowns across processes and application restarts.
    cooldown_ends_at = previous.last_sent_at + timedelta(seconds=policy.resend_cooldown_seconds)
    if sent_at < cooldown_ends_at:
        retry_after = max(1, int((cooldown_ends_at - sent_at).total_seconds() + 0.999))
        raise OtpResendError(retry_after)

    # Expire the old code before creating its replacement so only the latest email works.
    await _invalidate_active_challenges(session, previous.user_id, sent_at)
    new_challenge_id = uuid4()
    code = generate_otp(policy.length)
    replacement = AuthOtpChallenge(
        challenge_id=new_challenge_id,
        user_id=previous.user_id,
        otp_hash=hash_otp(code, new_challenge_id, policy.hash_secret),
        expires_at=sent_at + timedelta(minutes=policy.expires_minutes),
        attempt_count=0,
        resend_count=previous.resend_count + 1,
        last_sent_at=sent_at,
    )
    session.add(replacement)
    await session.commit()
    return IssuedOtp(
        challenge=replacement,
        code=code,
        recipient=previous.user.email,
        masked_email=mask_email(previous.user.email),
    )


async def invalidate_challenge(
    session: AsyncSession,
    challenge: AuthOtpChallenge,
    *,
    now: datetime | None = None,
) -> None:
    """Expire a challenge after a delivery failure without marking it verified."""
    challenge.expires_at = now or datetime.now(UTC)
    await session.commit()


async def _invalidate_active_challenges(
    session: AsyncSession, user_id: int, invalidated_at: datetime
) -> None:
    """Expire every unverified challenge so only the newest code can succeed."""
    await session.execute(
        update(AuthOtpChallenge)
        .where(
            AuthOtpChallenge.user_id == user_id,
            AuthOtpChallenge.verified_at.is_(None),
            AuthOtpChallenge.expires_at > invalidated_at,
        )
        .values(expires_at=invalidated_at)
    )


async def _lock_user(session: AsyncSession, user_id: int) -> None:
    """Serialize challenge replacement for one account using a consistent lock order."""
    await session.execute(select(User.id).where(User.id == user_id).with_for_update())
