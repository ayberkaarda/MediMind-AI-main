from __future__ import annotations

import dataclasses
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pytest

from app.ml.artifact import (
    ArtifactError,
    ArtifactMismatchError,
    ModelArtifact,
    load_artifact,
    save_artifact,
    verify_artifact,
)
from app.ml.registry import DataRegistry


def test_roundtrip(tmp_path: Path, tiny_artifact: ModelArtifact) -> None:
    path = save_artifact(tiny_artifact, tmp_path / "nested" / "model.joblib")
    loaded = load_artifact(path)
    assert loaded.feature_names == tiny_artifact.feature_names
    assert loaded.classes == tiny_artifact.classes
    assert loaded.metadata == tiny_artifact.metadata
    assert loaded.model_version == "test"
    assert loaded.feature_hash == tiny_artifact.feature_hash
    raw = joblib.load(path)
    assert isinstance(raw, dict)
    assert raw["format_version"] == 1


def test_load_missing(tmp_path: Path) -> None:
    with pytest.raises(ArtifactError, match="not found"):
        load_artifact(tmp_path / "nope.joblib")


def test_load_legacy_estimator_is_rejected(tmp_path: Path, tiny_artifact: ModelArtifact) -> None:
    path = tmp_path / "legacy.joblib"
    joblib.dump(tiny_artifact.estimator, path)
    with pytest.raises(ArtifactError, match="not a MediMind artifact"):
        load_artifact(path)


def test_load_unreadable(tmp_path: Path) -> None:
    path = tmp_path / "broken.joblib"
    path.write_bytes(b"not a pickle")
    with pytest.raises(ArtifactError, match="Cannot read"):
        load_artifact(path)


def test_load_wrong_format_version(tmp_path: Path, tiny_artifact: ModelArtifact) -> None:
    path = save_artifact(tiny_artifact, tmp_path / "m.joblib")
    payload = joblib.load(path)
    payload["format_version"] = 99
    joblib.dump(payload, path)
    with pytest.raises(ArtifactError, match="Unsupported artifact format"):
        load_artifact(path)


def test_verify_real_artifact(real_artifact: ModelArtifact, registry: DataRegistry) -> None:
    assert verify_artifact(real_artifact, registry) == []
    assert real_artifact.metadata["feature_hash"] == real_artifact.feature_hash
    for key in ("model_version", "trained_at", "sklearn_version", "dataset_sha256", "model_type"):
        assert real_artifact.metadata[key]


def test_verify_feature_mismatch(tiny_artifact: ModelArtifact, registry: DataRegistry) -> None:
    with pytest.raises(ArtifactError, match="features do not match"):
        verify_artifact(tiny_artifact, registry)


def test_verify_hash_mismatch(real_artifact: ModelArtifact, registry: DataRegistry) -> None:
    broken = dataclasses.replace(
        real_artifact, metadata={**real_artifact.metadata, "feature_hash": "0" * 64}
    )
    with pytest.raises(ArtifactError, match="feature_hash"):
        verify_artifact(broken, registry)


def test_verify_classes_mismatch(real_artifact: ModelArtifact, registry: DataRegistry) -> None:
    broken = dataclasses.replace(real_artifact, classes=tuple(reversed(real_artifact.classes)))
    with pytest.raises(ArtifactError, match="classes"):
        verify_artifact(broken, registry)


def test_verify_warnings(real_artifact: ModelArtifact, registry: DataRegistry) -> None:
    partial = dataclasses.replace(
        registry,
        disease_labels={},
        descriptions={},
    )
    old = dataclasses.replace(
        real_artifact, metadata={**real_artifact.metadata, "sklearn_version": "0.1.0"}
    )
    warnings = verify_artifact(old, partial)
    assert any("Missing Turkish label" in w for w in warnings)
    assert any("Missing Turkish description" in w for w in warnings)
    assert any("scikit-learn 0.1.0" in w for w in warnings)


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("feature_names", None, "feature_names"),
        ("feature_names", ["a", 1], "feature_names"),
        ("feature_names", ["a", "a"], "duplicates"),
        ("classes", [], "is empty"),
        ("metadata", None, "metadata"),
    ],
)
def test_load_rejects_bad_field_types(
    tmp_path: Path, tiny_artifact: ModelArtifact, field: str, value: object, message: str
) -> None:
    path = save_artifact(tiny_artifact, tmp_path / "m.joblib")
    payload = joblib.load(path)
    payload[field] = value
    joblib.dump(payload, path)
    with pytest.raises(ArtifactError, match=message):
        load_artifact(path)


def test_feature_mismatch_is_mismatch_error(
    tiny_artifact: ModelArtifact, registry: DataRegistry
) -> None:
    with pytest.raises(ArtifactMismatchError):
        verify_artifact(tiny_artifact, registry)


class _FakeEstimator:
    def __init__(self, classes: tuple[str, ...], n_features: int, output: Any) -> None:
        self.classes_ = np.array(classes)
        self.n_features_in_ = n_features
        self._output = output

    def predict_proba(self, x: Any) -> Any:
        if isinstance(self._output, Exception):
            raise self._output
        return self._output


def _with_estimator(artifact: ModelArtifact, estimator: object) -> ModelArtifact:
    return dataclasses.replace(artifact, estimator=estimator)  # type: ignore[arg-type]


def test_verify_estimator_checks(real_artifact: ModelArtifact, registry: DataRegistry) -> None:
    classes, n = real_artifact.classes, len(real_artifact.feature_names)
    uniform = np.full((1, len(classes)), 1 / len(classes))
    cases: list[tuple[ModelArtifact, str]] = [
        (dataclasses.replace(real_artifact, classes=()), "no classes"),
        (_with_estimator(real_artifact, object()), "predict_proba"),
        (_with_estimator(real_artifact, _FakeEstimator(classes, 3, uniform)), "expects 3"),
        (
            _with_estimator(real_artifact, _FakeEstimator(classes, n, RuntimeError("boom"))),
            "sample input",
        ),
        (
            _with_estimator(real_artifact, _FakeEstimator(classes, n, np.ones((1, 2)))),
            "output shape",
        ),
        (
            _with_estimator(real_artifact, _FakeEstimator(classes, n, uniform * 2)),
            "probability distribution",
        ),
    ]
    for artifact, message in cases:
        with pytest.raises(ArtifactError, match=message) as info:
            verify_artifact(artifact, registry)
        assert not isinstance(info.value, ArtifactMismatchError)
    fine = _with_estimator(real_artifact, _FakeEstimator(classes, n, uniform))
    assert verify_artifact(fine, registry) == []
