from __future__ import annotations

import dataclasses
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import joblib
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models import AnalysisRecord
from app.main import create_app
from app.ml.artifact import ArtifactMismatchError, ModelArtifact, save_artifact
from app.services.container import ServiceContainer
from app.services.prediction_service import PredictionOutcome
from tests.conftest import CLIENT_A, make_settings

FUNGAL = ["itching", "skin_rash", "nodal_skin_eruptions", "dischromic_patches"]
HEADERS = {"X-Client-Id": CLIENT_A}


def test_in_memory_database(tmp_path: Path) -> None:
    settings = make_settings(tmp_path, database_url="sqlite:///:memory:")
    with TestClient(create_app(settings)) as client:
        assert client.post("/api/v1/predict", json={"symptoms": FUNGAL}, headers=HEADERS).json()[
            "analysis_id"
        ]
        history = client.get("/api/v1/history", headers=HEADERS)
        assert history.status_code == 200
        assert history.json()["total"] == 1
        assert client.get("/api/v1/health").json()["db_ok"] is True


def test_concurrent_predictions(client: TestClient) -> None:
    def call(i: int) -> int:
        symptoms = FUNGAL[: 1 + i % 4]
        response = client.post("/api/v1/predict", json={"symptoms": symptoms}, headers=HEADERS)
        return response.status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses = list(pool.map(call, range(20)))
    assert statuses == [200] * 20
    assert client.get("/api/v1/history", headers=HEADERS).json()["total"] == 20


def test_failed_transaction_leaves_session_clean(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    container: ServiceContainer = client.app.state.container  # type: ignore[attr-defined]

    def broken_record(
        session: Session, client_id: str, outcome: PredictionOutcome
    ) -> AnalysisRecord:
        session.add(AnalysisRecord(client_id=client_id))  # missing NOT NULL columns
        session.commit()
        raise AssertionError("unreachable")

    with monkeypatch.context() as patch:
        patch.setattr(container.history, "record", broken_record)
        failed = client.post("/api/v1/predict", json={"symptoms": FUNGAL}, headers=HEADERS)
    assert failed.status_code == 500
    assert failed.json()["code"] == "internal_error"

    ok = client.post("/api/v1/predict", json={"symptoms": FUNGAL}, headers=HEADERS)
    assert ok.status_code == 200
    history = client.get("/api/v1/history", headers=HEADERS).json()
    assert history["total"] == 1
    assert history["items"][0]["id"] == ok.json()["analysis_id"]


def test_created_at_keeps_utc_offset(client: TestClient) -> None:
    created = client.post("/api/v1/predict", json={"symptoms": FUNGAL}, headers=HEADERS).json()[
        "created_at"
    ]
    assert created.endswith("+00:00")
    item = client.get("/api/v1/history", headers=HEADERS).json()["items"][0]
    assert item["created_at"].endswith("+00:00")
    assert item["created_at"] == created


def test_preflight_carries_request_id(client: TestClient) -> None:
    response = client.options(
        "/api/v1/predict",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "X-Request-ID": "pre-1",
        },
    )
    assert response.status_code == 200
    assert response.headers["x-request-id"] == "pre-1"
    rejected = client.options(
        "/api/v1/predict",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert rejected.status_code == 400
    assert rejected.headers["x-request-id"]


def test_broken_artifact_starts_degraded(tmp_path: Path) -> None:
    models = tmp_path / "models"
    models.mkdir()
    joblib.dump(
        {
            "format_version": 1,
            "estimator": None,
            "feature_names": None,
            "classes": [],
            "metadata": None,
        },
        models / "disease_model.joblib",
    )
    with TestClient(create_app(make_settings(tmp_path, model_dir=models))) as client:
        health = client.get("/api/v1/health")
        assert health.status_code == 503
        assert health.json()["model_loaded"] is False


def test_unusable_estimator_starts_degraded(tmp_path: Path, real_artifact: ModelArtifact) -> None:
    models = tmp_path / "models"
    broken = dataclasses.replace(real_artifact, estimator=object())  # type: ignore[arg-type]
    save_artifact(broken, models / "disease_model.joblib")
    with TestClient(create_app(make_settings(tmp_path, model_dir=models))) as client:
        assert client.get("/api/v1/health").json()["status"] == "degraded"


def test_feature_mismatch_fails_startup(tmp_path: Path, tiny_artifact: ModelArtifact) -> None:
    models = tmp_path / "models"
    save_artifact(tiny_artifact, models / "disease_model.joblib")
    app = create_app(make_settings(tmp_path, model_dir=models))
    with pytest.raises(ArtifactMismatchError), TestClient(app):
        pass
