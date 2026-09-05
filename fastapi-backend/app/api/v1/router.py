"""Compose all version-one feature routers into a single API router."""

from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.modules.auth.router import router as auth_router
from app.modules.tasks.router import router as tasks_router

api_v1_router = APIRouter()
# Feature routers keep their own paths and business concerns isolated.
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(tasks_router)
