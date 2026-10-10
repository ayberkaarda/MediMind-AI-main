# MediMind backend

FastAPI service and training pipeline for symptom-based disease prediction.
Results are produced by a statistical model trained on a small public dataset;
they are not a diagnosis.

## Setup

Requires [uv](https://docs.astral.sh/uv/). Python 3.12 is installed by uv if missing.

```bash
uv sync --all-groups
uv run uvicorn app.main:app --reload --port 8000
```

## Quality checks

```bash
uv run ruff check . && uv run ruff format --check .
uv run mypy app
uv run pytest -q --cov=app
```

## Training

```bash
uv run medimind-train --out models            # logistic regression (shipped)
uv run medimind-train --out /tmp/rf --model rf # random forest baseline
uv run python -m app.ml.compare_artifacts models/disease_model.joblib /tmp/retrain/disease_model.joblib
```

Training writes `models/disease_model.joblib`, `models/model_card.json` and
`data/symptoms.json` (the canonical symptom list the API serves).

The dataset contains 4920 rows but only ~304 distinct (symptom set, disease)
combinations, so a random row split leaks duplicates into the test fold.
Evaluation therefore uses nested grouped cross-validation: an outer
`StratifiedGroupKFold(5)` grouped by symptom set reports the metrics, and in each
outer fold an inner grouped CV on the training part alone picks `C` by log-loss.
The shipped model is refit on all rows with the `C` chosen most often. A
leave-one-group-out pass over the deduplicated table and a perturbation test
that removes exactly one symptom per held-out combination complete the picture.
See `models/model_card.json`.

**Honest note:** the dataset is synthetic and nearly separable; even grouped
cross-validation reaches 1.0 macro-F1. The reported metrics document the
evaluation method; they do not discriminate between models and say nothing
about real-world accuracy.

## API

Interactive docs at `/docs`. All v1 routes live under `/api/v1`; errors use
`application/problem+json` (`type, title, status, detail, code, request_id, errors`).
Every response, including CORS preflights, carries an `X-Request-ID` header (a valid
incoming one, at most 128 characters of `[A-Za-z0-9._:-]`, is echoed). Preflights
rejected by CORS stay plain text, as the CORS middleware produces them. The
deprecated unversioned routes keep FastAPI's original `{"detail": ...}` error body.
`predictions` holds up to `top_k` diseases scoring at least `min_prob`; the highest
ranked disease is always included even when it is below the threshold.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/health` | model and database status; 503 when degraded |
| GET | `/api/v1/symptoms` | symptoms with Turkish labels, region, severity weight; regions |
| POST | `/api/v1/predict` | `{"symptoms": [...]}`; stored in history when `X-Client-Id` is sent |
| GET | `/api/v1/diseases`, `/api/v1/diseases/{id}` | descriptions and precautions |
| GET/DELETE | `/api/v1/history`, `/api/v1/history/{id}` | requires `X-Client-Id` (UUID) |

`GET /symptoms` and `POST /predict` (unversioned) are deprecated and kept for the
previous frontend.

Configuration uses `MEDIMIND_*` environment variables; see `.env.example`.
History is stored in SQLite (`data/medimind.db` by default).

## Layout

```
app/main.py            create_app() factory and lifespan
app/core               settings, logging, request id middleware, problem+json errors
app/api                v1 routers and deprecated legacy routes
app/services           symptom, disease, prediction and history services
app/schemas            request and response models
app/db                 SQLAlchemy models and session helpers
app/ml/preprocessing   symptom normalisation and vectorisation (no sklearn)
app/ml/registry        Turkish labels, regions, severity, descriptions, precautions
app/ml/artifact        model artifact format, save/load/verify
app/ml/predictor       pure prediction logic
app/ml/train           training CLI with grouped cross-validation
app/ml/evaluate        metrics
data/                  source CSV/JSON files and body_regions.json
models/                trained artifact and model card
scripts/               one-off scripts kept for reference
```
