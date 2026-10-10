"""Quality gate for the committed artifact and its model card."""

from __future__ import annotations

from typing import Any

from app.core.paths import MODEL_PATH
from app.ml.artifact import ModelArtifact
from app.ml.predictor import Predictor
from app.ml.registry import DataRegistry


def test_grouped_cv_macro_f1(model_card: dict[str, Any]) -> None:
    assert model_card["metrics"]["grouped_cv"]["per_fold"]["macro_f1"]["mean"] >= 0.9


def test_perturbation_top3(model_card: dict[str, Any]) -> None:
    assert model_card["metrics"]["grouped_cv"]["perturbation"]["top3"] >= 0.8


def test_card_contents(model_card: dict[str, Any], real_artifact: ModelArtifact) -> None:
    assert model_card["model_version"] == real_artifact.model_version
    assert model_card["model_type"] == "lr"
    assert set(model_card["comparison"]) == {"lr", "rf"}
    assert model_card["data"]["feature_hash"] == real_artifact.feature_hash
    assert model_card["data"]["n_distinct_symptom_sets"] == 304
    assert model_card["metrics"]["dedup_logo"]["n_rows"] == 304
    assert model_card["config"]["selected_C"] in model_card["config"]["c_grid"]


def test_artifact_is_small() -> None:
    assert MODEL_PATH.stat().st_size < 100 * 1024


def test_known_full_symptom_set(real_artifact: ModelArtifact, registry: DataRegistry) -> None:
    result = Predictor(real_artifact).predict(
        ["itching", "skin_rash", "nodal_skin_eruptions", "dischromic_patches"]
    )
    assert result.top.disease == "Fungal infection"
    assert registry.disease_label(result.top.disease) == "Mantar Enfeksiyonu"


def test_partial_input_is_not_saturated(real_artifact: ModelArtifact) -> None:
    result = Predictor(real_artifact).predict(["headache"])
    assert result.top.probability < 0.99
