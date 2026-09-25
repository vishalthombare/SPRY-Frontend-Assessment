"""HTTP endpoints for login, refresh, logout, and current-user details."""

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select

from app.core.database import DatabaseSession
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.user import User
from app.modules.auth.dependencies import CurrentUser
from app.modules.auth.email_service import (
    EMAIL_DELIVERY_MESSAGE,
    EmailDeliveryError,
    ResendEmailService,
)
from app.modules.auth.otp_service import (
    INVALID_OTP_MESSAGE,
    RESEND_OTP_MESSAGE,
    IssuedOtp,
    OtpPolicy,
    OtpResendError,
    OtpVerificationError,
    create_challenge,
    invalidate_challenge,
    policy_from_settings,
    resend_challenge,
    verify_challenge,
)
from app.modules.auth.rate_limits import (
    limit_login,
    limit_logout,
    limit_otp_resend,
    limit_otp_verify,
    limit_refresh,
)
from app.modules.auth.schemas import (
    AuthenticatedUserResponse,
    LoginRequest,
    LoginResponse,
    LoginResult,
    OtpChallengeResponse,
    RefreshRequest,
    ResendOtpRequest,
    ResendOtpResponse,
    TokenResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
)
from app.modules.auth.service import authenticate_user
from app.schemas.response import ApiResponse, success

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Route decorators define the HTTP method/path and document the response in Swagger.
@router.post(
    "/login",
    response_model=ApiResponse[LoginResult],
    summary="Sign in",
    dependencies=[Depends(limit_login)],
)
async def login(
    payload: LoginRequest,
    session: DatabaseSession,
    request: Request,
) -> ApiResponse[LoginResponse | OtpChallengeResponse]:
    """Authenticate directly or begin email verification for a 2FA-enabled account."""
    # Password verification always happens before checking whether the account uses 2FA.
    # This prevents an attacker from discovering the 2FA setting for an unknown account.
    user = await authenticate_user(session, str(payload.email), payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Preserve the original one-step login contract for users who have not enabled 2FA.
    if not user.is_2fa_enabled:
        return success(_token_response(user, LoginResponse), message="Signed in successfully.")

    # Resolve email configuration lazily so normal login still works without Resend settings.
    policy, email_service = _otp_dependencies(request)
    # Only the challenge hash is persisted; the plain code exists temporarily for delivery.
    issued = await create_challenge(session, user=user, policy=policy)
    await _deliver_otp(session, issued, policy, email_service)
    return success(
        OtpChallengeResponse(
            challenge_id=issued.challenge.challenge_id,
            masked_email=issued.masked_email,
            expires_in_seconds=policy.expires_minutes * 60,
        ),
        message="Verification code sent.",
    )


@router.post(
    "/verify-otp",
    response_model=ApiResponse[VerifyOtpResponse],
    summary="Verify email code",
    dependencies=[Depends(limit_otp_verify)],
)
async def verify_otp(
    payload: VerifyOtpRequest,
    session: DatabaseSession,
    request: Request,
) -> ApiResponse[VerifyOtpResponse]:
    """Consume a valid OTP challenge before issuing the existing JWT pair."""
    policy = _otp_policy(request)
    try:
        user = await verify_challenge(
            session,
            challenge_id=payload.challenge_id,
            code=payload.otp,
            policy=policy,
        )
    except OtpVerificationError:
        # One generic message avoids revealing whether a code expired, failed, or was reused.
        raise HTTPException(status_code=400, detail=INVALID_OTP_MESSAGE) from None

    # JWTs are created only after the challenge has been successfully consumed.
    return success(
        _token_response(user, VerifyOtpResponse),
        message="Verification completed successfully.",
    )


@router.post(
    "/resend-otp",
    response_model=ApiResponse[ResendOtpResponse],
    summary="Resend email code",
    dependencies=[Depends(limit_otp_resend)],
)
async def resend_otp(
    payload: ResendOtpRequest,
    session: DatabaseSession,
    request: Request,
) -> ApiResponse[ResendOtpResponse]:
    """Replace an eligible OTP challenge and deliver its new code."""
    policy, email_service = _otp_dependencies(request)
    try:
        issued = await resend_challenge(
            session,
            challenge_id=payload.challenge_id,
            policy=policy,
        )
    except OtpResendError as error:
        # Retry-After lets clients display the remaining cooldown when one is available.
        headers = (
            {"Retry-After": str(error.retry_after_seconds)}
            if error.retry_after_seconds is not None
            else None
        )
        raise HTTPException(status_code=429, detail=RESEND_OTP_MESSAGE, headers=headers) from None

    await _deliver_otp(session, issued, policy, email_service)
    return success(
        ResendOtpResponse(
            challenge_id=issued.challenge.challenge_id,
            masked_email=issued.masked_email,
            expires_in_seconds=policy.expires_minutes * 60,
            resend_cooldown_seconds=policy.resend_cooldown_seconds,
        ),
        message="A new verification code was sent.",
    )


@router.post(
    "/refresh",
    response_model=ApiResponse[TokenResponse],
    summary="Refresh session",
    dependencies=[Depends(limit_refresh)],
)
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


@router.post(
    "/logout",
    response_model=ApiResponse[None],
    summary="Sign out",
    dependencies=[Depends(limit_logout)],
)
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


def _otp_policy(request: Request) -> OtpPolicy:
    """Return validated OTP configuration without exposing configuration details."""
    try:
        return policy_from_settings(request.app.state.settings)
    except ValueError:
        # Configuration details remain server-side instead of being exposed in the API response.
        raise HTTPException(status_code=503, detail=EMAIL_DELIVERY_MESSAGE) from None


def _otp_dependencies(request: Request) -> tuple[OtpPolicy, ResendEmailService]:
    """Resolve OTP policy and email delivery only for flows that actually require them."""
    policy = _otp_policy(request)
    try:
        email_service = ResendEmailService.from_settings(request.app.state.settings)
    except ValueError:
        raise HTTPException(status_code=503, detail=EMAIL_DELIVERY_MESSAGE) from None
    return policy, email_service


async def _deliver_otp(
    session: DatabaseSession,
    issued: IssuedOtp,
    policy: OtpPolicy,
    email_service: ResendEmailService,
) -> None:
    """Send a transient OTP and expire its challenge when provider delivery fails."""
    try:
        await email_service.send_otp(
            recipient=issued.recipient,
            code=issued.code,
            expires_minutes=policy.expires_minutes,
        )
    except EmailDeliveryError:
        # A code that was never delivered must not remain usable.
        await invalidate_challenge(session, issued.challenge)
        raise HTTPException(status_code=503, detail=EMAIL_DELIVERY_MESSAGE) from None


def _token_response(
    user: User, response_type: type[LoginResponse] | type[VerifyOtpResponse]
) -> LoginResponse | VerifyOtpResponse:
    """Build the unchanged JWT pair only after the required authentication steps succeed."""
    return response_type(
        access_token=create_access_token(user.id, user.auth_version),
        refresh_token=create_refresh_token(user.id, user.auth_version),
        user=user,
    )
