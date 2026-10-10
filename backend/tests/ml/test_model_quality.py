"""Quality gate for the committed artifact and its model card.

Metrics are recomputed from the artifact itself so a stale card cannot pass alone.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pytest

from app.core.paths import DATASET_PATH, MODEL_PATH
from app.ml.artifact import ModelArtifact
from app.ml.evaluate import top_k_accuracy
from app.ml.predictor import Predictor
from app.ml.registry import DataRegistry
from app.ml.train import Dataset, load_dataset, perturb_rows

TOLERANCE = 0.05


@pytest.fixture(scope="module")
def dedup(real_artifact: ModelArtifact) -> Dataset:
    ds = load_dataset(DATASET_PATH)
    assert tuple(ds.feature_names) == real_artifact.feature_names
    _, first = np.unique(ds.groups, return_index=True)
    return Dataset(
        X=ds.X[first],
        y=ds.y[first],
        groups=ds.groups[first],
        feature_names=ds.feature_names,
        classes=ds.classes,
        sha256=ds.sha256,
    )


def _cv(card: dict[str, Any]) -> dict[str, Any]:
    cv: dict[str, Any] = card["metrics"]["grouped_cv"]
    return cv


def test_card_thresholds(model_card: dict[str, Any]) -> None:
    assert _cv(model_card)["per_fold"]["macro_f1"]["mean"] >= 0.9
    assert _cv(model_card)["perturbation"]["top3"] >= 0.8


def test_recomputed_ranking_matches_card(
    real_artifact: ModelArtifact, model_card: dict[str, Any], dedup: Dataset
) -> None:
    proba = real_artifact.estimator.predict_proba(dedup.X)
    classes = list(real_artifact.classes)
    top1 = top_k_accuracy(dedup.y, proba, classes, k=1)
    top3 = top_k_accuracy(dedup.y, proba, classes, k=3)
    assert len(dedup.y) == 304
    assert top1 == pytest.approx(_cv(model_card)["per_fold"]["accuracy"]["mean"], abs=TOLERANCE)
    assert top3 == pytest.approx(_cv(model_card)["per_fold"]["top3"]["mean"], abs=TOLERANCE)


def test_recomputed_perturbation_matches_card(
    real_artifact: ModelArtifact, model_card: dict[str, Any], dedup: Dataset
) -> None:
    rows, sources = perturb_rows(dedup.X, np.random.default_rng(42), repeats=3)
    proba = real_artifact.estimator.predict_proba(rows)
    top3 = top_k_accuracy(dedup.y[sources], proba, list(real_artifact.classes), k=3)
    assert top3 >= 0.8
    assert top3 == pytest.approx(_cv(model_card)["perturbation"]["top3"], abs=TOLERANCE)


def test_card_matches_artifact(model_card: dict[str, Any], real_artifact: ModelArtifact) -> None:
    assert model_card["data"]["feature_hash"] == real_artifact.feature_hash
    assert model_card["data"]["feature_hash"] == real_artifact.metadata["feature_hash"]
    assert model_card["model_version"] == real_artifact.model_version
    assert model_card["data"]["dataset_sha256"] == real_artifact.metadata["dataset_sha256"]
    assert model_card["config"]["selected_C"] == real_artifact.metadata["hyperparameters"]["C"]
    assert model_card["config"]["selection"] == "nested_group_cv"
    assert model_card["model_type"] == "lr"
    assert set(model_card["comparison"]) == {"lr", "rf"}
    assert model_card["data"]["n_distinct_symptom_sets"] == 304
    assert model_card["metrics"]["dedup_logo"]["n_rows"] == 304


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
