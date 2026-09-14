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


async def limit_refresh(request: Request) -> None:
    """Limit refresh attempts by client without storing the submitted refresh token."""
    settings = request.app.state.settings
    await enforce_rate_limit(
        request,
        scope="auth-refresh",
        key=client_ip(request),
        limit=RateLimit.parse(settings.refresh_rate_limit),
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
