# OmniScan — AI Deepfake, Voice Clone & Synthetic Media Detection Platform

[![Technology Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20FastAPI%20%7C%20OpenCV%20%7C%20PostgreSQL-cyan.svg)](TECH_STACK_MAPPING.md)
[![Milestone](https://img.shields.io/badge/Milestone-M0%20Repository%20Foundation-mint.svg)](docs/MILESTONES.md)

OmniScan is a multi-modal synthetic media forensics and deepfake detection platform designed to scrutinize images, audio recordings, and videos for algorithmic manipulation, generative artifacts, and voice cloning.

---

## 🎯 Six Mandatory Technology Categories

OmniScan incorporates the six mandatory hackathon technology categories:
1. **Software Development**: Next.js 15 (App Router), React 19, TypeScript strict mode, Tailwind CSS, Python FastAPI, SQLAlchemy 2, Alembic, PostgreSQL.
2. **AI / Machine Learning**: Modular detector adapters (`BaseDetector`), replaceable inference pipelines, calibrated confidence semantics, explicit `detector_not_configured` handling.
3. **Computer Vision**: OpenCV, bounded FFmpeg/ffprobe frame extraction, temporal consistency analysis, frequency domain FFT/ELA forensics.
4. **Cybersecurity**: Real MIME/signature magic byte validation, SHA-256 fingerprinting, private S3/MinIO storage, pre-signed URLs, rate limiting, and hard deletion/retention controls.
5. **Natural Language Processing (NLP)**: Evidence-grounded forensic report generation, citation of extracted signals, zero-hallucination constraint.
6. **Cloud Computing**: Multi-stage Docker containers, Docker Compose, Redis async workers for heavy video/audio processing, 12-factor configuration.

Detailed technical mapping is available in [TECH_STACK_MAPPING.md](TECH_STACK_MAPPING.md).

---

## 📁 Repository Structure

```
omniscan/
  apps/
    web/                 # Next.js App Router frontend application
  services/
    api/                 # FastAPI REST API, detectors & services
  infra/
    docker-compose.yml   # PostgreSQL, MinIO, Redis local infrastructure
  docs/                  # Architecture, API contracts, data model, security
  TECH_STACK_MAPPING.md  # 6-category traceability matrix
  README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on v22)
- Python 3.11+
- Git

### 1. Web Application (`apps/web`)
```bash
cd apps/web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### 2. Backend API (`services/api`)
```bash
cd services/api
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Open [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive Swagger API documentation.

---

## ⚖️ Forensic Principles
- **Probabilistic Detection**: Detection scores are probabilistic model outputs, never conclusive proof of authenticity or deception.
- **Zero Fabrication**: The system never generates fake scores, mock probabilities, or ungrounded forensic evidence. If an inference model is unavailable, OmniScan reports `detector_not_configured`.
- **Human in the Loop**: Consequential decisions should always involve human expert review.
