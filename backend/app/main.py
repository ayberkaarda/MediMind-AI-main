"""MediMind HTTP API.

Serves the legacy ``GET /symptoms`` and ``POST /predict`` contract used by the
current frontend. Additional fields may be added to responses; existing fields
keep their names and types.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app import __version__
from app.core.paths import DATA_DIR, MODEL_PATH
from app.ml.artifact import load_artifact, verify_artifact
from app.ml.predictor import Predictor
from app.ml.preprocessing import UnknownSymptomError
from app.ml.registry import DataRegistry, turkish_sort_key

logger = logging.getLogger("medimind")

MAX_SYMPTOMS = 17
TOP_K = 5
MIN_LISTED_PROBABILITY = 0.01
NO_DESCRIPTION = "Tanım bulunamadı."
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


class SymptomItem(BaseModel):
    label: str
    value: str
    id: str
    region: str
    severity: int | None


class RegionItem(BaseModel):
    id: str
    label: str
    order: int
    kind: str


class SymptomsResponse(BaseModel):
    symptoms: list[SymptomItem]
    regions: list[RegionItem]


class SymptomRequest(BaseModel):
    symptoms: list[str] = Field(min_length=1, max_length=MAX_SYMPTOMS)


class RankedDisease(BaseModel):
    name: str
    value: float
    disease_id: str


class PredictResponse(BaseModel):
    disease: str
    confidence: float
    description: str
    precautions: list[str]
    top_predictions: list[RankedDisease]
    disease_id: str
    symptoms: list[str]
    model_version: str


@dataclass(frozen=True)
class ServiceState:
    registry: DataRegistry
    predictor: Predictor
    symptoms_payload: SymptomsResponse


def build_symptoms_payload(registry: DataRegistry) -> SymptomsResponse:
    items = [
        SymptomItem(
            label=registry.symptom_label(sid),
            value=sid,
            id=sid,
            region=registry.symptom_region[sid],
            severity=registry.severity.get(sid),
        )
        for sid in registry.symptom_ids
    ]
    items.sort(key=lambda item: (turkish_sort_key(item.label), item.id))
    regions = [
        RegionItem(id=r.id, label=r.label, order=r.order, kind=r.kind) for r in registry.regions
    ]
    return SymptomsResponse(symptoms=items, regions=regions)


def load_state(data_dir: Path = DATA_DIR, model_path: Path = MODEL_PATH) -> ServiceState:
    registry = DataRegistry.load(data_dir)
    artifact = load_artifact(model_path)
    verify_artifact(artifact, registry)
    logger.info(
        "Loaded model %s (%d features, %d classes)",
        artifact.model_version,
        len(artifact.feature_names),
        len(artifact.classes),
    )
    return ServiceState(
        registry=registry,
        predictor=Predictor(artifact),
        symptoms_payload=build_symptoms_payload(registry),
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.medimind = load_state()
    yield


app = FastAPI(title="MediMind API", version=__version__, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _state(request: Request) -> ServiceState:
    state: ServiceState = request.app.state.medimind
    return state


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "MediMind API is running"}


@app.get("/symptoms", response_model=SymptomsResponse)
def get_symptoms(request: Request) -> SymptomsResponse:
    return _state(request).symptoms_payload


@app.post("/predict", response_model=PredictResponse)
def predict_disease(payload: SymptomRequest, request: Request) -> PredictResponse:
    state = _state(request)
    try:
        result = state.predictor.predict(payload.symptoms)
    except UnknownSymptomError as exc:
        raise HTTPException(
            status_code=422, detail={"code": "unknown_symptom", "unknown": exc.unknown}
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=422, detail={"code": "empty_symptoms", "message": str(exc)}
        ) from exc

    registry = state.registry
    top = result.top
    return PredictResponse(
        disease=registry.disease_label(top.disease),
        confidence=top.probability,
        description=registry.description(top.disease) or NO_DESCRIPTION,
        precautions=list(registry.precautions_for(top.disease)),
        top_predictions=[
            RankedDisease(
                name=registry.disease_label(p.disease), value=p.probability, disease_id=p.disease
            )
            for p in result.top_k(TOP_K, MIN_LISTED_PROBABILITY)
        ],
        disease_id=top.disease,
        symptoms=list(result.symptoms),
        model_version=state.predictor.artifact.model_version,
    )
