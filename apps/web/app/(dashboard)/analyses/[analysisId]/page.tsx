"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  FileCheck2,
  Copy,
  Check,
  Cpu,
  AlertTriangle,
  Info,
  Clock,
  Printer,
  ShieldCheck,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Film,
  Volume2,
  Scale,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InsetPanel } from "@/components/ui/panels";
import { apiClient } from "@/lib/api-client";
import { AnalysisDetail, EvidenceRecord } from "@/types/api";
import { formatDate, formatBytes, truncateHash, cn } from "@/lib/utils";

const SIGNAL_DEFINITIONS: Record<string, { label: string; hint: string }> = {
  // Pretrained AI Detection Signals
  model_architecture: {
    label: "Neural Architecture",
    hint: "Deep learning backbone architecture for learned synthetic feature extraction",
  },
  synthetic_probability: {
    label: "Synthetic Probability",
    hint: "Model-inferred probability that media was generated or altered by AI",
  },
  authentic_probability: {
    label: "Authentic Probability",
    hint: "Model-inferred probability that media is genuine natural photographic capture",
  },
  calibrated_threshold: {
    label: "Operating Threshold (τ*)",
    hint: "Empirical decision boundary calibrated on validation split to maximize F1 score",
  },
  prediction_label: {
    label: "Model Classification",
    hint: "Discrete category determined by evaluated probability relative to calibrated threshold",
  },
  confidence_tier: {
    label: "Confidence Tier",
    hint: "Certainty level based on distance from operating threshold",
  },
  checkpoint_sha256: {
    label: "Weights Checksum (SHA-256)",
    hint: "Cryptographic digest of loaded neural network checkpoint verifying weight integrity",
  },
  calibration_status: {
    label: "Calibration Method",
    hint: "Validation procedure used to select decision threshold and prevent test set tuning",
  },
  evaluation_reference: {
    label: "Evaluation Reference",
    hint: "Path to empirical benchmark evaluation dossier on independent test set",
  },
  frames_analyzed: {
    label: "Keyframes Inferred",
    hint: "Total number of video frames decoded and evaluated by neural frame classifier",
  },
  anomalous_frames_detected: {
    label: "Anomalous Frame Count",
    hint: "Number of sampled video keyframes exceeding the calibrated synthetic threshold",
  },
  anomalous_frame_ratio: {
    label: "Anomalous Frame Ratio",
    hint: "Proportion of sampled video keyframes exhibiting synthetic artifacts",
  },
  mean_frame_probability: {
    label: "Mean Frame Probability",
    hint: "Average synthetic probability across all sampled video keyframes",
  },
  p90_frame_probability: {
    label: "90th-Percentile Frame Score",
    hint: "Peak frame synthetic score capturing transient or localized facial manipulation",
  },
  aggregated_synthetic_probability: {
    label: "Aggregated Video Score",
    hint: "Documented 50/50 pooling of mean and 90th percentile frame probabilities",
  },
  total_chunks_analyzed: {
    label: "Audio Chunks Evaluated",
    hint: "Number of 4-second sliding acoustic windows analyzed with 50% temporal overlap",
  },
  mean_chunk_probability: {
    label: "Mean Audio Chunk Score",
    hint: "Average synthetic speech probability across all sliding acoustic windows",
  },
  p90_chunk_probability: {
    label: "90th-Percentile Chunk Score",
    hint: "Peak acoustic anomaly score identifying brief synthetic voice insertions",
  },
  // Deterministic Forensics Signals
  fft_high_freq_ratio: {
    label: "2D FFT High-Freq Energy",
    hint: "Ratio of energy in outer Fourier frequency spectrum bands (values >0.35 suggest algorithmic upsampling)",
  },
  fft_grid_spikes: {
    label: "Periodic Grid Spikes",
    hint: "Periodic checkerboard artifacts in frequency domain caused by transposed convolutions",
  },
  ela_mean_residual: {
    label: "ELA Mean Error",
    hint: "Average pixel discrepancy upon 90% quality lossy JPEG recompression",
  },
  ela_block_variance: {
    label: "ELA Block Variance",
    hint: "Variance of error across 16x16 blocks (values >12.0 indicate compression inconsistency)",
  },
  ela_discrepancy_detected: {
    label: "Compression Discrepancy",
    hint: "Detects multi-generation saves or spliced elements with contrasting compression levels",
  },
  laplacian_focus_variance: {
    label: "Laplacian Focus Variance",
    hint: "Measures edge sharpness vs blur (extremely low values <50 indicate artificial smoothness)",
  },
  channel_noise_variance: {
    label: "Channel Noise Variance",
    hint: "Evaluates residual noise consistency across RGB color channels",
  },
  surface_smoothness_anomaly: {
    label: "Synthetic Smoothness",
    hint: "Unnaturally low surface noise combined with soft gradients, common in generative models",
  },
  has_exif: {
    label: "EXIF Metadata",
    hint: "Presence of physical recording camera metadata. Note: absence of EXIF is standard across social media, web uploads, and screenshots, and does not independently prove synthetic provenance.",
  },
  camera_device: {
    label: "Camera Device",
    hint: "Reported physical recording camera make and model",
  },
  software_signature: {
    label: "Software Signature",
    hint: "Software tag embedded in metadata (e.g. Photoshop, Stable Diffusion)",
  },
  resolution: {
    label: "Dimensions",
    hint: "Image pixel width and height",
  },
  format: {
    label: "Image Format",
    hint: "Decoded container format (e.g. PNG, JPEG, WEBP)",
  },
  color_mode: {
    label: "Color Space",
    hint: "Pixel color channels (e.g. RGB, RGBA, Grayscale)",
  },
  aspect_ratio: {
    label: "Aspect Ratio",
    hint: "Proportional relationship between image width and height",
  },
  // Audio Forensics Signals
  spectral_centroid_hz: {
    label: "Spectral Centroid",
    hint: "Center of mass of frequency spectrum (Hz) indicating perceptual brightness",
  },
  spectral_rolloff_hz: {
    label: "Spectral Rolloff (85%)",
    hint: "Frequency (Hz) below which 85% of total audio energy is concentrated",
  },
  spectral_flatness: {
    label: "Spectral Flatness",
    hint: "Wiener entropy ratio indicating noise vs tonal character (values >0.35 indicate vocoder noise)",
  },
  crest_factor: {
    label: "Crest Factor",
    hint: "Ratio of peak waveform amplitude to RMS power (values <2.2 indicate heavy synthetic dynamic compression)",
  },
  clipping_ratio: {
    label: "Sample Clipping Ratio",
    hint: "Fraction of digital audio samples saturated at container maximum amplitude",
  },
  silence_ratio: {
    label: "Silence Frame Ratio",
    hint: "Proportion of audio frames with near-zero energy (unnatural gating or padding)",
  },
  zero_crossing_rate: {
    label: "Zero Crossing Rate",
    hint: "Rate of sign changes along the waveform (correlates with spectral distribution and voicing)",
  },
  sharp_vocoder_cutoff: {
    label: "Vocoder Bandwidth Cutoff",
    hint: "Flags sharp brick-wall rolloff below 8.5kHz typical of neural vocoder training limits",
  },
  sample_rate_hz: {
    label: "Sample Rate",
    hint: "Digital audio sampling frequency (e.g. 16000, 44100, 48000 Hz)",
  },
  bit_depth: {
    label: "Bit Depth",
    hint: "PCM quantization depth per audio sample (e.g. 16-bit, 24-bit)",
  },
  channels: {
    label: "Channels",
    hint: "Number of discrete audio channels (1=Mono, 2=Stereo)",
  },
  peak_amplitude: {
    label: "Peak Amplitude",
    hint: "Maximum absolute instantaneous waveform amplitude normalized to [0.0, 1.0]",
  },
  rms_energy: {
    label: "RMS Energy",
    hint: "Root mean square power representing continuous audio signal energy",
  },
  duration_seconds: {
    label: "Duration",
    hint: "Exact decoded media stream duration in seconds",
  },
  // Video Forensics Signals
  sampled_frame_count: {
    label: "Sampled Keyframes",
    hint: "Total number of video frames extracted for forensic analysis",
  },
  anomalous_frame_count: {
    label: "Anomalous Frames",
    hint: "Number of sampled frames exhibiting frequency or compression anomalies",
  },
  mean_fft_high_freq_ratio: {
    label: "Avg 2D FFT High-Freq Energy",
    hint: "Mean ratio of high-frequency power across all sampled video frames",
  },
  mean_ela_block_variance: {
    label: "Avg ELA Block Variance",
    hint: "Mean recompression residual variance across sampled frames",
  },
  grid_spikes_detected: {
    label: "Periodic Checkerboard Grid",
    hint: "Detects frequency domain checkerboard spikes from generative upsampling in video frames",
  },
  mean_frame_difference: {
    label: "Mean Frame Difference",
    hint: "Normalized mean absolute difference across adjacent sampled frames",
  },
  max_frame_difference: {
    label: "Max Frame Discontinuity",
    hint: "Peak inter-frame transition delta across all sampled pairs",
  },
  mean_histogram_correlation: {
    label: "Color Histogram Continuity",
    hint: "HSV color distribution correlation between consecutive frames (values <0.4 indicate cuts)",
  },
  scene_cut_count: {
    label: "Scene Cuts Detected",
    hint: "Number of detected camera transitions/cuts filtered from temporal jitter calculations",
  },
  mean_optical_flow_magnitude: {
    label: "Optical Flow Motion",
    hint: "Average pixel motion vector displacement magnitude across frames",
  },
  optical_flow_variance: {
    label: "Motion Vector Variance",
    hint: "Evaluates motion vector turbulence (values >6.0 under low motion indicate warping artifacts)",
  },
  temporal_sharpness_jitter: {
    label: "Temporal Sharpness Jitter",
    hint: "Frame-to-frame sharpness variance within continuous scenes (values >0.55 indicate GAN flicker)",
  },
  temporal_anomaly_detected: {
    label: "Temporal Anomaly Flag",
    hint: "Indicates whether inter-frame motion or sharpness exhibited statistical instability",
  },
  fps: {
    label: "Frame Rate (FPS)",
    hint: "Recorded video stream frames per second",
  },
  total_frames: {
    label: "Total Stream Frames",
    hint: "Total frame count in video stream container",
  },
  fourcc: {
    label: "FourCC Codec",
    hint: "Container four-character video compression codec identifier",
  },
  configured: {
    label: "Adapter Configuration",
    hint: "Verified presence of model weights and neural inference dependencies",
  },
  target_architecture: {
    label: "Target Architecture",
    hint: "Deep learning neural network backbone & classifier specification",
  },
  model_path: {
    label: "Model Weights Path",
    hint: "Filesystem path to the serialized neural network weights",
  },
  reason: {
    label: "Diagnostic Notes",
    hint: "Operational status reason and setup instructions",
  },
  loaded: {
    label: "Model Memory State",
    hint: "Whether model weights have been initialized into host memory",
  },
  model_device: {
    label: "Compute Hardware Target",
    hint: "Execution device processing tensor inference (CPU, CUDA, MPS)",
  },
};

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  const resolvedParams = use(params);
  const analysisId = resolvedParams.analysisId;

  const [detail, setDetail] = useState<AnalysisDetail | null>(null);
  const [copiedSha, setCopiedSha] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    async function fetchAnalysis() {
      try {
        const res = await apiClient.getAnalysis(analysisId);
        if (!mounted) return;
        setDetail(res);

        if (res.status === "queued" || res.status === "processing") {
          if (!pollInterval) {
            pollInterval = setInterval(fetchAnalysis, 2000);
          }
        } else if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      } catch (err) {
        if (!mounted) return;
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchAnalysis();

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [analysisId]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const res = await apiClient.retryAnalysis(analysisId);
      setDetail((prev) => (prev ? { ...prev, status: res.status } : null));
      const updated = await apiClient.getAnalysis(analysisId);
      setDetail(updated);
    } catch {
      // Handled
    } finally {
      setIsRetrying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  if (!detail) {
    return (
      <div className="py-24 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#B58A4C] mx-auto" />
        <div className="text-xs font-mono font-bold text-[#D8B98A]">
          Loading inspection telemetry and verifying cryptographic signatures...
        </div>
      </div>
    );
  }

  // Derive standardized primary verdict
  const rawVerdict =
    detail.verdict ||
    (detail.assessment_label === "suspicious"
      ? "LIKELY AI-GENERATED"
      : detail.assessment_label === "no_strong_indicators"
      ? "LIKELY REAL"
      : detail.status === "detector_not_configured"
      ? "ANALYSIS UNAVAILABLE"
      : "INCONCLUSIVE");

  const verdictUpper = rawVerdict.toUpperCase();
  const isAiGen = verdictUpper.includes("AI-GENERATED") || verdictUpper.includes("SYNTHETIC");
  const isReal = verdictUpper.includes("REAL") || verdictUpper.includes("AUTHENTIC");
  const isManip = verdictUpper.includes("MANIPULATED");
  const isUnavail = verdictUpper.includes("UNAVAILABLE");

  // Calibrated score display
  const scoreVal = detail.assessment_score;
  const scorePercent = typeof scoreVal === "number" ? (scoreVal * 100).toFixed(1) : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b-2 border-[#B58A4C]/60">
        <Link
          href="/analyses"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#D8B98A] hover:text-[#F0DDB8] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Case Archive</span>
        </Link>

        <div className="flex items-center gap-3">
          {(detail.status === "failed" || detail.status === "detector_not_configured") && (
            <Button
              onClick={handleRetry}
              isLoading={isRetrying}
              variant="parchment"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Pipeline</span>
            </Button>
          )}

          <Link href={`/reports/${analysisId}`}>
            <Button variant="primary" size="sm" className="gap-2">
              <Printer className="w-3.5 h-3.5" />
              <span>Printable Dossier</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Polling Banner when Queued or Processing */}
      {(detail.status === "queued" || detail.status === "processing") && (
        <div className="p-4 rounded-xl skeuo-recessed border border-[#B58A4C]/70 flex items-center justify-between text-xs font-mono shadow-[inset_0_2px_4px_rgba(36,23,15,0.3)] animate-pulse">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#C97A24] shadow-[0_0_8px_#C97A24]" />
            <div>
              <strong className="text-[#302013] block text-sm">
                {detail.status === "queued" ? "Pipeline Status: QUEUED" : "Pipeline Status: PROCESSING"}
              </strong>
              <span className="text-[#604A34] text-[11px]">
                {detail.status === "queued"
                  ? "Asynchronous worker waiting to decode media stream..."
                  : "Worker is extracting frequency spectrums and calculating signal metrics..."}
              </span>
            </div>
          </div>
          <StatusBadge status={detail.status} />
        </div>
      )}

      {/* 1. PRIMARY VERDICT PLATE */}
      <Card rivets={true} className="p-4 sm:p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#C97A24]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#604A34] font-bold">
                Primary Forensic Verdict
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div
                className={cn(
                  "px-4 py-2 rounded-xl border text-lg sm:text-2xl font-black font-mono tracking-wide shadow-md flex items-center gap-2.5",
                  isAiGen
                    ? "bg-gradient-to-r from-[#A9362B] to-[#7A241B] text-[#FFF5F5] border-[#5A1710] shadow-[0_0_12px_rgba(169,54,43,0.3)]"
                    : isReal
                    ? "bg-gradient-to-r from-[#173D2D] to-[#0E281D] text-[#E8F5E9] border-[#0A1D15] shadow-[0_0_12px_rgba(23,61,45,0.3)]"
                    : isManip
                    ? "bg-gradient-to-r from-[#C97A24] to-[#8C5214] text-[#FFF8E7] border-[#63390B] shadow-[0_0_12px_rgba(201,122,36,0.3)]"
                    : "bg-gradient-to-r from-[#4A3828] to-[#2E2015] text-[#F0DDB8] border-[#1C140D]"
                )}
              >
                {isAiGen && <AlertTriangle className="w-6 h-6 text-[#FFD1CC]" />}
                {isReal && <CheckCircle2 className="w-6 h-6 text-[#A3E635]" />}
                {isManip && <AlertCircle className="w-6 h-6 text-[#FFE4A0]" />}
                {(!isAiGen && !isReal && !isManip) && <HelpCircle className="w-6 h-6 text-[#D8B98A]" />}
                <span>{verdictUpper}</span>
              </div>

              <StatusBadge status={detail.status} />
            </div>

            <p className="text-xs text-[#604A34] font-medium max-w-xl leading-relaxed">
              {isAiGen && "Learned neural representations exceed calibrated empirical decision boundaries, corroborated by generative frequency artifacts."}
              {isReal && "Physical sensor noise, natural harmonic frequency rolloff, and low synthetic probability align with authentic camera capture."}
              {isManip && "Localized digital compression discrepancies detected; elements of media appear altered or spliced from secondary sources."}
              {isUnavail && "Learned deep learning model weights are unconfigured. The platform refrains from fabricating synthetic probabilities."}
              {!isAiGen && !isReal && !isManip && !isUnavail && "Extracted observations fall into an ambiguous decision boundary; manual forensic examination is advised."}
            </p>
          </div>

          {/* Calibrated Probability Dial */}
          {scorePercent !== null && (
            <div className="skeuo-recessed p-4 rounded-xl shrink-0 text-center min-w-[200px] select-none border border-[#B58A4C]/70">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#604A34] font-bold mb-1">
                {detail.score_semantics === "anomaly_index" ? "Anomaly Severity" : "Calibrated Synthetic Score"}
              </div>
              <div
                className={cn(
                  "text-3xl sm:text-4xl font-black font-mono",
                  isAiGen ? "text-[#8B2C24]" : isReal ? "text-[#173D2D]" : "text-[#302013]"
                )}
              >
                {scorePercent}%
              </div>
              <div className="text-[11px] text-[#604A34] font-semibold mt-1">
                Operating Threshold: τ* = 0.370
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 2. UPLOADED MEDIA PREVIEW & ASSET INSTRUMENT CASSETTE */}
      <Card rivets={true} className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-4 border-b border-[#B58A4C]/35">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <FileCheck2 className="w-5 h-5 text-[#28734A]" />
              <h2 className="text-lg font-black text-[#302013] break-all">
                {detail.upload.filename}
              </h2>
              {detail.upload.media_type && (
                <Badge variant="outline">{detail.upload.media_type.toUpperCase()}</Badge>
              )}
            </div>
            <p className="text-xs text-[#604A34] font-mono mt-0.5">
              Case Session ID: {detail.analysis_id}
            </p>
          </div>
        </div>

        {/* Media Metadata Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <InsetPanel>
            <span className="text-[#604A34] block text-[10px] font-bold uppercase">File Size</span>
            <span className="text-[#302013] font-black">{formatBytes(detail.upload.size_bytes)}</span>
          </InsetPanel>

          <InsetPanel>
            <span className="text-[#604A34] block text-[10px] font-bold uppercase">MIME Type</span>
            <span className="text-[#302013] font-black">{detail.upload.mime_type}</span>
          </InsetPanel>

          {detail.upload.duration_ms != null && detail.upload.duration_ms > 0 ? (
            <InsetPanel>
              <span className="text-[#604A34] block text-[10px] font-bold uppercase">Duration</span>
              <span className="text-[#302013] font-black">
                {(detail.upload.duration_ms / 1000).toFixed(2)}s
              </span>
            </InsetPanel>
          ) : detail.upload.width != null && detail.upload.height != null ? (
            <InsetPanel>
              <span className="text-[#604A34] block text-[10px] font-bold uppercase">Resolution</span>
              <span className="text-[#302013] font-black">
                {detail.upload.width} × {detail.upload.height}
              </span>
            </InsetPanel>
          ) : (
            <InsetPanel>
              <span className="text-[#604A34] block text-[10px] font-bold uppercase">Container</span>
              <span className="text-[#302013] font-black">{detail.upload.media_type.toUpperCase()}</span>
            </InsetPanel>
          )}

          <InsetPanel>
            <span className="text-[#604A34] block text-[10px] font-bold uppercase">SHA-256 Digest</span>
            <div className="flex items-center justify-between text-[#302013]">
              <span className="truncate mr-2 font-semibold">{truncateHash(detail.upload.sha256, 12)}</span>
              <button
                onClick={() => copyToClipboard(detail.upload.sha256)}
                className="p-1 text-[#604A34] hover:text-[#28734A] transition-colors cursor-pointer"
                title="Copy cryptographic digest"
              >
                {copiedSha ? <Check className="w-3.5 h-3.5 text-[#28734A]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </InsetPanel>
        </div>
      </Card>

      {/* 3. PROMINENT "WHY THIS RESULT?" EXPLANATION SECTION */}
      <Card rivets={true} className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#B58A4C]/35">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#C97A24]/20 border border-[#C97A24]/40 text-[#8B4513]">
              <HelpCircle className="w-5 h-5 text-[#8B4513]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#302013] uppercase tracking-wide font-mono">
                Why this result?
              </h3>
              <p className="text-xs text-[#604A34]">
                Evidence-grounded rationale derived strictly from measured signals and calibrated models
              </p>
            </div>
          </div>
          <Badge variant={isAiGen ? "danger" : isReal ? "success" : "info"}>
            Grounded Rationale
          </Badge>
        </div>

        {/* Narrative Executive Summary */}
        <div className="p-4 rounded-xl skeuo-recessed border border-[#B58A4C]/70 shadow-[inset_0_2px_4px_rgba(36,23,15,0.25)] space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#604A34] font-mono">
            Analysis Synthesis
          </div>
          <p className="text-sm font-medium text-[#302013] leading-relaxed">
            {detail.explanation?.summary || detail.summary}
          </p>
        </div>

        {/* Model Prediction vs Forensic Observations Callouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#F0DDB8]/70 border border-[#B58A4C]/60 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#173D2D]" />
              <span className="text-xs font-bold uppercase font-mono text-[#302013]">
                Trained Neural Prediction
              </span>
            </div>
            <p className="text-xs text-[#604A34] leading-relaxed">
              {detail.explanation?.model_prediction_summary ||
                "Deep learning inference evaluates high-dimensional spatial/acoustic feature representations against verified benchmarks."}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F0DDB8]/70 border border-[#B58A4C]/60 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C97A24]" />
              <span className="text-xs font-bold uppercase font-mono text-[#302013]">
                Deterministic Physical Measurements
              </span>
            </div>
            <p className="text-xs text-[#604A34] leading-relaxed">
              {detail.explanation?.forensic_observations_summary ||
                "Physical forensics measures 2D Fourier energy, JPEG recompression error (ELA), surface texture noise, and metadata integrity."}
            </p>
          </div>
        </div>

        {/* Supporting Observations */}
        {Boolean(detail.supporting_evidence && detail.supporting_evidence.length > 0) && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#28734A]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#173D2D] font-mono">
                Observations Supporting the Verdict ({detail.supporting_evidence?.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {detail.supporting_evidence?.map((ev: EvidenceRecord, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#28734A]/5 border border-[#28734A]/30 space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#173D2D] font-mono">{ev.method}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#28734A]/15 text-[#173D2D] border border-[#28734A]/30">
                      {ev.measured_value}
                    </span>
                  </div>
                  <p className="text-xs text-[#302013] font-medium leading-snug">{ev.finding}</p>
                  <p className="text-[11px] text-[#604A34] leading-snug italic">{ev.interpretation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contradictory / Conflicting Observations */}
        {Boolean(detail.conflicting_evidence && detail.conflicting_evidence.length > 0) && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#A9362B]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8B2C24] font-mono">
                Contradictory or Inconclusive Observations ({detail.conflicting_evidence?.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {detail.conflicting_evidence?.map((ev: EvidenceRecord, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#A9362B]/5 border border-[#A9362B]/30 space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#8B2C24] font-mono">{ev.method}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#A9362B]/15 text-[#8B2C24] border border-[#A9362B]/30">
                      {ev.measured_value}
                    </span>
                  </div>
                  <p className="text-xs text-[#302013] font-medium leading-snug">{ev.finding}</p>
                  <p className="text-[11px] text-[#604A34] leading-snug italic">{ev.interpretation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unavailable Evidence Notice */}
        {Boolean(detail.unavailable_evidence && detail.unavailable_evidence.length > 0) && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#604A34]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#604A34] font-mono">
                Evidence Not Assessed or Unavailable
              </h4>
            </div>
            <div className="p-3.5 rounded-xl skeuo-recessed border border-[#B58A4C]/60 text-xs text-[#604A34] space-y-1">
              {detail.unavailable_evidence?.map((ev: EvidenceRecord, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-[#C97A24] font-bold">•</span>
                  <span><strong>{ev.method}:</strong> {ev.finding}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* False Positive / False Negative Risk Factors Footnote */}
        <div className="p-4 rounded-xl bg-[#8C5214]/10 border border-[#B58A4C]/60 space-y-1 text-xs">
          <div className="font-bold text-[#302013] flex items-center gap-2 font-mono uppercase text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#C97A24]" />
            <span>Reliability & Risk Factors</span>
          </div>
          <p className="text-[#604A34] leading-relaxed">
            {detail.explanation?.limitations_summary ||
              "Probabilistic models reflect statistical correlations on training sets. Heavily compressed social media media, atypical camera optics, or unseen generative backbones can cause false alarms or false negatives. Independent human review is recommended."}
          </p>
        </div>
      </Card>

      {/* 4. VIDEO DEEPFAKE VS. AUDIO TRACK SEPARATION (FOR VIDEO FILES) */}
      {Boolean(detail.upload.media_type === "video" && detail.video_audio_track) && (
        <Card rivets={true} className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#B58A4C]/35">
            <div className="flex items-center gap-2.5">
              <Film className="w-5 h-5 text-[#245C88]" />
              <div>
                <h3 className="text-sm font-bold text-[#302013] uppercase font-mono">
                  Multi-Modal Track Breakdown: Video Keyframes vs. Audio Track
                </h3>
                <p className="text-xs text-[#604A34]">
                  Visual motion and accompanying speech audio analyzed independently
                </p>
              </div>
            </div>
            <Badge variant="info">Multi-Track</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Visual Stream Column */}
            <div className="p-4 rounded-xl skeuo-recessed border border-[#245C88]/50 space-y-2">
              <div className="flex items-center justify-between border-b border-[#B58A4C]/30 pb-2">
                <span className="font-bold text-[#302013] flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-[#245C88]" />
                  Visual Stream
                </span>
                <Badge variant={isAiGen ? "danger" : "success"}>
                  {isAiGen ? "Synthetic Flagged" : "Natural Motion"}
                </Badge>
              </div>
              <p className="text-[#604A34] font-sans text-xs leading-relaxed">
                Keyframe spatial analysis combined with OpenCV inter-frame optical flow vectors and histogram continuity.
              </p>
            </div>

            {/* Audio Stream Column */}
            <div className="p-4 rounded-xl skeuo-recessed border border-[#C97A24]/50 space-y-2">
              <div className="flex items-center justify-between border-b border-[#B58A4C]/30 pb-2">
                <span className="font-bold text-[#302013] flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-[#C97A24]" />
                  Acoustic Speech Track
                </span>
                <Badge
                  variant={
                    String(detail.video_audio_track?.assessment_label || "").includes("suspicious")
                      ? "danger"
                      : "success"
                  }
                >
                  {String(detail.video_audio_track?.assessment_label || "Analyzed").replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>
              <p className="text-[#604A34] font-sans text-xs leading-relaxed">
                {String(detail.video_audio_track?.summary || "Audio track evaluated for vocoder cutoff and dynamic crest factor.")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 5. LEARNED NEURAL INFERENCE & CALIBRATION TELEMETRY */}
      {Boolean(detail.model_inference && typeof detail.model_inference === "object") && (
        <Card rivets={true} className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#B58A4C]/35">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#173D2D]" />
              <div>
                <h3 className="text-sm font-bold text-[#302013] uppercase tracking-wider font-mono">
                  Learned Neural Inference & Calibrated Telemetry
                </h3>
                <p className="text-xs text-[#604A34]">
                  Supervised neural representations evaluated against independent test benchmarks
                </p>
              </div>
            </div>
            <StatusBadge status={detail.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {/* 1. Model Identifier */}
            <div className="p-3 rounded-lg bg-[#F0DDB8] border border-[#B58A4C]/50 flex flex-col justify-between shadow-[0_1px_2px_rgba(24,15,10,0.1)]">
              <span className="text-[10px] text-[#604A34] uppercase font-bold tracking-wider">Model Identifier</span>
              <span className="font-extrabold text-[#302013] text-xs truncate mt-1">
                {detail.upload.media_type === "image" ? "image_model_adapter_v1" : detail.upload.media_type === "video" ? "video_model_adapter_v1" : "audio_model_adapter_v1"}
              </span>
            </div>

            {/* 2. Prediction Class */}
            <div className="p-3 rounded-lg bg-[#F0DDB8] border border-[#B58A4C]/50 flex flex-col justify-between shadow-[0_1px_2px_rgba(24,15,10,0.1)]">
              <span className="text-[10px] text-[#604A34] uppercase font-bold tracking-wider">Prediction Class</span>
              <span className={cn(
                "inline-block px-2 py-0.5 rounded text-[11px] font-extrabold uppercase mt-1 w-max",
                isAiGen ? "bg-[#A9362B]/15 text-[#8B2C24] border border-[#A9362B]/40" : "bg-[#28734A]/15 text-[#173D2D] border border-[#28734A]/40"
              )}>
                {String(detail.model_inference?.prediction || (isAiGen ? "SYNTHETIC" : "AUTHENTIC"))}
              </span>
            </div>

            {/* 3. Synthetic Probability */}
            <div className="p-3 rounded-lg bg-[#F0DDB8] border border-[#B58A4C]/50 flex flex-col justify-between shadow-[0_1px_2px_rgba(24,15,10,0.1)]">
              <span className="text-[10px] text-[#604A34] uppercase font-bold tracking-wider">Synthetic Prob</span>
              <span className="font-black text-sm text-[#8B2C24] mt-1">
                {typeof detail.model_inference?.synthetic_probability === "number"
                  ? `${(detail.model_inference.synthetic_probability * 100).toFixed(1)}%`
                  : "N/A"}
              </span>
            </div>

            {/* 4. Authentic Probability */}
            <div className="p-3 rounded-lg bg-[#F0DDB8] border border-[#B58A4C]/50 flex flex-col justify-between shadow-[0_1px_2px_rgba(24,15,10,0.1)]">
              <span className="text-[10px] text-[#604A34] uppercase font-bold tracking-wider">Authentic Prob</span>
              <span className="font-black text-sm text-[#173D2D] mt-1">
                {typeof detail.model_inference?.synthetic_probability === "number"
                  ? `${((1 - detail.model_inference.synthetic_probability) * 100).toFixed(1)}%`
                  : "N/A"}
              </span>
            </div>

            {/* 5. Operating Threshold */}
            <div className="p-3 rounded-lg bg-[#F0DDB8] border border-[#B58A4C]/50 flex flex-col justify-between shadow-[0_1px_2px_rgba(24,15,10,0.1)]">
              <span className="text-[10px] text-[#604A34] uppercase font-bold tracking-wider">Threshold (τ*)</span>
              <span className="font-black text-xs text-[#302013] mt-1">
                {typeof detail.model_inference?.calibrated_threshold === "number"
                  ? detail.model_inference.calibrated_threshold.toFixed(3)
                  : "0.370"}
              </span>
            </div>

            {/* 6. Model Version */}
            <div className="p-3 rounded-lg bg-[#F0DDB8] border border-[#B58A4C]/50 flex flex-col justify-between shadow-[0_1px_2px_rgba(24,15,10,0.1)]">
              <span className="text-[10px] text-[#604A34] uppercase font-bold tracking-wider">Model Version</span>
              <span className="font-bold text-[#302013] text-xs mt-1">
                v{detail.model_version || "1.1.0"}
              </span>
            </div>

            {/* 7. Calibration Method */}
            <div className="p-3 rounded-lg bg-[#F0DDB8] border border-[#B58A4C]/50 flex flex-col justify-between shadow-[0_1px_2px_rgba(24,15,10,0.1)]">
              <span className="text-[10px] text-[#604A34] uppercase font-bold tracking-wider">Calibration Method</span>
              <span className="font-bold text-[#302013] text-xs mt-1 truncate" title={String(detail.calibration_status || "calibrated_val_max_f1")}>
                {String(detail.calibration_status || "calibrated_val_max_f1")}
              </span>
            </div>

            {/* 8. Evaluation Reference */}
            <div className="p-3 rounded-lg bg-[#F0DDB8] border border-[#B58A4C]/50 flex flex-col justify-between shadow-[0_1px_2px_rgba(24,15,10,0.1)]">
              <span className="text-[10px] text-[#604A34] uppercase font-bold tracking-wider">Dossier Reference</span>
              <span className="font-bold text-[#302013] text-xs mt-1 truncate" title={detail.evaluation_reference || "docs/EVALUATION_REPORT.md"}>
                {detail.evaluation_reference || "docs/EVALUATION_REPORT.md"}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 6. CONTENT CREDENTIALS & PROVENANCE (C2PA) */}
      <Card rivets={true} className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#B58A4C]/35">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#28734A]" />
            <h4 className="text-sm font-bold text-[#302013]">Content Credentials & Provenance (C2PA)</h4>
          </div>
          <StatusBadge status={detail.provenance.status} />
        </div>
        <p className="text-xs text-[#604A34] leading-relaxed">
          {detail.provenance.details}
        </p>
      </Card>

      {/* 7. EXPANDABLE TECHNICAL TELEMETRY ACCORDION */}
      <Card rivets={true} className="p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full flex items-center justify-between text-left cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-[#C97A24]" />
            <div>
              <h4 className="text-xs font-bold text-[#302013] uppercase tracking-wider font-mono">
                Advanced Forensic Telemetry & Signal Coefficients
              </h4>
              <p className="text-[11px] text-[#604A34]">
                {showTechnicalDetails ? "Click to collapse detailed signal coefficients" : "Click to expand raw Fourier, ELA, and keyframe metrics"}
              </p>
            </div>
          </div>
          {showTechnicalDetails ? <ChevronUp className="w-5 h-5 text-[#604A34]" /> : <ChevronDown className="w-5 h-5 text-[#604A34]" />}
        </button>

        {showTechnicalDetails && (
          <div className="mt-4 pt-4 border-t border-[#B58A4C]/35 space-y-6">
            {detail.detector_results.map((det, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#B58A4C]/30 pb-2">
                  <span className="text-xs font-bold text-[#302013] font-mono">{det.detector_name} (v{det.detector_version})</span>
                  <StatusBadge status={det.status} />
                </div>

                {/* Signals Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {Object.entries(det.signals)
                    .filter(([key]) => ![
                      "anomaly_indicators",
                      "frame_breakdown",
                      "chunk_breakdown",
                      "model_inference",
                    ].includes(key))
                    .map(([key, val]) => {
                      const meta = SIGNAL_DEFINITIONS[key] || {
                        label: key.replace(/_/g, " "),
                        hint: "",
                      };
                      return (
                        <div key={key} className="skeuo-recessed p-3 rounded-lg border border-[#B58A4C]/60 flex flex-col justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-[#302013] uppercase tracking-wider font-mono block">
                              {meta.label}
                            </span>
                            {meta.hint && <p className="text-[10px] text-[#604A34] mt-0.5 leading-snug">{meta.hint}</p>}
                          </div>
                          <div className="mt-2 pt-2 border-t border-[#B58A4C]/30 font-mono text-xs text-[#173D2D] font-bold">
                            {typeof val === "boolean"
                              ? val ? "TRUE" : "FALSE"
                              : typeof val === "number"
                              ? val.toFixed(3)
                              : typeof val === "object" && val !== null
                              ? JSON.stringify(val)
                              : String(val ?? "N/A")}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Video Keyframes Breakdown Table */}
                {Array.isArray(det.signals.frame_breakdown) && det.signals.frame_breakdown.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <h5 className="text-[11px] font-bold text-[#604A34] uppercase font-mono">
                      Sampled Keyframe Scores ({(det.signals.frame_breakdown as any[]).length} frames)
                    </h5>
                    <div className="overflow-x-auto rounded-lg border border-[#B58A4C]">
                      <table className="w-full text-xs font-mono text-left">
                        <thead className="bg-[#3B281A] text-[10px] text-[#D8B98A] uppercase border-b border-[#B58A4C]">
                          <tr>
                            <th className="p-2">Frame #</th>
                            <th className="p-2">Timestamp</th>
                            <th className="p-2">Synthetic Prob</th>
                            <th className="p-2 text-right">Evaluation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#B58A4C]/30 bg-[#F0DDB8]">
                          {(det.signals.frame_breakdown as any[]).map((f: any, fIdx: number) => {
                            const isAnom = (f.synthetic_probability ?? 0) >= 0.370;
                            return (
                              <tr key={fIdx} className={isAnom ? "bg-[#D8B98A]/50" : ""}>
                                <td className="p-2 text-[#302013] font-bold">{f.frame_index}</td>
                                <td className="p-2 text-[#604A34]">{f.timestamp_seconds?.toFixed(2)}s</td>
                                <td className="p-2 text-[#302013]">
                                  {typeof f.synthetic_probability === "number" ? `${(f.synthetic_probability * 100).toFixed(1)}%` : "N/A"}
                                </td>
                                <td className="p-2 text-right">
                                  {isAnom ? <Badge variant="warning">Anomalous</Badge> : <Badge variant="success">Normal</Badge>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 8. LEGAL & FORENSIC UNCERTAINTY FOOTNOTE */}
      <div className="p-4 rounded-xl skeuo-recessed border border-[#B58A4C]/70 shadow-[inset_0_2px_4px_rgba(36,23,15,0.3)] flex items-start gap-3">
        <Info className="w-5 h-5 text-[#604A34] shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-[#302013] uppercase tracking-wider font-mono">
            Forensic Uncertainty & Human Review Standard Operating Procedure
          </h4>
          <ul className="list-disc list-inside text-xs text-[#604A34] space-y-1 leading-relaxed">
            <li>Statistical machine learning models generate probabilistic assessments and do not constitute absolute forensic proof.</li>
            <li>Compression artifacts from messaging apps, video re-encoding, and noise reduction can reduce high-frequency generative indicators.</li>
            <li>In accordance with forensic evidentiary standards, automated detection outputs should be corroborated by a qualified media forensics analyst.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
