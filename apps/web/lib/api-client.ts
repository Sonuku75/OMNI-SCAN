import {
  AnalysisCreateResponse,
  AnalysisDetail,
  AnalysisListResponse,
  AuthResponse,
  ForensicReport,
  HealthResponse,
  SystemSettingsResponse,
  UploadResponse,
  User,
} from "@/types/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let memoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("omniscan_token") || memoryToken;
  }
  return memoryToken;
}

export function setAuthToken(token: string | null): void {
  memoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("omniscan_token", token);
      document.cookie = `omniscan_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    } else {
      localStorage.removeItem("omniscan_token");
      document.cookie = "omniscan_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    }
  }
}

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...extra };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export class ApiError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let details: unknown = undefined;
    try {
      const data = await response.json();
      if (data?.error?.message) {
        errorMessage = data.error.message;
        details = data.error.details;
      } else if (data?.detail) {
        errorMessage = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // response is not json
    }
    throw new ApiError(errorMessage, response.status, details);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const apiClient = {
  getBaseUrl(): string {
    return BASE_URL;
  },

  async getHealth(): Promise<HealthResponse> {
    try {
      const res = await fetch(`${BASE_URL}/health`, {
        cache: "no-store",
      });
      return handleResponse<HealthResponse>(res);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return {
        status: "unhealthy",
        version: "unknown",
        timestamp: new Date().toISOString(),
        services: {
          database: "disconnected",
          storage: "disconnected",
          detectors: {
            image: "not_configured",
            audio: "not_configured",
            video: "not_configured",
            provenance: "not_configured",
          },
        },
      };
    }
  },

  // --- Auth endpoints ---
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const data = await handleResponse<AuthResponse>(res);
    setAuthToken(data.access_token);
    return data;
  },

  async register(data: { email: string; password: string; full_name?: string }): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const authData = await handleResponse<AuthResponse>(res);
    setAuthToken(authData.access_token);
    return authData;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    return handleResponse<User>(res);
  },

  logout(): void {
    const token = getAuthToken();
    if (token) {
      try {
        fetch(`${BASE_URL}/api/v1/auth/logout`, {
          method: "POST",
          headers: getHeaders(),
        }).catch(() => {});
      } catch {}
    }
    setAuthToken(null);
  },

  async getSettings(): Promise<SystemSettingsResponse> {
    const res = await fetch(`${BASE_URL}/api/v1/settings`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    return handleResponse<SystemSettingsResponse>(res);
  },

  // --- Uploads & Analyses ---
  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const headers = getHeaders();
    delete headers["Content-Type"]; // Let browser set multipart boundary

    const res = await fetch(`${BASE_URL}/api/v1/uploads`, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse<UploadResponse>(res);
  },

  async createAnalysis(
    uploadId: string,
    requestedChecks: string[] = ["synthetic_media", "provenance"]
  ): Promise<AnalysisCreateResponse> {
    const res = await fetch(`${BASE_URL}/api/v1/analyses`, {
      method: "POST",
      headers: getHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        upload_id: uploadId,
        requested_checks: requestedChecks,
      }),
    });
    return handleResponse<AnalysisCreateResponse>(res);
  },

  async listAnalyses(params?: {
    page?: number;
    pageSize?: number;
    mediaType?: string;
    status?: string;
  }): Promise<AnalysisListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.pageSize) query.set("page_size", params.pageSize.toString());
    if (params?.mediaType && params.mediaType !== "all") query.set("media_type", params.mediaType);
    if (params?.status && params.status !== "all") query.set("status", params.status);

    const qs = query.toString();
    const url = `${BASE_URL}/api/v1/analyses${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      cache: "no-store",
    });
    return handleResponse<AnalysisListResponse>(res);
  },

  async getAnalysis(analysisId: string): Promise<AnalysisDetail> {
    const res = await fetch(`${BASE_URL}/api/v1/analyses/${analysisId}`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    return handleResponse<AnalysisDetail>(res);
  },

  async deleteAnalysis(analysisId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/v1/analyses/${analysisId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return handleResponse<void>(res);
  },

  async retryAnalysis(analysisId: string): Promise<AnalysisCreateResponse> {
    const res = await fetch(`${BASE_URL}/api/v1/analyses/${analysisId}/retry`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse<AnalysisCreateResponse>(res);
  },

  async getReport(analysisId: string): Promise<ForensicReport> {
    const res = await fetch(`${BASE_URL}/api/v1/analyses/${analysisId}/report`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    return handleResponse<ForensicReport>(res);
  },

  getReportHtmlUrl(analysisId: string): string {
    return `${BASE_URL}/api/v1/analyses/${analysisId}/report/html`;
  },

  getReportExportUrl(analysisId: string, format: "json" | "html" = "json"): string {
    return `${BASE_URL}/api/v1/analyses/${analysisId}/report/export?format=${format}`;
  },
};
