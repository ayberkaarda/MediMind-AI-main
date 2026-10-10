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
    """Raised when an artifact is unreadable or incompatible with the data registry."""


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


def load_artifact(path: Path) -> ModelArtifact:
    if not path.is_file():
        raise ArtifactError(f"Model artifact not found: {path}")
    try:
        payload = joblib.load(path)
    except Exception as exc:
        raise ArtifactError(f"Cannot read model artifact {path}: {exc}") from exc
    if not isinstance(payload, dict) or any(k not in payload for k in REQUIRED_KEYS):
        raise ArtifactError(f"{path.name} is not a MediMind artifact (missing required keys)")
    if payload["format_version"] != FORMAT_VERSION:
        raise ArtifactError(
            f"Unsupported artifact format {payload['format_version']!r}, expected {FORMAT_VERSION}"
        )
    return ModelArtifact(
        estimator=payload["estimator"],
        feature_names=tuple(payload["feature_names"]),
        classes=tuple(payload["classes"]),
        metadata=dict(payload["metadata"]),
    )


def _minor(version: str) -> tuple[str, ...]:
    return tuple(version.split(".")[:2])


def verify_artifact(artifact: ModelArtifact, registry: DataRegistry) -> list[str]:
    """Check artifact/registry consistency.

    Raises ArtifactError on problems that would produce wrong predictions and
    returns a list of non-fatal warnings (also logged).
    """
    if tuple(artifact.feature_names) != tuple(registry.symptom_ids):
        missing = sorted(set(registry.symptom_ids) - set(artifact.feature_names))
        extra = sorted(set(artifact.feature_names) - set(registry.symptom_ids))
        raise ArtifactError(
            "Artifact features do not match data/symptoms.json "
            f"(missing={missing[:5]}, extra={extra[:5]}, order_or_count_differs=True)"
        )
    stored_hash = artifact.metadata.get("feature_hash")
    if stored_hash is not None and stored_hash != artifact.feature_hash:
        raise ArtifactError("Artifact feature_hash metadata does not match its feature names")
    estimator_classes = tuple(str(c) for c in getattr(artifact.estimator, "classes_", ()))
    if estimator_classes != artifact.classes:
        raise ArtifactError("Estimator classes_ do not match artifact classes")

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
