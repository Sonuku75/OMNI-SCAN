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
  FileText,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Terminal,
  Activity,
  HardDrive,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rivet } from "@/components/ui/rivet";
import { Token } from "@/components/ui/token";
import { apiClient } from "@/lib/api-client";
import { AnalysisDetail } from "@/types/api";
import { formatDate, formatBytes, truncateHash } from "@/lib/utils";

const SIGNAL_DEFINITIONS: Record<string, { label: string; hint: string }> = {
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
    label: "EXIF Present",
    hint: "Presence of hardware camera metadata and capture parameters",
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
  // Video Forensics & Temporal Signals
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

  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    async function fetchAnalysis() {
      try {
        const res = await apiClient.getAnalysis(analysisId);
        if (!mounted) return;
        setDetail(res);

        // Continue polling if still active
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
        // Keep existing detail or handle error
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
    } catch (e) {
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
          Loading forensic telemetry & verifying SHA-256 evidence...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b-2 border-[#B58A4C]/60">
        <Link
          href="/analyses"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#D8B98A] hover:text-[#F0DDB8] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Analysis Archive</span>
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
              <strong className="text-[#24170F] block text-sm">
                {detail.status === "queued" ? "Pipeline Status: QUEUED" : "Pipeline Status: PROCESSING"}
              </strong>
              <span className="text-[#664830] text-[11px]">
                {detail.status === "queued"
                  ? "Asynchronous forensic orchestrator waiting to decode media stream..."
                  : "Worker is extracting frequency spectrums, evaluating noise variance, and computing forensic metrics..."}
              </span>
            </div>
          </div>
          <Badge status={detail.status} />
        </div>
      )}

      {/* Main Asset Instrument Card with Rivets */}
      <Card rivets={true} className="p-3 sm:p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#B58A4C]/35">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#24170F] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                {detail.upload.filename}
              </h1>
              <Badge status={detail.status} />
              {detail.upload.media_type && (
                <Badge variant="outline">{detail.upload.media_type.toUpperCase()}</Badge>
              )}
            </div>
            <p className="text-xs text-[#664830] font-mono mt-1">
              Analysis Run: {detail.analysis_id}
            </p>
          </div>

          {/* Calibrated Assessment Meter Dial / Plaque */}
          {detail.assessment_score !== null && detail.assessment_score !== undefined && (
            <div className="skeuo-recessed p-4 rounded-xl shrink-0 text-center min-w-[210px] select-none border border-[#B58A4C]/70">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#664830] font-bold mb-1">
                {detail.score_semantics === "anomaly_index" ? "Anomaly Severity" : "Calibrated Score"}
              </div>
              <div className="text-3xl font-black font-mono text-[#24170F]">
                {detail.score_semantics === "anomaly_index"
                  ? detail.assessment_score.toFixed(2)
                  : `${(detail.assessment_score * 100).toFixed(1)}%`}
              </div>
              <div className="text-[11px] text-[#664830] font-semibold mt-1">
                {detail.score_semantics === "anomaly_index" ? "Heuristic Range [0.0 - 1.0]" : (detail.score_semantics || "Probabilistic")}
              </div>
            </div>
          )}
        </div>

        {/* Media Metadata Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="skeuo-recessed p-3 rounded-lg border border-[#B58A4C]/60">
            <span className="text-[#664830] block text-[10px] font-bold uppercase">File Size</span>
            <span className="text-[#24170F] font-black">{formatBytes(detail.upload.size_bytes)}</span>
          </div>

          <div className="skeuo-recessed p-3 rounded-lg border border-[#B58A4C]/60">
            <span className="text-[#664830] block text-[10px] font-bold uppercase">MIME Type</span>
            <span className="text-[#24170F] font-black">{detail.upload.mime_type}</span>
          </div>

          {detail.upload.duration_ms != null && detail.upload.duration_ms > 0 ? (
            <div className="skeuo-recessed p-3 rounded-lg border border-[#B58A4C]/60">
              <span className="text-[#664830] block text-[10px] font-bold uppercase">Duration</span>
              <span className="text-[#24170F] font-black">
                {(detail.upload.duration_ms / 1000).toFixed(2)}s
              </span>
            </div>
          ) : null}

          {detail.upload.width != null && detail.upload.height != null ? (
            <div className="skeuo-recessed p-3 rounded-lg border border-[#B58A4C]/60">
              <span className="text-[#664830] block text-[10px] font-bold uppercase">Resolution</span>
              <span className="text-[#24170F] font-black">
                {detail.upload.width} × {detail.upload.height}
              </span>
            </div>
          ) : null}

          <div
            className={`skeuo-recessed p-3 rounded-lg border border-[#B58A4C]/60 ${
              (detail.upload.duration_ms != null && detail.upload.duration_ms > 0) ||
              (detail.upload.width != null && detail.upload.height != null)
                ? "sm:col-span-1"
                : "sm:col-span-2"
            }`}
          >
            <span className="text-[#664830] block text-[10px] font-bold uppercase">SHA-256 Digest</span>
            <div className="flex items-center justify-between text-[#24170F]">
              <span className="truncate mr-2 font-semibold">{truncateHash(detail.upload.sha256, 12)}</span>
              <button
                onClick={() => copyToClipboard(detail.upload.sha256)}
                className="p-1 text-[#664830] hover:text-[#28734A] transition-colors"
                title="Copy cryptographic digest"
              >
                {copiedSha ? <Check className="w-3.5 h-3.5 text-[#28734A]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Human Review Recommendation Alert */}
      {detail.human_review_recommended && (
        <div className="skeuo-card p-2">
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#8C5214] to-[#63390B] border border-[#B58A4C] text-[#F0DDB8] flex items-start gap-3 shadow-[inset_0_1px_1px_rgba(229,201,149,0.3)]">
            <AlertTriangle className="w-5 h-5 text-[#E5C995] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#F0DDB8] uppercase tracking-wider font-mono">
                Human Review Verification Advised
              </h4>
              <p className="text-xs text-[#D8B98A] leading-relaxed">
                Automated detection algorithms flagged statistical generative indicators. In accordance with forensic standard operating procedures, model outputs must be corroborated by a qualified media forensics analyst before rendering final determinations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Evidence-Grounded Summary */}
      {detail.summary && (
        <Card rivets={true} className="p-3 sm:p-4">
          <div className="pb-2.5 border-b border-[#B58A4C]/35">
            <h3 className="text-sm font-bold text-[#24170F]">Evidence-Grounded Dossier Summary</h3>
            <p className="text-xs text-[#664830]">Synthesized from calibrated detector telemetry</p>
          </div>
          <div className="mt-3">
            <p className="text-xs text-[#24170F] leading-relaxed skeuo-recessed p-4 rounded-xl font-medium border border-[#B58A4C]/60">
              {detail.summary}
            </p>
          </div>
        </Card>
      )}

      {/* Modular Detector Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#E5C995]" />
          <h3 className="text-sm font-extrabold text-[#F0DDB8] uppercase tracking-wider font-mono">
            Modular Detector Telemetry & Signals
          </h3>
        </div>

        <div className="space-y-4">
          {detail.detector_results.map((det, index) => (
            <Card key={index} rivets={true} className="p-3 sm:p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#B58A4C]/35">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#D8B98A] border border-[#B58A4C]">
                    <Cpu className="w-4 h-4 text-[#173D2D]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#24170F]">{det.detector_name}</h4>
                    <p className="text-[10px] text-[#664830] font-mono">Version {det.detector_version}</p>
                  </div>
                </div>
                <Badge status={det.status} />
              </div>

              {/* Anomaly Indicators Alert */}
              {Array.isArray(det.signals.anomaly_indicators) && det.signals.anomaly_indicators.length > 0 && (
                <div className="p-3.5 rounded-xl skeuo-recessed border border-[#C97A24] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#C97A24] font-bold block">
                    Flagged Forensic Discrepancies
                  </span>
                  <ul className="space-y-1.5">
                    {det.signals.anomaly_indicators.map((ind: string, idx: number) => (
                      <li key={idx} className="text-xs text-[#24170F] font-mono flex items-start gap-2">
                        <span className="text-[#C97A24] font-bold">•</span>
                        <span>{ind}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Signals Grid */}
              {Object.keys(det.signals).filter((k) => k !== "anomaly_indicators").length > 0 ? (
                <div>
                  <h5 className="text-[11px] font-bold text-[#664830] uppercase tracking-wider mb-2 font-mono">
                    Extracted Signal Coefficients
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
                    {Object.entries(det.signals)
                      .filter(
                        ([key]) =>
                          ![
                            "anomaly_indicators",
                            "frame_breakdown",
                            "scene_cut_timestamps",
                            "anomalous_frame_indices",
                          ].includes(key)
                      )
                      .map(([key, val]) => {
                        const meta = SIGNAL_DEFINITIONS[key] || {
                          label: key.replace(/_/g, " "),
                          hint: "",
                        };
                        return (
                          <div
                            key={key}
                            className="skeuo-recessed p-3 rounded-lg flex flex-col justify-between border border-[#B58A4C]/60"
                          >
                            <div>
                              <span className="text-[11px] font-bold text-[#24170F] block capitalize">
                                {meta.label}
                              </span>
                              {meta.hint && (
                                <span className="text-[10px] text-[#664830] block font-sans mt-0.5 leading-snug">
                                  {meta.hint}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-right">
                              <span className="text-[#173D2D] font-black text-xs bg-[#F0DDB8] px-2 py-0.5 rounded border border-[#B58A4C] shadow-[0_1px_2px_rgba(24,15,10,0.2)]">
                                {typeof val === "number"
                                  ? val.toFixed(3)
                                  : typeof val === "boolean"
                                  ? val
                                    ? "True"
                                    : "False"
                                  : String(val)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Sampled Video Keyframes Breakdown Table */}
                  {Array.isArray(det.signals.frame_breakdown) && det.signals.frame_breakdown.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[11px] font-bold text-[#664830] uppercase tracking-wider font-mono">
                          Sampled Video Keyframes Breakdown ({(det.signals.frame_breakdown as any[]).length} Frames)
                        </h5>
                        <span className="text-[10px] text-[#664830] font-mono">
                          Uniform Temporal Sampling
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-[#B58A4C]">
                        <table className="w-full text-xs font-mono text-left">
                          <thead className="bg-[#3B281A] text-[10px] text-[#D8B98A] uppercase border-b border-[#B58A4C]">
                            <tr>
                              <th className="p-2.5">Frame #</th>
                              <th className="p-2.5">Timestamp</th>
                              <th className="p-2.5">FFT Energy</th>
                              <th className="p-2.5">ELA Variance</th>
                              <th className="p-2.5">Laplacian Focus</th>
                              <th className="p-2.5">Grid Spikes</th>
                              <th className="p-2.5 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#B58A4C]/30 bg-[#F0DDB8]">
                            {(det.signals.frame_breakdown as any[]).map((f: any, fIdx: number) => (
                              <tr key={fIdx} className={f.anomalous ? "bg-[#D8B98A]/50" : ""}>
                                <td className="p-2.5 text-[#24170F] font-bold">{f.frame_index}</td>
                                <td className="p-2.5 text-[#664830]">{f.timestamp_seconds?.toFixed(2)}s</td>
                                <td className="p-2.5 text-[#24170F]">{f.fft_high_freq_ratio?.toFixed(3) ?? "-"}</td>
                                <td className="p-2.5 text-[#24170F]">{f.ela_block_variance?.toFixed(2) ?? "-"}</td>
                                <td className="p-2.5 text-[#24170F]">{f.laplacian_focus_variance?.toFixed(1) ?? "-"}</td>
                                <td className="p-2.5">
                                  {f.grid_spikes_detected ? (
                                    <span className="text-[#C97A24] font-bold">Detected</span>
                                  ) : (
                                    <span className="text-[#28734A]">Normal</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right">
                                  {f.anomalous ? (
                                    <Badge variant="warning">Anomalous</Badge>
                                  ) : (
                                    <Badge variant="success">Clean</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-[#664830] font-mono skeuo-recessed p-3.5 rounded-lg border border-[#B58A4C]/60">
                  {det.status === "not_configured"
                    ? "Model weights are not configured for this detector. Set the corresponding model path environment variable to enable deep learning inference."
                    : `No signals extracted (detector status: ${det.status}).`}
                </div>
              )}

              {/* Known Limitations */}
              {det.limitations.length > 0 && (
                <div className="pt-2">
                  <h5 className="text-[11px] font-bold text-[#664830] uppercase tracking-wider mb-1 font-mono">
                    Detector Limitations & Edge Cases
                  </h5>
                  <ul className="list-disc list-inside text-xs text-[#664830] space-y-1">
                    {det.limitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Provenance Card */}
      <Card rivets={true} className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#B58A4C]/35">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#28734A]" />
            <h4 className="text-sm font-bold text-[#24170F]">Content Credentials & Provenance (C2PA)</h4>
          </div>
          <Badge status={detail.provenance.status} />
        </div>
        <p className="text-xs text-[#664830] leading-relaxed">
          {detail.provenance.details}
        </p>
      </Card>

      {/* Legal & Forensic Disclaimers */}
      <div className="p-4 rounded-xl skeuo-recessed border border-[#B58A4C]/70 shadow-[inset_0_2px_4px_rgba(36,23,15,0.3)] flex items-start gap-3">
        <Info className="w-5 h-5 text-[#664830] shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-[#24170F] uppercase tracking-wider font-mono">
            Forensic Uncertainty & Disclaimers
          </h4>
          <ul className="list-disc list-inside text-xs text-[#664830] space-y-1 leading-relaxed">
            {detail.limitations_disclosure.map((disc, idx) => (
              <li key={idx}>{disc}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
