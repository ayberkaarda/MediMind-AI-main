from __future__ import annotations

from fastapi.testclient import TestClient

from app.ml.registry import turkish_sort_key


def test_symptoms_catalogue(client: TestClient) -> None:
    response = client.get("/api/v1/symptoms")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "public, max-age=3600"
    assert response.headers["x-request-id"]
    body = response.json()
    symptoms = body["symptoms"]
    assert len(symptoms) == 131
    assert set(symptoms[0]) == {"id", "label", "label_en", "region", "severity"}
    labels = [s["label"] for s in symptoms]
    assert labels == sorted(labels, key=turkish_sort_key)
    by_id = {s["id"]: s for s in symptoms}
    assert by_id["abdominal_pain"]["label"] == "Karın Ağrısı"
    assert by_id["abdominal_pain"]["label_en"] == "Abdominal pain"
    assert by_id["abdominal_pain"]["region"] == "abdomen"
    assert by_id["high_fever"]["severity"] == 7


def test_symptoms_regions(client: TestClient) -> None:
    body = client.get("/api/v1/symptoms").json()
    regions = body["regions"]
    assert [r["order"] for r in regions] == list(range(1, 9))
    assert {s["region"] for s in body["symptoms"]} == {r["id"] for r in regions}
