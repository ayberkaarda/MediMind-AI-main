from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from fastapi.testclient import TestClient
from sklearn.linear_model import LogisticRegression

from app.core.config import Settings
from app.core.paths import DATA_DIR, MODEL_CARD_PATH, MODEL_PATH
from app.main import create_app
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


CLIENT_A = "11111111-1111-4111-8111-111111111111"
CLIENT_B = "22222222-2222-4222-8222-222222222222"


def make_settings(tmp_path: Path, **overrides: Any) -> Settings:
    values: dict[str, Any] = {
        "database_url": f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        "app_env": "test",
        "log_level": "WARNING",
        **overrides,
    }
    return Settings(_env_file=None, **values)


@pytest.fixture()
def settings(tmp_path: Path) -> Settings:
    return make_settings(tmp_path)


@pytest.fixture()
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture()
def client_id() -> str:
    return CLIENT_A
