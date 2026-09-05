import jwt
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.user import User
from app.schemas.auth import (
    AuthenticatedUserResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RefreshRequest,
    TokenResponse,
)
from app.services.auth import authenticate_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse, summary="Sign in")
async def login(payload: LoginRequest, session: DatabaseSession) -> LoginResponse:
    """Authenticate credentials and issue a bearer access token."""
    user = await authenticate_user(session, str(payload.email), payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return LoginResponse(
        access_token=create_access_token(user.id, user.auth_version),
        refresh_token=create_refresh_token(user.id, user.auth_version),
        user=user,
    )


@router.post("/refresh", response_model=TokenResponse, summary="Refresh session")
async def refresh(payload: RefreshRequest, session: DatabaseSession) -> TokenResponse:
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

    return TokenResponse(
        access_token=create_access_token(user.id, user.auth_version),
        refresh_token=create_refresh_token(user.id, user.auth_version),
    )


@router.post("/logout", response_model=LogoutResponse, summary="Sign out")
async def logout(current_user: CurrentUser, session: DatabaseSession) -> LogoutResponse:
    """Invalidate all currently issued tokens for the authenticated user."""
    current_user.auth_version += 1
    current_user.updated_by = current_user.id
    await session.commit()
    return LogoutResponse(message="Signed out successfully.")


@router.get("/me", response_model=AuthenticatedUserResponse, summary="Get current user")
async def get_me(current_user: CurrentUser) -> User:
    """Return the user represented by the bearer access token."""
    return current_user
