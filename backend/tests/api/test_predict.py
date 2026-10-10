from __future__ import annotations

from datetime import datetime

from fastapi.testclient import TestClient

from app.core.errors import PROBLEM_JSON

URL = "/api/v1/predict"
FUNGAL = ["itching", "skin_rash", "nodal_skin_eruptions", "dischromic_patches"]


def test_predict_without_client_id(client: TestClient) -> None:
    response = client.post(URL, json={"symptoms": FUNGAL})
    assert response.status_code == 200
    body = response.json()
    assert body["analysis_id"] is None
    assert body["request_id"] == response.headers["x-request-id"]
    assert body["input"] == {"symptoms": FUNGAL, "count": 4}
    top = body["top_prediction"]
    assert top["disease_id"] == "fungal_infection"
    assert top["name"] == "Mantar Enfeksiyonu"
    assert top["name_en"] == "Fungal infection"
    assert 0.5 < top["probability"] <= 1.0
    assert top["description"]
    assert top["precautions"]
    assert body["predictions"][0]["disease_id"] == "fungal_infection"
    assert 1 <= len(body["predictions"]) <= 5
    assert all(p["probability"] >= 0.01 for p in body["predictions"])
    assert body["confidence_label"] == "high"
    assert body["disclaimer"] is True
    assert body["model_version"]
    datetime.fromisoformat(body["created_at"])


def test_severity(client: TestClient) -> None:
    body = client.post(URL, json={"symptoms": FUNGAL}).json()
    # weights: itching 1, skin_rash 3, nodal_skin_eruptions 4, dischromic_patches 6
    assert body["severity"] == {
        "score": 14,
        "max_possible": 28,
        "mean_weight": 3.5,
        "level": "moderate",
    }
    low = client.post(URL, json={"symptoms": ["itching"]}).json()["severity"]
    assert low["level"] == "low"
    high = client.post(URL, json={"symptoms": ["high_fever", "chest_pain"]}).json()["severity"]
    assert high["level"] == "high"


def test_predict_with_client_id_is_saved(client: TestClient, client_id: str) -> None:
    response = client.post(URL, json={"symptoms": FUNGAL}, headers={"X-Client-Id": client_id})
    assert response.status_code == 200
    analysis_id = response.json()["analysis_id"]
    assert isinstance(analysis_id, int)
    history = client.get("/api/v1/history", headers={"X-Client-Id": client_id}).json()
    assert history["total"] == 1
    assert history["items"][0]["id"] == analysis_id


def test_predict_accepts_legacy_spaced_input(client: TestClient) -> None:
    spaced = client.post(URL, json={"symptoms": ["skin rash", "itching", "skin_rash"]}).json()
    assert spaced["input"] == {"symptoms": ["skin_rash", "itching"], "count": 2}


def test_request_id_is_echoed(client: TestClient) -> None:
    response = client.post(URL, json={"symptoms": FUNGAL}, headers={"X-Request-ID": "abc-123"})
    assert response.headers["x-request-id"] == "abc-123"
    assert response.json()["request_id"] == "abc-123"
    generated = client.post(URL, json={"symptoms": FUNGAL}, headers={"X-Request-ID": "bad id!"})
    assert generated.headers["x-request-id"] != "bad id!"
    assert len(generated.headers["x-request-id"]) == 32


def test_unknown_symptom_problem(client: TestClient) -> None:
    response = client.post(URL, json={"symptoms": ["itching", "flying", "yok_boyle"]})
    assert response.status_code == 422
    assert response.headers["content-type"].startswith(PROBLEM_JSON)
    body = response.json()
    assert body["code"] == "unknown_symptom"
    assert body["status"] == 422
    assert body["type"].endswith("unknown_symptom")
    assert body["errors"] == [{"symptom": "flying"}, {"symptom": "yok_boyle"}]
    assert body["request_id"] == response.headers["x-request-id"]


def test_validation_problems(client: TestClient) -> None:
    empty = client.post(URL, json={"symptoms": []})
    assert empty.status_code == 422
    assert empty.json()["code"] == "validation_error"
    assert empty.json()["errors"][0]["loc"] == ["body", "symptoms"]

    missing = client.post(URL, json={})
    assert missing.json()["code"] == "validation_error"

    blank = client.post(URL, json={"symptoms": ["  ", ""]})
    assert blank.status_code == 422
    assert blank.json()["code"] == "empty_symptoms"

    ids = [s["id"] for s in client.get("/api/v1/symptoms").json()["symptoms"]][:18]
    too_many = client.post(URL, json={"symptoms": ids})
    assert too_many.status_code == 422
    assert too_many.json()["code"] == "too_many_symptoms"

    duplicates = client.post(URL, json={"symptoms": ["itching"] * 20})
    assert duplicates.status_code == 200


def test_invalid_client_id(client: TestClient) -> None:
    response = client.post(URL, json={"symptoms": FUNGAL}, headers={"X-Client-Id": "nope"})
    assert response.status_code == 400
    assert response.json()["code"] == "invalid_client_id"
