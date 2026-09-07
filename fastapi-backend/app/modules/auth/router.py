"""HTTP endpoints for login, refresh, logout, and current-user details."""

import jwt
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.database import DatabaseSession
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.user import User
from app.modules.auth.dependencies import CurrentUser
from app.modules.auth.schemas import (
    AuthenticatedUserResponse,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    TokenResponse,
)
from app.modules.auth.service import authenticate_user
from app.schemas.response import ApiResponse, success

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Route decorators define the HTTP method/path and document the response in Swagger.
@router.post("/login", response_model=ApiResponse[LoginResponse], summary="Sign in")
async def login(payload: LoginRequest, session: DatabaseSession) -> ApiResponse[LoginResponse]:
    """Authenticate credentials and issue a bearer access token."""
    user = await authenticate_user(session, str(payload.email), payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return success(
        LoginResponse(
            access_token=create_access_token(user.id, user.auth_version),
            refresh_token=create_refresh_token(user.id, user.auth_version),
            user=user,
        ),
        message="Signed in successfully.",
    )


@router.post("/refresh", response_model=ApiResponse[TokenResponse], summary="Refresh session")
async def refresh(payload: RefreshRequest, session: DatabaseSession) -> ApiResponse[TokenResponse]:
    """Validate a refresh token and rotate the client's token pair."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        claims = decode_token(payload.refresh_token, "refresh")
    except jwt.InvalidTokenError as error:
        raise unauthorized from error

    # The database check rejects disabled users and tokens invalidated by logout.
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

    return success(
        TokenResponse(
            access_token=create_access_token(user.id, user.auth_version),
            refresh_token=create_refresh_token(user.id, user.auth_version),
        )
    )


@router.post("/logout", response_model=ApiResponse[None], summary="Sign out")
async def logout(current_user: CurrentUser, session: DatabaseSession) -> ApiResponse[None]:
    """Invalidate all currently issued tokens for the authenticated user."""
    # Existing tokens carry the old version and fail authentication immediately.
    current_user.auth_version += 1
    current_user.updated_by = current_user.id
    await session.commit()
    return success(None, message="Signed out successfully.")


@router.get(
    "/me", response_model=ApiResponse[AuthenticatedUserResponse], summary="Get current user"
)
async def get_me(current_user: CurrentUser) -> ApiResponse[AuthenticatedUserResponse]:
    """Return the user represented by the bearer access token."""
    return success(current_user)
