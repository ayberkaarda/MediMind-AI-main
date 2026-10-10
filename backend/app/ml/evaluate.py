"""Evaluation metrics for probabilistic multi-class classifiers."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import numpy as np
import numpy.typing as npt
from sklearn.metrics import accuracy_score, f1_score
from sklearn.metrics import log_loss as sk_log_loss

FloatArray = npt.NDArray[np.float64]
Labels = Sequence[Any] | npt.NDArray[Any]


def align_proba(
    proba: FloatArray, model_classes: Sequence[Any], classes: Sequence[Any]
) -> FloatArray:
    """Reorder probability columns to `classes`, filling classes unseen in training with 0."""
    position = {c: i for i, c in enumerate(classes)}
    out = np.zeros((proba.shape[0], len(classes)), dtype=np.float64)
    for j, cls in enumerate(model_classes):
        out[:, position[cls]] = proba[:, j]
    return out


def _label_indices(y_true: Labels, classes: Sequence[Any]) -> npt.NDArray[np.intp]:
    position = {c: i for i, c in enumerate(classes)}
    return np.array([position[y] for y in y_true], dtype=np.intp)


def accuracy(y_true: Labels, proba: FloatArray, classes: Sequence[Any]) -> float:
    pred = np.asarray(classes, dtype=object)[np.argmax(proba, axis=1)]
    return float(accuracy_score(np.asarray(y_true, dtype=object), pred))


def macro_f1(y_true: Labels, proba: FloatArray, classes: Sequence[Any]) -> float:
    pred = np.asarray(classes, dtype=object)[np.argmax(proba, axis=1)]
    return float(
        f1_score(
            np.asarray(y_true, dtype=object),
            pred,
            labels=sorted(set(np.asarray(y_true, dtype=object).tolist()) | set(pred.tolist())),
            average="macro",
            zero_division=0,
        )
    )


def top_k_accuracy(y_true: Labels, proba: FloatArray, classes: Sequence[Any], k: int = 3) -> float:
    idx = _label_indices(y_true, classes)
    top = np.argsort(-proba, axis=1, kind="stable")[:, :k]
    return float(np.mean(np.any(top == idx[:, None], axis=1)))


def log_loss(y_true: Labels, proba: FloatArray, classes: Sequence[Any]) -> float:
    clipped = np.clip(proba, 1e-15, 1.0)
    clipped = clipped / clipped.sum(axis=1, keepdims=True)
    return float(sk_log_loss(_label_indices(y_true, classes), clipped, labels=range(len(classes))))


def brier_multiclass(y_true: Labels, proba: FloatArray, classes: Sequence[Any]) -> float:
    """Mean over samples of the squared error summed over classes (range 0..2)."""
    onehot = np.zeros_like(proba)
    onehot[np.arange(len(proba)), _label_indices(y_true, classes)] = 1.0
    return float(np.mean(np.sum((proba - onehot) ** 2, axis=1)))


def summarize(y_true: Labels, proba: FloatArray, classes: Sequence[Any]) -> dict[str, float]:
    return {
        "accuracy": accuracy(y_true, proba, classes),
        "macro_f1": macro_f1(y_true, proba, classes),
        "top3": top_k_accuracy(y_true, proba, classes, k=3),
        "log_loss": log_loss(y_true, proba, classes),
        "brier": brier_multiclass(y_true, proba, classes),
    }


def mean_std(values: Sequence[float]) -> dict[str, float]:
    arr = np.asarray(values, dtype=np.float64)
    return {"mean": round(float(arr.mean()), 4), "std": round(float(arr.std()), 4)}
