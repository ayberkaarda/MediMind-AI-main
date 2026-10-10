"""Filesystem locations for data and model artifacts."""

from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.environ.get("MEDIMIND_DATA_DIR", BACKEND_DIR / "data"))
MODELS_DIR = Path(os.environ.get("MEDIMIND_MODELS_DIR", BACKEND_DIR / "models"))

DATASET_PATH = DATA_DIR / "dataset.csv"
SYMPTOMS_PATH = DATA_DIR / "symptoms.json"
MODEL_FILENAME = "disease_model.joblib"
MODEL_CARD_FILENAME = "model_card.json"
MODEL_PATH = MODELS_DIR / MODEL_FILENAME
MODEL_CARD_PATH = MODELS_DIR / MODEL_CARD_FILENAME
