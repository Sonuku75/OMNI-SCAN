# OmniScan — API Contracts & Specification (v1)

Base URL: `/api/v1`
Content-Type: `application/json`

---

## 1. System Health

### `GET /health`
Returns system status, active dependencies, and database connectivity.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-10-20T01:00:00Z",
  "services": {
    "database": "connected",
    "storage": "connected",
    "detectors": {
      "image": "available",
      "audio": "not_configured",
      "video": "not_configured"
    }
  }
}
```

---

## 2. Uploads

### `POST /api/v1/uploads`
Accepts multipart form-data upload. Performs file signature validation, size check, SHA-256 digest computation, and private object storage persisting.

**Form Data**:
- `file`: Binary file (Supported: JPG, PNG, WEBP, WAV, MP3, M4A, MP4, MOV)

**Response `201 Created`**:
```json
{
  "upload_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "original_filename": "evidence_sample.png",
  "media_type": "image",
  "mime_type": "image/png",
  "size_bytes": 1048576,
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "status": "uploaded",
  "created_at": "2026-10-20T01:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: Empty or malformed payload.
- `413 Payload Too Large`: Exceeds configured size limit.
- `415 Unsupported Media Type`: Magic bytes do not match permitted media types.

---

## 3. Analyses

### `POST /api/v1/analyses`
Creates an analysis run on an uploaded media asset.

**Request Body**:
```json
{
  "upload_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "requested_checks": [
    "synthetic_media",
    "provenance"
  ]
}
```

**Response `202 Accepted`**:
```json
{
  "analysis_id": "1c7e9a8b-4a5c-4e32-9c12-3f8d2b9e1a4f",
  "upload_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "queued",
  "created_at": "2026-10-20T01:00:05Z"
}
```

### `GET /api/v1/analyses`
Lists previous analyses with pagination and filtering.

**Query Parameters**:
- `page`: default `1`
- `page_size`: default `20`
- `media_type`: `image` | `audio` | `video`
- `status`: `queued` | `processing` | `completed` | `failed` | `detector_not_configured`

**Response `200 OK`**:
```json
{
  "items": [
    {
      "analysis_id": "1c7e9a8b-4a5c-4e32-9c12-3f8d2b9e1a4f",
      "upload_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "filename": "evidence_sample.png",
      "media_type": "image",
      "status": "completed",
      "assessment_label": "suspicious_manipulation",
      "assessment_score": 0.78,
      "score_semantics": "calibrated_probability",
      "created_at": "2026-10-20T01:00:05Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

### `GET /api/v1/analyses/{analysis_id}`
Retrieves detailed analysis findings, detector signals, and provenance data.

**Response `200 OK`**:
```json
{
  "analysis_id": "1c7e9a8b-4a5c-4e32-9c12-3f8d2b9e1a4f",
  "status": "completed",
  "assessment_label": "suspicious_manipulation",
  "assessment_score": 0.78,
  "score_semantics": "calibrated_probability",
  "summary": "Forensic frequency analysis revealed high-frequency spectral clustering typical of generative diffusion artifacts.",
  "upload": {
    "upload_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "filename": "evidence_sample.png",
    "media_type": "image",
    "size_bytes": 1048576,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "detector_results": [
    {
      "detector_name": "spectral_frequency_v1",
      "detector_version": "1.2.0",
      "status": "completed",
      "score": 0.78,
      "score_semantics": "calibrated_probability",
      "signals": {
        "fft_anomaly_ratio": 0.82,
        "ela_difference_norm": 0.14
      },
      "limitations": [
        "High-contrast artificial graphics can generate false positive spectral peaks."
      ]
    }
  ],
  "provenance": {
    "status": "no_credentials_found",
    "metadata": {
      "exif_present": true,
      "camera_model": null
    }
  },
  "created_at": "2026-10-20T01:00:05Z",
  "completed_at": "2026-10-20T01:00:12Z"
}
```

### `DELETE /api/v1/analyses/{analysis_id}`
Deletes the analysis record and triggers storage cleanup for the associated media.

**Response `204 No Content`**

---

## 4. Reports

### `GET /api/v1/analyses/{analysis_id}/report`
Returns a structured, print-ready forensic analysis document including disclaimers and grounding traces.

**Response `200 OK`**:
```json
{
  "report_id": "rep_9a8b7c",
  "analysis_id": "1c7e9a8b-4a5c-4e32-9c12-3f8d2b9e1a4f",
  "generated_at": "2026-10-20T01:00:20Z",
  "summary_statement": "The media contains statistical artifacts consistent with synthetic generation.",
  "evidence_points": [
    "Azimuthal average in 2D FFT shows pronounced high-frequency periodic spikes.",
    "No C2PA provenance manifest present in file metadata."
  ],
  "human_review_recommended": true,
  "disclaimer": "Detection results are probabilistic and do not constitute absolute forensic proof."
}
```
