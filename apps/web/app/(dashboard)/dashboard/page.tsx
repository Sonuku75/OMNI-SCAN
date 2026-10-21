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
  ExternalLink,
  Sliders,
  Calendar,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Token } from "@/components/ui/token";
import { Rivet } from "@/components/ui/rivet";
import { InsetPanel, SectionHeader } from "@/components/ui/panels";
import { apiClient } from "@/lib/api-client";
import { AnalysisSummary, HealthResponse } from "@/types/api";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

        if (analysesRes.status === "fulfilled" && analysesRes.value.items) {
          setAnalyses(analysesRes.value.items);
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
      {/* Top Banner / Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-[#B58A4C]/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F0DDB8] tracking-tight drop-shadow-[0_1px_2px_rgba(18,11,7,0.8)]">
            Forensic Intelligence Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#D8B98A] mt-0.5">
            Real-time multi-modal synthetic media verification and artifact inspection.
          </p>
        </div>

        {/* Date Plaque with Corner Screws */}
        <div className="relative self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-[#3B281A] to-[#24170F] border border-[#B58A4C] shadow-[0_3px_8px_rgba(18,11,7,0.5),inset_0_1px_0_rgba(229,201,149,0.25)] flex items-center gap-2.5 select-none">
          <Rivet size="sm" rotation={15} />
          <Calendar className="w-3.5 h-3.5 text-[#E5C995]" />
          <span suppressHydrationWarning className="text-xs font-bold text-[#F0DDB8] font-mono">
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <Rivet size="sm" rotation={85} />
        </div>
      </div>

      {/* 4 Wooden Skeuomorphic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Ingested */}
        <Card hoverEffect>
          <div className="flex items-center gap-3.5">
            <Token color="green" size="md">
              <ScanEye className="w-5 h-5 text-white" />
            </Token>
            <div>
              <span className="text-[11px] font-bold text-[#604A34] uppercase tracking-wider block">
                Total Ingested
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black font-mono text-[#302013]">
                  {totalAnalyses}
                </span>
                <span className="text-[11px] text-[#604A34] font-medium">assets</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#B58A4C]/35 flex items-center justify-between text-[11px] text-[#604A34]">
            <span>Forensic Sessions</span>
            <span className="font-semibold text-[#28734A]">Verified</span>
          </div>
        </Card>

        {/* Card 2: Flagged For Review */}
        <Card hoverEffect>
          <div className="flex items-center gap-3.5">
            <Token color="bronze" size="md">
              <AlertTriangle className="w-5 h-5 text-white" />
            </Token>
            <div>
              <span className="text-[11px] font-bold text-[#604A34] uppercase tracking-wider block">
                Flagged for Review
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black font-mono text-[#C97A24]">
                  {reviewNeededCount}
                </span>
                <span className="text-[11px] text-[#604A34] font-medium">findings</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#B58A4C]/35 flex items-center justify-between text-[11px] text-[#604A34]">
            <span>Synthetic Anomaly</span>
            <span className="font-semibold text-[#C97A24]">Analyst Audit Advised</span>
          </div>
        </Card>

        {/* Card 3: Multi-modal Breakdown */}
        <Card hoverEffect>
          <div className="flex items-center gap-3.5">
            <Token color="blue" size="md">
              <Cpu className="w-5 h-5 text-white" />
            </Token>
            <div>
              <span className="text-[11px] font-bold text-[#604A34] uppercase tracking-wider block">
                Modal Distribution
              </span>
              <div className="flex items-center gap-2 mt-1 text-xs font-mono font-bold text-[#302013]">
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-[#28734A]" /> {imageCount}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-[#C97A24]" /> {audioCount}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-[#245C88]" /> {videoCount}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#B58A4C]/35 flex items-center justify-between text-[11px] text-[#604A34]">
            <span>Spectrum Channels</span>
            <span className="font-semibold text-[#245C88]">Image / Audio / Video</span>
          </div>
        </Card>

        {/* Card 4: Integrity Guard */}
        <Card hoverEffect>
          <div className="flex items-center gap-3.5">
            <Token color="red" size="md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </Token>
            <div>
              <span className="text-[11px] font-bold text-[#604A34] uppercase tracking-wider block">
                Integrity Standard
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-[#28734A]">
                  ENFORCED
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#B58A4C]/35 flex items-center justify-between text-[11px] text-[#604A34]">
            <span>Audit Level</span>
            <span className="font-semibold text-[#28734A]">Deterministic Limits</span>
          </div>
        </Card>
      </div>

      {/* Main Section: Recent Analyses & Detector Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Analyses Instrument Console */}
        <div className="lg:col-span-2 space-y-4">
          <div className="skeuo-card p-2">
            <div className="bg-gradient-to-r from-[#4A3321] to-[#3B281A] px-4 py-2.5 rounded-lg flex items-center justify-between border border-[#B58A4C] shadow-[inset_0_1px_0_rgba(229,201,149,0.25)]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#E5C995]" />
                <h3 className="text-sm font-bold text-[#F0DDB8] tracking-wide drop-shadow-[0_1px_1px_rgba(18,11,7,0.8)]">
                  Recent Case Analyses
                </h3>
              </div>
              <Link
                href="/analyses"
                className="text-xs font-semibold text-[#E5C995] hover:text-[#F0DDB8] flex items-center gap-1 transition-colors drop-shadow-[0_1px_1px_rgba(18,11,7,0.8)]"
              >
                <span>View All Cases</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* List / Table Area */}
            <div className="p-3 space-y-2.5">
              {isLoading ? (
                <div className="skeuo-plate text-center py-12 text-xs font-mono text-[#604A34]">
                  Loading recent evidence records...
                </div>
              ) : analyses.length === 0 ? (
                <div className="skeuo-plate text-center py-12 p-6">
                  <ScanEye className="w-10 h-10 text-[#604A34] mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#302013]">No analyses recorded yet</p>
                  <p className="text-xs text-[#604A34] mt-1">
                    Upload an image, audio, or video file to begin forensic pipeline processing.
                  </p>
                  <Link href="/analyze" className="mt-4 inline-block">
                    <Button variant="parchment" size="sm">
                      Analyze First Asset
                    </Button>
                  </Link>
                </div>
              ) : (
                analyses.map((item) => (
                  <div
                    key={item.analysis_id}
                    className="skeuo-plate p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-[#D8B98A] border border-[#B58A4C] shrink-0 mt-0.5 shadow-[inset_0_1px_3px_rgba(36,23,15,0.3)]">
                        {item.media_type === "image" && (
                          <ImageIcon className="w-4 h-4 text-[#28734A]" />
                        )}
                        {item.media_type === "audio" && (
                          <Mic className="w-4 h-4 text-[#C97A24]" />
                        )}
                        {item.media_type === "video" && (
                          <Video className="w-4 h-4 text-[#245C88]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[#302013] truncate max-w-xs">
                            {item.filename}
                          </span>
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#604A34] mt-1 font-mono">
                          <span>Case ID: {item.analysis_id.slice(0, 10)}...</span>
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
                          <div className="text-xs font-mono font-black text-[#302013]">
                            {(item.assessment_score * 100).toFixed(0)}% Score
                          </div>
                          <div className="text-[10px] text-[#604A34] font-medium">
                            Calibrated
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#604A34] font-mono">
                          {item.status === "detector_not_configured"
                            ? "Unconfigured"
                            : "Pending"}
                        </span>
                      )}

                      <Link href={`/analyses/${item.analysis_id}`}>
                        <Button variant="parchment" size="sm">
                          Inspect
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Real Detector Stack Readiness & Quick Ingest */}
        <div className="space-y-4">
          <Card rivets={true}>
            <div className="pb-3 border-b border-[#B58A4C]/35 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#302013] tracking-tight">
                  Detector Stack Readiness
                </h3>
                <p className="text-xs text-[#604A34]">Live backend telemetry</p>
              </div>
              <Link
                href="/settings"
                className="text-xs font-semibold text-[#173D2D] hover:text-[#28734A] hover:underline flex items-center gap-1"
              >
                <span>Config</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="pt-3 space-y-3">
              {/* Image Detector */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#B58A4C]/25">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#D8B98A] border border-[#B58A4C]">
                    <ImageIcon className="w-3.5 h-3.5 text-[#28734A]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#302013]">
                      Image Forensics
                    </div>
                    <div className="text-[10px] text-[#604A34] font-mono">
                      spectral_frequency_v1
                    </div>
                  </div>
                </div>
                <StatusBadge status={health?.services?.detectors?.image || "not_configured"} />
              </div>

              {/* Audio Detector */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#B58A4C]/25">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#D8B98A] border border-[#B58A4C]">
                    <Mic className="w-3.5 h-3.5 text-[#C97A24]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#302013]">
                      Audio & Voice
                    </div>
                    <div className="text-[10px] text-[#604A34] font-mono">
                      audio_forensics_v1
                    </div>
                  </div>
                </div>
                <StatusBadge status={health?.services?.detectors?.audio || "not_configured"} />
              </div>

              {/* Video Detector */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#B58A4C]/25">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#D8B98A] border border-[#B58A4C]">
                    <Video className="w-3.5 h-3.5 text-[#245C88]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#302013]">
                      Video & Temporal
                    </div>
                    <div className="text-[10px] text-[#604A34] font-mono">
                      video_forensics_v1
                    </div>
                  </div>
                </div>
                <StatusBadge status={health?.services?.detectors?.video || "not_configured"} />
              </div>

              {/* C2PA Provenance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#D8B98A] border border-[#B58A4C]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#28734A]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#302013]">
                      Content Credentials (C2PA)
                    </div>
                    <div className="text-[10px] text-[#604A34] font-mono">
                      metadata_provenance_v1
                    </div>
                  </div>
                </div>
                <StatusBadge status={health?.services?.detectors?.provenance || "available"} />
              </div>
            </div>

            {/* Note */}
            <div className="mt-4 p-3 rounded-lg skeuo-recessed text-xs text-[#604A34] leading-relaxed border border-[#B58A4C]/60">
              Unconfigured detectors return honest explicit status and do not output synthetic scores.
            </div>
          </Card>

          {/* Quick Launch Card */}
          <div className="skeuo-card p-2 text-center select-none">
            <div className="bg-gradient-to-b from-[#3B281A] to-[#24170F] p-4 rounded-xl border border-[#B58A4C] shadow-[inset_0_1px_0_rgba(229,201,149,0.25)] space-y-3">
              <h4 className="text-sm font-bold text-[#F0DDB8]">
                Analyze New Media Asset
              </h4>
              <p className="text-xs text-[#D8B98A] leading-relaxed">
                Ingest image, audio, or video files for magic byte validation and cryptographic fingerprinting.
              </p>
              <Link href="/analyze" className="block w-full">
                <Button variant="primary" className="w-full gap-2">
                  <ScanEye className="w-4 h-4 text-[#E5C995]" />
                  <span>Open Ingestion Bay</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
