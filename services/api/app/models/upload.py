import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Upload(Base):
    __tablename__ = "uploads"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    owner_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    object_key: Mapped[str] = mapped_column(String(512), unique=True, index=True, nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    media_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="uploaded", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    owner: Mapped[Optional["User"]] = relationship("User", back_populates="uploads")
    analyses: Mapped[List["Analysis"]] = relationship(
        "Analysis",
        back_populates="upload",
        cascade="all, delete-orphan",
    )
