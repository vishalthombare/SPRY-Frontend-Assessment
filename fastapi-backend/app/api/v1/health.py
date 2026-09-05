"""Public health endpoints used by developers and hosting platforms."""

from fastapi import APIRouter

from app.core.database import check_database_connection
from app.schemas.health import HealthResponse
from app.schemas.response import ApiResponse, success

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=ApiResponse[HealthResponse], summary="Check API availability")
async def health_check() -> ApiResponse[HealthResponse]:
    """Return application availability without exposing internal configuration."""
    return success(HealthResponse(status="ok"))


@router.get(
    "/health/database",
    response_model=ApiResponse[HealthResponse],
    summary="Check database availability",
)
async def database_health_check() -> ApiResponse[HealthResponse]:
    """Verify that the API can reach PostgreSQL using a read-only probe."""
    await check_database_connection()
    return success(HealthResponse(status="ok"))
