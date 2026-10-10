from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "status": "ok",
                "model_loaded": True,
                "model_version": "20261010-lr-59a12e81",
                "model_type": "lr",
                "trained_at": "2026-10-10T17:40:37+00:00",
                "sklearn_version": "1.9.1",
                "n_features": 131,
                "n_classes": 41,
                "db_ok": True,
                "app_version": "0.2.0",
            }
        },
    )

    status: Literal["ok", "degraded"]
    model_loaded: bool
    model_version: str | None
    model_type: str | None
    trained_at: str | None
    sklearn_version: str | None
    n_features: int | None
    n_classes: int | None
    db_ok: bool
    app_version: str
