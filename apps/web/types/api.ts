export type MediaType = "image" | "audio" | "video";

export type AnalysisStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "detector_not_configured";

export type DetectorStatus =
  | "available"
  | "completed"
  | "failed"
  | "not_configured"
  | "disabled";

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  services: {
    database: "connected" | "disconnected" | "not_configured";
    storage: "connected" | "disconnected" | "not_configured";
    detectors: {
      image: DetectorStatus;
      audio: DetectorStatus;
      video: DetectorStatus;
      provenance: DetectorStatus;
    };
  };
}

export interface UploadResponse {
  upload_id: string;
  original_filename: string;
  media_type: MediaType;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  status: "uploaded" | "processing" | "deleted";
  created_at: string;
}

export interface DetectorResult {
  detector_name: string;
  detector_version: string;
  status: DetectorStatus;
  score?: number | null;
  score_semantics?: "raw_score" | "calibrated_probability" | "anomaly_index" | "not_applicable";
  signals: Record<string, unknown>;
  limitations: string[];
  error?: string | null;
}

export interface ProvenanceCheckResult {
  status: "verified" | "invalid" | "incomplete" | "no_credentials_found" | "not_supported" | "failed";
  metadata: Record<string, unknown>;
  content_credentials_status: string;
  details?: string;
}

export interface AnalysisSummary {
  analysis_id: string;
  upload_id: string;
  filename: string;
  media_type: MediaType;
  status: AnalysisStatus;
  assessment_label?: string | null;
  assessment_score?: number | null;
  score_semantics?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface AnalysisDetail {
  analysis_id: string;
  status: AnalysisStatus;
  assessment_label: string | null;
  assessment_score: number | null;
  score_semantics: string | null;
  summary: string | null;
  upload: {
    upload_id: string;
    filename: string;
    media_type: MediaType;
    mime_type: string;
    size_bytes: number;
    sha256: string;
    duration_ms?: number | null;
    width?: number | null;
    height?: number | null;
    created_at: string;
  };
  detector_results: DetectorResult[];
  provenance: ProvenanceCheckResult;
  human_review_recommended: boolean;
  limitations_disclosure: string[];
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface AnalysisListResponse {
  items: AnalysisSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface AnalysisCreateRequest {
  upload_id: string;
  requested_checks?: string[];
}

export interface AnalysisCreateResponse {
  analysis_id: string;
  upload_id: string;
  status: AnalysisStatus;
  created_at: string;
}

export interface ForensicReport {
  report_id: string;
  analysis_id: string;
  generated_at: string;
  media_metadata: {
    filename: string;
    sha256: string;
    media_type: MediaType;
    size_bytes: number;
  };
  summary_statement: string;
  evidence_points: string[];
  detector_breakdown: Array<{
    name: string;
    version: string;
    status: string;
    score: number | null;
    semantics: string | null;
  }>;
  provenance_summary: string;
  provenance_status?: string | null;
  provenance_details?: Record<string, unknown> | null;
  assessment_label?: string | null;
  assessment_score?: number | null;
  score_semantics?: string | null;
  limitations_and_uncertainty: string[];
  human_review_recommended: boolean;
  disclaimer: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
