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
from collections import Counter
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
from app.ml.evaluate import align_proba, log_loss, mean_std, summarize, top_k_accuracy
from app.ml.preprocessing import build_index, feature_hash, normalize_disease, normalize_symptom

C_GRID: tuple[float, ...] = (0.3, 1.0, 3.0, 10.0)
NOTES = (
    "The dataset is synthetic and nearly separable: even grouped cross-validation reaches 1.0. "
    "These metrics document the evaluation method; they do not discriminate between models."
)
DEFAULT_FOLDS = 5
DEFAULT_INNER_FOLDS = 3
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


def perturb_rows(
    X: npt.NDArray[np.uint8], rng: np.random.Generator, repeats: int = PERTURBATION_REPEATS
) -> tuple[npt.NDArray[np.uint8], npt.NDArray[np.intp]]:
    """Copies of each distinct row (with >= 2 symptoms) with exactly one symptom removed.

    Returns the perturbed rows and the index of the source row for each of them.
    """
    _, first = np.unique(X, axis=0, return_index=True)
    rows: list[npt.NDArray[np.uint8]] = []
    sources: list[int] = []
    for i in sorted(first.tolist()):
        active = np.flatnonzero(X[i])
        if active.size < 2:
            continue
        for _ in range(repeats):
            row = X[i].copy()
            row[rng.choice(active)] = 0
            rows.append(row)
            sources.append(i)
    if not rows:
        return np.zeros((0, X.shape[1]), dtype=np.uint8), np.zeros(0, dtype=np.intp)
    return np.vstack(rows), np.asarray(sources, dtype=np.intp)


FoldPlanner = Callable[[npt.NDArray[np.intp]], tuple[EstimatorFactory, dict[str, Any]]]


def _fixed(factory: EstimatorFactory) -> FoldPlanner:
    def plan(train_idx: npt.NDArray[np.intp]) -> tuple[EstimatorFactory, dict[str, Any]]:
        return factory, {}

    return plan


def inner_select_c(
    ds: Dataset,
    train_idx: npt.NDArray[np.intp],
    grid: Sequence[float],
    folds: int,
    seed: int,
) -> tuple[float, dict[str, float]]:
    """Choose C by pooled log-loss of a grouped CV run on the outer training part only."""
    X, y, groups = ds.X[train_idx], ds.y[train_idx], ds.groups[train_idx]
    cv = StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=seed)
    splits = list(cv.split(X, y, groups))
    losses: dict[str, float] = {}
    for c in grid:
        oof = np.zeros((len(y), len(ds.classes)))
        for tr, te in splits:
            estimator = make_estimator("lr", c, seed).fit(X[tr], y[tr])
            oof[te] = align_proba(estimator.predict_proba(X[te]), estimator.classes_, ds.classes)
        losses[str(c)] = round(log_loss(y, oof, ds.classes), 4)
    best = min(grid, key=lambda c: (losses[str(c)], c))
    return float(best), losses


def nested_lr_planner(
    ds: Dataset, grid: Sequence[float], inner_folds: int, seed: int
) -> FoldPlanner:
    def plan(train_idx: npt.NDArray[np.intp]) -> tuple[EstimatorFactory, dict[str, Any]]:
        c, losses = inner_select_c(ds, train_idx, grid, inner_folds, seed)
        return partial(make_estimator, "lr", c, seed), {"C": c, "inner_log_loss": losses}

    return plan


