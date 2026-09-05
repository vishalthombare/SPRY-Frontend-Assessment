"""Password hashing and signed JWT creation/validation utilities."""

from datetime import UTC, datetime, timedelta
from typing import Literal, NamedTuple

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import get_settings

password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Create an Argon2 hash suitable for persistent storage."""
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Safely compare a plain password with its stored Argon2 hash."""
    try:
        return password_hasher.verify(password_hash, password)
    # Invalid credentials intentionally return one generic False result.
    except (VerifyMismatchError, InvalidHashError):
        return False


TokenType = Literal["access", "refresh"]


class TokenClaims(NamedTuple):
    """Validated identity and revocation version carried by a JWT."""

    user_id: int
    auth_version: int


def _create_token(
    user_id: int,
    auth_version: int,
    token_type: TokenType,
    expires_delta: timedelta,
) -> str:
    settings = get_settings()
    issued_at = datetime.now(UTC)
    # `sub` identifies the user; `ver` lets logout invalidate previously issued tokens.
    payload = {
        "sub": str(user_id),
        "ver": auth_version,
        "type": token_type,
        "iat": issued_at,
        "exp": issued_at + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: int, auth_version: int = 0) -> str:
    """Create a short-lived signed access token."""
    settings = get_settings()
    return _create_token(
        user_id,
        auth_version,
        "access",
        timedelta(minutes=settings.jwt_expires_minutes),
    )


def create_refresh_token(user_id: int, auth_version: int = 0) -> str:
    """Create a longer-lived token that can renew an authenticated session."""
    settings = get_settings()
    return _create_token(
        user_id,
        auth_version,
        "refresh",
        timedelta(days=settings.jwt_refresh_expires_days),
    )


def decode_token(token: str, expected_type: TokenType) -> TokenClaims:
    """Validate a JWT of the expected type and return its identity claims."""
    settings = get_settings()
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "ver", "exp", "type"]},
    )
    # Access and refresh tokens are never interchangeable.
    if payload["type"] != expected_type:
        raise jwt.InvalidTokenError("Invalid token type")

    try:
        return TokenClaims(user_id=int(payload["sub"]), auth_version=int(payload["ver"]))
    except (TypeError, ValueError) as error:
        raise jwt.InvalidTokenError("Invalid token claims") from error


def decode_access_token(token: str) -> int:
    """Validate an access token and return its integer user identifier."""
    return decode_token(token, "access").user_id
