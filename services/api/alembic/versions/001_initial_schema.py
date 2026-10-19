"""Initial database schema for OmniScan forensic platform

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-20 02:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users Table
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. Uploads Table
    op.create_table(
        "uploads",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_id", sa.String(length=36), nullable=True),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("media_type", sa.String(length=32), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="uploaded"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_uploads_owner_id", "uploads", ["owner_id"])
    op.create_index("ix_uploads_object_key", "uploads", ["object_key"], unique=True)
    op.create_index("ix_uploads_media_type", "uploads", ["media_type"])
    op.create_index("ix_uploads_sha256", "uploads", ["sha256"])
    op.create_index("ix_uploads_deleted_at", "uploads", ["deleted_at"])

    # 3. Analyses Table
    op.create_table(
        "analyses",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("upload_id", sa.String(length=36), nullable=False),
        sa.Column("owner_id", sa.String(length=36), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("assessment_label", sa.String(length=64), nullable=True),
        sa.Column("assessment_score", sa.Float(), nullable=True),
        sa.Column("score_semantics", sa.String(length=64), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["upload_id"], ["uploads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analyses_upload_id", "analyses", ["upload_id"])
    op.create_index("ix_analyses_owner_id", "analyses", ["owner_id"])
    op.create_index("ix_analyses_status", "analyses", ["status"])

    # 4. Detector Results Table
    op.create_table(
        "detector_results",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("analysis_id", sa.String(length=36), nullable=False),
        sa.Column("detector_name", sa.String(length=128), nullable=False),
        sa.Column("detector_version", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("score_semantics", sa.String(length=64), nullable=True),
        sa.Column("signals_json", sa.JSON(), nullable=False),
        sa.Column("limitations_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["analysis_id"], ["analyses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_detector_results_analysis_id", "detector_results", ["analysis_id"])

    # 5. Provenance Checks Table
    op.create_table(
        "provenance_checks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("analysis_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("content_credentials_status", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["analysis_id"], ["analyses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_provenance_checks_analysis_id", "provenance_checks", ["analysis_id"])


def downgrade() -> None:
    op.drop_table("provenance_checks")
    op.drop_table("detector_results")
    op.drop_table("analyses")
    op.drop_table("uploads")
    op.drop_table("users")
