"""FastAPI application factory and middleware registration."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import Settings, get_settings
from app.core.exception_handlers import register_exception_handlers
from app.core.rate_limit import InMemoryRateLimiter, RateLimiter, validate_rate_limit_settings
from app.core.rate_limit_middleware import GlobalRateLimitMiddleware


def create_app(
    settings: Settings | None = None,
    rate_limiter: RateLimiter | None = None,
) -> FastAPI:
    """Create the app, register cross-cutting behavior, and attach versioned routes."""
    settings = settings or get_settings()
    validate_rate_limit_settings(settings)
    application = FastAPI(
        title=settings.app_name,
        debug=settings.app_debug,
        version="0.1.0",
    )
    limiter = rate_limiter or InMemoryRateLimiter()
    application.state.settings = settings
    application.state.rate_limiter = limiter
    application.add_middleware(
        GlobalRateLimitMiddleware,
        settings=settings,
        limiter=limiter,
    )
    # CORS allows the Angular development server to call this API in the browser.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(application)
    application.include_router(api_v1_router, prefix=settings.api_v1_prefix)
    return application


# Uvicorn imports this module-level ASGI application through `app.main:app`.
app = create_app()
