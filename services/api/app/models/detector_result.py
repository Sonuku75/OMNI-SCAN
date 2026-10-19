import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class DetectorResult(Base):
    __tablename__ = "detector_results"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    analysis_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("analyses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    detector_name: Mapped[str] = mapped_column(String(128), nullable=False)
    detector_version: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score_semantics: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    signals_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    limitations_json: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="detector_results")
