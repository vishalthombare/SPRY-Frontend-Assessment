"""Public response contract shared by API and database health checks."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Public health-check response."""

    status: Literal["ok"]
