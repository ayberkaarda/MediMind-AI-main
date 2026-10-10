"""Prediction use case: validation, model call, severity heuristic and response mapping."""

from __future__ import annotations

import logging
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from app.core.config import Settings
from app.core.errors import InvalidInputError, ModelNotLoadedError, UnknownSymptomsError
from app.ml.predictor import Prediction, Predictor
from app.ml.preprocessing import UnknownSymptomError, disease_slug, normalize_symptom_list
from app.ml.registry import DataRegistry
from app.schemas.predict import (
    InputEcho,
    LegacyPredictResponse,
    LegacyRankedDisease,
    PredictionItem,
    PredictResponse,
    Severity,
    TopPrediction,
)

logger = logging.getLogger("medimind.prediction")

MAX_SEVERITY_WEIGHT = 7
NO_DESCRIPTION = "Tanım bulunamadı."
ConfidenceLabel = Literal["high", "medium", "low"]
SeverityLevel = Literal["low", "moderate", "high"]


@dataclass(frozen=True)
class PredictionOutcome:
    symptoms: tuple[str, ...]
    top: Prediction
    predictions: tuple[Prediction, ...]
    severity: Severity
    confidence_label: ConfidenceLabel
    model_version: str


class PredictionService:
    def __init__(
        self, registry: DataRegistry, predictor: Predictor | None, settings: Settings
    ) -> None:
        self._registry = registry
        self._predictor = predictor
        self._settings = settings

    @property
    def model_loaded(self) -> bool:
        return self._predictor is not None

    def predict(self, raw_symptoms: Sequence[str]) -> PredictionOutcome:
        if self._predictor is None:
            raise ModelNotLoadedError("The prediction model is not loaded.")
        symptoms = normalize_symptom_list(raw_symptoms)
        if not symptoms:
            raise InvalidInputError(
                "At least one non-empty symptom is required.", code="empty_symptoms"
            )
        if len(symptoms) > self._settings.max_symptoms:
            raise InvalidInputError(
                f"At most {self._settings.max_symptoms} distinct symptoms are allowed.",
                code="too_many_symptoms",
            )
        try:
            result = self._predictor.predict(symptoms)
        except UnknownSymptomError as exc:
            raise UnknownSymptomsError(exc.unknown) from exc

        listed = result.top_k(self._settings.top_k, self._settings.min_prob)
        outcome = PredictionOutcome(
            symptoms=result.symptoms,
            top=result.top,
            predictions=tuple(listed),
            severity=self.severity(result.symptoms),
            confidence_label=self.confidence_label(result.top.probability),
            model_version=self._predictor.artifact.model_version,
        )
        logger.info(
            "prediction n_symptoms=%d top_disease_id=%s top_prob=%.4f",
            len(outcome.symptoms),
            disease_slug(outcome.top.disease),
            outcome.top.probability,
            extra={
                "event": "prediction",
                "n_symptoms": len(outcome.symptoms),
                "top_disease_id": disease_slug(outcome.top.disease),
                "top_prob": round(outcome.top.probability, 4),
            },
        )
        return outcome

    def severity(self, symptoms: Sequence[str]) -> Severity:
        """Dataset weight heuristic (1..7 per symptom); not a clinical triage score."""
        weights = [self._registry.severity.get(s, 0) for s in symptoms]
        score = sum(weights)
        mean = score / len(weights) if weights else 0.0
        level: SeverityLevel
        if mean < self._settings.severity_low_below:
            level = "low"
        elif mean < self._settings.severity_moderate_below:
            level = "moderate"
        else:
            level = "high"
        return Severity(
            score=score,
            max_possible=MAX_SEVERITY_WEIGHT * len(weights),
            mean_weight=round(mean, 2),
            level=level,
        )

    def confidence_label(self, probability: float) -> ConfidenceLabel:
        if probability >= self._settings.confidence_high_at:
            return "high"
        if probability >= self._settings.confidence_medium_at:
            return "medium"
        return "low"

    def to_response(
        self,
        outcome: PredictionOutcome,
        *,
        request_id: str,
        analysis_id: int | None,
        created_at: datetime,
    ) -> PredictResponse:
        registry = self._registry
        top = outcome.top
        return PredictResponse(
            request_id=request_id,
            analysis_id=analysis_id,
            model_version=outcome.model_version,
            input=InputEcho(symptoms=list(outcome.symptoms), count=len(outcome.symptoms)),
            top_prediction=TopPrediction(
                disease_id=disease_slug(top.disease),
                name=registry.disease_label(top.disease),
                name_en=top.disease,
                probability=top.probability,
                description=registry.description(top.disease),
                precautions=list(registry.precautions_for(top.disease)),
            ),
            predictions=[
                PredictionItem(
                    disease_id=disease_slug(p.disease),
                    name=registry.disease_label(p.disease),
                    probability=p.probability,
                )
                for p in outcome.predictions
            ],
            severity=outcome.severity,
            confidence_label=outcome.confidence_label,
            created_at=created_at,
        )

    def to_legacy(self, outcome: PredictionOutcome) -> LegacyPredictResponse:
        registry = self._registry
        top = outcome.top
        return LegacyPredictResponse(
            disease=registry.disease_label(top.disease),
            confidence=top.probability,
            description=registry.description(top.disease) or NO_DESCRIPTION,
            precautions=list(registry.precautions_for(top.disease)),
            top_predictions=[
                LegacyRankedDisease(
                    name=registry.disease_label(p.disease),
                    value=p.probability,
                    disease_id=p.disease,
                )
                for p in outcome.predictions
            ],
            disease_id=top.disease,
            symptoms=list(outcome.symptoms),
            model_version=outcome.model_version,
        )
