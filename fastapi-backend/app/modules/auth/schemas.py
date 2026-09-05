"""Validated authentication request and safe public response contracts."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    """Credentials accepted by the JSON login endpoint."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AuthenticatedUserResponse(BaseModel):
    """Safe authenticated-user fields returned to clients."""

    # from_attributes allows Pydantic to serialize a SQLAlchemy User directly.
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    is_superuser: bool
    created_date: datetime


class LoginResponse(BaseModel):
    """JWT and user details returned after successful authentication."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: AuthenticatedUserResponse


class RefreshRequest(BaseModel):
    """Refresh token supplied to renew a session."""

    refresh_token: str = Field(min_length=1)


class TokenResponse(BaseModel):
    """Rotated token pair returned by the refresh endpoint."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
