from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class SymptomOut(BaseModel):
    id: str
    label: str
    label_en: str
    region: str
    severity: int | None


class RegionOut(BaseModel):
    id: str
    label: str
    order: int
    kind: str


class SymptomsResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "symptoms": [
                    {
                        "id": "abdominal_pain",
                        "label": "Karın Ağrısı",
                        "label_en": "Abdominal pain",
                        "region": "abdomen",
                        "severity": 4,
                    }
                ],
                "regions": [{"id": "abdomen", "label": "Karın", "order": 3, "kind": "body"}],
            }
        }
    )

    symptoms: list[SymptomOut]
    regions: list[RegionOut]


class LegacySymptom(BaseModel):
    label: str
    value: str
    id: str
    region: str
    severity: int | None


class LegacySymptomsResponse(BaseModel):
    symptoms: list[LegacySymptom]
    regions: list[RegionOut]
