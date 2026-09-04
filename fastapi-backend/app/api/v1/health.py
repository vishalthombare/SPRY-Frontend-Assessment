from fastapi import APIRouter

from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Check API availability")
async def health_check() -> HealthResponse:
    """Return application availability without exposing internal configuration."""
    return HealthResponse(status="ok")
