from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from fastapi.testclient import TestClient
from sklearn.linear_model import LogisticRegression

from app.core.paths import DATA_DIR, MODEL_CARD_PATH, MODEL_PATH
from app.main import app
from app.ml.artifact import ModelArtifact, load_artifact
from app.ml.preprocessing import feature_hash
from app.ml.registry import DataRegistry

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def registry() -> DataRegistry:
    return DataRegistry.load(DATA_DIR)


@pytest.fixture(scope="session")
def real_artifact() -> ModelArtifact:
    return load_artifact(MODEL_PATH)


@pytest.fixture(scope="session")
def model_card() -> dict[str, Any]:
    card: dict[str, Any] = json.loads(MODEL_CARD_PATH.read_text(encoding="utf-8"))
    return card


@pytest.fixture(scope="session")
def tiny_artifact() -> ModelArtifact:
    """Three features, three classes; each class is identified by one feature."""
    features = ("alpha_sign", "beta_sign", "gamma_sign")
    X = np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]] * 4, dtype=np.uint8)
    y = np.array(["A", "B", "C"] * 4, dtype=object)
    estimator = LogisticRegression(C=10.0, max_iter=1000).fit(X, y)
    return ModelArtifact(
        estimator=estimator,
        feature_names=features,
        classes=tuple(str(c) for c in estimator.classes_),
        metadata={"model_version": "test", "feature_hash": feature_hash(features)},
    )


@pytest.fixture(scope="session")
def mini_dataset() -> Path:
    return FIXTURES / "mini_dataset.csv"


@pytest.fixture()
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
