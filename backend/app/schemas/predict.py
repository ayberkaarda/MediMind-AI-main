from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.common import UtcDatetime

MAX_REQUEST_ITEMS = 131
MAX_SYMPTOM_LENGTH = 64
# Symptom ids are snake_case; spaces (legacy form), parentheses and hyphens are tolerated.
SYMPTOM_PATTERN = r"^[A-Za-z0-9_ ()\-]+$"

SymptomInput = Annotated[
    str, StringConstraints(min_length=1, max_length=MAX_SYMPTOM_LENGTH, pattern=SYMPTOM_PATTERN)
]

FUNGAL_EXAMPLE: list[Any] = ["itching", "skin_rash", "nodal_skin_eruptions", "dischromic_patches"]


class PredictRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"symptoms": FUNGAL_EXAMPLE}})

    symptoms: list[SymptomInput] = Field(
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
                "model_version": "20261011-lr-59a12e81",
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
    predictions: list[PredictionItem] = Field(
        description=(
            "Up to top_k diseases whose score is at least min_prob, best first. "
            "The highest ranked disease is always included, even below min_prob."
        )
    )
    severity: Severity
    confidence_label: Literal["high", "medium", "low"]
    disclaimer: Literal[True] = True
    created_at: UtcDatetime
