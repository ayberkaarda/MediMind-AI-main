from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app
from tests.conftest import CLIENT_A, CLIENT_B, make_settings

URL = "/api/v1/history"
FUNGAL = ["itching", "skin_rash", "nodal_skin_eruptions", "dischromic_patches"]
COLD = ["continuous_sneezing", "chills", "cough", "runny_nose"]


def _predict(client: TestClient, client_id: str, symptoms: list[str]) -> int:
    response = client.post(
        "/api/v1/predict", json={"symptoms": symptoms}, headers={"X-Client-Id": client_id}
    )
    assert response.status_code == 200
    analysis_id: int = response.json()["analysis_id"]
    return analysis_id


def _history(client: TestClient, client_id: str, **params: int) -> dict[str, object]:
    response = client.get(URL, headers={"X-Client-Id": client_id}, params=params)
    assert response.status_code == 200
    body: dict[str, object] = response.json()
    return body


def test_clients_are_isolated(client: TestClient) -> None:
    first = _predict(client, CLIENT_A, FUNGAL)
    second = _predict(client, CLIENT_A, COLD)
    _predict(client, CLIENT_B, COLD)

    a = _history(client, CLIENT_A)
    assert a["total"] == 2
    items = a["items"]
    assert isinstance(items, list)
    assert [i["id"] for i in items] == [second, first]  # newest first
    newest = items[0]
    assert set(newest) == {
        "id",
        "created_at",
        "symptoms",
        "top_disease_id",
        "top_disease_name",
        "probability",
        "severity_level",
        "model_version",
    }
    assert items[1]["symptoms"] == FUNGAL
    assert items[1]["top_disease_id"] == "fungal_infection"
    assert items[1]["top_disease_name"] == "Mantar Enfeksiyonu"
    assert _history(client, CLIENT_B)["total"] == 1


def test_pagination(client: TestClient) -> None:
    ids = [_predict(client, CLIENT_A, s) for s in (FUNGAL, COLD, ["itching"])]
    page = _history(client, CLIENT_A, limit=1, offset=1)
    assert page["total"] == 3
    items = page["items"]
    assert isinstance(items, list)
    assert [i["id"] for i in items] == [ids[1]]


def test_page_size_is_capped(tmp_path: Path) -> None:
    with TestClient(create_app(make_settings(tmp_path, history_limit=2))) as client:
        for symptoms in (FUNGAL, COLD, ["itching"]):
            _predict(client, CLIENT_A, symptoms)
        body = _history(client, CLIENT_A, limit=100)
        assert body["total"] == 3
        assert isinstance(body["items"], list)
        assert len(body["items"]) == 2


def test_delete_one_and_cross_client_404(client: TestClient) -> None:
    mine = _predict(client, CLIENT_A, FUNGAL)
    other = _predict(client, CLIENT_B, COLD)

    cross = client.delete(f"{URL}/{other}", headers={"X-Client-Id": CLIENT_A})
    assert cross.status_code == 404
    assert cross.json()["code"] == "analysis_not_found"

    ok = client.delete(f"{URL}/{mine}", headers={"X-Client-Id": CLIENT_A})
    assert ok.status_code == 204
    assert ok.content == b""
    assert _history(client, CLIENT_A)["total"] == 0
    assert _history(client, CLIENT_B)["total"] == 1

    again = client.delete(f"{URL}/{mine}", headers={"X-Client-Id": CLIENT_A})
    assert again.status_code == 404


def test_delete_all(client: TestClient) -> None:
    _predict(client, CLIENT_A, FUNGAL)
    _predict(client, CLIENT_A, COLD)
    _predict(client, CLIENT_B, COLD)
    response = client.delete(URL, headers={"X-Client-Id": CLIENT_A})
    assert response.status_code == 204
    assert _history(client, CLIENT_A)["total"] == 0
    assert _history(client, CLIENT_B)["total"] == 1


def test_client_id_required(client: TestClient) -> None:
    missing = client.get(URL)
    assert missing.status_code == 400
    assert missing.json()["code"] == "missing_client_id"
    invalid = client.delete(URL, headers={"X-Client-Id": "not-a-uuid"})
    assert invalid.status_code == 400
    assert invalid.json()["code"] == "invalid_client_id"


def test_client_id_is_canonicalised(client: TestClient) -> None:
    _predict(client, CLIENT_A.upper(), FUNGAL)
    assert _history(client, CLIENT_A)["total"] == 1
