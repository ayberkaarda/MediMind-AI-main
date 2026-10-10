"""Wires settings, data, model and database into the services used by the routes."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.core.paths import MODEL_FILENAME
from app.db.session import create_db_engine, create_session_factory, init_db
from app.ml.artifact import (
    ArtifactError,
    ArtifactMismatchError,
    ModelArtifact,
    load_artifact,
    verify_artifact,
)
from app.ml.predictor import Predictor
from app.ml.registry import DataRegistry
from app.services.disease_service import DiseaseService
from app.services.history_service import HistoryService
from app.services.prediction_service import PredictionService
from app.services.symptom_service import SymptomService

logger = logging.getLogger("medimind")


@dataclass
class ServiceContainer:
    settings: Settings
    registry: DataRegistry
    artifact: ModelArtifact | None
    engine: Engine
    session_factory: sessionmaker[Session]
    symptoms: SymptomService
    diseases: DiseaseService
    predictions: PredictionService
    history: HistoryService

    def close(self) -> None:
        self.engine.dispose()


def _load_model(settings: Settings, registry: DataRegistry) -> ModelArtifact | None:
    path = settings.model_dir / MODEL_FILENAME
    try:
        artifact = load_artifact(path)
        verify_artifact(artifact, registry)
    except ArtifactMismatchError:
        # A model built for another feature space would give wrong answers: fail fast.
        raise
    except ArtifactError as exc:
        # Missing or broken model: serve reference data in degraded mode, /predict answers 503.
        logger.error("Model unavailable: %s", exc)
        return None
    logger.info(
        "Loaded model %s (%d features, %d classes)",
        artifact.model_version,
        len(artifact.feature_names),
        len(artifact.classes),
    )
    return artifact


def build_container(settings: Settings) -> ServiceContainer:
    registry = DataRegistry.load(settings.data_dir)
    artifact = _load_model(settings, registry)
    engine = create_db_engine(settings.database_url)
    init_db(engine)
    diseases = DiseaseService(registry, artifact.classes if artifact else None)
    return ServiceContainer(
        settings=settings,
        registry=registry,
        artifact=artifact,
        engine=engine,
        session_factory=create_session_factory(engine),
        symptoms=SymptomService(registry),
        diseases=diseases,
        predictions=PredictionService(
            registry, Predictor(artifact) if artifact else None, settings
        ),
        history=HistoryService(diseases, settings.history_limit),
    )
