from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class HistoryItem(BaseModel):
    id: int
    created_at: datetime
    symptoms: list[str]
    top_disease_id: str
    top_disease_name: str
    probability: float
    severity_level: str
    model_version: str


class HistoryListResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {
                        "id": 12,
                        "created_at": "2026-10-10T12:00:00Z",
                        "symptoms": ["itching", "skin_rash"],
                        "top_disease_id": "fungal_infection",
                        "top_disease_name": "Mantar Enfeksiyonu",
                        "probability": 0.93,
                        "severity_level": "low",
                        "model_version": "20261010-lr-59a12e81",
                    }
                ],
                "total": 1,
            }
        }
    )

    items: list[HistoryItem]
    total: int
