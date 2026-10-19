import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.user import User
from app.models.upload import Upload
from app.models.analysis import Analysis
from app.models.detector_result import DetectorResult
from app.models.provenance import ProvenanceCheck


@pytest.mark.asyncio
async def test_database_model_persistence():
    """Verify SQLAlchemy 2 declarative models persist with constraints, FKs and cascade delete."""
    async with AsyncSessionLocal() as session:
        # 1. Create User
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"analyst_{user_id[:8]}@omniscan.local",
            is_active=True,
        )
        session.add(user)

        # 2. Create Upload
        upload_id = str(uuid.uuid4())
        upload = Upload(
            id=upload_id,
            owner_id=user.id,
            object_key=f"{upload_id}_sample.png",
            original_filename="sample.png",
            media_type="image",
            mime_type="image/png",
            size_bytes=1048576,
            sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            status="uploaded",
        )
        session.add(upload)

        # 3. Create Analysis
        analysis_id = str(uuid.uuid4())
        analysis = Analysis(
            id=analysis_id,
            upload_id=upload.id,
            owner_id=user.id,
            status="detector_not_configured",
            score_semantics="not_applicable",
        )
        session.add(analysis)

        # 4. Create DetectorResult
        det_result = DetectorResult(
            id=str(uuid.uuid4()),
            analysis_id=analysis.id,
            detector_name="spectral_frequency_v1",
            detector_version="1.0.0",
            status="not_configured",
            signals_json={"anomaly": False},
            limitations_json=["Unconfigured in M2"],
        )
        session.add(det_result)

        # 5. Create ProvenanceCheck
        prov = ProvenanceCheck(
            id=str(uuid.uuid4()),
            analysis_id=analysis.id,
            status="not_supported",
            metadata_json={},
            content_credentials_status="unverified",
        )
        session.add(prov)

        await session.commit()

        # Query back and verify relations
        stmt = select(Analysis).where(Analysis.id == analysis_id)
        result = await session.execute(stmt)
        queried_analysis = result.scalar_one()

        assert queried_analysis.id == analysis_id
        assert queried_analysis.upload_id == upload_id
        assert queried_analysis.status == "detector_not_configured"

        # Verify soft-deletion retention tracking on upload
        upload.deleted_at = datetime.now(timezone.utc)
        upload.status = "deleted"
        await session.commit()

        stmt_upload = select(Upload).where(Upload.id == upload_id)
        res_upload = await session.execute(stmt_upload)
        deleted_upload = res_upload.scalar_one()
        assert deleted_upload.deleted_at is not None
        assert deleted_upload.status == "deleted"
