from __future__ import annotations

from fastapi.testclient import TestClient

from app.ml.registry import turkish_sort_key


def test_list_diseases(client: TestClient) -> None:
    response = client.get("/api/v1/diseases")
    assert response.status_code == 200
    diseases = response.json()["diseases"]
    assert len(diseases) == 41
    assert len({d["id"] for d in diseases}) == 41
    names = [d["name"] for d in diseases]
    assert names == sorted(names, key=turkish_sort_key)
    ids = {d["id"] for d in diseases}
    assert {"fungal_infection", "dimorphic_hemorrhoids_piles", "diabetes"} <= ids


def test_get_disease(client: TestClient) -> None:
    body = client.get("/api/v1/diseases/fungal_infection").json()
    assert body["name"] == "Mantar Enfeksiyonu"
    assert body["name_en"] == "Fungal infection"
    assert body["description"]
    assert len(body["precautions"]) == 4


def test_unknown_disease(client: TestClient) -> None:
    response = client.get("/api/v1/diseases/flu")
    assert response.status_code == 404
    assert response.json()["code"] == "disease_not_found"
