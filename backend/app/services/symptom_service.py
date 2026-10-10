"""Symptom catalogue built once from the data registry."""

from __future__ import annotations

from app.ml.registry import DataRegistry, turkish_sort_key
from app.schemas.symptoms import (
    RegionOut,
    SymptomOut,
    SymptomsResponse,
)


def english_label(symptom_id: str) -> str:
    return symptom_id.replace("_", " ").strip().capitalize()


class SymptomService:
    def __init__(self, registry: DataRegistry) -> None:
        self._registry = registry
        ordered = sorted(
            registry.symptom_ids,
            key=lambda sid: (turkish_sort_key(registry.symptom_label(sid)), sid),
        )
        regions = [
            RegionOut(id=r.id, label=r.label, order=r.order, kind=r.kind) for r in registry.regions
        ]
        self._catalog = SymptomsResponse(
            symptoms=[
                SymptomOut(
                    id=sid,
                    label=registry.symptom_label(sid),
                    label_en=english_label(sid),
                    region=registry.symptom_region[sid],
                    severity=registry.severity.get(sid),
                )
                for sid in ordered
            ],
            regions=regions,
        )

    def catalog(self) -> SymptomsResponse:
        return self._catalog
