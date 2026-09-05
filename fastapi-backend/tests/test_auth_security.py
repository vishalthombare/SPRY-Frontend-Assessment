import jwt

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_token,
)


def test_access_token_round_trip() -> None:
    token = create_access_token(user_id=42)

    assert decode_access_token(token) == 42


def test_access_token_rejects_invalid_value() -> None:
    try:
        decode_access_token("not-a-valid-token")
    except jwt.InvalidTokenError:
        pass
    else:
        raise AssertionError("Invalid token was accepted")


def test_refresh_token_round_trip() -> None:
    token = create_refresh_token(user_id=42, auth_version=3)

    claims = decode_token(token, "refresh")

    assert claims.user_id == 42
    assert claims.auth_version == 3


def test_refresh_token_cannot_be_used_as_access_token() -> None:
    token = create_refresh_token(user_id=42)

    try:
        decode_token(token, "access")
    except jwt.InvalidTokenError:
        pass
    else:
        raise AssertionError("Refresh token was accepted as an access token")
