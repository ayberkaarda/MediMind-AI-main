from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import ClientId, Container, DbSession
from app.schemas.common import problem
from app.schemas.history import HistoryListResponse

router = APIRouter(
    prefix="/history",
    tags=["history"],
    responses={400: problem("Missing or invalid X-Client-Id")},
)


@router.get("", response_model=HistoryListResponse, summary="List this client's analyses")
def list_history(
    container: Container,
    session: DbSession,
    client_id: ClientId,
    limit: Annotated[int | None, Query(ge=1, le=500)] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> HistoryListResponse:
    return container.history.page(session, client_id, limit, offset)


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete all analyses of this client",
)
def clear_history(container: Container, session: DbSession, client_id: ClientId) -> Response:
    container.history.delete_all(session, client_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/{analysis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete one analysis",
    responses={404: problem("Analysis not found for this client")},
)
def delete_analysis(
    analysis_id: int, container: Container, session: DbSession, client_id: ClientId
) -> Response:
    container.history.delete_one(session, client_id, analysis_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
