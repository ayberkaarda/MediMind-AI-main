from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ProblemDetail(BaseModel):
    """Error body returned with ``Content-Type: application/problem+json``."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "type": "urn:medimind:problem:unknown_symptom",
                "title": "Unprocessable Content",
                "status": 422,
                "detail": "Unknown symptom(s): flying",
                "code": "unknown_symptom",
                "request_id": "6f1c2d0e9a8b4c7d8e9f0a1b2c3d4e5f",
                "errors": [{"symptom": "flying"}],
            }
        }
    )

    type: str
    title: str
    status: int
    detail: str
    code: str
    request_id: str
    errors: list[dict[str, Any]] = Field(default_factory=list)


def problem(description: str) -> dict[str, Any]:
    return {
        "model": ProblemDetail,
        "description": description,
        "content": {"application/problem+json": {}},
    }


VALIDATION_RESPONSES: dict[int | str, dict[str, Any]] = {
    422: problem("Validation error"),
    500: problem("Internal error"),
}
