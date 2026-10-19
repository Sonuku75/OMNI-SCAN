import uuid
from datetime import datetime, timezone
from typing import Any, Dict
from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ProvenanceCheck(Base):
    __tablename__ = "provenance_checks"

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
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    content_credentials_status: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    analysis: Mapped["Analysis"] = relationship("Analysis", back_populates="provenance_checks")
