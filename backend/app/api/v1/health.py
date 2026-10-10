from __future__ import annotations

from fastapi import APIRouter, Response

from app.api.deps import Container
from app.db.session import check_db
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health",
    description="Reports model and database status. Returns 503 when degraded.",
    responses={503: {"model": HealthResponse, "description": "Degraded"}},
)
def health(container: Container, response: Response) -> HealthResponse:
    artifact = container.artifact
    meta = artifact.metadata if artifact else {}
    db_ok = check_db(container.engine)
    ok = artifact is not None and db_ok
    if not ok:
        response.status_code = 503
    return HealthResponse(
        status="ok" if ok else "degraded",
        model_loaded=artifact is not None,
        model_version=artifact.model_version if artifact else None,
        model_type=meta.get("model_type"),
        trained_at=meta.get("trained_at"),
        sklearn_version=meta.get("sklearn_version"),
        n_features=len(artifact.feature_names) if artifact else None,
        n_classes=len(artifact.classes) if artifact else None,
        db_ok=db_ok,
        app_version=container.settings.app_version,
    )
