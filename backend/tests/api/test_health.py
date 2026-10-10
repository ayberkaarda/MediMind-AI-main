from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app
from tests.conftest import make_settings


def test_health_ok(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert body["db_ok"] is True
    assert body["n_features"] == 131
    assert body["n_classes"] == 41
    assert body["model_type"] == "lr"
    assert body["model_version"]
    assert body["trained_at"]
    assert body["sklearn_version"]
    assert body["app_version"]


def test_degraded_without_model(tmp_path: Path) -> None:
    empty_models = tmp_path / "models"
    empty_models.mkdir()
    settings = make_settings(tmp_path, model_dir=empty_models)
    with TestClient(create_app(settings)) as client:
        health = client.get("/api/v1/health")
        assert health.status_code == 503
        assert health.json()["status"] == "degraded"
        assert health.json()["model_loaded"] is False

        predict = client.post("/api/v1/predict", json={"symptoms": ["itching"]})
        assert predict.status_code == 503
        assert predict.json()["code"] == "model_not_loaded"

        legacy = client.post("/predict", json={"symptoms": ["itching"]})
        assert legacy.status_code == 503
        assert legacy.json() == {"detail": "Model not loaded"}

        assert client.get("/api/v1/symptoms").status_code == 200
        assert len(client.get("/api/v1/diseases").json()["diseases"]) == 41
