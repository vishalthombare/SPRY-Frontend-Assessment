"""Task endpoint rate-limit dependencies."""

from fastapi import Request

from app.core.rate_limit import RateLimit, enforce_rate_limit
from app.modules.auth.dependencies import CurrentUser


async def limit_task_read(request: Request, current_user: CurrentUser) -> None:
    """Apply the documented read allowance per authenticated user."""
    settings = request.app.state.settings
    await enforce_rate_limit(
        request,
        scope="task-read",
        key=str(current_user.id),
        limit=RateLimit.parse(settings.global_rate_limit),
    )


async def limit_task_write(request: Request, current_user: CurrentUser) -> None:
    """Share one mutation allowance across create, update, delete, complete, and restore."""
    settings = request.app.state.settings
    await enforce_rate_limit(
        request,
        scope="task-write",
        key=str(current_user.id),
        limit=RateLimit.parse(settings.task_write_rate_limit),
    )
