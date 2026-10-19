# OmniScan — Implementation Milestones & Roadmap

| Milestone | Title | Focus Area | Status | Verification Gate |
|---|---|---|---|---|
| **M0** | **Repository Foundation** | Monorepo structure, Next.js 15, TypeScript, Tailwind CSS, dark navy design system, navigation shell, typed API client scaffolding, documentation. | ✅ **Completed** | `next build` and `tsc --noEmit` pass with 0 errors. |
| **M1** | **FastAPI Foundation** | FastAPI app, versioned `/api/v1` routes, `/health` endpoint, Pydantic schemas, initial test suite. | ✅ **Completed** | Pytest 12/12 tests pass, health and v1 endpoints verified. |
| **M2** | **Database & Secure Uploads** | PostgreSQL, SQLAlchemy 2, Alembic, S3/MinIO private storage, SHA-256 fingerprinting, MIME magic check, deletion. | ✅ **Completed** | Pytest 17/17 tests pass, Alembic migrations verified, private storage isolated. |
| **M3** | **Analysis Orchestration** | Analysis state machine (`queued`, `processing`, `completed`, `detector_not_configured`, `failed`), polling, background queue. | ✅ **Completed** | Pytest 22/22 tests pass, state machine & polling verified, Next.js build clean. |
| **M4** | **Image Detector** | Image forensic adapter, spectral frequency (FFT/ELA) analysis, confidence semantics, limitation disclaimers. | ✅ **Completed** | Pytest 34/34 tests pass, image forensics & model adapter verified, Next.js build clean. |
| **M5** | **Audio Detector** | Audio forensic adapter, vocoder/cloning artifacts, spectrogram analysis, error handling. | ✅ **Completed** | Pytest 45/45 tests pass, audio forensics, STFT spectrogram & AASIST adapter verified, Next.js build clean. |
| **M6** | **Video Detector** | Bounded FFmpeg frame extraction, OpenCV temporal consistency checks, resource limits. | Pending | Video frame sampler tests and timeout enforcement tests. |
| **M7** | **Reports, Provenance & Auth** | Printable forensic reports, C2PA / EXIF provenance checker, JWT auth, retention purge controls. | Pending | Grounding assertion tests, auth protection tests. |
| **M8** | **Hardening & Deployment** | Multi-stage Dockerfiles, Docker Compose stack, rate limiting, structured audit logging, demo script. | Pending | Full stack startup via `docker compose up`, security review. |
