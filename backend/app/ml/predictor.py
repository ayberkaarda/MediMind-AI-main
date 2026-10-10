"""Framework independent prediction logic."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from app.ml.artifact import ModelArtifact
from app.ml.preprocessing import build_index, normalize_symptom_list, vectorize


@dataclass(frozen=True)
class Prediction:
    disease: str
    probability: float


@dataclass(frozen=True)
class PredictionResult:
    symptoms: tuple[str, ...]
    ranked: tuple[Prediction, ...]

    @property
    def top(self) -> Prediction:
        return self.ranked[0]

    def top_k(self, k: int, min_probability: float = 0.0) -> list[Prediction]:
        """Up to ``k`` best diseases with probability >= ``min_probability``.

        The highest ranked disease is always returned, even when it falls below
        the threshold, so callers never receive an empty ranking.
        """
        if k < 1:
            raise ValueError("k must be at least 1")
        selected = [p for p in self.ranked[:k] if p.probability >= min_probability]
        return selected or [self.ranked[0]]


class Predictor:
    def __init__(self, artifact: ModelArtifact) -> None:
        self._artifact = artifact
        self._index = build_index(artifact.feature_names)

    @property
    def artifact(self) -> ModelArtifact:
        return self._artifact

    def predict(self, symptoms: Iterable[str]) -> PredictionResult:
        """Rank all diseases for the given symptoms.

        Raises UnknownSymptomError for symptoms outside the feature space and
        ValueError when no symptom is given.
        """
        normalized = normalize_symptom_list(symptoms)
        if not normalized:
            raise ValueError("At least one symptom is required")
        row = vectorize(normalized, self._artifact.feature_names, self._index)
        probabilities = self._artifact.estimator.predict_proba(row)[0]
        ranked = sorted(
            (
                Prediction(disease=disease, probability=float(p))
                for disease, p in zip(self._artifact.classes, probabilities, strict=True)
            ),
            key=lambda pred: (-pred.probability, pred.disease),
        )
        return PredictionResult(symptoms=tuple(normalized), ranked=tuple(ranked))
