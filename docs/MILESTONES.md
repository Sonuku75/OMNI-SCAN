# OmniScan — Implementation Milestones & Roadmap

| Milestone | Title | Focus Area | Status | Verification Gate |
|---|---|---|---|---|
| **M0** | **Repository Foundation** | Monorepo structure, Next.js 15, TypeScript, Tailwind CSS, dark navy design system, navigation shell, typed API client scaffolding, documentation. | ✅ **Completed** | `next build` and `tsc --noEmit` pass with 0 errors. |
| **M1** | **FastAPI Foundation** | FastAPI app, versioned `/api/v1` routes, `/health` endpoint, Pydantic schemas, initial test suite. | ✅ **Completed** | Pytest 12/12 tests pass, health and v1 endpoints verified. |
| **M2** | **Database & Secure Uploads** | PostgreSQL, SQLAlchemy 2, Alembic, S3/MinIO private storage, SHA-256 fingerprinting, MIME magic check, deletion. | ✅ **Completed** | Pytest 17/17 tests pass, Alembic migrations verified, private storage isolated. |
| **M3** | **Analysis Orchestration** | Analysis state machine (`queued`, `processing`, `completed`, `detector_not_configured`, `failed`), polling, background queue. | ✅ **Completed** | Pytest 22/22 tests pass, state machine & polling verified, Next.js build clean. |
| **M4** | **Image Detector** | Image forensic adapter, spectral frequency (FFT/ELA) analysis, confidence semantics, limitation disclaimers. | ✅ **Completed** | Pytest 34/34 tests pass, image forensics & model adapter verified, Next.js build clean. |
| **M5** | **Audio Detector** | Audio forensic adapter, vocoder/cloning artifacts, spectrogram analysis, error handling. | ✅ **Completed** | Pytest 45/45 tests pass, audio forensics, STFT spectrogram & AASIST adapter verified, Next.js build clean. |
| **M6** | **Video Detector** | Bounded FFmpeg/OpenCV frame extraction, per-frame image forensics reuse, OpenCV temporal consistency checks, resource limits. | ✅ **Completed** | Pytest 57/57 tests pass, video frame sampling, temporal consistency & ViViT adapter verified, Next.js build clean. |
| **M7** | **Reports, Provenance & Auth** | Printable forensic reports (HTML/JSON/export), C2PA / EXIF provenance verifier, bcrypt + JWT authentication, cross-user isolation. | ✅ **Completed** | Pytest 63/63 tests pass, cross-user access isolation verified, Next.js build clean. |
| **M8** | **Local Hardening & Final Integration** | In-memory sliding-window rate limiting, multi-stage Dockerfiles, Docker Compose local infrastructure, zero-fabrication model adapter verification, local development guide. | ✅ **Completed** | Full pytest suite 67/67 pass, `next build` clean, local setup & test checklist verified. |
