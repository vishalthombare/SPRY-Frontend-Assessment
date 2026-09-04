from fastapi import APIRouter

from app.core.database import check_database_connection
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Check API availability")
async def health_check() -> HealthResponse:
    """Return application availability without exposing internal configuration."""
    return HealthResponse(status="ok")


@router.get(
    "/health/database",
    response_model=HealthResponse,
    summary="Check database availability",
)
async def database_health_check() -> HealthResponse:
    """Verify that the API can reach PostgreSQL using a read-only probe."""
    await check_database_connection()
    return HealthResponse(status="ok")
