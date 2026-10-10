from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

MAX_REQUEST_ITEMS = 131
LEGACY_MAX_SYMPTOMS = 17

FUNGAL_EXAMPLE: list[Any] = ["itching", "skin_rash", "nodal_skin_eruptions", "dischromic_patches"]


class PredictRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"symptoms": FUNGAL_EXAMPLE}})

    symptoms: list[str] = Field(
        min_length=1,
        max_length=MAX_REQUEST_ITEMS,
        description="Symptom ids; legacy space separated names are accepted and normalised.",
    )


class InputEcho(BaseModel):
    symptoms: list[str]
    count: int


class TopPrediction(BaseModel):
    disease_id: str
    name: str
    name_en: str
    probability: float
    description: str | None
    precautions: list[str]


class PredictionItem(BaseModel):
    disease_id: str
    name: str
    probability: float


class Severity(BaseModel):
    score: int
    max_possible: int
    mean_weight: float
    level: Literal["low", "moderate", "high"]


class PredictResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "request_id": "6f1c2d0e9a8b4c7d8e9f0a1b2c3d4e5f",
                "analysis_id": 12,
                "model_version": "20261010-lr-59a12e81",
                "input": {"symptoms": FUNGAL_EXAMPLE, "count": 4},
                "top_prediction": {
                    "disease_id": "fungal_infection",
                    "name": "Mantar Enfeksiyonu",
                    "name_en": "Fungal infection",
                    "probability": 0.98,
                    "description": "...",
                    "precautions": ["İki kez banyo yapmak"],
                },
                "predictions": [
                    {
                        "disease_id": "fungal_infection",
                        "name": "Mantar Enfeksiyonu",
                        "probability": 0.98,
                    }
                ],
                "severity": {
                    "score": 14,
                    "max_possible": 28,
                    "mean_weight": 3.5,
                    "level": "moderate",
                },
                "confidence_label": "high",
                "disclaimer": True,
                "created_at": "2026-10-10T12:00:00Z",
            }
        }
    )

    request_id: str
    analysis_id: int | None
    model_version: str
    input: InputEcho
    top_prediction: TopPrediction
    predictions: list[PredictionItem]
    severity: Severity
    confidence_label: Literal["high", "medium", "low"]
    disclaimer: Literal[True] = True
    created_at: datetime


class LegacyPredictRequest(BaseModel):
    symptoms: list[str] = Field(min_length=1, max_length=LEGACY_MAX_SYMPTOMS)


class LegacyRankedDisease(BaseModel):
    name: str
    value: float
    disease_id: str


class LegacyPredictResponse(BaseModel):
    disease: str
    confidence: float
    description: str
    precautions: list[str]
    top_predictions: list[LegacyRankedDisease]
    disease_id: str
    symptoms: list[str]
    model_version: str
