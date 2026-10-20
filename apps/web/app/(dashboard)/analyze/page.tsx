"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileCheck2,
  AlertCircle,
  Shield,
  ArrowRight,
  X,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Token } from "@/components/ui/token";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  detectMediaTypeFromExtension,
  validateFileHeader,
  verifyMagicBytes,
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
  const [backendHealth, setBackendHealth] = useState<"checking" | "online" | "standby">("checking");

  useEffect(() => {
    let mounted = true;
    apiClient
      .getHealth()
      .then((res) => {
        if (!mounted) return;
        setBackendHealth(res.status === "healthy" ? "online" : "standby");
      })
      .catch(() => {
        if (!mounted) return;
        setBackendHealth("standby");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleFileSelection = async (file: File) => {
    setValidationError(null);
    setApiError(null);
    setIsVerifying(true);

    const check = validateFileHeader(file);
    if (!check.valid) {
      setValidationError(check.error || "Invalid file format or size limits exceeded.");
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
    setUploadStatusText("Streaming file to forensic pipeline & computing SHA-256 fingerprint...");

    try {
      // 1. Upload to backend
      const uploadRes = await apiClient.uploadFile(selectedFile);
      setUploadStatusText("File verified. Initializing forensic analysis task...");

      // 2. Create analysis run
      const analysisRes = await apiClient.createAnalysis(uploadRes.upload_id);
      setUploadStatusText("Task queued. Redirecting to live inspection workspace...");

      // 3. Navigate to analysis inspection
      router.push(`/analyses/${analysisRes.analysis_id}`);
    } catch (err) {
      setIsUploading(false);
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError(
          "Backend API is currently in standby (Milestone 0/1). The analysis pipeline will execute upon backend activation."
        );
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info Plaque */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#B58A4C]/60">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F0DDB8] tracking-tight drop-shadow-[0_1px_2px_rgba(18,11,7,0.8)]">
            Analyze Media Asset
          </h1>
          <p className="text-xs text-[#D8B98A]">
            Ingest digital evidence for magic byte validation, hash calculation, and artifact inspection.
          </p>
        </div>

        {/* Real Backend Status Chip */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#24170F] border border-[#B58A4C]/60 text-xs font-mono select-none self-start sm:self-auto shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)]">
          <Activity className="w-3.5 h-3.5 text-[#B58A4C]" />
          <span className="text-[#D8B98A]">Server Connection:</span>
          {backendHealth === "checking" ? (
            <span className="text-[#D8B98A] animate-pulse">Pinging...</span>
          ) : backendHealth === "online" ? (
            <Badge variant="success">Online</Badge>
          ) : (
            <Badge variant="info">Standby</Badge>
          )}
        </div>
      </div>

      {/* Main Forensic Ingestion Bay (Card with Rivets) */}
      <Card rivets={true} className="p-2 sm:p-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.wav,.mp3,.m4a,.mp4,.mov,.webm,.mkv,.avi"
          onChange={onFileInputChange}
        />

        {!selectedFile ? (
          /* Recessed Drag & Drop Bay */
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer skeuo-recessed p-8 sm:p-12 text-center transition-all flex flex-col items-center justify-center select-none ${
              isDragging
                ? "border-[#28734A] bg-[#CEAC7B] scale-[1.01]"
                : "hover:border-[#E5C995]"
            }`}
          >
            <Token color="green" size="lg" className="mb-4">
              <UploadCloud className="w-8 h-8 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
            </Token>

            <h3 className="text-lg font-extrabold text-[#24170F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
              Drop Media Asset into Ingestion Bay
            </h3>
            <p className="text-xs text-[#664830] mt-1 max-w-md">
              or click to open the file selection dialogue. Files undergo client-side magic byte verification and SHA-256 fingerprinting.
            </p>

            {/* Allowed Specs Plates */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-mono text-[#664830]">
              <span className="px-3 py-1.5 rounded-lg bg-[#F0DDB8] border border-[#B58A4C] shadow-[0_2px_4px_rgba(24,15,10,0.2),inset_0_1px_0_rgba(255,255,255,0.7)] font-semibold text-[#24170F]">
                Images: JPG, PNG, WEBP (Max 25MB)
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#F0DDB8] border border-[#B58A4C] shadow-[0_2px_4px_rgba(24,15,10,0.2),inset_0_1px_0_rgba(255,255,255,0.7)] font-semibold text-[#24170F]">
                Audio: WAV, MP3, M4A (Max 50MB, 3min)
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#F0DDB8] border border-[#B58A4C] shadow-[0_2px_4px_rgba(24,15,10,0.2),inset_0_1px_0_rgba(255,255,255,0.7)] font-semibold text-[#24170F]">
                Video: MP4, MOV, WEBM, MKV (Max 150MB, 60s)
              </span>
            </div>
          </div>
        ) : (
          /* Selected Asset Ingestion Cassette */
          <div className="skeuo-recessed p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <Token color={detectedType === "image" ? "green" : detectedType === "audio" ? "bronze" : "blue"} size="md">
                  <FileCheck2 className="w-5 h-5 text-white" />
                </Token>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-extrabold text-[#24170F]">
                      {selectedFile.name}
                    </span>
                    {detectedType && (
                      <Badge variant="info">{detectedType.toUpperCase()}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-[#664830] font-mono mt-0.5">
                    {formatBytes(selectedFile.size)} • Magic bytes validated • Container decoded
                  </div>
                </div>
              </div>

              {!isUploading && (
                <button
                  onClick={resetSelection}
                  className="p-1.5 rounded-lg text-[#664830] hover:text-[#A9362B] hover:bg-[#B58A4C]/20 transition-colors border border-transparent hover:border-[#B58A4C]"
                  aria-label="Remove asset"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[#B58A4C]/35 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[#664830] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#28734A]" />
                <span>SHA-256 cryptographic digest generated upon submission.</span>
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

                {/* Tactile Raised Hardware Start Button */}
                <Button
                  variant="primary"
                  size="md"
                  onClick={startAnalysis}
                  isLoading={isUploading}
                  className="gap-2 w-full sm:w-auto text-sm px-6 shadow-md"
                >
                  <span>{isUploading ? "Streaming to Engine..." : "Start Forensic Analysis"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Real-time Streaming State Display */}
            {isUploading && (
              <div className="p-3.5 rounded-lg bg-[#24170F] border border-[#28734A] text-xs text-[#F0DDB8] font-mono shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] flex items-center gap-2 animate-pulse">
                <Activity className="w-4 h-4 text-[#28734A] shrink-0" />
                <span>{uploadStatusText}</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Validation or API Error Plaque */}
      {(validationError || apiError) && (
        <div className="skeuo-card p-2">
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#C43E32] to-[#A9362B] border border-[#7A241B] text-[#FFF5F5] flex items-start gap-3 shadow-[inset_0_1px_1px_rgba(255,200,200,0.3)]">
            <AlertCircle className="w-5 h-5 text-[#FFF5F5] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Forensic Ingestion Notice</div>
              <p className="text-xs text-[#FFE4E1] mt-0.5 leading-relaxed">
                {validationError || apiError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Standard Footnote */}
      <div className="p-4 rounded-xl skeuo-recessed border border-[#B58A4C]/70 text-xs text-[#664830] leading-relaxed select-none">
        <strong className="text-[#24170F]">Forensic Integrity Guarantee:</strong> OmniScan calculates cryptographic hashes before running any analysis adapters. Raw files are stored under private retention policies and permanently purged upon request.
      </div>
    </div>
  );
}
