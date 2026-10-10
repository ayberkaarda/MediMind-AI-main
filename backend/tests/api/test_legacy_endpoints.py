from __future__ import annotations

from fastapi.testclient import TestClient

from app.ml.registry import turkish_sort_key

FUNGAL = ["itching", "skin_rash", "nodal_skin_eruptions", "dischromic_patches"]


def test_root(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


def test_symptoms_legacy_shape(client: TestClient) -> None:
    response = client.get("/symptoms")
    assert response.status_code == 200
    body = response.json()
    symptoms = body["symptoms"]
    assert len(symptoms) == 131
    for item in symptoms:
        assert isinstance(item["label"], str) and item["label"]
        assert isinstance(item["value"], str) and " " not in item["value"]
        assert item["id"] == item["value"]
    labels = [item["label"] for item in symptoms]
    assert labels == sorted(labels, key=turkish_sort_key)


def test_symptoms_regions(client: TestClient) -> None:
    body = client.get("/symptoms").json()
    region_ids = [r["id"] for r in body["regions"]]
    assert region_ids[0] == "head_neck"
    assert len(region_ids) == 8
    assert {item["region"] for item in body["symptoms"]} == set(region_ids)


def test_predict_happy_path(client: TestClient) -> None:
    response = client.post("/predict", json={"symptoms": FUNGAL})
    assert response.status_code == 200
    body = response.json()
    assert body["disease"] == "Mantar Enfeksiyonu"
    assert body["disease_id"] == "Fungal infection"
    assert 0.0 < body["confidence"] <= 1.0
    assert isinstance(body["description"], str) and body["description"]
    assert isinstance(body["precautions"], list) and body["precautions"]
    top = body["top_predictions"]
    assert 1 <= len(top) <= 5
    assert top[0]["name"] == "Mantar Enfeksiyonu"
    assert set(top[0]) >= {"name", "value"}
    assert all(p["value"] > 0.01 for p in top)
    assert body["symptoms"] == FUNGAL
    assert body["model_version"]


def test_predict_accepts_legacy_spaced_values(client: TestClient) -> None:
    spaced = client.post(
        "/predict", json={"symptoms": ["itching", "skin rash", "nodal skin eruptions"]}
    ).json()
    canonical = client.post(
        "/predict", json={"symptoms": ["itching", "skin_rash", "nodal_skin_eruptions"]}
    ).json()
    assert spaced == canonical
    assert spaced["disease"] == "Mantar Enfeksiyonu"


def test_predict_unknown_symptom(client: TestClient) -> None:
    response = client.post("/predict", json={"symptoms": ["itching", "flying"]})
    assert response.status_code == 422
    assert response.json()["detail"] == {"code": "unknown_symptom", "unknown": ["flying"]}


def test_predict_validation(client: TestClient) -> None:
    assert client.post("/predict", json={"symptoms": []}).status_code == 422
    assert client.post("/predict", json={}).status_code == 422
    assert client.post("/predict", json={"symptoms": ["itching"] * 18}).status_code == 422
    blank = client.post("/predict", json={"symptoms": ["  "]})
    assert blank.status_code == 422
    assert blank.json()["detail"]["code"] == "empty_symptoms"
