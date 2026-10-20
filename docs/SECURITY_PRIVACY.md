# OmniScan — Security & Privacy Architecture

## 1. Security Architecture Principles

OmniScan processes user-submitted media files which must be treated as inherently untrusted inputs. Security is designed with defense-in-depth across storage, execution, and networking layers.

---

## 2. Ingestion & File Upload Security

1. **Header vs Body Verification**:
   - The user-supplied `Content-Type` header and file extension are never trusted.
   - The backend validates magic numbers / file signatures (using byte inspection) against an explicit allowlist.
2. **File Size Limits**:
   - Strict size caps prevent denial-of-service and memory exhaustion attacks:
     - Image: 25 MB max
     - Audio: 50 MB max
     - Video: 150 MB max
3. **Cryptographic Integrity & Deduplication**:
   - Every file is hashed with SHA-256 during streaming upload.
   - The SHA-256 hash forms a tamper-evident media fingerprint.
4. **Filename Sanitization**:
   - Filenames are stripped of path traversal characters (`..`, `/`, `\`), null bytes (`%00`), and control codes.
   - Files are stored on disk and S3 with UUID-based keys; user filenames are only retained in the database for display.

---

## 3. Storage Security & Media Isolation

1. **Private Storage by Default**:
   - Media files are stored in private S3/MinIO buckets with all public read access disabled.
   - Access to media assets (for previews or downloads) is granted solely through expiring pre-signed URLs (e.g., valid for 15 minutes).
2. **Execution Sandboxing**:
   - FFmpeg and OpenCV media decoders are run with memory and timeout boundaries.
   - Asynchronous worker tasks handle heavy decoding off the main web thread.

---

## 4. Privacy & Media Retention Controls

1. **Data Minimization**:
   - No unnecessary telemetry or biometric identity data is retained.
   - Analysis results store extracted statistical features rather than raw biometric identifiers.
2. **Retention Policy**:
   - Configurable retention periods (default 7 days, or configurable per workspace).
3. **Hard Deletion**:
   - When a user deletes an analysis or file, the system triggers cascading hard deletion:
     - Removes S3 object
     - Removes local scratch files
     - Purges database records and associated detector results
4. **Zero-Hallucination & Honest Communication**:
   - Absence of provenance credentials is never communicated as proof of synthetic media.
   - Confidence numbers are clearly labeled as model outputs with documented limitations.

---

## 5. Authentication, Authorization & Provenance Integrity

1. **Analyst Authentication & Password Storage**:
   - Passwords are encrypted using bcrypt with high-workfactor salting (12 rounds).
   - Plaintext passwords are never logged, stored in cache, or returned in API responses.
2. **Stateless JWT Tokens**:
   - Signed with HMAC-SHA256 (`HS256`) using server-side secrets with configurable token expiration.
   - Injected via standard `Authorization: Bearer <token>` headers.
3. **Cross-User Data Isolation**:
   - Every uploaded asset and analysis session is tagged with its owner ID.
   - Invocations across user boundaries return HTTP 404 (or 403) to prevent unauthorized enumeration or ID probing attacks.
4. **Digital Provenance & C2PA Standards (ISO 19566-5)**:
   - JUMBF container chunks are parsed to inspect for cryptographic assertions and signatures.
   - Distinguishes between `verified`, `invalid` (tampered or broken claims), `no_credentials_found` (unauthenticated container), and `not_supported`.
   - Distinguishes between cryptographic assertions and unauthenticated EXIF tags, flagging generative AI tool signatures when present.
