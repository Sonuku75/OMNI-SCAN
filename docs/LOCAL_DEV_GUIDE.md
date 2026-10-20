# OmniScan — Local Development, Hardening & Testing Guide

This guide provides instructions for running, testing, hardening, and troubleshooting OmniScan locally on a developer machine.

---

## 1. Local Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Developer Local Machine                     │
├──────────────────────────────┬──────────────────────────────┤
│      Frontend (Port 3000)    │     Backend (Port 8000)      │
│   Next.js 15 (App Router)    │    FastAPI + Uvicorn 0.34    │
│   React 19 + Tailwind CSS    │     SQLAlchemy 2 + Pydantic  │
│   TypeScript (Strict Mode)   │    OpenCV + SciPy + PIL      │
├──────────────────────────────┼──────────────────────────────┤
│        Storage Layer         │      Security & Rate Limiter │
│   Local Disk / MinIO (9000)  │  Sliding-Window In-Memory    │
│   SHA-256 Fingerprinting     │  JWT (HS256) + Bcrypt Auth   │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 2. Developer Machine Startup Options

OmniScan supports two local execution workflows:
1. **Bare-Metal Workflow** (Recommended for rapid development: uses local Python virtualenv and Node.js).
2. **Containerized Workflow** (Uses `docker compose` to run PostgreSQL, MinIO, Redis, FastAPI, and Next.js).

---

### Workflow A: Bare-Metal Startup (Fast & Lightweight)

#### Step 1: Start Backend API
```powershell
# In terminal 1 (from repository root):
cd services/api

# Create and activate virtual environment (if not already created)
python -m venv venv
.\venv\Scripts\activate   # On Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations (or let FastAPI auto-initialize SQLite on startup)
alembic upgrade head

# Launch FastAPI development server with auto-reload
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Base URL: `http://localhost:8000`
- Swagger UI Documentation: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/health`

#### Step 2: Start Frontend Web Dashboard
```powershell
# In terminal 2 (from repository root):
cd apps/web

# Install npm dependencies
npm install

# Start Next.js development server
npm run dev
```
- Dashboard URL: `http://localhost:3000`

---

### Workflow B: Docker Compose Startup

```powershell
# From repository root:
cd infra

# Launch full development stack (DB, Redis, MinIO, API, Web)
docker compose up --build
```
- Web UI: `http://localhost:3000`
- API: `http://localhost:8000`
- MinIO Object Storage Console: `http://localhost:9001` (User: `minioadmin`, Pass: `minioadmin`)

To shut down:
```powershell
docker compose down
```

---

## 3. Configuration & Environment Variables

Create `.env` inside `services/api/.env` (or copy from `services/api/.env.example`):

```bash
# Core API Settings
ENVIRONMENT=development
PROJECT_NAME="OmniScan Forensics API"
VERSION=1.0.0
API_V1_PREFIX=/api/v1

# Security & Secret Keys (must be at least 32 characters in production)
SECRET_KEY=dev-insecure-secret-key-32chars-min-change-in-prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Rate Limiting Controls
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=120
AUTH_RATE_LIMIT_PER_MINUTE=30

# CORS Allowed Origins
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# Database (Default: SQLite local zero-config fallback)
DATABASE_URL=sqlite+aiosqlite:///./omniscan.db
DATABASE_SYNC_URL=sqlite:///./omniscan.db
# For Docker / Local PostgreSQL:
# DATABASE_URL=postgresql+asyncpg://omniscan:omniscan_password@localhost:5432/omniscan_db

# Object Storage (Default: Local filesystem storage)
STORAGE_PROVIDER=local
STORAGE_BUCKET=omniscan-media
LOCAL_STORAGE_DIR=./local_storage
# For MinIO / S3:
# STORAGE_PROVIDER=minio
# S3_ENDPOINT_URL=http://localhost:9000
# S3_ACCESS_KEY=minioadmin
# S3_SECRET_KEY=minioadmin

# Media Constraints
MAX_UPLOAD_SIZE_IMAGE_MB=25
MAX_UPLOAD_SIZE_AUDIO_MB=50
MAX_UPLOAD_SIZE_VIDEO_MB=150
VIDEO_MAX_DURATION_SECONDS=60
VIDEO_MAX_FRAMES_SAMPLED=100

# Pretrained Model Weights (Leave unset to use deterministic heuristics with detector_not_configured)
# IMAGE_MODEL_PATH=/path/to/weights/resnet50.onnx
# AUDIO_MODEL_PATH=/path/to/weights/aasist.pt
# VIDEO_MODEL_PATH=/path/to/weights/vivit.onnx
```

