from __future__ import annotations

import json
import logging
from datetime import datetime

import pytest

from app.core import config
from app.core.config import Settings, get_settings, resolve_sqlite_url
from app.core.logging import configure_logging, request_id_var
from app.core.middleware import resolve_request_id
from app.core.paths import BACKEND_DIR
from app.db.base import UTCDateTime


def test_relative_sqlite_url_is_resolved_against_backend() -> None:
    resolved = resolve_sqlite_url("sqlite:///./data/medimind.db")
    assert resolved == f"sqlite:///{(BACKEND_DIR / 'data' / 'medimind.db').resolve().as_posix()}"


@pytest.mark.parametrize(
    "url",
    [
        "sqlite:///:memory:",
        "sqlite:////app/data/db/medimind.db",
        "postgresql+psycopg://user@host/db",
    ],
)
def test_other_urls_are_untouched(url: str) -> None:
    assert resolve_sqlite_url(url) == url


def test_settings_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MEDIMIND_TOP_K", "3")
    monkeypatch.setenv("MEDIMIND_CORS_ORIGINS", '["https://example.org"]')
    settings = Settings(_env_file=None)
    assert settings.top_k == 3
    assert settings.cors_origins == ["https://example.org"]
    assert settings.database_url.startswith("sqlite:///")
    assert settings.database_url.endswith("data/medimind.db")


def test_get_settings_is_cached() -> None:
    config.get_settings.cache_clear()
    assert get_settings() is get_settings()
    config.get_settings.cache_clear()


def test_json_logging_includes_request_id(capsys: pytest.CaptureFixture[str]) -> None:
    configure_logging("INFO", "json")
    configure_logging("INFO", "json")  # idempotent
    named = [h for h in logging.getLogger().handlers if h.get_name() == "medimind"]
    assert len(named) == 1
    token = request_id_var.set("rid-1")
    try:
        logging.getLogger("medimind.test").info("hello", extra={"event": "unit"})
    finally:
        request_id_var.reset(token)
    line = capsys.readouterr().out.strip().splitlines()[-1]
    record = json.loads(line)
    assert record["message"] == "hello"
    assert record["request_id"] == "rid-1"
    assert record["event"] == "unit"
    assert record["level"] == "INFO"


def test_text_logging(capsys: pytest.CaptureFixture[str]) -> None:
    configure_logging("INFO", "text")
    logging.getLogger("medimind.test").info("plain")
    assert "[-] plain" in capsys.readouterr().out
    configure_logging("WARNING", "text")


def test_resolve_request_id() -> None:
    assert resolve_request_id("abc.DEF-1_2:3") == "abc.DEF-1_2:3"
    assert len(resolve_request_id(None)) == 32
    assert resolve_request_id("x" * 128) == "x" * 128
    assert resolve_request_id("x" * 129) != "x" * 129
    assert resolve_request_id("has space") != "has space"


@pytest.mark.parametrize("value", ["abc\n", "abc\r\n", "a\nb", "abc\x00", "tab\there", "\x7f"])
def test_request_id_rejects_line_breaks_and_control_chars(value: str) -> None:
    generated = resolve_request_id(value)
    assert generated != value
    assert len(generated) == 32
    assert generated.isalnum()


def test_utc_datetime_rejects_naive() -> None:
    column = UTCDateTime()
    with pytest.raises(ValueError, match="timezone-aware"):
        column.process_bind_param(datetime(2026, 1, 1), dialect=None)  # type: ignore[arg-type]
    assert column.process_bind_param(None, dialect=None) is None  # type: ignore[arg-type]
    assert column.process_result_value(None, dialect=None) is None  # type: ignore[arg-type]
