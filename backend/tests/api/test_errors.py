from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.errors import PROBLEM_JSON, AppError, UnknownSymptomsError, problem_response
from app.main import create_app


def test_unknown_route_is_problem_json(client: TestClient) -> None:
    response = client.get("/api/v1/nope")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith(PROBLEM_JSON)
    assert response.json()["code"] == "not_found"


def test_method_not_allowed(client: TestClient) -> None:
    response = client.put("/api/v1/symptoms")
    assert response.status_code == 405
    assert response.json()["code"] == "method_not_allowed"


def test_malformed_json(client: TestClient) -> None:
    response = client.post(
        "/api/v1/predict", content=b"{not json", headers={"content-type": "application/json"}
    )
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_unhandled_error_is_500_without_stack(settings: Settings) -> None:
    app = create_app(settings)

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("secret internals")

    with TestClient(app) as client:
        response = client.get("/boom", headers={"X-Request-ID": "req-500"})
    assert response.status_code == 500
    assert response.headers["content-type"].startswith(PROBLEM_JSON)
    assert response.headers["x-request-id"] == "req-500"
    body = response.json()
    assert body["code"] == "internal_error"
    assert body["request_id"] == "req-500"
    assert "secret" not in response.text
    assert "Traceback" not in response.text


def test_app_error_overrides_and_unknown_status() -> None:
    err = AppError("teapot", code="teapot", status=418)
    assert (err.status, err.code, err.errors) == (418, "teapot", [])
    response = problem_response(599, "weird", "odd status")
    assert response.status_code == 599
    assert b'"title":"Error"' in response.body


def test_cors_exposes_request_id(client: TestClient) -> None:
    response = client.options(
        "/api/v1/predict",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-client-id",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    simple = client.get("/api/v1/symptoms", headers={"Origin": "http://localhost:5173"})
    assert "x-request-id" in simple.headers["access-control-expose-headers"].lower()


def test_unknown_symptoms_error_clips_echo() -> None:
    err = UnknownSymptomsError(["y" * 100, "short"])
    assert len(err.unknown[0]) == 64
    assert err.unknown[1] == "short"
    assert err.errors == [{"symptom": err.unknown[0]}, {"symptom": "short"}]
