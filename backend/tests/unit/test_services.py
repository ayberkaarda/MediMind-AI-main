from __future__ import annotations

from pathlib import Path

import pytest

from app.core.errors import NotFoundError
from app.ml.artifact import ModelArtifact
from app.ml.predictor import Predictor
from app.ml.preprocessing import disease_slug
from app.ml.registry import DataRegistry
from app.services.disease_service import DiseaseService
from app.services.prediction_service import PredictionService
from tests.conftest import make_settings


@pytest.mark.parametrize(
    ("name", "slug"),
    [
        ("Fungal infection", "fungal_infection"),
        ("Dimorphic hemmorhoids(piles)", "dimorphic_hemorrhoids_piles"),
        ("(vertigo) Paroymsal  Positional Vertigo", "vertigo_paroymsal_positional_vertigo"),
        ("Diabetes ", "diabetes"),
    ],
)
def test_disease_slug(name: str, slug: str) -> None:
    assert disease_slug(name) == slug


def test_disease_service_fallbacks(registry: DataRegistry) -> None:
    service = DiseaseService(registry)
    assert service.slug("Fungal infection") == "fungal_infection"
    assert service.name_for("fungal_infection") == "Mantar Enfeksiyonu"
    assert service.name_for("removed_disease") == "removed_disease"
    with pytest.raises(NotFoundError):
        service.get("removed_disease")


def test_disease_slugs_must_be_unique(registry: DataRegistry) -> None:
    with pytest.raises(ValueError, match="not unique"):
        DiseaseService(registry, ["Common Cold", "common cold"])


def test_confidence_labels(
    tmp_path: Path, registry: DataRegistry, real_artifact: ModelArtifact
) -> None:
    service = PredictionService(registry, Predictor(real_artifact), make_settings(tmp_path))
    assert service.confidence_label(0.6) == "high"
    assert service.confidence_label(0.3) == "medium"
    assert service.confidence_label(0.29) == "low"
    assert service.model_loaded is True


def test_severity_thresholds_come_from_settings(tmp_path: Path, registry: DataRegistry) -> None:
    settings = make_settings(tmp_path, severity_low_below=2.0, severity_moderate_below=3.0)
    service = PredictionService(registry, None, settings)
    assert service.model_loaded is False
    assert service.severity(["itching"]).level == "low"  # weight 1
    assert service.severity(["lethargy"]).level == "moderate"  # weight 2
    assert service.severity(["skin_rash"]).level == "high"  # weight 3
    assert service.severity([]).max_possible == 0
