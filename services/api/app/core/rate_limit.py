import asyncio
import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.logging import logger


class InMemoryRateLimiter:
    """
    Thread-safe in-memory sliding-window rate limiter for local and containerized deployments.
    Provides multi-tier request throttling:
      - Strict tier for authentication endpoints (login/register brute-force prevention)
      - Standard tier for general API endpoints
    """

    def __init__(self):
        # Maps IP -> list of timestamps (float)
        self._general_windows: Dict[str, List[float]] = defaultdict(list)
        self._auth_windows: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._last_cleanup = time.time()

    def _clean_stale_entries(self, now: float):
        """Purge entries older than 60 seconds to prevent memory growth."""
        if now - self._last_cleanup < 30.0:
            return
        self._last_cleanup = now
        cutoff = now - 60.0
        for ip in list(self._general_windows.keys()):
            self._general_windows[ip] = [t for t in self._general_windows[ip] if t > cutoff]
            if not self._general_windows[ip]:
                del self._general_windows[ip]
        for ip in list(self._auth_windows.keys()):
            self._auth_windows[ip] = [t for t in self._auth_windows[ip] if t > cutoff]
            if not self._auth_windows[ip]:
                del self._auth_windows[ip]

    async def is_allowed(self, ip: str, is_auth_path: bool) -> Tuple[bool, int]:
        """
        Evaluates whether a request from the given IP is within rate limits.
        Returns: (is_allowed, retry_after_seconds)
        """
        if not settings.RATE_LIMIT_ENABLED:
            return True, 0

        now = time.time()
        cutoff = now - 60.0

        async with self._lock:
            self._clean_stale_entries(now)

            if is_auth_path:
                window = self._auth_windows[ip]
                limit = settings.AUTH_RATE_LIMIT_PER_MINUTE
            else:
                window = self._general_windows[ip]
                limit = settings.RATE_LIMIT_REQUESTS_PER_MINUTE

            # Retain only timestamps from within the last 60 seconds
            active = [t for t in window if t > cutoff]

            if len(active) >= limit:
                oldest = active[0]
                retry_after = max(1, int(60.0 - (now - oldest)))
                return False, retry_after

            active.append(now)
            if is_auth_path:
                self._auth_windows[ip] = active
            else:
                self._general_windows[ip] = active

            return True, 0

    def reset(self):
        """Clear all tracking state (used in testing)."""
        self._general_windows.clear()
        self._auth_windows.clear()


limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware applying rate limiting by client IP.
    """

    EXEMPT_PATHS = {
        "/health",
        "/api/v1/health",
        "/docs",
        "/redoc",
        "/openapi.json",
    }

    AUTH_PATHS = {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
    }

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Bypass health checks and API documentation
        if path in self.EXEMPT_PATHS or not path.startswith(("/api/", "/health")):
            return await call_next(request)

        # Identify client IP (respecting forward headers from proxies/load balancers)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host
        else:
            client_ip = "unknown_client"

        is_auth = path in self.AUTH_PATHS
        allowed, retry_after = await limiter.is_allowed(client_ip, is_auth)

        if not allowed:
            logger.warning(
                f"Rate limit exceeded for IP '{client_ip}' on '{path}' (retry-after: {retry_after}s)"
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(retry_after)},
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Rate limit exceeded. Please retry in {retry_after} seconds.",
                    }
                },
            )

        return await call_next(request)
