from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class DiseaseSummary(BaseModel):
    id: str
    name: str
    name_en: str


class DiseaseDetail(DiseaseSummary):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "fungal_infection",
                "name": "Mantar Enfeksiyonu",
                "name_en": "Fungal infection",
                "description": "...",
                "precautions": ["İki kez banyo yapmak"],
            }
        }
    )

    description: str | None
    precautions: list[str]


class DiseasesResponse(BaseModel):
    diseases: list[DiseaseSummary]
