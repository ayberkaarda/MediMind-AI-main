from __future__ import annotations

import ast
from pathlib import Path

import numpy as np
import pytest

from app.ml.linear import LinearSoftmaxModel

APP_DIR = Path(__file__).resolve().parents[2] / "app"
TRAINING_ONLY = {APP_DIR / "ml" / "train.py", APP_DIR / "ml" / "evaluate.py"}
TRAINING_LIBRARIES = {"sklearn", "pandas", "scipy"}


def _synthetic(n_classes: int, seed: int = 0) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    X = rng.integers(0, 2, size=(120, 8)).astype(np.uint8)
    weights = rng.normal(size=(8, n_classes))
    labels = np.array([f"class_{i}" for i in range(n_classes)], dtype=object)
    y = labels[np.argmax(X @ weights + rng.normal(scale=0.5, size=(120, n_classes)), axis=1)]
    return X, y


@pytest.mark.parametrize("n_classes", [2, 4])
def test_matches_sklearn_logistic_regression(n_classes: int) -> None:
    linear_model = pytest.importorskip("sklearn.linear_model")
    X, y = _synthetic(n_classes)
    fitted = linear_model.LogisticRegression(C=3.0, max_iter=5000).fit(X, y)
    model = LinearSoftmaxModel.from_sklearn(fitted)

    probe = np.vstack([X, np.random.default_rng(1).integers(0, 2, size=(30, 8))])
    np.testing.assert_allclose(
        model.predict_proba(probe), fitted.predict_proba(probe), rtol=0, atol=1e-9
    )
    assert list(model.predict(probe)) == list(fitted.predict(probe))
    assert list(model.classes_) == list(fitted.classes_)
    assert model.n_features_in_ == fitted.n_features_in_ == 8
    assert model.coef_.shape == (n_classes, 8)
    assert model.intercept_.shape == (n_classes,)


def test_predict_proba_is_stable_for_large_scores() -> None:
    model = LinearSoftmaxModel(coef=[[1000.0], [-1000.0]], intercept=[0.0, 0.0], classes="ab")
    proba = model.predict_proba([[5.0], [-5.0]])
    assert np.all(np.isfinite(proba))
    np.testing.assert_allclose(proba, [[1.0, 0.0], [0.0, 1.0]])
    assert list(model.predict([[5.0], [-5.0]])) == ["a", "b"]


@pytest.mark.parametrize(
    ("coef", "intercept", "classes", "message"),
    [
        ([1.0, 2.0], [0.0, 0.0], "ab", "2-dimensional"),
        ([[1.0]], [0.0], "a", "two classes"),
        ([[1.0], [2.0]], [0.0], "ab", "Shape mismatch"),
        ([[np.nan], [2.0]], [0.0, 0.0], "ab", "finite"),
    ],
)
def test_rejects_invalid_parameters(
    coef: object, intercept: object, classes: str, message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        LinearSoftmaxModel(coef=coef, intercept=intercept, classes=classes)


def test_rejects_wrong_input_width() -> None:
    model = LinearSoftmaxModel(coef=np.eye(3), intercept=np.zeros(3), classes="abc")
    with pytest.raises(ValueError, match=r"shape \(n, 3\)"):
        model.predict_proba(np.zeros((1, 2)))


def _imported_modules(path: Path) -> set[str]:
    modules: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            modules.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            modules.add(node.module.split(".")[0])
    return modules


def test_serving_code_does_not_import_training_libraries() -> None:
    offenders = {
        str(path.relative_to(APP_DIR)): sorted(
            _imported_modules(path) & {"sklearn", "pandas", "scipy"}
        )
        for path in APP_DIR.rglob("*.py")
        if path not in TRAINING_ONLY
    }
    assert {name: mods for name, mods in offenders.items() if mods} == {}
