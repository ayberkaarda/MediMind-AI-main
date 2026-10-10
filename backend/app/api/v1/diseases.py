from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import Container
from app.schemas.common import problem
from app.schemas.diseases import DiseaseDetail, DiseasesResponse

router = APIRouter(tags=["diseases"])


@router.get("/diseases", response_model=DiseasesResponse, summary="List diseases")
def list_diseases(container: Container) -> DiseasesResponse:
    return container.diseases.all()


@router.get(
    "/diseases/{disease_id}",
    response_model=DiseaseDetail,
    summary="Disease details",
    responses={404: problem("Disease not found")},
)
def get_disease(disease_id: str, container: Container) -> DiseaseDetail:
    return container.diseases.get(disease_id)
