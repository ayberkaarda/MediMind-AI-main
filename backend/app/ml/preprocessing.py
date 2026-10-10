"""Symptom and disease name normalisation and feature vectorisation.

This module must stay free of scikit-learn so it can be shared by the API and
the training pipeline without pulling heavy dependencies into either path.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Iterable, Mapping, Sequence

import numpy as np
import numpy.typing as npt

# Misspellings found in the source files, keyed by their normalised form.
SYMPTOM_ALIASES: Mapping[str, str] = {
    "foul_smell_ofurine": "foul_smell_of_urine",
    "dischromic__patches": "dischromic_patches",
}

DISEASE_ALIASES: Mapping[str, str] = {
    "Dimorphic hemmorhoids(piles)": "Dimorphic hemorrhoids(piles)",
}

_WHITESPACE = re.compile(r"\s+")
_UNDERSCORES = re.compile(r"_+")


class UnknownSymptomError(ValueError):
    """Raised when input symptoms are not part of the feature space."""

    def __init__(self, unknown: Sequence[str]) -> None:
        self.unknown = list(unknown)
        super().__init__(f"Unknown symptom(s): {', '.join(self.unknown)}")


def normalize_symptom(raw: str) -> str:
    """Return the canonical snake_case id for a symptom name.

    Accepts legacy space separated names ("abdominal pain") as well as the
    malformed spellings present in the dataset ("dischromic _patches").
    """
    value = _WHITESPACE.sub("_", raw.strip().lower())
    if value in SYMPTOM_ALIASES:
        return SYMPTOM_ALIASES[value]
    value = _UNDERSCORES.sub("_", value).strip("_")
    return SYMPTOM_ALIASES.get(value, value)


def normalize_disease(raw: str) -> str:
    """Return the canonical English disease name (trimmed, single spaced)."""
    value = _WHITESPACE.sub(" ", raw.strip())
    return DISEASE_ALIASES.get(value, value)


_NON_SLUG = re.compile(r"[^a-z0-9]+")


def disease_slug(name: str) -> str:
    """URL safe disease id, e.g. "Dimorphic hemorrhoids(piles)" -> "dimorphic_hemorrhoids_piles"."""
    return _NON_SLUG.sub("_", normalize_disease(name).lower()).strip("_")


def canonical_feature_names(raw_names: Iterable[str]) -> list[str]:
    """Normalise, deduplicate and sort symptom names into a feature list."""
    names = {normalize_symptom(name) for name in raw_names if name and name.strip()}
    names.discard("")
    return sorted(names)


def normalize_symptom_list(raw: Iterable[str]) -> list[str]:
    """Normalise a user supplied list, dropping blanks and duplicates (order kept)."""
    seen: dict[str, None] = {}
    for item in raw:
        if not item or not item.strip():
            continue
        seen.setdefault(normalize_symptom(item), None)
    return list(seen)


def build_index(feature_names: Sequence[str]) -> dict[str, int]:
    """Map each feature name to its column index."""
    return {name: i for i, name in enumerate(feature_names)}


def vectorize(
    symptoms: Iterable[str],
    feature_names: Sequence[str],
    index: Mapping[str, int] | None = None,
) -> npt.NDArray[np.uint8]:
    """Encode one symptom collection as a binary row vector of shape (1, n_features).

    Raises UnknownSymptomError if any symptom is outside the feature space.
    """
    lookup = index if index is not None else build_index(feature_names)
    normalized = normalize_symptom_list(symptoms)
    unknown = [s for s in normalized if s not in lookup]
    if unknown:
        raise UnknownSymptomError(unknown)
    row = np.zeros((1, len(feature_names)), dtype=np.uint8)
    for symptom in normalized:
        row[0, lookup[symptom]] = 1
    return row


def feature_hash(feature_names: Sequence[str]) -> str:
    """Order sensitive SHA-256 fingerprint of a feature list."""
    digest = hashlib.sha256("\n".join(feature_names).encode("utf-8"))
    return digest.hexdigest()
