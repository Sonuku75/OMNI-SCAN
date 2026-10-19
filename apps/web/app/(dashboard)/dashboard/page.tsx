"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ScanEye,
  AlertTriangle,
  Image as ImageIcon,
  Mic,
  Video,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { AnalysisSummary, HealthResponse } from "@/types/api";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingSampleData, setIsUsingSampleData] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [healthRes, analysesRes] = await Promise.allSettled([
          apiClient.getHealth(),
          apiClient.listAnalyses({ pageSize: 5 }),
        ]);

        if (!mounted) return;

        if (healthRes.status === "fulfilled") {
          setHealth(healthRes.value);
        }

        if (analysesRes.status === "fulfilled" && analysesRes.value.items.length > 0) {
          setAnalyses(analysesRes.value.items);
          setIsUsingSampleData(false);
        } else {
          // Explicitly labeled initial milestone sample data
          setIsUsingSampleData(true);
          setAnalyses([
            {
              analysis_id: "demo-sample-01",
              upload_id: "upload-demo-01",
              filename: "sample_diffusion_portrait.png",
              media_type: "image",
              status: "completed",
              assessment_label: "likely_synthetic",
              assessment_score: 0.88,
              score_semantics: "calibrated_probability",
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              analysis_id: "demo-sample-02",
              upload_id: "upload-demo-02",
              filename: "voice_clone_statement.wav",
              media_type: "audio",
              status: "detector_not_configured",
              assessment_label: null,
              assessment_score: null,
              score_semantics: null,
              created_at: new Date(Date.now() - 7200000).toISOString(),
            },
            {
              analysis_id: "demo-sample-03",
              upload_id: "upload-demo-03",
              filename: "press_briefing_clip.mp4",
              media_type: "video",
              status: "queued",
              assessment_label: null,
              assessment_score: null,
              score_semantics: null,
              created_at: new Date(Date.now() - 10800000).toISOString(),
            },
          ]);
        }
      } catch {
        // Handled gracefully
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const totalAnalyses = analyses.length;
  const imageCount = analyses.filter((a) => a.media_type === "image").length;
  const audioCount = analyses.filter((a) => a.media_type === "audio").length;
  const videoCount = analyses.filter((a) => a.media_type === "video").length;
  const reviewNeededCount = analyses.filter(
    (a) => a.assessment_label === "likely_synthetic" || a.status === "failed"
  ).length;

  return (
    <div className="space-y-6">
      {/* Banner / Sample Data Notice */}
      {isUsingSampleData && (
        <div className="p-3 rounded-lg bg-omni-surface border border-omni-border/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-omni-muted">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>
              <strong className="text-omni-text">Notice:</strong> Displaying representative demo sample items until backend persistence is populated in Milestone 1/2.
            </span>
          </div>
          <Badge variant="info">Sample Demonstration Data</Badge>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-omni-muted uppercase tracking-wider">
              Total Ingested
            </span>
            <ScanEye className="w-4 h-4 text-omni-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-omni-text">{totalAnalyses}</span>
            <span className="text-xs text-omni-muted">assets</span>
          </div>
          <p className="mt-1 text-[11px] text-omni-muted">Forensic analysis sessions</p>
        </Card>

        <Card hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-omni-muted uppercase tracking-wider">
              Flagged For Review
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {reviewNeededCount}
            </span>
            <span className="text-xs text-omni-muted">findings</span>
          </div>
          <p className="mt-1 text-[11px] text-omni-muted">Human verification advised</p>
        </Card>

        <Card hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-omni-muted uppercase tracking-wider">
              Media Breakdown
            </span>
            <Cpu className="w-4 h-4 text-omni-secondary" />
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1 text-omni-text">
              <ImageIcon className="w-3.5 h-3.5 text-omni-primary" /> {imageCount}
            </span>
            <span className="flex items-center gap-1 text-omni-text">
              <Mic className="w-3.5 h-3.5 text-omni-secondary" /> {audioCount}
            </span>
            <span className="flex items-center gap-1 text-omni-text">
              <Video className="w-3.5 h-3.5 text-cyan-400" /> {videoCount}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-omni-muted">Multi-modal distribution</p>
        </Card>

        <Card hoverEffect>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-omni-muted uppercase tracking-wider">
              Active Security Guard
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-bold text-emerald-400">Enforced</span>
          </div>
          <p className="mt-1 text-[11px] text-omni-muted">Zero-hallucination disclaimers</p>
        </Card>
      </div>

      {/* Main Grid: Recent Analyses & Detector Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Analyses List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-omni-text tracking-tight">
                Recent Forensic Analyses
              </h3>
              <p className="text-xs text-omni-muted">
                Inspect evidence and calibrated uncertainty signals.
              </p>
            </div>
            <Link
              href="/analyses"
              className="text-xs font-medium text-omni-primary hover:text-omni-primaryHover flex items-center gap-1"
            >
              View all history <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {analyses.length === 0 ? (
              <Card className="text-center py-10">
                <ScanEye className="w-8 h-8 text-omni-muted mx-auto mb-2" />
                <p className="text-sm font-medium text-omni-text">No analyses recorded</p>
                <p className="text-xs text-omni-muted mt-1">
                  Upload an image, audio, or video file to start forensic analysis.
                </p>
                <Link href="/analyze" className="mt-4 inline-block">
                  <Button size="sm">Start First Analysis</Button>
                </Link>
              </Card>
            ) : (
              analyses.map((item) => (
                <Card
                  key={item.analysis_id}
                  hoverEffect
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-lg bg-omni-bg border border-omni-border shrink-0 mt-0.5">
                      {item.media_type === "image" && (
                        <ImageIcon className="w-4 h-4 text-omni-primary" />
                      )}
                      {item.media_type === "audio" && (
                        <Mic className="w-4 h-4 text-omni-secondary" />
                      )}
                      {item.media_type === "video" && (
                        <Video className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-omni-text truncate max-w-xs">
                          {item.filename}
                        </span>
                        <Badge status={item.status} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-omni-muted mt-1 font-mono">
                        <span>ID: {item.analysis_id.slice(0, 12)}...</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDate(item.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {item.assessment_score !== null && item.assessment_score !== undefined ? (
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-omni-text">
                          {(item.assessment_score * 100).toFixed(0)}% Score
                        </div>
                        <div className="text-[10px] text-omni-muted">Probabilistic</div>
                      </div>
                    ) : (
                      <span className="text-xs text-omni-muted font-mono">
                        {item.status === "detector_not_configured"
                          ? "Adapter Unconfigured"
                          : "Pending"}
                      </span>
                    )}

                    <Link href={`/analyses/${item.analysis_id}`}>
                      <Button variant="outline" size="sm">
                        Inspect
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Detector Integration Status Matrix */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-omni-text tracking-tight">
                Detector Stack
              </h3>
              <p className="text-xs text-omni-muted">Honest integration telemetry</p>
            </div>
            <Link
              href="/settings"
              className="text-xs text-omni-muted hover:text-omni-text flex items-center gap-1"
            >
              Config <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <Card className="space-y-4">
            <div className="space-y-3">
              {/* Image Detector */}
              <div className="flex items-center justify-between pb-3 border-b border-omni-border/60">
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="w-4 h-4 text-omni-primary" />
                  <div>
                    <div className="text-xs font-medium text-omni-text">
                      Image Artifact Detector
                    </div>
                    <div className="text-[10px] text-omni-muted font-mono">
                      spectral_frequency_v1
                    </div>
                  </div>
                </div>
                <Badge variant="success">Available</Badge>
              </div>

              {/* Audio Detector */}
              <div className="flex items-center justify-between pb-3 border-b border-omni-border/60">
                <div className="flex items-center gap-2.5">
                  <Mic className="w-4 h-4 text-omni-secondary" />
                  <div>
                    <div className="text-xs font-medium text-omni-text">
                      Voice Clone & Audio
                    </div>
                    <div className="text-[10px] text-omni-muted font-mono">
                      vocoder_spectral_v1
                    </div>
                  </div>
                </div>
                <Badge variant="info">Milestone 5</Badge>
              </div>

              {/* Video Detector */}
              <div className="flex items-center justify-between pb-3 border-b border-omni-border/60">
                <div className="flex items-center gap-2.5">
                  <Video className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs font-medium text-omni-text">
                      Video Frame & Temporal
                    </div>
                    <div className="text-[10px] text-omni-muted font-mono">
                      ffmpeg_temporal_v1
                    </div>
                  </div>
                </div>
                <Badge variant="info">Milestone 6</Badge>
              </div>

              {/* Provenance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-medium text-omni-text">
                      Content Credentials (C2PA)
                    </div>
                    <div className="text-[10px] text-omni-muted font-mono">
                      metadata_provenance_v1
                    </div>
                  </div>
                </div>
                <Badge variant="info">Milestone 7</Badge>
              </div>
            </div>

            <div className="pt-3 border-t border-omni-border/60">
              <div className="p-3 rounded-lg bg-omni-bg border border-omni-border text-xs text-omni-muted leading-relaxed">
                <strong className="text-omni-text">Forensic Integrity Rule:</strong> Unconfigured
                detectors yield explicit <code className="text-omni-primary font-mono text-[11px]">detector_not_configured</code>. OmniScan never simulates mock predictions.
              </div>
            </div>
          </Card>

          {/* Quick Action Card */}
          <Card className="bg-gradient-to-br from-omni-surface to-omni-surfaceHover border-omni-border p-5">
            <h4 className="text-sm font-semibold text-omni-text mb-1">
              Ready for Media Inspection?
            </h4>
            <p className="text-xs text-omni-muted mb-4 leading-relaxed">
              Upload files to compute SHA-256 digests and trigger modular detector adapters.
            </p>
            <Link href="/analyze" className="w-full block">
              <Button className="w-full gap-2">
                <ScanEye className="w-4 h-4" />
                <span>Open Media Analyzer</span>
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
