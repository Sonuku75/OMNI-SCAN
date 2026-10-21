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
  Image as ImageIcon,
  Mic,
  Video,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Token } from "@/components/ui/token";
import { SectionHeader } from "@/components/ui/panels";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  detectMediaTypeFromExtension,
  validateFileHeader,
  verifyMagicBytes,
} from "@/lib/validators";
import { formatBytes } from "@/lib/utils";
import { MediaType, SystemSettingsResponse } from "@/types/api";

export default function AnalyzePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedType, setDetectedType] = useState<MediaType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "image" | "video" | "audio">("all");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Upload & execution state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<"checking" | "online" | "standby">("checking");
  const [settings, setSettings] = useState<SystemSettingsResponse | null>(null);

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

    apiClient
      .getSettings()
      .then((res) => {
        if (!mounted) return;
        setSettings(res);
      })
      .catch(() => {});

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
      setValidationError(check.error || "File format or size limits exceeded.");
      setSelectedFile(null);
      setDetectedType(null);
      setIsVerifying(false);
      return;
    }

    // Verify magic bytes
    const magicOk = await verifyMagicBytes(file);
    if (!magicOk) {
      setValidationError("File header bytes do not match expected container signature.");
      setSelectedFile(null);
      setDetectedType(null);
      setIsVerifying(false);
      return;
    }

    const detected = check.mediaType || detectMediaTypeFromExtension(file.name);
    setSelectedFile(file);
    setDetectedType(detected);
    if (detected) {
      setSelectedCategory(detected);
    }
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
    setUploadStatusText("Streaming file to storage vault and computing SHA-256 fingerprint...");

    try {
      // 1. Upload to backend
      const uploadRes = await apiClient.uploadFile(selectedFile);
      setUploadStatusText("File verified. Queueing forensic analysis task...");

      // 2. Create analysis run
      const analysisRes = await apiClient.createAnalysis(uploadRes.upload_id);
      setUploadStatusText("Analysis queued. Redirecting to inspection workspace...");

      // 3. Navigate to analysis inspection
      router.push(`/analyses/${analysisRes.analysis_id}`);
    } catch (err) {
      setIsUploading(false);
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError("Backend service is currently unavailable. Please check API connectivity.");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SectionHeader
        title="Analyze Media Asset"
        description="Ingest digital evidence for magic byte validation, hash calculation, and artifact inspection."
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#24170F] border border-[#B58A4C]/60 text-xs font-mono select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)]">
            <Activity className="w-3.5 h-3.5 text-[#B58A4C]" />
            <span className="text-[#D8B98A] hidden sm:inline">Backend:</span>
            {backendHealth === "checking" ? (
              <span className="text-[#D8B98A] animate-pulse text-[11px]">Pinging...</span>
            ) : backendHealth === "online" ? (
              <Badge variant="success">Online</Badge>
            ) : (
              <Badge variant="info">Standby</Badge>
            )}
          </div>
        }
      />

      {/* Unified Modality Category Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory("image");
            if (fileInputRef.current) {
              fileInputRef.current.accept = ".jpg,.jpeg,.png,.webp";
            }
          }}
          className={`p-3.5 rounded-xl border text-left transition-all select-none cursor-pointer ${
            selectedCategory === "image"
              ? "bg-[#D8B98A] border-[#173D2D] shadow-[0_2px_8px_rgba(23,61,45,0.25),inset_0_1px_0_rgba(255,255,255,0.6)] ring-2 ring-[#28734A]"
              : "skeuo-recessed border-[#B58A4C]/60 hover:border-[#B58A4C]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#28734A]/20 text-[#173D2D] border border-[#28734A]/40">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-[#302013] font-mono">
                Image Detection
              </div>
              <div className="text-[10px] text-[#604A34]">
                Diffusion, GANs, ELA & FFT
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory("video");
            if (fileInputRef.current) {
              fileInputRef.current.accept = ".mp4,.mov,.webm,.mkv,.avi";
            }
          }}
          className={`p-3.5 rounded-xl border text-left transition-all select-none cursor-pointer ${
            selectedCategory === "video"
              ? "bg-[#D8B98A] border-[#245C88] shadow-[0_2px_8px_rgba(36,92,136,0.25),inset_0_1px_0_rgba(255,255,255,0.6)] ring-2 ring-[#245C88]"
              : "skeuo-recessed border-[#B58A4C]/60 hover:border-[#B58A4C]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#245C88]/20 text-[#164060] border border-[#245C88]/40">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-[#302013] font-mono">
                Video Deepfakes
              </div>
              <div className="text-[10px] text-[#604A34]">
                Keyframes & Temporal Motion
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory("audio");
            if (fileInputRef.current) {
              fileInputRef.current.accept = ".wav,.mp3,.m4a";
            }
          }}
          className={`p-3.5 rounded-xl border text-left transition-all select-none cursor-pointer ${
            selectedCategory === "audio"
              ? "bg-[#D8B98A] border-[#C97A24] shadow-[0_2px_8px_rgba(201,122,36,0.25),inset_0_1px_0_rgba(255,255,255,0.6)] ring-2 ring-[#C97A24]"
              : "skeuo-recessed border-[#B58A4C]/60 hover:border-[#B58A4C]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#C97A24]/20 text-[#8B4513] border border-[#C97A24]/40">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-[#302013] font-mono">
                Audio & Voice Cloning
              </div>
              <div className="text-[10px] text-[#604A34]">
                Speech Spoof & Vocoders
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Main Ingestion Bay */}
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

            <h3 className="text-lg font-extrabold text-[#302013] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
              Drop Media Asset into Ingestion Bay
            </h3>
            <p className="text-xs text-[#604A34] mt-1 max-w-md">
              or click to open the file dialogue. Media undergoes client-side magic byte verification and SHA-256 fingerprinting.
            </p>

            {/* Allowed Specs Plates */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-mono text-[#604A34]">
              <span className="px-3 py-1.5 rounded-lg bg-[#F0DDB8] border border-[#B58A4C] shadow-[0_2px_4px_rgba(24,15,10,0.2),inset_0_1px_0_rgba(255,255,255,0.7)] font-semibold text-[#302013] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#28734A]" />
                Images: JPG, PNG, WEBP (Max {settings?.limits?.image_max_mb || 25}MB)
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#F0DDB8] border border-[#B58A4C] shadow-[0_2px_4px_rgba(24,15,10,0.2),inset_0_1px_0_rgba(255,255,255,0.7)] font-semibold text-[#302013] flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-[#C97A24]" />
                Audio: WAV, MP3, M4A (Max {settings?.limits?.audio_max_mb || 50}MB)
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#F0DDB8] border border-[#B58A4C] shadow-[0_2px_4px_rgba(24,15,10,0.2),inset_0_1px_0_rgba(255,255,255,0.7)] font-semibold text-[#302013] flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-[#245C88]" />
                Video: MP4, MOV, WEBM (Max {settings?.limits?.video_max_mb || 150}MB)
              </span>
            </div>
          </div>
        ) : (
          /* Selected Asset Ingestion Cassette */
          <div className="skeuo-recessed p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <Token
                  color={
                    detectedType === "image"
                      ? "green"
                      : detectedType === "audio"
                      ? "bronze"
                      : "blue"
                  }
                  size="md"
                >
                  <FileCheck2 className="w-5 h-5 text-white" />
                </Token>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-extrabold text-[#302013] break-all">
                      {selectedFile.name}
                    </span>
                    {detectedType && (
                      <Badge variant="info">{detectedType.toUpperCase()}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-[#604A34] font-mono mt-0.5">
                    {formatBytes(selectedFile.size)} • Magic bytes verified • Container validated
                  </div>
                </div>
              </div>

              {!isUploading && (
                <button
                  onClick={resetSelection}
                  className="p-1.5 rounded-lg text-[#604A34] hover:text-[#A9362B] hover:bg-[#B58A4C]/20 transition-colors border border-transparent hover:border-[#B58A4C]"
                  aria-label="Remove asset"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[#B58A4C]/35 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[#604A34] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#28734A]" />
                <span>SHA-256 cryptographic digest calculated upon submission.</span>
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

            {/* Live Streaming State Display */}
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
              <div className="font-bold text-sm">Ingestion Notice</div>
              <p className="text-xs text-[#FFE4E1] mt-0.5 leading-relaxed">
                {validationError || apiError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Guarantee Footnote */}
      <div className="p-4 rounded-xl skeuo-recessed border border-[#B58A4C]/70 text-xs text-[#604A34] leading-relaxed select-none">
        <strong className="text-[#302013]">Integrity Guarantee:</strong> OmniScan calculates cryptographic hashes before running any analysis adapters. Raw files are stored under private retention policies and permanently purged upon request.
      </div>
    </div>
  );
}
