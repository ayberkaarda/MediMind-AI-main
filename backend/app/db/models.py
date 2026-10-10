from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UTCDateTime


def utcnow() -> datetime:
    return datetime.now(UTC)


class AnalysisRecord(Base):
    __tablename__ = "analysis_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[str] = mapped_column(String(36), index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, index=True)
    symptoms_json: Mapped[str] = mapped_column(Text)
    predictions_json: Mapped[str] = mapped_column(Text)
    top_disease_id: Mapped[str] = mapped_column(String(128))
    top_probability: Mapped[float] = mapped_column(Float)
    severity_score: Mapped[int] = mapped_column(Integer)
    severity_level: Mapped[str] = mapped_column(String(16))
    model_version: Mapped[str] = mapped_column(String(64))
