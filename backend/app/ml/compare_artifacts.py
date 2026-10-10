"""Compare a freshly trained artifact against the committed one.

Usage::

    python -m app.ml.compare_artifacts BASE.joblib NEW.joblib [--tolerance 0.02]

Fails when the feature space or class list differs, or when the grouped-CV
macro-F1 recorded in the neighbouring model cards drifts beyond the tolerance.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from app.core.paths import MODEL_CARD_FILENAME
from app.ml.artifact import load_artifact

DEFAULT_TOLERANCE = 0.02


def _card_macro_f1(artifact_path: Path) -> float:
    card_path = artifact_path.with_name(MODEL_CARD_FILENAME)
    card: dict[str, Any] = json.loads(card_path.read_text(encoding="utf-8"))
    return float(card["metrics"]["grouped_cv"]["per_fold"]["macro_f1"]["mean"])


def compare(base: Path, new: Path, tolerance: float = DEFAULT_TOLERANCE) -> list[str]:
    """Return a list of problems; empty means the artifacts are compatible."""
    a, b = load_artifact(base), load_artifact(new)
    problems: list[str] = []
    if a.feature_hash != b.feature_hash:
        problems.append(f"feature_hash differs: {a.feature_hash[:12]} != {b.feature_hash[:12]}")
    if a.classes != b.classes:
        changed = sorted(set(a.classes) ^ set(b.classes))
        problems.append(f"classes differ: {changed or 'order changed'}")
    f1_a, f1_b = _card_macro_f1(base), _card_macro_f1(new)
    if abs(f1_a - f1_b) > tolerance:
        problems.append(f"macro-F1 drift {f1_a:.4f} -> {f1_b:.4f} exceeds +/-{tolerance}")
    return problems


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Compare two MediMind model artifacts")
    parser.add_argument("base", type=Path)
    parser.add_argument("new", type=Path)
    parser.add_argument("--tolerance", type=float, default=DEFAULT_TOLERANCE)
    args = parser.parse_args(argv)
    problems = compare(args.base, args.new, args.tolerance)
    for problem in problems:
        print(f"FAIL: {problem}", file=sys.stderr)
    if not problems:
        print("OK: artifacts are compatible")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
