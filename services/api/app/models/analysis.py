import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    upload_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("uploads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), default="queued", nullable=False, index=True)
    assessment_label: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    assessment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score_semantics: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    upload: Mapped["Upload"] = relationship("Upload", back_populates="analyses")
    owner: Mapped[Optional["User"]] = relationship("User", back_populates="analyses")
    detector_results: Mapped[List["DetectorResult"]] = relationship(
        "DetectorResult",
        back_populates="analysis",
        cascade="all, delete-orphan",
    )
    provenance_checks: Mapped[List["ProvenanceCheck"]] = relationship(
        "ProvenanceCheck",
        back_populates="analysis",
        cascade="all, delete-orphan",
    )
