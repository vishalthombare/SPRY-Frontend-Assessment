"""Authentication-specific rate-limit dependencies."""

from fastapi import Request

from app.core.rate_limit import RateLimit, client_ip, enforce_rate_limit, opaque_key
from app.models.user import User
from app.modules.auth.dependencies import CurrentUser


async def limit_login(request: Request) -> None:
    """Limit each IP and normalized-email pair without retaining the email address."""
    settings = request.app.state.settings
    try:
        body = await request.json()
    except ValueError:
        body = {}
    submitted_email = body.get("email", "") if isinstance(body, dict) else ""
    normalized_email = (
        submitted_email.strip().casefold() if isinstance(submitted_email, str) else ""
    )
    identity = f"{client_ip(request)}:{normalized_email}"
    await enforce_rate_limit(
        request,
        scope="auth-login",
        key=opaque_key(identity),
        limit=RateLimit.parse(settings.login_rate_limit),
    )


async def limit_register(request: Request) -> None:
    """Limit account creation by client IP to reduce automated registration abuse."""
    await enforce_rate_limit(
        request,
        scope="auth-register",
        key=client_ip(request),
        limit=RateLimit.parse(request.app.state.settings.register_rate_limit),
    )


async def limit_refresh(request: Request) -> None:
    """Limit refresh attempts by client without storing the submitted refresh token."""
    settings = request.app.state.settings
    await enforce_rate_limit(
        request,
        scope="auth-refresh",
        key=client_ip(request),
        limit=RateLimit.parse(settings.refresh_rate_limit),
    )


async def limit_otp_verify(request: Request) -> None:
    """Limit verification attempts by both client IP and opaque challenge ID."""
    await _limit_otp_request(
        request,
        scope="auth-otp-verify",
        configured_limit=request.app.state.settings.otp_verify_rate_limit,
    )


async def limit_otp_resend(request: Request) -> None:
    """Limit replacement-code requests by both client IP and opaque challenge ID."""
    await _limit_otp_request(
        request,
        scope="auth-otp-resend",
        configured_limit=request.app.state.settings.otp_resend_rate_limit,
    )


async def limit_logout(request: Request, current_user: CurrentUser) -> None:
    """Limit logout attempts by the authenticated user's stable integer ID."""
    await _limit_authenticated(request, current_user, "auth-logout")


async def _limit_authenticated(request: Request, user: User, scope: str) -> None:
    settings = request.app.state.settings
    await enforce_rate_limit(
        request,
        scope=scope,
        key=str(user.id),
        limit=RateLimit.parse(settings.logout_rate_limit),
    )


async def _limit_otp_request(request: Request, *, scope: str, configured_limit: str) -> None:
    """Build a privacy-safe limit key from the requester and submitted challenge."""
    try:
        body = await request.json()
    except ValueError:
        body = {}
    challenge_id = body.get("challenge_id", "") if isinstance(body, dict) else ""
    # Combining both values stops one client from exhausting another client's allowance.
    identity = f"{client_ip(request)}:{challenge_id}"
    # Hash the compound identity so raw IP addresses are not retained in limiter storage.
    await enforce_rate_limit(
        request,
        scope=scope,
        key=opaque_key(identity),
        limit=RateLimit.parse(configured_limit),
    )
