from __future__ import annotations

import csv

import numpy as np
import pytest

from app.core.paths import DATASET_PATH
from app.ml.preprocessing import (
    UnknownSymptomError,
    build_index,
    canonical_feature_names,
    feature_hash,
    normalize_disease,
    normalize_symptom,
    normalize_symptom_list,
    vectorize,
)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("itching", "itching"),
        (" skin_rash", "skin_rash"),
        ("spotting_ urination", "spotting_urination"),
        ("foul_smell_of urine", "foul_smell_of_urine"),
        ("dischromic _patches", "dischromic_patches"),
        ("foul_smell_ofurine", "foul_smell_of_urine"),
        ("dischromic__patches", "dischromic_patches"),
        ("abdominal pain", "abdominal_pain"),
        ("  Abdominal   Pain ", "abdominal_pain"),
        ("toxic_look_(typhos)", "toxic_look_(typhos)"),
        ("_back_pain_", "back_pain"),
    ],
)
def test_normalize_symptom(raw: str, expected: str) -> None:
    assert normalize_symptom(raw) == expected


def _raw_dataset_symptoms() -> set[str]:
    with DATASET_PATH.open(encoding="utf-8") as fh:
        reader = csv.reader(fh)
        next(reader)
        return {cell for row in reader for cell in row[1:] if cell.strip()}


def test_normalize_is_idempotent_on_dataset() -> None:
    for raw in _raw_dataset_symptoms():
        once = normalize_symptom(raw)
        assert normalize_symptom(once) == once
        assert " " not in once


def test_canonical_feature_names_dataset() -> None:
    names = canonical_feature_names(_raw_dataset_symptoms())
    assert len(names) == 131
    assert names == sorted(names)
    assert "dischromic_patches" in names
    assert "foul_smell_of_urine" in names
    assert "spotting_urination" in names


def test_canonical_feature_names_drops_blanks() -> None:
    assert canonical_feature_names(["b", " a", "", "  ", "a "]) == ["a", "b"]


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Diabetes ", "Diabetes"),
        ("(vertigo) Paroymsal  Positional Vertigo", "(vertigo) Paroymsal Positional Vertigo"),
        ("Dimorphic hemmorhoids(piles)", "Dimorphic hemorrhoids(piles)"),
    ],
)
def test_normalize_disease(raw: str, expected: str) -> None:
    assert normalize_disease(raw) == expected


def test_normalize_symptom_list_dedupes_and_keeps_order() -> None:
    assert normalize_symptom_list(["skin rash", "itching", "skin_rash", " "]) == [
        "skin_rash",
        "itching",
    ]


def test_vectorize() -> None:
    features = ["a", "b_c", "d"]
    row = vectorize(["b c", "a", "a"], features)
    assert row.dtype == np.uint8
    assert row.shape == (1, 3)
    assert row.tolist() == [[1, 1, 0]]
    assert vectorize(["d"], features, build_index(features)).tolist() == [[0, 0, 1]]


def test_vectorize_unknown() -> None:
    with pytest.raises(UnknownSymptomError) as info:
        vectorize(["a", "zzz", "yyy"], ["a"])
    assert info.value.unknown == ["zzz", "yyy"]


def test_feature_hash_is_order_sensitive() -> None:
    assert feature_hash(["a", "b"]) == feature_hash(["a", "b"])
    assert feature_hash(["a", "b"]) != feature_hash(["b", "a"])
    assert len(feature_hash(["a"])) == 64
