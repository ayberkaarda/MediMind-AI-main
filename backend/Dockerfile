# syntax=docker/dockerfile:1.7

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never
WORKDIR /app
# Dependencies first for better layer caching; the dev and train groups
# (pytest, pandas, scikit-learn) stay out of the runtime image.
COPY pyproject.toml uv.lock .python-version ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-default-groups --no-install-project
COPY README.md ./
COPY app ./app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-default-groups

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    MEDIMIND_APP_ENV=production \
    MEDIMIND_LOG_FORMAT=json \
    MEDIMIND_DATABASE_URL=sqlite:////app/data/db/medimind.db
RUN groupadd --system --gid 10001 medimind \
    && useradd --system --uid 10001 --gid medimind --home-dir /app --no-create-home medimind
WORKDIR /app
COPY --from=builder --chown=medimind:medimind /app /app
COPY --chown=medimind:medimind data ./data
COPY --chown=medimind:medimind models ./models
RUN mkdir -p /app/data/db && chown medimind:medimind /app/data/db
VOLUME ["/app/data/db"]
USER medimind
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4).status == 200 else 1)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
