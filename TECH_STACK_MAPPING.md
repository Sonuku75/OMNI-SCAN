# OmniScan — Mandatory Technology Stack Mapping & Requirements Matrix

This document provides the authoritative mapping for the **six mandatory source-image technology categories** for **OmniScan** (AI Deepfake, Voice Clone & Synthetic Media Detection Platform).

---

## 1. Executive Category Mapping Matrix

| # | Technology Category | Selected Technology & Frameworks | Primary Codebase Locations | Verification & Testing Strategy | Implementation Milestone & Status |
|---|---|---|---|---|---|
| **1** | **Software Development** | Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS, Python 3.11+ FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, PostgreSQL | `apps/web/*`<br>`services/api/app/main.py`<br>`services/api/app/api/v1/*`<br>`services/api/app/models/*` | TypeScript `tsc --noEmit`<br>Next.js production build (`next build`)<br>FastAPI pytest suite (`services/api/tests`) | **M0** (Web App: ✅)<br>**M1** (FastAPI Core: ✅)<br>**M2** (DB & ORM: ✅) |
| **2** | **AI / Machine Learning** | Modular detector adapters (`BaseDetector`), replaceable inference pipelines (PyTorch, ONNX Runtime, HuggingFace Transformers), calibrated uncertainty semantics, model versioning | `services/api/app/detectors/base.py`<br>`services/api/app/detectors/registry.py`<br>`services/api/app/detectors/image/`<br>`services/api/app/detectors/audio/`<br>`services/api/app/detectors/video/` | Pytest detector unit tests<br>Evaluation dataset benchmarking<br>`detector_not_configured` graceful handling tests | **M3** (Orchestration & State Machine: ✅)<br>**M4** (Image Forensics & Pretrained Model Adapter: ✅)<br>**M5** (Audio Forensics & Voice Clone Model Adapter: ✅)<br>**M6** (Video Adapter: Planned) |
| **3** | **Computer Vision** | OpenCV (`opencv-python-headless`), FFmpeg & `ffprobe`, frame extraction, temporal consistency analysis, spectral/frequency domain and Error Level Analysis (ELA) | `services/api/app/detectors/video/frame_extractor.py`<br>`services/api/app/detectors/image/forensics.py`<br>`services/api/app/detectors/video/temporal.py` | Pytest video frame sampling tests<br>Constrained decoding boundary tests (resolution, fps, duration limits)<br>Corrupt media handling tests | **M4** (Image CV Signals, 2D FFT & ELA Forensics: ✅)<br>**M6** (Video Extraction & CV Analysis: Planned) |
| **4** | **Cybersecurity** | MIME magic byte sniffing (`python-magic`/`filetype`), SHA-256 media fingerprinting, upload limits, private S3/MinIO storage with pre-signed URLs, rate limiting, JWT/auth session checks, audit logging, safe sandboxed media processing, data retention & permanent deletion controls | `services/api/app/core/security.py`<br>`services/api/app/api/v1/endpoints/uploads.py`<br>`services/api/app/storage/s3.py`<br>`services/api/app/services/retention.py`<br>`apps/web/lib/validators.ts` | Upload security test suite (polyglot files, zip bombs, oversized payloads)<br>Authz privilege boundary tests<br>Storage access isolation tests<br>Retention purge tests | **M2** (Upload & Private Storage Security: ✅)<br>**M7** (Auth & Retention Security)<br>**M8** (Hardening & Auditing) |
| **5** | **Natural Language Processing (NLP)** | Evidence-grounded forensic explanation generator, structured JSON summary synthesis, template-based certainty disclaimers, zero-hallucination constraint enforcement (no fabricated scores or hallucinated artifacts) | `services/api/app/services/report_generator.py`<br>`services/api/app/services/nlp_explainer.py`<br>`apps/web/features/reports/*` | Report synthesis test suite<br>Grounding assertion tests (verifying every claim maps directly to detector signals)<br>Output disclaimer validation | **M7** (Reports & NLP Explanations) |
| **6** | **Cloud Computing** | Docker multi-stage containers, Docker Compose local infra (PostgreSQL, MinIO, Redis), asynchronous task queue (Redis + background worker) for heavy video/audio processing, 12-factor environment configuration, health check probes | `infra/docker-compose.yml`<br>`services/api/Dockerfile`<br>`apps/web/Dockerfile`<br>`services/api/app/jobs/*`<br>`services/api/app/core/config.py` | Docker compose service health checks<br>Async worker task execution tests<br>Config validation startup tests | **M0** (Infra structure: ✅)<br>**M1** (Health check: ✅)<br>**M2** (Storage adapter & MinIO config: ✅)<br>**M6** (Async video worker)<br>**M8** (Production Docker) |

---

## 2. Detailed Category Breakdown & Traceability

### 1. Software Development
- **Requirements**:
  - Unified monorepo structure with modern web dashboard and backend API.
  - Strict type safety from backend schemas to frontend UI components.
  - Responsive, accessible dashboard following a cybersecurity/forensic design system.
  - Versioned REST API (`/api/v1`) with standard HTTP status codes, structured errors, and health monitoring.
- **Components**:
  - `apps/web`: Next.js 15 App Router, React 19, Tailwind CSS, TypeScript.
  - `services/api`: FastAPI, Pydantic v2, SQLAlchemy 2, Alembic migrations.
- **Acceptance Criteria**:
  - Frontend builds with 0 TypeScript and lint errors.
  - All dashboard routes render responsively across mobile, tablet, and desktop.
  - Backend API conforms to OpenAPI 3.1 specification.

