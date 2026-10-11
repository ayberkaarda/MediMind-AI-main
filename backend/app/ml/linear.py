"""Dependency-light linear softmax classifier used at serving time.

Training fits a scikit-learn ``LogisticRegression``; its learned parameters are
copied into :class:`LinearSoftmaxModel` so the API only needs numpy to score.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]


class LinearSoftmaxModel:
    """Multinomial linear model: ``softmax(X @ coef.T + intercept)``.

    Mirrors the parts of the scikit-learn classifier interface the API relies on:
    ``classes_``, ``n_features_in_``, ``predict_proba`` and ``predict``.
    """

    def __init__(self, coef: Any, intercept: Any, classes: Any) -> None:
        coef_arr = np.array(coef, dtype=np.float64)
        intercept_arr = np.array(intercept, dtype=np.float64).reshape(-1)
        classes_arr = np.array([str(c) for c in classes], dtype=object)
        if coef_arr.ndim != 2:
            raise ValueError(f"coef must be 2-dimensional, got shape {coef_arr.shape}")
        n_classes = len(classes_arr)
        if n_classes < 2:
            raise ValueError("At least two classes are required")
        if coef_arr.shape[0] != n_classes or intercept_arr.shape != (n_classes,):
            raise ValueError(
                f"Shape mismatch: coef {coef_arr.shape}, intercept {intercept_arr.shape}, "
                f"{n_classes} classes"
            )
        if not (np.all(np.isfinite(coef_arr)) and np.all(np.isfinite(intercept_arr))):
            raise ValueError("Model parameters must be finite")
        self.coef_: FloatArray = coef_arr
        self.intercept_: FloatArray = intercept_arr
        self.classes_: npt.NDArray[np.object_] = classes_arr
        self.n_features_in_: int = int(coef_arr.shape[1])

    @classmethod
    def from_sklearn(cls, estimator: Any) -> LinearSoftmaxModel:
        """Copy a fitted ``LogisticRegression`` by reading its learned attributes.

        A binary model stores a single row ``w``; ``sigmoid(z)`` equals the softmax
        of ``[0, z]``, so a zero row is prepended for the first class.
        """
        coef = np.asarray(estimator.coef_, dtype=np.float64)
        intercept = np.asarray(estimator.intercept_, dtype=np.float64).reshape(-1)
        classes = list(estimator.classes_)
        if len(classes) == 2 and coef.shape[0] == 1:
            coef = np.vstack([np.zeros_like(coef), coef])
            intercept = np.concatenate([np.zeros(1), intercept])
        return cls(coef, intercept, classes)

    def decision_function(self, x: Any) -> FloatArray:
        arr = np.asarray(x, dtype=np.float64)
        if arr.ndim != 2 or arr.shape[1] != self.n_features_in_:
            raise ValueError(f"Expected input of shape (n, {self.n_features_in_}), got {arr.shape}")
        scores: FloatArray = arr @ self.coef_.T + self.intercept_
        return scores

    def predict_proba(self, x: Any) -> FloatArray:
        scores = self.decision_function(x)
        scores -= scores.max(axis=1, keepdims=True)
        np.exp(scores, out=scores)
        scores /= scores.sum(axis=1, keepdims=True)
        return scores

    def predict(self, x: Any) -> npt.NDArray[np.object_]:
        labels: npt.NDArray[np.object_] = self.classes_[
            np.argmax(self.decision_function(x), axis=1)
        ]
        return labels
