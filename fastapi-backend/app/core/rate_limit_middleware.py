"""Central rate-limit middleware for all versioned API requests."""

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import Settings
from app.core.rate_limit import RATE_LIMIT_MESSAGE, RateLimit, RateLimiter, client_ip


class GlobalRateLimitMiddleware:
    """Apply the global IP limit while preserving CORS and health-check behavior."""

    def __init__(self, app: ASGIApp, *, settings: Settings, limiter: RateLimiter) -> None:
        self.app = app
        self.settings = settings
        self.limiter = limiter
        self.limit = RateLimit.parse(settings.global_rate_limit)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        excluded = (
            not request.url.path.startswith(self.settings.api_v1_prefix)
            or request.method == "OPTIONS"
            or (
                request.method == "GET"
                and request.url.path == f"{self.settings.api_v1_prefix}/health"
            )
        )
        if not self.settings.rate_limit_enabled or excluded:
            await self.app(scope, receive, send)
            return

        retry_after = await self.limiter.check("global", client_ip(request), self.limit)
        if retry_after is not None:
            response = JSONResponse(
                status_code=429,
                headers={"Retry-After": str(retry_after)},
                content={
                    "success": False,
                    "message": RATE_LIMIT_MESSAGE,
                    "response": None,
                    "status": 429,
                },
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
