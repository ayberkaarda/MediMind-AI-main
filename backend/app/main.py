"""MediMind HTTP API application factory."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api import legacy
from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import REQUEST_ID_HEADER, RequestContextMiddleware
from app.services.container import build_container

DESCRIPTION = (
    "Ranks diseases from a symptom checklist using a model trained on a small public "
    "dataset. Results are model outputs, not a diagnosis."
)

OPENAPI_TAGS = [
    {"name": "health", "description": "Liveness and model status."},
    {"name": "symptoms", "description": "Symptom catalogue and body regions."},
    {"name": "predict", "description": "Disease ranking for selected symptoms."},
    {"name": "diseases", "description": "Disease descriptions and precautions."},
    {"name": "history", "description": "Per-client analysis history (X-Client-Id)."},
    {"name": "legacy", "description": "Deprecated unversioned routes."},
]


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level, settings.log_format)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        container = build_container(settings)
        app.state.container = container
        try:
            yield
        finally:
            container.close()

    app = FastAPI(
        title="MediMind API",
        version=settings.app_version,
        description=DESCRIPTION,
        openapi_tags=OPENAPI_TAGS,
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Client-Id", REQUEST_ID_HEADER],
        expose_headers=[REQUEST_ID_HEADER],
    )
    # Added last so it is the outermost layer: every response, including CORS
    # preflights, carries X-Request-ID. Rejected preflights stay plain text (CORS spec).
    app.add_middleware(RequestContextMiddleware)
    register_exception_handlers(app)
    app.include_router(api_router)
    app.include_router(legacy.router)

    @app.get("/", include_in_schema=False)
    def root() -> RedirectResponse:
        return RedirectResponse(url="/docs")

    return app


app = create_app()
