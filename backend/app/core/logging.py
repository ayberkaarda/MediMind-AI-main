"""Logging setup: JSON or text output with the current request id on every record."""

from __future__ import annotations

import logging
import sys
from contextvars import ContextVar

from pythonjsonlogger.json import JsonFormatter

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

_HANDLER_NAME = "medimind"
TEXT_FORMAT = "%(asctime)s %(levelname)s %(name)s [%(request_id)s] %(message)s"
JSON_FIELDS = "%(asctime)s %(levelname)s %(name)s %(request_id)s %(message)s"


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = request_id_var.get()
        return True


def configure_logging(level: str = "INFO", fmt: str = "text") -> None:
    """Install a single stdout handler on the root logger (idempotent)."""
    root = logging.getLogger()
    for handler in list(root.handlers):
        if handler.get_name() == _HANDLER_NAME:
            root.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.set_name(_HANDLER_NAME)
    handler.addFilter(RequestIdFilter())
    if fmt == "json":
        handler.setFormatter(
            JsonFormatter(JSON_FIELDS, rename_fields={"levelname": "level", "asctime": "time"})
        )
    else:
        handler.setFormatter(logging.Formatter(TEXT_FORMAT))
    root.addHandler(handler)
    root.setLevel(level.upper())
