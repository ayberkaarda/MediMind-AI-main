"""Read-only lookup tables used to present predictions.

All source files are parsed once at startup with the standard library so the
serving path does not depend on pandas.
"""

from __future__ import annotations

import csv
import json
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.ml.preprocessing import normalize_disease, normalize_symptom

SYMPTOMS_FILE = "symptoms.json"
SYMPTOM_LABELS_FILE = "symptoms_tr_map.json"
DISEASE_LABELS_FILE = "diseases_tr_map.json"
DESCRIPTIONS_FILE = "symptom_Description_TR.csv"
PRECAUTIONS_FILE = "symptom_precaution_TR.csv"
SEVERITY_FILE = "Symptom-severity.csv"
REGIONS_FILE = "body_regions.json"

_TR_ALPHABET = "abcçdefgğhıijklmnoöprsştuüvwxyz"
_TR_ORDER = {ch: i for i, ch in enumerate(_TR_ALPHABET)}
_TR_LOWER = str.maketrans({"I": "ı", "İ": "i"})
_TR_UPPER_FIRST = {"i": "İ", "ı": "I"}


class RegistryError(RuntimeError):
    """Raised when the data files are missing or inconsistent."""


def turkish_lower(text: str) -> str:
    return text.translate(_TR_LOWER).lower()


def turkish_sort_key(text: str) -> tuple[int, ...]:
    """Collation key following the Turkish alphabet; other characters sort last."""
    return tuple(_TR_ORDER.get(ch, 100 + ord(ch)) for ch in turkish_lower(text))


def turkish_capitalize(text: str) -> str:
    """Upper-case the first letter only, honouring dotted and dotless i."""
    text = text.strip()
    if not text:
        return text
    first = _TR_UPPER_FIRST.get(text[0], text[0].upper())
    return first + text[1:]


@dataclass(frozen=True)
class Region:
    id: str
    label: str
    order: int
    kind: str
    symptoms: tuple[str, ...]


@dataclass(frozen=True)
class DataRegistry:
    symptom_ids: tuple[str, ...]
    symptom_labels: Mapping[str, str]
    disease_labels: Mapping[str, str]
    descriptions: Mapping[str, str]
    precautions: Mapping[str, tuple[str, ...]]
    severity: Mapping[str, int]
    regions: tuple[Region, ...]
    symptom_region: Mapping[str, str]

    @classmethod
    def load(cls, data_dir: Path) -> DataRegistry:
        symptom_ids = tuple(_load_symptom_ids(data_dir / SYMPTOMS_FILE))
        regions = _load_regions(data_dir / REGIONS_FILE)
        return cls(
            symptom_ids=symptom_ids,
            symptom_labels=_load_symptom_labels(data_dir / SYMPTOM_LABELS_FILE),
            disease_labels=_load_disease_labels(data_dir / DISEASE_LABELS_FILE),
            descriptions=_load_descriptions(data_dir / DESCRIPTIONS_FILE),
            precautions=_load_precautions(data_dir / PRECAUTIONS_FILE),
            severity=_load_severity(data_dir / SEVERITY_FILE),
            regions=regions,
            symptom_region=_index_regions(regions, symptom_ids),
        )

    def symptom_label(self, symptom_id: str) -> str:
        return self.symptom_labels.get(symptom_id, symptom_id.replace("_", " ").title())

    def disease_label(self, disease: str) -> str:
        return self.disease_labels.get(disease, disease)

    def description(self, disease: str) -> str | None:
        return self.descriptions.get(disease)

    def precautions_for(self, disease: str) -> tuple[str, ...]:
        return self.precautions.get(disease, ())

    def missing_disease_info(self, diseases: tuple[str, ...]) -> dict[str, list[str]]:
        """Report diseases lacking a label, description or precautions."""
        return {
            "label": [d for d in diseases if d not in self.disease_labels],
            "description": [d for d in diseases if d not in self.descriptions],
            "precautions": [d for d in diseases if not self.precautions.get(d)],
        }


def _read_json(path: Path) -> Any:
    if not path.is_file():
        raise RegistryError(f"Missing data file: {path}")
    with path.open(encoding="utf-8-sig") as fh:
        return json.load(fh)


def _read_csv(path: Path) -> list[dict[str, str]]:
    if not path.is_file():
        raise RegistryError(f"Missing data file: {path}")
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def _load_symptom_ids(path: Path) -> list[str]:
    payload = _read_json(path)
    symptoms = payload.get("symptoms") if isinstance(payload, dict) else None
    if not isinstance(symptoms, list) or not symptoms:
        raise RegistryError(f"{path.name} must contain a non-empty 'symptoms' list")
    ids = [str(s) for s in symptoms]
    if len(set(ids)) != len(ids) or any(normalize_symptom(s) != s for s in ids):
        raise RegistryError(f"{path.name} must contain unique canonical symptom ids")
    return ids


def _load_symptom_labels(path: Path) -> dict[str, str]:
    labels: dict[str, str] = {}
    for key, value in _read_json(path).items():
        labels.setdefault(normalize_symptom(key), str(value).strip())
    return labels


def _load_disease_labels(path: Path) -> dict[str, str]:
    return {normalize_disease(k): str(v).strip() for k, v in _read_json(path).items()}


def _load_descriptions(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for row in _read_csv(path):
        disease = normalize_disease(row.get("Disease") or "")
        text = (row.get("Description") or "").strip()
        if disease and text:
            result.setdefault(disease, text)
    return result


def _load_precautions(path: Path) -> dict[str, tuple[str, ...]]:
    result: dict[str, tuple[str, ...]] = {}
    for row in _read_csv(path):
        disease = normalize_disease(row.get("Disease") or "")
        if not disease:
            continue
        items = [
            turkish_capitalize(value)
            for key, value in row.items()
            if key and key.startswith("Precaution") and value and value.strip()
        ]
        result.setdefault(disease, tuple(items))
    return result


def _load_severity(path: Path) -> dict[str, int]:
    result: dict[str, int] = {}
    for row in _read_csv(path):
        raw = (row.get("Symptom") or "").strip()
        if not raw or raw == "prognosis":
            continue
        try:
            weight = int((row.get("weight") or "").strip())
        except ValueError as exc:
            raise RegistryError(f"Invalid severity weight for {raw!r}") from exc
        # The source file lists some symptoms twice; the first entry wins.
        result.setdefault(normalize_symptom(raw), weight)
    return result


def _load_regions(path: Path) -> tuple[Region, ...]:
    payload = _read_json(path)
    regions = [
        Region(
            id=str(item["id"]),
            label=str(item["label"]),
            order=int(item["order"]),
            kind=str(item.get("kind", "body")),
            symptoms=tuple(normalize_symptom(s) for s in item.get("symptoms", [])),
        )
        for item in payload.get("regions", [])
    ]
    if not regions:
        raise RegistryError(f"{path.name} defines no regions")
    return tuple(sorted(regions, key=lambda r: r.order))


def _index_regions(regions: tuple[Region, ...], symptom_ids: tuple[str, ...]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    duplicates: set[str] = set()
    for region in regions:
        for symptom in region.symptoms:
            if symptom in mapping:
                duplicates.add(symptom)
            mapping[symptom] = region.id
    known = set(symptom_ids)
    unknown = sorted(set(mapping) - known)
    missing = sorted(known - set(mapping))
    if duplicates or unknown or missing:
        raise RegistryError(
            "body_regions.json must assign every symptom to exactly one region "
            f"(duplicates={sorted(duplicates)}, unknown={unknown}, missing={missing})"
        )
    return mapping
