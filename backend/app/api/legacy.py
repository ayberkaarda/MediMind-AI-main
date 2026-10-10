"""Deprecated unversioned routes kept for the previous frontend.

Success responses keep the original shape; errors keep the ``{"detail": ...}`` body.
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.api.deps import Container
from app.core.errors import AppError, ModelNotLoadedError, UnknownSymptomsError
from app.schemas.predict import LegacyPredictRequest, LegacyPredictResponse
from app.schemas.symptoms import LegacySymptomsResponse

router = APIRouter(tags=["legacy"], deprecated=True)


@router.get("/symptoms", response_model=LegacySymptomsResponse, summary="Use /api/v1/symptoms")
def legacy_symptoms(container: Container) -> LegacySymptomsResponse:
    return container.symptoms.legacy_catalog()


@router.post(
    "/predict",
    response_model=LegacyPredictResponse,
    summary="Use /api/v1/predict",
    responses={422: {"description": "Invalid input"}, 503: {"description": "Model not loaded"}},
)
def legacy_predict(
    payload: LegacyPredictRequest, container: Container
) -> LegacyPredictResponse | JSONResponse:
    try:
        outcome = container.predictions.predict(payload.symptoms)
    except ModelNotLoadedError:
        return JSONResponse({"detail": "Model not loaded"}, status_code=503)
    except UnknownSymptomsError as exc:
        return JSONResponse(
            {"detail": {"code": exc.code, "unknown": exc.unknown}}, status_code=exc.status
        )
    except AppError as exc:
        return JSONResponse(
            {"detail": {"code": exc.code, "message": exc.detail}}, status_code=exc.status
        )
    return container.predictions.to_legacy(outcome)
