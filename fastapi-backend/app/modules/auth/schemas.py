"""Validated authentication request and safe public response contracts."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

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

    # The literal value is the discriminator for the two possible login response shapes.
    requires_otp: Literal[False] = False
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: AuthenticatedUserResponse


class OtpChallengeResponse(BaseModel):
    """Temporary login result returned without JWTs when email verification is required."""

    # No access or refresh token is included until the submitted OTP is verified.
    requires_otp: Literal[True] = True
    challenge_id: UUID
    masked_email: str
    expires_in_seconds: int = Field(gt=0)


# Pydantic and Swagger use requires_otp to select and document the correct response model.
LoginResult = Annotated[LoginResponse | OtpChallengeResponse, Field(discriminator="requires_otp")]


class VerifyOtpRequest(BaseModel):
    """Challenge and six-digit code submitted to finish authentication."""

    challenge_id: UUID
    # Keeping the OTP as a string preserves leading zeroes such as "004281".
    otp: str = Field(pattern=r"^\d{6}$")


class VerifyOtpResponse(LoginResponse):
    """Authenticated token response issued only after successful OTP verification."""


class ResendOtpRequest(BaseModel):
    """Opaque challenge identifier requesting a replacement email code."""

    challenge_id: UUID


class ResendOtpResponse(BaseModel):
    """Replacement challenge metadata returned after an OTP resend."""

    challenge_id: UUID
    masked_email: str
    expires_in_seconds: int = Field(gt=0)
    resend_cooldown_seconds: int = Field(gt=0)


class RefreshRequest(BaseModel):
    """Refresh token supplied to renew a session."""

    refresh_token: str = Field(min_length=1)


class TokenResponse(BaseModel):
    """Rotated token pair returned by the refresh endpoint."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
