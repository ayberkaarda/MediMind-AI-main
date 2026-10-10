"""Per-client analysis history stored in the relational database."""

from __future__ import annotations

import json

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.db.models import AnalysisRecord, utcnow
from app.ml.preprocessing import disease_slug
from app.schemas.history import HistoryItem, HistoryListResponse
from app.services.disease_service import DiseaseService
from app.services.prediction_service import PredictionOutcome


class HistoryService:
    def __init__(self, diseases: DiseaseService, max_page_size: int) -> None:
        self._diseases = diseases
        self._max_page_size = max_page_size

    def record(
        self, session: Session, client_id: str, outcome: PredictionOutcome
    ) -> AnalysisRecord:
        record = AnalysisRecord(
            client_id=client_id,
            created_at=utcnow(),
            symptoms_json=json.dumps(list(outcome.symptoms)),
            predictions_json=json.dumps(
                [
                    {"disease_id": disease_slug(p.disease), "probability": round(p.probability, 6)}
                    for p in outcome.predictions
                ]
            ),
            top_disease_id=disease_slug(outcome.top.disease),
            top_probability=outcome.top.probability,
            severity_score=outcome.severity.score,
            severity_level=outcome.severity.level,
            model_version=outcome.model_version,
        )
        session.add(record)
        session.commit()
        return record

    def page(
        self, session: Session, client_id: str, limit: int | None, offset: int
    ) -> HistoryListResponse:
        page = min(limit or self._max_page_size, self._max_page_size)
        total = session.scalar(
            select(func.count())
            .select_from(AnalysisRecord)
            .where(AnalysisRecord.client_id == client_id)
        )
        rows = session.scalars(
            select(AnalysisRecord)
            .where(AnalysisRecord.client_id == client_id)
            .order_by(AnalysisRecord.created_at.desc(), AnalysisRecord.id.desc())
            .limit(page)
            .offset(offset)
        ).all()
        return HistoryListResponse(items=[self._item(r) for r in rows], total=int(total or 0))

    def delete_all(self, session: Session, client_id: str) -> int:
        result = session.execute(
            delete(AnalysisRecord).where(AnalysisRecord.client_id == client_id)
        )
        session.commit()
        return int(getattr(result, "rowcount", 0) or 0)

    def delete_one(self, session: Session, client_id: str, analysis_id: int) -> None:
        record = session.get(AnalysisRecord, analysis_id)
        if record is None or record.client_id != client_id:
            raise NotFoundError(f"Analysis {analysis_id} not found.", code="analysis_not_found")
        session.delete(record)
        session.commit()

    def _item(self, record: AnalysisRecord) -> HistoryItem:
        return HistoryItem(
            id=record.id,
            created_at=record.created_at,
            symptoms=json.loads(record.symptoms_json),
            top_disease_id=record.top_disease_id,
            top_disease_name=self._diseases.name_for(record.top_disease_id),
            probability=record.top_probability,
            severity_level=record.severity_level,
            model_version=record.model_version,
        )
