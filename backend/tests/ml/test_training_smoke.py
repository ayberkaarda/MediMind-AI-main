from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from app.ml import compare_artifacts
from app.ml.artifact import load_artifact
from app.ml.linear import LinearSoftmaxModel
from app.ml.predictor import Predictor
from app.ml.train import (
    C_GRID,
    load_dataset,
    main,
    make_estimator,
    most_frequent_c,
    perturb_rows,
)


def _train(tmp_path: Path, dataset: Path, *extra: str) -> Path:
    out = tmp_path / "out"
    code = main(
        [
            "--out",
            str(out),
            "--dataset",
            str(dataset),
            "--symptoms-out",
            str(tmp_path / "symptoms.json"),
            "--folds",
            "3",
            *extra,
        ]
    )
    assert code == 0
    return out


def test_load_dataset_normalizes(mini_dataset: Path) -> None:
    ds = load_dataset(mini_dataset)
    assert ds.X.shape == (36, 12)
    assert ds.n_unique == 18
    assert ds.classes == ["Common Cold", "Fungal infection", "Migraine"]
    assert "dischromic_patches" in ds.feature_names


def test_train_lr_with_baseline(tmp_path: Path, mini_dataset: Path) -> None:
    out = _train(tmp_path, mini_dataset, "--perturbation-repeats", "1")
    artifact = load_artifact(out / "disease_model.joblib")
    assert artifact.classes == ("Common Cold", "Fungal infection", "Migraine")
    assert artifact.metadata["model_type"] == "lr"
    assert artifact.metadata["hyperparameters"]["C"] in C_GRID
    # The random forest is a comparison baseline only; the artifact holds the linear model.
    assert type(artifact.estimator) is LinearSoftmaxModel

    card = json.loads((out / "model_card.json").read_text(encoding="utf-8"))
    assert set(card["comparison"]) == {"lr", "rf"}
    assert card["config"]["selected_C"] == artifact.metadata["hyperparameters"]["C"]
    assert card["config"]["selection"] == "nested_group_cv"
    assert len(card["config"]["outer_selected_C"]) == 3
    assert card["config"]["selected_C"] == most_frequent_c(card["config"]["outer_selected_C"])
    cv = card["metrics"]["grouped_cv"]
    assert {"accuracy", "macro_f1", "top3", "log_loss", "brier"} <= set(cv["per_fold"])
    for fold in cv["fold_details"]:
        assert set(fold["inner_log_loss"]) == {str(c) for c in C_GRID}
    # every distinct combination has >= 2 symptoms, one perturbed copy each
    assert cv["perturbation"]["n_combinations"] == 18
    assert cv["perturbation"]["n"] == 18
    assert card["metrics"]["dedup_logo"]["n_rows"] == 18

    symptoms = json.loads((tmp_path / "symptoms.json").read_text(encoding="utf-8"))
    assert symptoms["symptoms"] == list(artifact.feature_names)
    assert symptoms["feature_hash"] == artifact.feature_hash

    result = Predictor(artifact).predict(["headache", "stiff neck"])
    assert result.top.disease == "Migraine"


def test_retrain_and_compare(tmp_path: Path, mini_dataset: Path) -> None:
    base_out = _train(tmp_path / "base", mini_dataset, "--no-baseline", "--no-symptoms")
    new_out = _train(tmp_path / "new", mini_dataset, "--no-baseline", "--seed", "7")
    new_artifact = load_artifact(new_out / "disease_model.joblib")
    assert new_artifact.metadata["model_type"] == "lr"
    assert not (tmp_path / "base" / "symptoms.json").exists()

    base, new = base_out / "disease_model.joblib", new_out / "disease_model.joblib"
    assert compare_artifacts.compare(base, new, tolerance=1.0) == []
    assert compare_artifacts.main([str(base), str(new), "--tolerance", "1.0"]) == 0

    card_path = new_out / "model_card.json"
    card = json.loads(card_path.read_text(encoding="utf-8"))
    card["metrics"]["grouped_cv"]["per_fold"]["macro_f1"]["mean"] = -5.0
    card_path.write_text(json.dumps(card), encoding="utf-8")
    problems = compare_artifacts.compare(base, new)
    assert any("macro-F1 drift" in p for p in problems)
    assert compare_artifacts.main([str(base), str(new)]) == 1


def test_compare_detects_feature_and_class_changes(tmp_path: Path, mini_dataset: Path) -> None:
    full = _train(tmp_path / "a", mini_dataset, "--no-baseline", "--no-symptoms")
    reduced = tmp_path / "reduced.csv"
    lines = mini_dataset.read_text(encoding="utf-8").splitlines()
    reduced.write_text(
        "\n".join(line for line in lines if not line.startswith("Migraine")) + "\n",
        encoding="utf-8",
    )
    small = _train(tmp_path / "b", reduced, "--no-baseline", "--no-symptoms")
    problems = compare_artifacts.compare(
        full / "disease_model.joblib", small / "disease_model.joblib", tolerance=1.0
    )
    assert any("feature_hash" in p for p in problems)
    assert any("classes differ" in p for p in problems)


def test_missing_dataset(tmp_path: Path) -> None:
    assert main(["--out", str(tmp_path), "--dataset", str(tmp_path / "none.csv")]) == 2


def test_only_logistic_regression_can_be_shipped(tmp_path: Path, mini_dataset: Path) -> None:
    with pytest.raises(SystemExit):
        main(["--out", str(tmp_path), "--dataset", str(mini_dataset), "--model", "rf"])


def test_unknown_model_type() -> None:
    with pytest.raises(ValueError, match="Unknown model type"):
        make_estimator("svm")


def test_perturb_rows_removes_exactly_one_symptom(mini_dataset: Path) -> None:
    ds = load_dataset(mini_dataset)
    rows, sources = perturb_rows(ds.X, np.random.default_rng(0), repeats=2)
    distinct = {tuple(r) for r in ds.X.tolist() if sum(r) > 1}
    assert len(rows) == 2 * len(distinct)
    assert len(set(sources.tolist())) == len(distinct)
    for row, source in zip(rows, sources, strict=True):
        original = ds.X[source]
        assert int(original.sum()) - int(row.sum()) == 1
        assert np.all(row <= original)


def test_perturb_rows_skips_single_symptom_rows() -> None:
    X = np.array([[1, 0, 0], [0, 1, 0]], dtype=np.uint8)
    rows, sources = perturb_rows(X, np.random.default_rng(0))
    assert rows.shape == (0, 3)
    assert sources.shape == (0,)


def test_most_frequent_c() -> None:
    assert most_frequent_c([10.0, 3.0, 10.0]) == 10.0
    assert most_frequent_c([10.0, 3.0]) == 3.0
