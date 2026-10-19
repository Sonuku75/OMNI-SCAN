"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileCheck2,
  AlertCircle,
  Shield,
  FileWarning,
  CheckCircle2,
  ArrowRight,
  X,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  detectMediaTypeFromExtension,
  validateFileHeader,
  verifyMagicBytes,
  MEDIA_LIMITS,
} from "@/lib/validators";
import { formatBytes } from "@/lib/utils";
import { MediaType } from "@/types/api";

export default function AnalyzePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedType, setDetectedType] = useState<MediaType | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Upload & Analysis execution state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [apiError, setApiError] = useState<string | null>(null);

  const handleFileSelection = async (file: File) => {
    setValidationError(null);
    setApiError(null);
    setIsVerifying(true);

    const check = validateFileHeader(file);
    if (!check.valid) {
      setValidationError(check.error || "Invalid file");
      setSelectedFile(null);
      setDetectedType(null);
      setIsVerifying(false);
      return;
    }

    // Verify magic bytes
    const magicOk = await verifyMagicBytes(file);
    if (!magicOk) {
      setValidationError("File header bytes do not match expected media signatures.");
      setSelectedFile(null);
      setDetectedType(null);
      setIsVerifying(false);
      return;
    }

    setSelectedFile(file);
    setDetectedType(check.mediaType || detectMediaTypeFromExtension(file.name));
    setIsVerifying(false);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setDetectedType(null);
    setValidationError(null);
    setApiError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startAnalysis = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setApiError(null);
    setUploadStatusText("Streaming file to private storage & computing SHA-256...");

    try {
      // 1. Upload to backend
      const uploadRes = await apiClient.uploadFile(selectedFile);
      setUploadStatusText("File verified. Initializing forensic analysis task...");

      // 2. Create analysis run
      const analysisRes = await apiClient.createAnalysis(uploadRes.upload_id);
      setUploadStatusText("Task queued. Redirecting to live inspection detail...");

      // 3. Navigate to analysis inspection
      router.push(`/analyses/${analysisRes.analysis_id}`);
    } catch (err) {
      setIsUploading(false);
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError(
          "Backend API is currently in standby (Milestone 0). API integration will connect in Milestone 1."
        );
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
      <div>
        <h1 className="text-xl font-bold text-omni-text tracking-tight">
          Analyze Media Asset
        </h1>
        <p className="text-xs text-omni-muted mt-1">
          Upload images, audio recordings, or videos for forensic integrity checks and synthetic artifact detection.
        </p>
      </div>

      {/* Main Upload Dropzone */}
      <Card className="border-dashed border-2 border-omni-border p-8 text-center transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.wav,.mp3,.m4a,.mp4,.mov,.webm,.mkv,.avi"
          onChange={onFileInputChange}
        />

        {!selectedFile ? (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`cursor-pointer flex flex-col items-center justify-center py-8 rounded-xl transition-all ${
              isDragging
                ? "bg-omni-primary/5 border border-omni-primary/40 scale-[1.01]"
                : "hover:bg-omni-surfaceHover/40"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-2xl bg-omni-primary/10 border border-omni-primary/30 flex items-center justify-center text-omni-primary mb-4 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base font-semibold text-omni-text">
              Drag and drop media file here
            </h3>
            <p className="text-xs text-omni-muted mt-1 max-w-sm">
              or click to browse from your device. Files are validated for magic byte signatures.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-omni-muted">
              <span className="px-2 py-1 rounded bg-omni-bg border border-omni-border">
                Images: JPG, PNG, WEBP (Max 25MB)
              </span>
              <span className="px-2 py-1 rounded bg-omni-bg border border-omni-border">
                Audio: WAV, MP3, M4A (Max 50MB, 3min)
              </span>
              <span className="px-2 py-1 rounded bg-omni-bg border border-omni-border">
                Video: MP4, MOV, WEBM, MKV, AVI (Max 150MB, 60s)
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-omni-bg rounded-xl border border-omni-border text-left">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-omni-primary/10 border border-omni-primary/30 flex items-center justify-center text-omni-primary">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-omni-text">{selectedFile.name}</span>
                    {detectedType && <Badge variant="info">{detectedType.toUpperCase()}</Badge>}
                  </div>
                  <div className="text-xs text-omni-muted font-mono mt-0.5">
                    {formatBytes(selectedFile.size)} • Client validation passed
                  </div>
                </div>
              </div>

              {!isUploading && (
                <button
                  onClick={resetSelection}
                  className="p-1.5 rounded-lg text-omni-muted hover:text-omni-text hover:bg-omni-surfaceHover transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Upload & Ingestion Actions */}
            <div className="mt-6 pt-4 border-t border-omni-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-omni-muted flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>SHA-256 fingerprint will be generated upon upload.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetSelection}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={startAnalysis}
                  isLoading={isUploading}
                  className="gap-2 w-full sm:w-auto"
                >
                  <span>{isUploading ? "Uploading..." : "Start Analysis"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {isUploading && (
              <div className="mt-4 p-3 rounded-lg bg-omni-surface border border-omni-border text-xs text-omni-primary font-mono animate-pulse">
                {uploadStatusText}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Validation Error Notice */}
      {validationError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-3 text-rose-300 text-xs">
          <FileWarning className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-0.5">Validation Failed</strong>
            <span>{validationError}</span>
          </div>
        </div>
      )}

      {/* API Notice / Error */}
      {apiError && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-0.5">Integration Notice</strong>
            <span>{apiError}</span>
          </div>
        </div>
      )}

      {/* Security & Privacy Notice */}
      <Card className="bg-omni-surface/70 border-omni-border p-5">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-omni-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-omni-text uppercase tracking-wider font-mono">
              Privacy & Media Isolation Guarantee
            </h4>
            <p className="text-xs text-omni-muted leading-relaxed">
              Files are stored in private object storage buckets. No media is public or shared with third-party generative models without authorization. Retention policy and instant hard deletion can be managed at any time in{" "}
              <span className="text-omni-text font-medium">Settings & Retention Controls</span>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