---

## 4. Local End-to-End Testing Checklist

Follow this checklist to verify the full forensic pipeline on your machine:

- [ ] **1. Health & Readiness Probe**:
  - Request: `GET http://localhost:8000/health`
  - Verify `status: "healthy"` and services for `database`, `storage`, and `detectors` (`image`, `audio`, `video`, `provenance`) report available states.
- [ ] **2. Analyst Registration & Login**:
  - Open `http://localhost:3000/register`.
  - Register an analyst account (`analyst@agency.example.com`).
  - Verify redirect to `/dashboard` and JWT token stored in browser storage.
- [ ] **3. Media Upload & Fingerprinting**:
  - Navigate to `http://localhost:3000/analyze`.
  - Upload a test image (`.png` or `.jpg`).
  - Verify immediate SHA-256 computation and private storage ingestion.
- [ ] **4. Analysis Orchestration & State Polling**:
  - Start analysis inspection.
  - Verify polling transitions cleanly from `queued` &rarr; `processing` &rarr; `completed`.
- [ ] **5. Modular Forensic Inspections**:
  - **Image Forensics**: Inspect 2D Fourier (FFT) spectrum, Error Level Analysis (ELA), and Laplacian edge variance.
  - **Audio Forensics**: Test WAV/MP3 speech asset; verify STFT spectrogram, zero-crossing dynamics, and vocoder rolloff check.
  - **Video Forensics**: Test MP4/MOV clip; verify deterministic frame sampling and OpenCV temporal consistency index.
  - **AI Model Status**: Verify that unconfigured deep learning adapters return explicit `detector_not_configured` badges without fake scores.
- [ ] **6. Provenance & C2PA Inspection**:
  - Verify container C2PA manifest badge (`verified`, `invalid`, `no_credentials_found`, or `not_supported`).
  - Verify EXIF camera and software metadata extraction.
- [ ] **7. Grounded Forensic Dossier & Exports**:
  - Open `/reports/{analysis_id}`.
  - Click **Download JSON** and verify full schema telemetry download.
  - Click **Standalone HTML** or **Print Dossier** and verify clean printable view.
- [ ] **8. Rate Limiting & Abuse Prevention**:
  - Send rapid requests to `/api/v1/auth/login` to confirm HTTP 429 throttling after limit.
- [ ] **9. Cross-User Data Isolation**:
  - Verify that User B cannot access User A's private analyses or reports (returns 404).

---

## 5. Troubleshooting Guide

### Port Already In Use (3000, 8000, 5432, 9000)
- **Problem**: `listen EADDRINUSE: address already in use :::3000` or `Errno 10048 (WinError 10048)`.
- **Solution (Windows PowerShell)**:
  ```powershell
  # Find PID using the port:
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess
  # Or use another port:
  uvicorn app.main:app --port 8001
  ```

### Missing FFmpeg or OpenCV Runtime Dependencies
- **Problem**: `cv2` or `ffmpeg` command fails with missing DLL or shared object (`libgl1`, `libglib2.0-0`).
- **Solution**:
  - **Windows**: OpenCV and FFmpeg binaries are bundled in `opencv-python-headless` and standard PATH. Ensure `ffmpeg` is accessible on PATH if running bare-metal video sampling.
  - **Linux / Docker**: Ensure `apt-get install -y ffmpeg libgl1 libglib2.0-0` is installed (already included in `services/api/Dockerfile`).

### SQLite File Locking or Migration Conflicts
- **Problem**: `sqlite3.OperationalError: database is locked`.
- **Solution**:
  - OmniScan uses WAL mode and async connections. If a test locks the local DB, delete `omniscan.db` and run `alembic upgrade head`.

### Rate Limit Exceeded During Automated Testing
- **Problem**: API returns HTTP 429 `RATE_LIMIT_EXCEEDED` during heavy manual testing.
- **Solution**:
  - Set `RATE_LIMIT_ENABLED=false` in `services/api/.env` or increase `RATE_LIMIT_REQUESTS_PER_MINUTE=600`.
