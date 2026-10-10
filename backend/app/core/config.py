"""Application settings loaded from environment variables (prefix ``MEDIMIND_``)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app import __version__
from app.core.paths import BACKEND_DIR, DATA_DIR, MODELS_DIR

_SQLITE_PREFIX = "sqlite:///"


def resolve_sqlite_url(url: str, base: Path = BACKEND_DIR) -> str:
    """Make relative SQLite paths absolute against the backend directory."""
    if not url.startswith(_SQLITE_PREFIX) or url == "sqlite:///:memory:":
        return url
    raw = url[len(_SQLITE_PREFIX) :]
    path = Path(raw)
    if path.is_absolute() or raw.startswith("/"):
        return url
    return f"{_SQLITE_PREFIX}{(base / path).resolve().as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="MEDIMIND_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    app_version: str = __version__
    log_level: str = "INFO"
    log_format: Literal["json", "text"] = "text"
    database_url: str = "sqlite:///./data/medimind.db"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )
    data_dir: Path = DATA_DIR
    model_dir: Path = MODELS_DIR

    max_symptoms: int = Field(default=17, ge=1, le=131)
    top_k: int = Field(default=5, ge=1, le=41)
    min_prob: float = Field(default=0.01, ge=0.0, le=1.0)
    history_limit: int = Field(default=50, ge=1, le=500)

    # Thresholds on the mean dataset severity weight (scale 1..7). Not clinical triage.
    severity_low_below: float = 3.0
    severity_moderate_below: float = 5.0
    # Thresholds on the top model score; shown as a coarse label only.
    confidence_high_at: float = 0.6
    confidence_medium_at: float = 0.3

    @field_validator("database_url")
    @classmethod
    def _absolute_sqlite(cls, value: str) -> str:
        return resolve_sqlite_url(value)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
