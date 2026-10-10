"""Application errors rendered as RFC 9457 ``application/problem+json`` responses."""

from __future__ import annotations

import logging
from collections.abc import Sequence
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import request_id_var

PROBLEM_JSON = "application/problem+json"
PROBLEM_TYPE_BASE = "urn:medimind:problem:"

logger = logging.getLogger("medimind.errors")


class AppError(Exception):
    status: int = 500
    code: str = "internal_error"
    title: str | None = None

    def __init__(
        self,
        detail: str,
        *,
        code: str | None = None,
        status: int | None = None,
        errors: Sequence[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        if code is not None:
            self.code = code
        if status is not None:
            self.status = status
        self.errors = list(errors or [])


class ModelNotLoadedError(AppError):
    status = 503
    code = "model_not_loaded"


MAX_ECHOED_ITEMS = 10
MAX_ECHOED_LENGTH = 64


def _clip(value: str) -> str:
    return value if len(value) <= MAX_ECHOED_LENGTH else value[: MAX_ECHOED_LENGTH - 1] + "…"


class UnknownSymptomsError(AppError):
    """Unknown input symptoms; at most 10 are echoed back, each clipped to 64 characters."""

    status = 422
    code = "unknown_symptom"

    def __init__(self, unknown: Sequence[str]) -> None:
        self.unknown = [_clip(s) for s in list(unknown)[:MAX_ECHOED_ITEMS]]
        more = len(unknown) - len(self.unknown)
        suffix = f" (+{more} more)" if more > 0 else ""
        super().__init__(
            f"Unknown symptom(s): {', '.join(self.unknown)}{suffix}",
            errors=[{"symptom": s} for s in self.unknown],
        )


class InvalidInputError(AppError):
    status = 422
    code = "validation_error"


class NotFoundError(AppError):
    status = 404
    code = "not_found"


class InvalidClientIdError(AppError):
    status = 400
    code = "invalid_client_id"


class MissingClientIdError(AppError):
    status = 400
    code = "missing_client_id"


def problem_response(
    status: int,
    code: str,
    detail: str,
    *,
    title: str | None = None,
    errors: Sequence[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    try:
        phrase = HTTPStatus(status).phrase
    except ValueError:
        phrase = "Error"
    request_id = request_id_var.get()
    body = {
        "type": f"{PROBLEM_TYPE_BASE}{code}",
        "title": title or phrase,
        "status": status,
        "detail": detail,
        "code": code,
        "request_id": request_id,
        "errors": jsonable_encoder(list(errors or [])),
    }
    response_headers = {"X-Request-ID": request_id, **(headers or {})}
    return JSONResponse(body, status_code=status, media_type=PROBLEM_JSON, headers=response_headers)


def internal_error_response() -> JSONResponse:
    return problem_response(500, "internal_error", "An unexpected error occurred.")


_HTTP_CODES = {
    400: "bad_request",
    404: "not_found",
    405: "method_not_allowed",
    406: "not_acceptable",
    413: "payload_too_large",
    415: "unsupported_media_type",
}


async def _app_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    return problem_response(exc.status, exc.code, exc.detail, title=exc.title, errors=exc.errors)


async def _validation_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    errors = [
        {"loc": list(err.get("loc", ())), "msg": err.get("msg", ""), "type": err.get("type", "")}
        for err in exc.errors()
    ]
    return problem_response(422, "validation_error", "Request validation failed.", errors=errors)


async def _http_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    code = _HTTP_CODES.get(exc.status_code, f"http_{exc.status_code}")
    detail = exc.detail if isinstance(exc.detail, str) else HTTPStatus(exc.status_code).phrase
    return problem_response(exc.status_code, code, detail, headers=dict(exc.headers or {}))


async def _unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return internal_error_response()


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_handler)
    app.add_exception_handler(StarletteHTTPException, _http_error_handler)
    app.add_exception_handler(Exception, _unhandled_handler)
