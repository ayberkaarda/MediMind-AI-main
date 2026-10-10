from __future__ import annotations

import math

import pytest

from app.ml.artifact import ModelArtifact
from app.ml.predictor import Prediction, PredictionResult, Predictor
from app.ml.preprocessing import UnknownSymptomError


def test_tiny_predictor_ranks_expected_class(tiny_artifact: ModelArtifact) -> None:
    result = Predictor(tiny_artifact).predict(["beta sign"])
    assert result.symptoms == ("beta_sign",)
    assert result.top.disease == "B"
    assert math.isclose(sum(p.probability for p in result.ranked), 1.0, rel_tol=1e-9)


def test_ranking_is_sorted_and_deterministic(real_artifact: ModelArtifact) -> None:
    predictor = Predictor(real_artifact)
    first = predictor.predict(["high_fever", "headache", "nausea"])
    second = predictor.predict(["nausea", "headache", "high_fever"])
    assert first.ranked == second.ranked
    probabilities = [p.probability for p in first.ranked]
    assert probabilities == sorted(probabilities, reverse=True)
    assert len(first.ranked) == 41


def test_top_k(real_artifact: ModelArtifact) -> None:
    result = Predictor(real_artifact).predict(["itching", "skin_rash"])
    assert len(result.top_k(3)) == 3
    assert all(p.probability > 0.01 for p in result.top_k(5, 0.01))
    # nothing reaches the threshold: the best candidate is still returned
    assert result.top_k(5, 1.0) == [result.top]


def test_legacy_spaced_input(real_artifact: ModelArtifact) -> None:
    predictor = Predictor(real_artifact)
    spaced = predictor.predict(["skin rash", "nodal skin eruptions", "itching"])
    canonical = predictor.predict(["skin_rash", "nodal_skin_eruptions", "itching"])
    assert spaced.ranked == canonical.ranked
    assert spaced.symptoms == canonical.symptoms


def test_unknown_symptom(real_artifact: ModelArtifact) -> None:
    with pytest.raises(UnknownSymptomError):
        Predictor(real_artifact).predict(["itching", "flying"])


def test_empty_input(real_artifact: ModelArtifact) -> None:
    with pytest.raises(ValueError, match="At least one"):
        Predictor(real_artifact).predict(["  "])


def test_top_k_threshold_is_inclusive() -> None:
    result = PredictionResult(
        symptoms=("a",),
        ranked=(Prediction("x", 0.5), Prediction("y", 0.3), Prediction("z", 0.2)),
    )
    assert [p.disease for p in result.top_k(3, 0.3)] == ["x", "y"]
    assert [p.disease for p in result.top_k(2, 0.0)] == ["x", "y"]
    assert [p.disease for p in result.top_k(3, 0.6)] == ["x"]
    with pytest.raises(ValueError, match="k must be"):
        result.top_k(0)
