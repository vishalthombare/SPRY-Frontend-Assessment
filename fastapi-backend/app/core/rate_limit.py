"""Async-safe in-memory rate limiting with replaceable storage boundaries."""

import asyncio
import hashlib
import math
import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

from fastapi import HTTPException, Request, status

from app.core.config import Settings

RATE_LIMIT_MESSAGE = "Too many requests. Please try again later."
_LIMIT_PATTERN = re.compile(
    r"^(?P<count>[1-9]\d*)/(?:(?P<amount>[1-9]\d*))?"
    r"(?P<unit>second|minute|hour|day)s?$"
)
_UNIT_SECONDS = {"second": 1, "minute": 60, "hour": 3600, "day": 86_400}


@dataclass(frozen=True, slots=True)
class RateLimit:
    """Maximum request count and fixed-window duration in seconds."""

    requests: int
    window_seconds: int

    @classmethod
    def parse(cls, value: str) -> "RateLimit":
        """Parse values such as ``100/minute`` and ``5/15minutes``."""
        match = _LIMIT_PATTERN.fullmatch(value.strip().lower())
        if match is None:
            raise ValueError(f"Invalid rate limit: {value!r}")
        amount = int(match.group("amount") or 1)
        return cls(
            requests=int(match.group("count")),
            window_seconds=amount * _UNIT_SECONDS[match.group("unit")],
        )


@dataclass(slots=True)
class _Window:
    """Mutable request count for one key and one fixed time window."""

    count: int
    expires_at: float


class RateLimiter(Protocol):
    """Storage-neutral contract used by middleware and route dependencies."""

    async def check(self, scope: str, key: str, limit: RateLimit) -> int | None:
        """Return retry seconds when blocked, otherwise return ``None``."""


class InMemoryRateLimiter:
    """Fixed-window limiter suitable for one-process, single-worker deployments."""

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._windows: dict[tuple[str, str], _Window] = {}
        self._lock = asyncio.Lock()

    async def check(self, scope: str, key: str, limit: RateLimit) -> int | None:
        """Atomically consume capacity and lazily remove expired windows."""
        now = self._clock()
        bucket_key = (scope, key)
        async with self._lock:
            self._remove_expired(now)
            window = self._windows.get(bucket_key)
            if window is None:
                self._windows[bucket_key] = _Window(1, now + limit.window_seconds)
                return None
            if window.count >= limit.requests:
                return max(1, math.ceil(window.expires_at - now))
            window.count += 1
            return None

    def _remove_expired(self, now: float) -> None:
        """Prevent inactive client buckets from growing memory indefinitely."""
        expired = [key for key, window in self._windows.items() if window.expires_at <= now]
        for key in expired:
            del self._windows[key]


def client_ip(request: Request) -> str:
    """Use the ASGI server's resolved peer address without trusting arbitrary headers."""
    return request.client.host if request.client else "unknown"


def opaque_key(value: str) -> str:
    """Hash identifiers so tokens and user-entered values never become stored bucket keys."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def get_rate_limiter(request: Request) -> RateLimiter:
    """Resolve the configured limiter through application state for easy replacement."""
    return request.app.state.rate_limiter


def validate_rate_limit_settings(settings: Settings) -> None:
    """Fail during application startup when any configured limit is malformed."""
    for value in (
        settings.global_rate_limit,
        settings.register_rate_limit,
        settings.login_rate_limit,
        settings.refresh_rate_limit,
        settings.logout_rate_limit,
        settings.task_write_rate_limit,
        settings.otp_verify_rate_limit,
        settings.otp_resend_rate_limit,
    ):
        RateLimit.parse(value)


async def enforce_rate_limit(
    request: Request,
    *,
    scope: str,
    key: str,
    limit: RateLimit,
) -> None:
    """Raise a standard 429 error when a bucket has no remaining capacity."""
    settings: Settings = request.app.state.settings
    if not settings.rate_limit_enabled:
        return
    retry_after = await get_rate_limiter(request).check(scope, key, limit)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=RATE_LIMIT_MESSAGE,
            headers={"Retry-After": str(retry_after)},
        )
