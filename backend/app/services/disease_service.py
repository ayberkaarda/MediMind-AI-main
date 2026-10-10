"""Disease reference data keyed by URL safe slugs."""

from __future__ import annotations

from collections.abc import Iterable

from app.core.errors import NotFoundError
from app.ml.preprocessing import disease_slug
from app.ml.registry import DataRegistry, turkish_sort_key
from app.schemas.diseases import DiseaseDetail, DiseasesResponse, DiseaseSummary


class DiseaseService:
    def __init__(self, registry: DataRegistry, diseases: Iterable[str] | None = None) -> None:
        self._registry = registry
        names = list(diseases) if diseases is not None else list(registry.disease_labels)
        self._by_slug = {disease_slug(name): name for name in names}
        if len(self._by_slug) != len(set(names)):
            raise ValueError("Disease slugs are not unique")
        self._summaries = sorted(
            (self._summary(slug, name) for slug, name in self._by_slug.items()),
            key=lambda d: (turkish_sort_key(d.name), d.id),
        )

    def _summary(self, slug: str, name: str) -> DiseaseSummary:
        return DiseaseSummary(id=slug, name=self._registry.disease_label(name), name_en=name)

    @staticmethod
    def slug(name: str) -> str:
        return disease_slug(name)

    def name_for(self, slug: str) -> str:
        """Turkish display name for a slug (falls back to the slug itself)."""
        english = self._by_slug.get(slug)
        return self._registry.disease_label(english) if english else slug

    def all(self) -> DiseasesResponse:
        return DiseasesResponse(diseases=self._summaries)

    def get(self, slug: str) -> DiseaseDetail:
        english = self._by_slug.get(slug)
        if english is None:
            raise NotFoundError(f"Disease '{slug}' not found.", code="disease_not_found")
        return DiseaseDetail(
            id=slug,
            name=self._registry.disease_label(english),
            name_en=english,
            description=self._registry.description(english),
            precautions=list(self._registry.precautions_for(english)),
        )
