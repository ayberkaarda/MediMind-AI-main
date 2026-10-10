"""Model artifact format: a single joblib file holding a plain dict.

Layout::

    {
        "format_version": 1,
        "estimator": <fitted sklearn classifier>,
        "feature_names": [...],
        "classes": [...],
        "metadata": {...},
    }
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

import joblib
import numpy as np
import numpy.typing as npt

from app.ml.preprocessing import feature_hash
from app.ml.registry import DataRegistry

FORMAT_VERSION = 1
REQUIRED_KEYS = ("format_version", "estimator", "feature_names", "classes", "metadata")

logger = logging.getLogger(__name__)


class Classifier(Protocol):
    classes_: Any

    def predict_proba(self, x: Any) -> npt.NDArray[np.float64]: ...


class ArtifactError(RuntimeError):
    """The artifact is unreadable or internally broken; the API runs in degraded mode."""


class ArtifactMismatchError(ArtifactError):
    """The artifact does not match the data registry; startup must fail."""


@dataclass(frozen=True)
class ModelArtifact:
    estimator: Classifier
    feature_names: tuple[str, ...]
    classes: tuple[str, ...]
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def feature_hash(self) -> str:
        return feature_hash(self.feature_names)

    @property
    def model_version(self) -> str:
        return str(self.metadata.get("model_version", "unknown"))


def save_artifact(artifact: ModelArtifact, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "format_version": FORMAT_VERSION,
        "estimator": artifact.estimator,
        "feature_names": list(artifact.feature_names),
        "classes": list(artifact.classes),
        "metadata": dict(artifact.metadata),
    }
    joblib.dump(payload, path, compress=3)
    return path


def _string_tuple(value: Any, name: str) -> tuple[str, ...]:
    if not isinstance(value, list | tuple) or not all(isinstance(v, str) for v in value):
        raise ArtifactError(f"Artifact field '{name}' must be a list of strings")
    if not value:
        raise ArtifactError(f"Artifact field '{name}' is empty")
    if len(set(value)) != len(value):
        raise ArtifactError(f"Artifact field '{name}' contains duplicates")
    return tuple(value)


def _parse_payload(payload: Any, source: str) -> ModelArtifact:
    if not isinstance(payload, dict) or any(k not in payload for k in REQUIRED_KEYS):
        raise ArtifactError(f"{source} is not a MediMind artifact (missing required keys)")
    if payload["format_version"] != FORMAT_VERSION:
        raise ArtifactError(
            f"Unsupported artifact format {payload['format_version']!r}, expected {FORMAT_VERSION}"
        )
    metadata = payload["metadata"]
    if not isinstance(metadata, dict):
        raise ArtifactError("Artifact field 'metadata' must be a mapping")
    return ModelArtifact(
        estimator=payload["estimator"],
        feature_names=_string_tuple(payload["feature_names"], "feature_names"),
        classes=_string_tuple(payload["classes"], "classes"),
        metadata=dict(metadata),
    )


def load_artifact(path: Path) -> ModelArtifact:
    """Load and structurally validate an artifact; every failure raises ArtifactError."""
    if not path.is_file():
        raise ArtifactError(f"Model artifact not found: {path}")
    try:
        payload = joblib.load(path)
    except Exception as exc:
        raise ArtifactError(f"Cannot read model artifact {path}: {exc}") from exc
    try:
        return _parse_payload(payload, path.name)
    except ArtifactError:
        raise
    except Exception as exc:
        raise ArtifactError(f"Invalid model artifact {path}: {exc}") from exc


def _minor(version: str) -> tuple[str, ...]:
    return tuple(version.split(".")[:2])


def _check_estimator(artifact: ModelArtifact) -> None:
    estimator = artifact.estimator
    if not artifact.classes:
        raise ArtifactError("Artifact has no classes")
    if not callable(getattr(estimator, "predict_proba", None)):
        raise ArtifactError("Estimator does not implement predict_proba")
    estimator_classes = tuple(str(c) for c in getattr(estimator, "classes_", ()))
    if estimator_classes != artifact.classes:
        raise ArtifactError("Estimator classes_ do not match artifact classes")
    n_features = len(artifact.feature_names)
    learned = getattr(estimator, "n_features_in_", None)
    if learned != n_features:
        raise ArtifactError(f"Estimator expects {learned} features, artifact lists {n_features}")
    try:
        sample = np.asarray(estimator.predict_proba(np.zeros((1, n_features), dtype=np.uint8)))
    except Exception as exc:
        raise ArtifactError(f"Estimator failed on a sample input: {exc}") from exc
    if sample.shape != (1, len(artifact.classes)):
        raise ArtifactError(f"Unexpected predict_proba output shape {sample.shape}")
    if not np.all(np.isfinite(sample)) or not np.isclose(sample.sum(), 1.0, atol=1e-6):
        raise ArtifactError("predict_proba output is not a probability distribution")


def verify_artifact(artifact: ModelArtifact, registry: DataRegistry) -> list[str]:
    """Check that the artifact is usable and consistent with the data registry.

    Raises ArtifactMismatchError when the feature space differs from the registry
    (startup must fail), ArtifactError when the estimator itself is unusable, and
    returns a list of non-fatal warnings (also logged).
    """
    if tuple(artifact.feature_names) != tuple(registry.symptom_ids):
        missing = sorted(set(registry.symptom_ids) - set(artifact.feature_names))
        extra = sorted(set(artifact.feature_names) - set(registry.symptom_ids))
        raise ArtifactMismatchError(
            "Artifact features do not match data/symptoms.json "
            f"(missing={missing[:5]}, extra={extra[:5]}, order_or_count_differs=True)"
        )
    stored_hash = artifact.metadata.get("feature_hash")
    if stored_hash is not None and stored_hash != artifact.feature_hash:
        raise ArtifactMismatchError(
            "Artifact feature_hash metadata does not match its feature names"
        )
    _check_estimator(artifact)

    warnings: list[str] = []
    for kind, diseases in registry.missing_disease_info(artifact.classes).items():
        if diseases:
            warnings.append(f"Missing Turkish {kind} for: {', '.join(diseases)}")

    trained_with = artifact.metadata.get("sklearn_version")
    if trained_with:
        import sklearn

        if _minor(str(trained_with)) != _minor(sklearn.__version__):
            warnings.append(
                f"Artifact trained with scikit-learn {trained_with}, running {sklearn.__version__}"
            )
    for message in warnings:
        logger.warning(message)
    return warnings
