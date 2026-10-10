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
Evaluation therefore uses `StratifiedGroupKFold` grouped by symptom set, a
leave-one-group-out pass over the deduplicated table and a perturbation test
that drops one symptom per combination. See `models/model_card.json`.

## Layout

```
app/main.py            API (legacy /symptoms and /predict)
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
