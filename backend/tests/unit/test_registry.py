from __future__ import annotations

import json
import shutil
from collections import Counter
from pathlib import Path

import pytest

from app.core.paths import DATA_DIR
from app.ml.artifact import ModelArtifact
from app.ml.registry import (
    DataRegistry,
    RegistryError,
    turkish_capitalize,
    turkish_lower,
    turkish_sort_key,
)

EXPECTED_REGIONS = ["head_neck", "chest", "abdomen", "back", "arms", "legs", "skin", "general"]


def test_symptom_count(registry: DataRegistry) -> None:
    assert len(registry.symptom_ids) == 131
    assert len(set(registry.symptom_ids)) == 131


def test_every_symptom_has_a_unique_turkish_label(registry: DataRegistry) -> None:
    labels = [registry.symptom_labels.get(s) for s in registry.symptom_ids]
    assert None not in labels
    duplicates = [label for label, n in Counter(labels).items() if n > 1]
    assert duplicates == []


def test_regions_cover_every_symptom_exactly_once(registry: DataRegistry) -> None:
    assert [r.id for r in registry.regions] == EXPECTED_REGIONS
    assert [r.order for r in registry.regions] == list(range(1, 9))
    assigned = [s for r in registry.regions for s in r.symptoms]
    assert len(assigned) == len(set(assigned)) == 131
    assert set(assigned) == set(registry.symptom_ids)
    assert set(registry.symptom_region) == set(registry.symptom_ids)
    assert registry.symptom_region["neck_pain"] == "head_neck"
    assert registry.symptom_region["back_pain"] == "back"
    assert registry.symptom_region["knee_pain"] == "legs"
    assert registry.symptom_region["brittle_nails"] == "arms"
    assert registry.symptom_region["spotting_urination"] == "abdomen"


def test_region_labels(registry: DataRegistry) -> None:
    labels = {r.id: r.label for r in registry.regions}
    assert labels["head_neck"] == "Baş ve boyun"
    assert labels["general"] == "Genel"
    assert {r.kind for r in registry.regions if r.id in ("skin", "general")} == {"other"}


def test_severity(registry: DataRegistry) -> None:
    assert set(registry.symptom_ids) <= set(registry.severity)
    assert "prognosis" not in registry.severity
    assert registry.severity["fluid_overload"] == 6  # first of two entries
    assert registry.severity["foul_smell_of_urine"] == 5
    assert all(1 <= w <= 7 for w in registry.severity.values())


def test_disease_tables_cover_all_classes(
    registry: DataRegistry, real_artifact: ModelArtifact
) -> None:
    assert len(real_artifact.classes) == 41
    missing = registry.missing_disease_info(real_artifact.classes)
    assert missing == {"label": [], "description": [], "precautions": []}
    assert registry.disease_label("Fungal infection") == "Mantar Enfeksiyonu"
    assert registry.disease_label("Dimorphic hemorrhoids(piles)") == "Hemoroid (Basur)"
    assert registry.precautions_for("Diabetes")


def test_fallbacks(registry: DataRegistry) -> None:
    assert registry.symptom_label("not_a_symptom") == "Not A Symptom"
    assert registry.disease_label("Unknown") == "Unknown"
    assert registry.description("Unknown") is None
    assert registry.precautions_for("Unknown") == ()


def test_precautions_are_capitalized(registry: DataRegistry) -> None:
    for items in registry.precautions.values():
        for item in items:
            assert item == item.strip()
            assert item[0] == turkish_capitalize(item[0])


def test_turkish_helpers() -> None:
    assert turkish_lower("IŞIK İzmir") == "ışık izmir"
    assert turkish_capitalize("ishal") == "İshal"
    assert turkish_capitalize("ılık su") == "Ilık su"
    assert turkish_capitalize("  ") == ""
    words = ["Dal", "Çay", "Cam", "Ödem", "Ozon", "İshal", "Isı"]
    assert sorted(words, key=turkish_sort_key) == [
        "Cam",
        "Çay",
        "Dal",
        "Isı",
        "İshal",
        "Ozon",
        "Ödem",
    ]


def _copy_data(tmp_path: Path) -> Path:
    target = tmp_path / "data"
    shutil.copytree(DATA_DIR, target, ignore=shutil.ignore_patterns("dataset.csv", "*.db"))
    return target


def test_duplicate_region_assignment_fails(tmp_path: Path) -> None:
    data = _copy_data(tmp_path)
    path = data / "body_regions.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload["regions"][0]["symptoms"].append("back_pain")
    path.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(RegistryError, match="exactly one region"):
        DataRegistry.load(data)


def test_missing_file_fails(tmp_path: Path) -> None:
    data = _copy_data(tmp_path)
    (data / "symptoms.json").unlink()
    with pytest.raises(RegistryError, match="Missing data file"):
        DataRegistry.load(data)


def test_non_canonical_symptoms_json_fails(tmp_path: Path) -> None:
    data = _copy_data(tmp_path)
    (data / "symptoms.json").write_text('{"symptoms": ["abdominal pain"]}', encoding="utf-8")
    with pytest.raises(RegistryError, match="canonical"):
        DataRegistry.load(data)


def test_invalid_severity_fails(tmp_path: Path) -> None:
    data = _copy_data(tmp_path)
    (data / "Symptom-severity.csv").write_text("Symptom,weight\nitching,high\n", encoding="utf-8")
    with pytest.raises(RegistryError, match="severity"):
        DataRegistry.load(data)
