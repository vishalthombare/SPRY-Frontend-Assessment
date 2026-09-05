from functools import lru_cache

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed application settings."""

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

    @computed_field
    @property
    def async_database_url(self) -> str:
        """Use the asyncpg driver even when a provider supplies a standard URL."""
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.database_url

    @computed_field
    @property
    def sync_database_url(self) -> str:
        """Use psycopg for synchronous Alembic migration commands."""
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
    return Settings()
