"""Reusable FastAPI dependency that resolves the authenticated user."""

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from app.core.database import DatabaseSession
from app.core.security import decode_token
from app.models.user import User

# FastAPI reads the Authorization header but lets this module return one consistent 401 response.
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    session: DatabaseSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(bearer_scheme)],
) -> User:
    """Resolve an active, non-deleted user from a bearer access token."""
    # Use one response for missing, malformed, expired, or revoked credentials.
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    try:
        claims = decode_token(credentials.credentials, "access")
    except jwt.InvalidTokenError as error:
        raise unauthorized from error

    # Checking auth_version makes logout effective for already-issued JWTs.
    user = await session.scalar(
        select(User).where(
            User.id == claims.user_id,
            User.auth_version == claims.auth_version,
            User.is_active.is_(True),
            User.is_deleted.is_(False),
        )
    )
    if user is None:
        raise unauthorized
    return user


# Annotated + Depends tells FastAPI to inject the resolved user into protected route parameters.
CurrentUser = Annotated[User, Depends(get_current_user)]
