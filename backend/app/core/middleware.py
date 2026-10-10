"""ASGI middleware: request id propagation, access logging and last-resort error handling."""

from __future__ import annotations

import logging
import re
import time
import uuid

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.errors import internal_error_response
from app.core.logging import request_id_var

REQUEST_ID_HEADER = "X-Request-ID"
CLIENT_ID_HEADER = "X-Client-Id"
_VALID_REQUEST_ID = re.compile(r"[A-Za-z0-9._:-]{1,128}")

access_logger = logging.getLogger("medimind.access")
error_logger = logging.getLogger("medimind.errors")


def resolve_request_id(incoming: str | None) -> str:
    """Accept a well-formed client supplied id, otherwise generate one."""
    if incoming and _VALID_REQUEST_ID.fullmatch(incoming):
        return incoming
    return uuid.uuid4().hex


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        request_id = resolve_request_id(headers.get(REQUEST_ID_HEADER))
        token = request_id_var.set(request_id)
        scope.setdefault("state", {})["request_id"] = request_id
        started = time.perf_counter()
        status_code = 500
        response_started = False

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code, response_started
            if message["type"] == "http.response.start":
                response_started = True
                status_code = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            error_logger.exception("Unhandled error on %s %s", scope["method"], scope["path"])
            if response_started:
                raise
            await internal_error_response()(scope, receive, send_wrapper)
        finally:
            duration_ms = (time.perf_counter() - started) * 1000
            client_id = (headers.get(CLIENT_ID_HEADER) or "")[:8] or None
            access_logger.info(
                "%s %s %d %.1fms",
                scope["method"],
                scope["path"],
                status_code,
                duration_ms,
                extra={
                    "event": "access",
                    "method": scope["method"],
                    "path": scope["path"],
                    "status": status_code,
                    "duration_ms": round(duration_ms, 2),
                    "client_id": client_id,
                },
            )
            request_id_var.reset(token)
