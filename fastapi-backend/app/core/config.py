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

    @computed_field
    @property
    def cors_origin_list(self) -> list[str]:
        """Convert the comma-separated environment value into exact origins."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return one validated settings instance per application process."""
    return Settings()
