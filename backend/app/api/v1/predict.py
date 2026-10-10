from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import Container, DbSession, OptionalClientId, RequestId
from app.db.models import utcnow
from app.schemas.common import problem
from app.schemas.predict import PredictRequest, PredictResponse

router = APIRouter(tags=["predict"])


@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Rank diseases for a set of symptoms",
    description=(
        "Returns model scores for the most likely diseases. Scores are model outputs, not "
        "probabilities of having a disease. When `X-Client-Id` is sent the analysis is stored "
        "in that client's history."
    ),
    responses={
        400: problem("Invalid X-Client-Id"),
        422: problem("Validation error or unknown symptom"),
        503: problem("Model not loaded"),
    },
)
def predict(
    payload: PredictRequest,
    container: Container,
    session: DbSession,
    client_id: OptionalClientId,
    request_id: RequestId,
) -> PredictResponse:
    outcome = container.predictions.predict(payload.symptoms)
    analysis_id: int | None = None
    created_at = utcnow()
    if client_id is not None:
        record = container.history.record(session, client_id, outcome)
        analysis_id, created_at = record.id, record.created_at
    return container.predictions.to_response(
        outcome, request_id=request_id, analysis_id=analysis_id, created_at=created_at
    )