### 2. AI / Machine Learning
- **Requirements**:
  - Pluggable `BaseDetector` interface allowing interchangeable model backends without application rewrites.
  - Explicit score semantics (`raw_score`, `calibrated_probability`, `threshold`, `uncertainty_interval`).
  - Zero fabrication: never generate random scores or hallucinated confidence levels.
  - If weights or API credentials are missing, system returns `detector_not_configured` gracefully.
- **Components**:
  - `services/api/app/detectors/base.py`: Abstract base detector contract.
  - `services/api/app/detectors/registry.py`: Dynamic detector registry with status tracking.
  - Adapters for Image (synthetic artifacts), Audio (vocoder/cloning artifacts), and Video (temporal & facial inconsistencies).
- **Acceptance Criteria**:
  - Each detector provides version metadata, limitation disclosures, and verified signals.
  - Unit tests prove `detector_not_configured` is returned when dependencies are absent.

### 3. Computer Vision
- **Requirements**:
  - Safe media parsing and frame extraction using OpenCV and FFmpeg/ffprobe.
  - Hard resource bounds: maximum video duration, max resolution, frame downsampling, and decode timeouts.
  - Forensic image checks: frequency domain analysis (FFT/DCT), Error Level Analysis (ELA), noise residual variance.
  - Video temporal analysis: frame-to-frame optical flow consistency and facial landmark stability.
- **Components**:
  - `services/api/app/detectors/video/frame_extractor.py`: Bounded FFmpeg frame sampler.
  - `services/api/app/detectors/image/cv_signals.py`: OpenCV forensic filtering & frequency analysis.
  - `services/api/app/detectors/video/temporal.py`: Temporal jitter and landmark continuity analysis.
- **Acceptance Criteria**:
  - Malformed or oversized video fails cleanly within timeout limits without crashing the process.
  - Frame extraction yields uniform sampling rates with memory boundaries enforced.

### 4. Cybersecurity
- **Requirements**:
  - Strict defense-in-depth on file intake: validate file signatures (magic bytes) against declared MIME types.
  - Compute SHA-256 hash immediately upon upload for forensic integrity and deduplication.
  - Store media in private object storage; no public URLs. Media access via expiring signed URLs only.
  - Comprehensive audit trail, granular media retention policies, and user-initiated permanent deletion.
  - Protection against upload attacks: path traversal sanitization, size caps, zip-bomb prevention, parser isolation.
- **Components**:
  - `services/api/app/core/security.py`: Token validation, hash utilities, filename sanitization.
  - `services/api/app/api/v1/endpoints/uploads.py`: Magic byte check, size validation, SHA-256 computation.
  - `services/api/app/storage/`: S3/MinIO adapter generating private presigned URLs.
  - `services/api/app/services/retention.py`: Configurable retention expiry and hard deletion.
- **Acceptance Criteria**:
  - Uploading an executable disguised as an image is rejected with `415 Unsupported Media Type`.
  - Deleted media files are wiped from storage and database cascading to detector results.

### 5. Natural Language Processing (NLP)
- **Requirements**:
  - Evidence-grounded report generation synthesizing multi-modal detection signals into plain-English summaries.
  - Grounding invariant: Every assertion in the report must directly reference a validated detector signal. No inventing findings or altering scores.
  - Structured risk disclosures: Explicitly enumerate model limitations, false-positive risks, and human-review recommendations.
- **Components**:
  - `services/api/app/services/nlp_explainer.py`: Grounded explanation generator.
  - `services/api/app/services/report_generator.py`: PDF/printable forensic summary builder.
  - `apps/web/features/reports/*`: Report visualization UI with evidence links.
- **Acceptance Criteria**:
  - Generated reports include mandatory disclaimers and cite exact signal evidence.
  - Reports for unconfigured detectors clearly communicate unavailability rather than synthetic data.

### 6. Cloud Computing
- **Requirements**:
  - 12-factor cloud-ready application containerized with multi-stage Dockerfiles.
  - Docker Compose orchestrating Web, API, PostgreSQL, Redis, and MinIO object storage.
  - Asynchronous background worker architecture for video and audio processing to prevent blocking HTTP endpoints.
  - Configurable storage adapters (local filesystem, MinIO, AWS S3, Google Cloud Storage).
  - Health check endpoints (`/health` and `/api/health`) for container orchestrators (Kubernetes / ECS).
- **Components**:
  - `infra/docker-compose.yml`: Local cloud emulation stack.
  - `services/api/Dockerfile` & `apps/web/Dockerfile`: Production multi-stage container builds.
  - `services/api/app/jobs/`: Asynchronous queue worker integration.
  - `services/api/app/core/config.py`: Environment-driven configuration.
- **Acceptance Criteria**:
  - `docker compose up` brings up the entire functional stack locally.
  - Heavy video tasks execute asynchronously via background queue with status pollable via REST.

---

## 3. Strict Operating Invariants

1. **Probabilistic Nature of Detection**: Detection is never binary certainty. Confidence scores are model outputs, not definitive proof of authenticity.
2. **Zero Hallucination / Zero Fabrication**: No random mock scores, fake metrics, or fabricated evidence will ever be presented as live predictions.
3. **Explicit Unconfigured State**: If weights or cloud credentials are missing, the system unambiguously returns `detector_not_configured`.
4. **Data Isolation & Privacy**: Secrets stay in environment variables. Uploaded media is private by default and purged according to retention policy.
