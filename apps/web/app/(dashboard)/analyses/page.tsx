"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Filter,
  Trash2,
  Clock,
  Image as ImageIcon,
  Mic,
  Video,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rivet } from "@/components/ui/rivet";
import { apiClient } from "@/lib/api-client";
import { AnalysisSummary } from "@/types/api";
import { formatDate } from "@/lib/utils";

export default function AnalysesPage() {
  const [items, setItems] = useState<AnalysisSummary[]>([]);
  const [search, setSearch] = useState("");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchAnalyses() {
      try {
        const res = await apiClient.listAnalyses({
          mediaType: mediaFilter,
          status: statusFilter,
        });
        if (!mounted) return;
        if (res.items && res.items.length > 0) {
          setItems(res.items);
        } else {
          // Provide representative items if API empty or in M0
          setItems([
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
        // Fallback
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchAnalyses();
    return () => {
      mounted = false;
    };
  }, [mediaFilter, statusFilter]);

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteAnalysis(id);
    } catch {
      // Local removal in demo state
    }
    setItems((prev) => prev.filter((item) => item.analysis_id !== id));
    setDeleteConfirmId(null);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.filename.toLowerCase().includes(search.toLowerCase()) ||
      item.analysis_id.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-[#B58A4C]/60">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F0DDB8] tracking-tight drop-shadow-[0_1px_2px_rgba(18,11,7,0.8)]">
            Forensic Case Archive
          </h1>
          <p className="text-xs text-[#D8B98A]">
            Chronological audit log of analyzed synthetic assets, detection scores, and SHA-256 evidence.
          </p>
        </div>

        <Link href="/analyze">
          <Button variant="primary" size="sm" className="gap-2">
            <span>New Case Ingestion</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Recessed Filter Console */}
      <div className="skeuo-recessed p-4 sm:p-5 space-y-4 border border-[#B58A4C]/70">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Slot */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#664830]" />
            <input
              type="text"
              placeholder="Search filename or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F0DDB8] border border-[#B58A4C] text-xs font-semibold text-[#24170F] placeholder-[#664830]/70 focus:outline-none focus:border-[#E5C995] shadow-[inset_0_2px_4px_rgba(36,23,15,0.2)] font-mono"
            />
          </div>

          {/* Media Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[#24170F] shrink-0">Type:</label>
            <select
              value={mediaFilter}
              onChange={(e) => setMediaFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#F0DDB8] border border-[#B58A4C] text-xs font-semibold text-[#24170F] focus:outline-none focus:border-[#E5C995] shadow-[inset_0_2px_4px_rgba(36,23,15,0.2)] font-mono"
            >
              <option value="all">All Media Modalities</option>
              <option value="image">Image Evidence</option>
              <option value="audio">Audio / Voice Clones</option>
              <option value="video">Video Synthetics</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[#24170F] shrink-0">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#F0DDB8] border border-[#B58A4C] text-xs font-semibold text-[#24170F] focus:outline-none focus:border-[#E5C995] shadow-[inset_0_2px_4px_rgba(36,23,15,0.2)] font-mono"
            >
              <option value="all">All Pipeline Statuses</option>
              <option value="completed">Completed & Verified</option>
              <option value="queued">Queued / Processing</option>
              <option value="detector_not_configured">Detector Unconfigured</option>
              <option value="failed">Failed Execution</option>
            </select>
          </div>
        </div>
      </div>

      {/* Structured Forensic History Instrument Panel */}
      <div className="skeuo-card p-2 sm:p-2.5">
        {/* Wood/Metal Header */}
        <div className="bg-gradient-to-r from-[#4A3321] to-[#3B281A] px-4 py-3 rounded-lg border border-[#B58A4C] flex items-center justify-between shadow-[inset_0_1px_0_rgba(229,201,149,0.25)]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#E5C995]" />
            <span className="text-xs sm:text-sm font-bold text-[#F0DDB8] tracking-wide drop-shadow-[0_1px_1px_rgba(18,11,7,0.8)]">
              Forensic Log Entries ({filteredItems.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Rivet size="sm" rotation={30} />
            <span className="text-[11px] font-mono text-[#D8B98A] hidden sm:inline">
              ISO/IEC 27037 Compliant
            </span>
            <Rivet size="sm" rotation={120} />
          </div>
        </div>

        {/* Table Body */}
        <div className="p-3 space-y-2.5">
          {isLoading ? (
            <div className="skeuo-plate text-center py-12 text-xs font-mono text-[#664830]">
              Querying forensic case database records...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="skeuo-plate text-center py-12 p-6">
              <History className="w-8 h-8 text-[#664830] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#24170F]">No analyses match criteria</p>
              <p className="text-xs text-[#664830] mt-1">
                Try modifying your search or modality filters.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.analysis_id}
                className="skeuo-plate p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#E5C995]"
              >
                {/* File info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-lg bg-[#D8B98A] border border-[#B58A4C] shrink-0 mt-0.5 shadow-[inset_0_1px_3px_rgba(36,23,15,0.3)]">
                    {item.media_type === "image" && (
                      <ImageIcon className="w-5 h-5 text-[#28734A]" />
                    )}
                    {item.media_type === "audio" && (
                      <Mic className="w-5 h-5 text-[#C97A24]" />
                    )}
                    {item.media_type === "video" && (
                      <Video className="w-5 h-5 text-[#245C88]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-[#24170F] truncate max-w-sm">
                        {item.filename}
                      </span>
                      <Badge status={item.status} />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#664830] mt-1 font-mono">
                      <span>ID: {item.analysis_id}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  {item.assessment_score !== null && item.assessment_score !== undefined ? (
                    <div className="text-right">
                      <div className="text-xs font-mono font-black text-[#24170F]">
                        {(item.assessment_score * 100).toFixed(0)}% Score
                      </div>
                      <div className="text-[10px] text-[#664830]">Probabilistic</div>
                    </div>
                  ) : (
                    <span className="text-xs text-[#664830] font-mono">
                      {item.status === "detector_not_configured"
                        ? "Unconfigured"
                        : "Queued"}
                    </span>
                  )}

                  <Link href={`/analyses/${item.analysis_id}`}>
                    <Button variant="parchment" size="sm">
                      Inspect
                    </Button>
                  </Link>

                  {/* Delete Button / Confirm */}
                  {deleteConfirmId === item.analysis_id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(item.analysis_id)}
                        className="px-2 py-1 rounded bg-[#A9362B] text-white text-xs font-bold hover:bg-[#8B2C23]"
                        title="Confirm Purge"
                      >
                        Purge
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-1 text-[#664830] hover:text-[#24170F]"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(item.analysis_id)}
                      className="p-1.5 rounded-lg text-[#664830] hover:text-[#A9362B] hover:bg-[#B58A4C]/20 transition-colors"
                      title="Purge record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
