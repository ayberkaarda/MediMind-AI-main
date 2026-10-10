from __future__ import annotations

from fastapi import APIRouter, Response

from app.api.deps import Container
from app.schemas.symptoms import SymptomsResponse

router = APIRouter(tags=["symptoms"])

CACHE_CONTROL = "public, max-age=3600"


@router.get(
    "/symptoms",
    response_model=SymptomsResponse,
    summary="Symptom catalogue",
    description="All symptoms with Turkish labels, body region and dataset severity weight, "
    "sorted by Turkish label.",
)
def list_symptoms(container: Container, response: Response) -> SymptomsResponse:
    response.headers["Cache-Control"] = CACHE_CONTROL
    return container.symptoms.catalog()
