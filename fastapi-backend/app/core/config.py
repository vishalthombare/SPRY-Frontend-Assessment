"""Typed application settings loaded from environment variables."""

from functools import lru_cache

from pydantic import Field, SecretStr, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings validated by Pydantic when the process starts."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SPRY Task Management API"
    app_env: str = "development"
    app_debug: bool = False
    app_timezone: str = "Asia/Kuala_Lumpur"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:4200"
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60
    jwt_refresh_expires_days: int = 7
    rate_limit_enabled: bool = True
    global_rate_limit: str = "100/minute"
    login_rate_limit: str = "5/15minutes"
    refresh_rate_limit: str = "20/minute"
    logout_rate_limit: str = "10/minute"
    task_write_rate_limit: str = "30/minute"
    # SecretStr prevents accidental disclosure when settings are printed or logged.
    resend_api_key: SecretStr = SecretStr("")
    email_from: str = ""
    otp_hash_secret: SecretStr = SecretStr("")
    # Numeric constraints fail configuration validation before invalid limits reach services.
    otp_expires_minutes: int = Field(default=5, ge=1)
    otp_max_attempts: int = Field(default=5, ge=1)
    otp_resend_cooldown_seconds: int = Field(default=60, ge=1)
    otp_max_resends: int = Field(default=3, ge=1)
    otp_verify_rate_limit: str = "5/5minutes"
    otp_resend_rate_limit: str = "3/hour"

    # @computed_field exposes derived URLs like normal validated settings fields.
    @computed_field
    @property
    def async_database_url(self) -> str:
        """Use the asyncpg driver even when a provider supplies a standard URL."""
        # Providers such as Neon commonly return `postgresql://`; the API uses asyncpg.
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.database_url

    @computed_field
    @property
    def sync_database_url(self) -> str:
        """Use psycopg for synchronous Alembic migration commands."""
        # Alembic runs synchronously, so it needs psycopg rather than asyncpg.
        url = self.database_url
        for scheme in ("postgresql+asyncpg://", "postgresql://"):
            if url.startswith(scheme):
                return url.replace(scheme, "postgresql+psycopg://", 1)
        return url

    @computed_field
    @property
    def cors_origin_list(self) -> list[str]:
        """Convert the comma-separated environment value into exact origins."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return one validated settings instance per application process."""
    # lru_cache prevents reparsing the .env file for every request.
    return Settings()
