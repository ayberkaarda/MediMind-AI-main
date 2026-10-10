"""FastAPI dependencies shared by the routers."""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.errors import InvalidClientIdError, MissingClientIdError
from app.core.logging import request_id_var
from app.services.container import ServiceContainer

CLIENT_ID_DESCRIPTION = "Anonymous client identifier (UUID) used to scope analysis history."


def get_container(request: Request) -> ServiceContainer:
    container: ServiceContainer = request.app.state.container
    return container


Container = Annotated[ServiceContainer, Depends(get_container)]


def get_session(container: Container) -> Iterator[Session]:
    with container.session_factory() as session:
        yield session


DbSession = Annotated[Session, Depends(get_session)]


def get_request_id(request: Request) -> str:
    return str(getattr(request.state, "request_id", None) or request_id_var.get())


RequestId = Annotated[str, Depends(get_request_id)]


def optional_client_id(
    x_client_id: Annotated[
        str | None, Header(alias="X-Client-Id", description=CLIENT_ID_DESCRIPTION)
    ] = None,
) -> str | None:
    if x_client_id is None or not x_client_id.strip():
        return None
    try:
        return str(uuid.UUID(x_client_id.strip()))
    except ValueError as exc:
        raise InvalidClientIdError("X-Client-Id must be a UUID.") from exc


OptionalClientId = Annotated[str | None, Depends(optional_client_id)]


def required_client_id(client_id: OptionalClientId) -> str:
    if client_id is None:
        raise MissingClientIdError("X-Client-Id header is required.")
    return client_id


ClientId = Annotated[str, Depends(required_client_id)]
