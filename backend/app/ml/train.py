"""Training CLI: ``medimind-train --out <dir> [--model lr|rf]``.

The dataset repeats a small number of (symptom set, disease) combinations many
times, so rows are grouped by symptom set for every evaluation to keep
duplicates out of the test folds.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
import sys
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import partial
from pathlib import Path
from typing import Any

import numpy as np
import numpy.typing as npt
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import LeaveOneGroupOut, StratifiedGroupKFold, cross_val_predict

from app.core.paths import DATASET_PATH, MODEL_CARD_FILENAME, MODEL_FILENAME, SYMPTOMS_PATH
from app.ml.artifact import ModelArtifact, save_artifact
from app.ml.evaluate import align_proba, mean_std, summarize, top_k_accuracy
from app.ml.preprocessing import build_index, feature_hash, normalize_disease, normalize_symptom

C_GRID: tuple[float, ...] = (0.1, 0.3, 1.0, 3.0)
DEFAULT_FOLDS = 5
DEFAULT_SEED = 42
PERTURBATION_REPEATS = 3
RF_TREES = 200

Estimator = Any
EstimatorFactory = Callable[[], Estimator]


@dataclass(frozen=True)
class Dataset:
    X: npt.NDArray[np.uint8]
    y: npt.NDArray[np.object_]
    groups: npt.NDArray[np.intp]
    feature_names: list[str]
    classes: list[str]
    sha256: str

    @property
    def n_unique(self) -> int:
        return len(np.unique(self.groups))


def load_dataset(path: Path) -> Dataset:
    """Read the wide Kaggle CSV and build a binary feature matrix via melt."""
    df = pd.read_csv(path)
    symptom_cols = [c for c in df.columns if c.lower().startswith("symptom")]
    long = (
        df[symptom_cols]
        .reset_index(names="row")
        .melt(id_vars="row", value_name="symptom")
        .dropna(subset=["symptom"])
    )
    long["symptom"] = long["symptom"].astype(str).map(normalize_symptom)
    long = long[long["symptom"] != ""]
    feature_names = sorted(long["symptom"].unique().tolist())
    index = build_index(feature_names)

    X = np.zeros((len(df), len(feature_names)), dtype=np.uint8)
    X[long["row"].to_numpy(), long["symptom"].map(index).to_numpy()] = 1
    y = df["Disease"].astype(str).map(normalize_disease).to_numpy(dtype=object)

    keep = X.sum(axis=1) > 0
    X, y = X[keep], y[keep]
    _, groups = np.unique(X, axis=0, return_inverse=True)
    return Dataset(
        X=X,
        y=y,
        groups=groups.astype(np.intp).ravel(),
        feature_names=feature_names,
        classes=sorted(set(y.tolist())),
        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
    )


def make_estimator(kind: str, c: float = 1.0, seed: int = DEFAULT_SEED) -> Estimator:
    if kind == "lr":
        return LogisticRegression(C=c, max_iter=5000)
    if kind == "rf":
        return RandomForestClassifier(n_estimators=RF_TREES, random_state=seed, n_jobs=-1)
    raise ValueError(f"Unknown model type: {kind}")


def _perturbation_hits(
    estimator: Estimator,
    X_test: npt.NDArray[np.uint8],
    y_test: npt.NDArray[np.object_],
    classes: Sequence[str],
    rng: np.random.Generator,
) -> tuple[list[Any], npt.NDArray[np.float64]]:
    """Drop one random symptom from each distinct test combination and predict."""
    _, first = np.unique(X_test, axis=0, return_index=True)
    rows, labels = [], []
    for i in sorted(first):
        active = np.flatnonzero(X_test[i])
        if active.size < 2:
            continue
        for _ in range(PERTURBATION_REPEATS):
            row = X_test[i].copy()
            row[rng.choice(active)] = 0
            rows.append(row)
            labels.append(y_test[i])
    if not rows:
        return [], np.zeros((0, len(classes)))
    proba = estimator.predict_proba(np.vstack(rows))
    return labels, align_proba(proba, estimator.classes_, classes)


def grouped_cv(ds: Dataset, factory: EstimatorFactory, folds: int, seed: int) -> dict[str, Any]:
    """StratifiedGroupKFold evaluation plus perturbation robustness on held-out groups."""
    cv = StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=seed)
    rng = np.random.default_rng(seed)
    oof = np.zeros((len(ds.y), len(ds.classes)))
    per_fold: list[dict[str, float]] = []
    pert_labels: list[Any] = []
    pert_proba: list[npt.NDArray[np.float64]] = []
    for train_idx, test_idx in cv.split(ds.X, ds.y, ds.groups):
        estimator = factory()
        estimator.fit(ds.X[train_idx], ds.y[train_idx])
        proba = align_proba(estimator.predict_proba(ds.X[test_idx]), estimator.classes_, ds.classes)
        oof[test_idx] = proba
        per_fold.append(summarize(ds.y[test_idx], proba, ds.classes))
        labels, p = _perturbation_hits(estimator, ds.X[test_idx], ds.y[test_idx], ds.classes, rng)
        pert_labels.extend(labels)
        pert_proba.append(p)
    pooled = summarize(ds.y, oof, ds.classes)
    pert = np.vstack(pert_proba)
    return {
        "folds": folds,
        "per_fold": {k: mean_std([f[k] for f in per_fold]) for k in per_fold[0]},
        "pooled": {k: round(v, 4) for k, v in pooled.items()},
        "perturbation": {
            "description": "one random symptom removed from each held-out combination",
            "n": len(pert_labels),
            "top1": round(top_k_accuracy(pert_labels, pert, ds.classes, k=1), 4),
            "top3": round(top_k_accuracy(pert_labels, pert, ds.classes, k=3), 4),
        },
    }


def dedup_logo(ds: Dataset, factory: EstimatorFactory) -> dict[str, Any]:
    """Leave-one-group-out over the table of distinct (symptom set, disease) rows."""
    _, first = np.unique(ds.groups, return_index=True)
    X, y, groups = ds.X[first], ds.y[first], ds.groups[first]
    proba = cross_val_predict(
        factory(), X, y, groups=groups, cv=LeaveOneGroupOut(), method="predict_proba", n_jobs=-1
    )
    metrics = summarize(y, proba, ds.classes)
    return {
        "n_rows": len(y),
        **{k: round(metrics[k], 4) for k in ("accuracy", "macro_f1", "top3")},
    }


def select_c(
    ds: Dataset, folds: int, seed: int, grid: Sequence[float]
) -> tuple[float, list[dict[str, Any]]]:
    """Pick the LogisticRegression C with the lowest pooled grouped-CV log-loss."""
    results = []
    for c in grid:
        report = grouped_cv(ds, partial(make_estimator, "lr", c, seed), folds, seed)
        results.append({"C": c, "log_loss": report["pooled"]["log_loss"], "report": report})
        print(f"  C={c:<5} grouped-CV log-loss={report['pooled']['log_loss']:.4f}")
    best = min(results, key=lambda r: (r["log_loss"], r["C"]))
    return float(best["C"]), results


def _git_sha() -> str | None:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return out.stdout.strip() or None


def _evaluate_model(
    kind: str, ds: Dataset, folds: int, seed: int, c: float | None = None
) -> dict[str, Any]:
    def factory() -> Estimator:
        return make_estimator(kind, c if c is not None else 1.0, seed)

    cv_report = grouped_cv(ds, factory, folds, seed)
    return {"grouped_cv": cv_report, "dedup_logo": dedup_logo(ds, factory)}


def _comparison_row(report: dict[str, Any]) -> dict[str, float]:
    cv = report["grouped_cv"]
    return {
        "grouped_cv_macro_f1": cv["per_fold"]["macro_f1"]["mean"],
        "grouped_cv_top3": cv["per_fold"]["top3"]["mean"],
        "grouped_cv_log_loss": cv["pooled"]["log_loss"],
        "grouped_cv_brier": cv["pooled"]["brier"],
        "dedup_logo_macro_f1": report["dedup_logo"]["macro_f1"],
        "perturbation_top3": cv["perturbation"]["top3"],
    }


def train(
    dataset_path: Path,
    out_dir: Path,
    model: str = "lr",
    symptoms_out: Path | None = SYMPTOMS_PATH,
    folds: int = DEFAULT_FOLDS,
    seed: int = DEFAULT_SEED,
    c_grid: Sequence[float] = C_GRID,
    baseline: bool = True,
) -> dict[str, Any]:
    """Evaluate, fit on all rows and write artifact, model card and symptom list."""
    started = time.perf_counter()
    ds = load_dataset(dataset_path)
    print(
        f"Dataset: {len(ds.y)} rows, {ds.n_unique} distinct symptom sets, "
        f"{len(ds.feature_names)} symptoms, {len(ds.classes)} diseases"
    )

    reports: dict[str, dict[str, Any]] = {}
    c_search: list[dict[str, Any]] = []
    selected_c: float | None = None
    if model == "lr" or baseline:
        print("Selecting C for logistic regression (grouped CV log-loss):")
        selected_c, search = select_c(ds, folds, seed, c_grid)
        c_search = [{"C": r["C"], "log_loss": r["log_loss"]} for r in search]
        lr_cv = next(r["report"] for r in search if r["C"] == selected_c)
        reports["lr"] = {
            "grouped_cv": lr_cv,
            "dedup_logo": dedup_logo(ds, lambda: make_estimator("lr", selected_c, seed)),
        }
    if model == "rf" or baseline:
        print("Evaluating random forest baseline:")
        reports["rf"] = _evaluate_model("rf", ds, folds, seed)

    final_c = selected_c if model == "lr" and selected_c is not None else 1.0
    estimator = make_estimator(model, final_c, seed)
    estimator.fit(ds.X, ds.y)
    if model == "rf":
        estimator.set_params(n_jobs=None)

    trained_at = datetime.now(UTC).replace(microsecond=0)
    fhash = feature_hash(ds.feature_names)
    metadata = {
        "model_version": f"{trained_at:%Y%m%d}-{model}-{fhash[:8]}",
        "model_type": model,
        "trained_at": trained_at.isoformat(),
        "sklearn_version": sklearn.__version__,
        "python_version": platform.python_version(),
        "feature_hash": fhash,
        "dataset_sha256": ds.sha256,
        "n_train_rows": len(ds.y),
        "git_sha": _git_sha(),
        "hyperparameters": {"C": final_c} if model == "lr" else {"n_estimators": RF_TREES},
    }
    artifact = ModelArtifact(
        estimator=estimator,
        feature_names=tuple(ds.feature_names),
        classes=tuple(str(c) for c in estimator.classes_),
        metadata=metadata,
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = save_artifact(artifact, out_dir / MODEL_FILENAME)

    shipped = reports[model]
    card = {
        "model_version": metadata["model_version"],
        "model_type": model,
        "trained_at": metadata["trained_at"],
        "intended_use": (
            "Educational demo that ranks diseases from a symptom checklist. Not a diagnostic tool."
        ),
        "data": {
            "source": dataset_path.name,
            "dataset_sha256": ds.sha256,
            "n_rows": len(ds.y),
            "n_distinct_symptom_sets": ds.n_unique,
            "n_features": len(ds.feature_names),
            "n_classes": len(ds.classes),
            "feature_hash": fhash,
        },
        "config": {
            "folds": folds,
            "seed": seed,
            "c_grid": list(c_grid),
            "selected_C": selected_c,
            "perturbation_repeats": PERTURBATION_REPEATS,
            "rf_trees": RF_TREES,
        },
        "metrics": shipped,
        "c_search": c_search,
        "comparison": {name: _comparison_row(r) for name, r in reports.items()},
        "limitations": [
            "Synthetic-looking Kaggle dataset with ~304 distinct combinations.",
            "Scores are model outputs and not calibrated probabilities of disease.",
            "Severity weights come from the dataset and are not clinical triage.",
        ],
        "environment": {
            "sklearn_version": metadata["sklearn_version"],
            "python_version": metadata["python_version"],
            "git_sha": metadata["git_sha"],
        },
    }
    card_path = out_dir / MODEL_CARD_FILENAME
    _write_json(card_path, card)
    if symptoms_out is not None:
        _write_json(symptoms_out, {"feature_hash": fhash, "symptoms": ds.feature_names})

    _print_summary(card, model_path, card_path, time.perf_counter() - started)
    return card


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def _print_summary(card: dict[str, Any], model_path: Path, card_path: Path, seconds: float) -> None:
    cv = card["metrics"]["grouped_cv"]
    print(f"\nShipped model: {card['model_type']} (selected C={card['config']['selected_C']})")
    for key in ("accuracy", "macro_f1", "top3", "log_loss", "brier"):
        stat = cv["per_fold"][key]
        print(f"  grouped-CV {key:<9} {stat['mean']:.4f} +/- {stat['std']:.4f}")
    logo = card["metrics"]["dedup_logo"]
    print(
        f"  dedup-LOGO (n={logo['n_rows']}) accuracy={logo['accuracy']:.4f} "
        f"macro_f1={logo['macro_f1']:.4f} top3={logo['top3']:.4f}"
    )
    pert = cv["perturbation"]
    print(f"  perturbation (n={pert['n']}) top1={pert['top1']:.4f} top3={pert['top3']:.4f}")
    print("\nComparison:")
    header = ["model", *next(iter(card["comparison"].values())).keys()]
    print("  " + " | ".join(header))
    for name, row in card["comparison"].items():
        print("  " + " | ".join([name, *(f"{v:.4f}" for v in row.values())]))
    print(f"\nWrote {model_path} ({model_path.stat().st_size / 1024:.1f} KiB)")
    print(f"Wrote {card_path} ({card_path.stat().st_size / 1024:.1f} KiB)")
    print(f"Done in {seconds:.1f}s")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="medimind-train", description=__doc__)
    parser.add_argument("--out", type=Path, required=True, help="output directory")
    parser.add_argument("--model", choices=("lr", "rf"), default="lr")
    parser.add_argument("--dataset", type=Path, default=DATASET_PATH)
    parser.add_argument(
        "--symptoms-out",
        type=Path,
        default=SYMPTOMS_PATH,
        help="where to write the canonical symptom list (default: data/symptoms.json)",
    )
    parser.add_argument("--no-symptoms", action="store_true", help="do not write symptoms.json")
    parser.add_argument("--folds", type=int, default=DEFAULT_FOLDS)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--no-baseline", action="store_true", help="skip the comparison model")
    args = parser.parse_args(argv)

    if not args.dataset.is_file():
        print(f"Dataset not found: {args.dataset}", file=sys.stderr)
        return 2
    train(
        dataset_path=args.dataset,
        out_dir=args.out,
        model=args.model,
        symptoms_out=None if args.no_symptoms else args.symptoms_out,
        folds=args.folds,
        seed=args.seed,
        baseline=not args.no_baseline,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
