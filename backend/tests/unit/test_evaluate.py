from __future__ import annotations

import math

import numpy as np
import pytest

from app.ml.evaluate import (
    accuracy,
    align_proba,
    brier_multiclass,
    log_loss,
    macro_f1,
    mean_std,
    summarize,
    top_k_accuracy,
)

CLASSES = ["a", "b", "c"]
Y = ["a", "b", "c", "a"]
PROBA = np.array(
    [
        [0.8, 0.1, 0.1],
        [0.2, 0.7, 0.1],
        [0.5, 0.1, 0.4],
        [0.6, 0.3, 0.1],
    ]
)


def test_basic_metrics() -> None:
    assert accuracy(Y, PROBA, CLASSES) == pytest.approx(0.75)
    assert top_k_accuracy(Y, PROBA, CLASSES, k=1) == pytest.approx(0.75)
    assert top_k_accuracy(Y, PROBA, CLASSES, k=2) == pytest.approx(1.0)
    assert 0.0 < macro_f1(Y, PROBA, CLASSES) < 1.0


def test_perfect_predictions() -> None:
    proba = np.eye(3)
    assert brier_multiclass(CLASSES, proba, CLASSES) == pytest.approx(0.0)
    assert log_loss(CLASSES, proba, CLASSES) < 1e-6
    assert macro_f1(CLASSES, proba, CLASSES) == pytest.approx(1.0)


def test_brier_worst_case() -> None:
    proba = np.array([[0.0, 1.0, 0.0]])
    assert brier_multiclass(["a"], proba, CLASSES) == pytest.approx(2.0)


def test_log_loss_uniform() -> None:
    proba = np.full((2, 3), 1 / 3)
    assert log_loss(["a", "b"], proba, CLASSES) == pytest.approx(math.log(3))


def test_align_proba_fills_missing_classes() -> None:
    proba = np.array([[0.25, 0.75]])
    aligned = align_proba(proba, ["c", "a"], CLASSES)
    assert aligned.tolist() == [[0.75, 0.0, 0.25]]


def test_summarize_and_mean_std() -> None:
    summary = summarize(Y, PROBA, CLASSES)
    assert set(summary) == {"accuracy", "macro_f1", "top3", "log_loss", "brier"}
    assert mean_std([1.0, 0.0]) == {"mean": 0.5, "std": 0.5}
