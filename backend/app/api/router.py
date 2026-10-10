from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import diseases, health, history, predict, symptoms
from app.schemas.common import VALIDATION_RESPONSES

API_V1_PREFIX = "/api/v1"

api_router = APIRouter(prefix=API_V1_PREFIX, responses=VALIDATION_RESPONSES)
api_router.include_router(health.router)
api_router.include_router(symptoms.router)
api_router.include_router(predict.router)
api_router.include_router(diseases.router)
api_router.include_router(history.router)