def grouped_cv(
    ds: Dataset,
    planner: FoldPlanner,
    folds: int,
    seed: int,
    repeats: int = PERTURBATION_REPEATS,
) -> dict[str, Any]:
    """Outer StratifiedGroupKFold evaluation plus perturbation robustness on held-out groups.

    ``planner`` receives the outer training indices and returns the estimator factory
    for that fold, so hyperparameters can be tuned without seeing the test groups.
    """
    cv = StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=seed)
    rng = np.random.default_rng(seed)
    oof = np.zeros((len(ds.y), len(ds.classes)))
    per_fold: list[dict[str, float]] = []
    fold_info: list[dict[str, Any]] = []
    pert_labels: list[Any] = []
    pert_proba: list[npt.NDArray[np.float64]] = []
    n_combinations = 0
    for fold, (train_idx, test_idx) in enumerate(cv.split(ds.X, ds.y, ds.groups)):
        factory, info = planner(train_idx)
        estimator = factory()
        estimator.fit(ds.X[train_idx], ds.y[train_idx])
        proba = align_proba(estimator.predict_proba(ds.X[test_idx]), estimator.classes_, ds.classes)
        oof[test_idx] = proba
        per_fold.append(summarize(ds.y[test_idx], proba, ds.classes))
        fold_info.append({"fold": fold, **info})

        X_test, y_test = ds.X[test_idx], ds.y[test_idx]
        rows, sources = perturb_rows(X_test, rng, repeats)
        n_combinations += len(set(sources.tolist()))
        if len(rows):
            pert_labels.extend(y_test[sources].tolist())
            pert_proba.append(
                align_proba(estimator.predict_proba(rows), estimator.classes_, ds.classes)
            )
    pooled = summarize(ds.y, oof, ds.classes)
    pert = np.vstack(pert_proba) if pert_proba else np.zeros((0, len(ds.classes)))
    return {
        "folds": folds,
        "per_fold": {k: mean_std([f[k] for f in per_fold]) for k in per_fold[0]},
        "pooled": {k: round(v, 4) for k, v in pooled.items()},
        "fold_details": fold_info,
        "perturbation": {
            "description": "exactly one random symptom removed from each held-out combination",
            "repeats": repeats,
            "n_combinations": n_combinations,
            "n": len(pert_labels),
            "top1": round(top_k_accuracy(pert_labels, pert, ds.classes, k=1), 4)
            if pert_labels
            else 0.0,
            "top3": round(top_k_accuracy(pert_labels, pert, ds.classes, k=3), 4)
            if pert_labels
            else 0.0,
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


def most_frequent_c(selected: Sequence[float]) -> float:
    """Most frequently selected C; ties go to the smaller (more regularised) value."""
    counts = Counter(selected)
    return float(min(counts, key=lambda c: (-counts[c], c)))


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
    inner_folds: int = DEFAULT_INNER_FOLDS,
    seed: int = DEFAULT_SEED,
    c_grid: Sequence[float] = C_GRID,
    baseline: bool = True,
    perturbation_repeats: int = PERTURBATION_REPEATS,
) -> dict[str, Any]:
    """Evaluate with nested grouped CV, fit on all rows, write artifact, card and symptom list."""
    started = time.perf_counter()
    ds = load_dataset(dataset_path)
    print(
        f"Dataset: {len(ds.y)} rows, {ds.n_unique} distinct symptom sets, "
        f"{len(ds.feature_names)} symptoms, {len(ds.classes)} diseases"
    )

    reports: dict[str, dict[str, Any]] = {}
    outer_cs: list[float] = []
    final_c: float | None = None
    if model == "lr" or baseline:
        print(
            f"Logistic regression: outer {folds}-fold grouped CV, "
            f"C chosen per outer fold by inner {inner_folds}-fold grouped CV log-loss"
        )
        cv_report = grouped_cv(
            ds, nested_lr_planner(ds, c_grid, inner_folds, seed), folds, seed, perturbation_repeats
        )
        outer_cs = [float(f["C"]) for f in cv_report["fold_details"]]
        for f in cv_report["fold_details"]:
            print(f"  outer fold {f['fold']}: C={f['C']} inner log-loss={f['inner_log_loss']}")
        final_c = most_frequent_c(outer_cs)
        reports["lr"] = {
            "grouped_cv": cv_report,
            "dedup_logo": dedup_logo(ds, partial(make_estimator, "lr", final_c, seed)),
        }
    if model == "rf" or baseline:
        print("Evaluating random forest baseline (same outer folds, no tuning)")
        rf_factory = partial(make_estimator, "rf", 1.0, seed)
        reports["rf"] = {
            "grouped_cv": grouped_cv(ds, _fixed(rf_factory), folds, seed, perturbation_repeats),
            "dedup_logo": dedup_logo(ds, rf_factory),
        }

    fit_c = final_c if model == "lr" and final_c is not None else 1.0
    estimator = make_estimator(model, fit_c, seed)
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
        "hyperparameters": {"C": fit_c} if model == "lr" else {"n_estimators": RF_TREES},
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
            "selection": "nested_group_cv",
            "folds": folds,
            "inner_folds": inner_folds,
            "seed": seed,
            "c_grid": list(c_grid),
            "outer_selected_C": outer_cs,
            "selected_C": final_c,
            "final_C_rule": "most frequent C across outer folds (ties: smaller C)",
            "perturbation_repeats": perturbation_repeats,
            "rf_trees": RF_TREES,
            "dedup_logo_note": "dedup-LOGO uses the final C; it is a secondary, non-nested view",
        },
        "metrics": shipped,
        "comparison": {name: _comparison_row(r) for name, r in reports.items()},
        "notes": NOTES,
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
    cfg = card["config"]
    print(
        f"\nShipped model: {card['model_type']} (selection={cfg['selection']}, "
        f"outer C={cfg['outer_selected_C']}, final C={cfg['selected_C']})"
    )
    for key in ("accuracy", "macro_f1", "top3", "log_loss", "brier"):
        stat = cv["per_fold"][key]
        print(f"  grouped-CV {key:<9} {stat['mean']:.4f} +/- {stat['std']:.4f}")
    logo = card["metrics"]["dedup_logo"]
    print(
        f"  dedup-LOGO (n={logo['n_rows']}) accuracy={logo['accuracy']:.4f} "
        f"macro_f1={logo['macro_f1']:.4f} top3={logo['top3']:.4f}"
    )
    pert = cv["perturbation"]
    print(
        f"  perturbation (combinations={pert['n_combinations']}, n={pert['n']}) "
        f"top1={pert['top1']:.4f} top3={pert['top3']:.4f}"
    )
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
    parser.add_argument("--folds", type=int, default=DEFAULT_FOLDS, help="outer grouped CV folds")
    parser.add_argument("--inner-folds", type=int, default=DEFAULT_INNER_FOLDS)
    parser.add_argument("--perturbation-repeats", type=int, default=PERTURBATION_REPEATS)
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
        inner_folds=args.inner_folds,
        perturbation_repeats=args.perturbation_repeats,
        seed=args.seed,
        baseline=not args.no_baseline,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
