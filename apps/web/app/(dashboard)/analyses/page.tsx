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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    const matchesSearch = item.filename.toLowerCase().includes(search.toLowerCase());
    const matchesMedia = mediaFilter === "all" || item.media_type === mediaFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesMedia && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-omni-text tracking-tight">
            Analysis History & Forensics
          </h1>
          <p className="text-xs text-omni-muted mt-1">
            Browse and scrutinize all previously processed media assets and inspection reports.
          </p>
        </div>
        <Link href="/analyze">
          <Button size="sm">Start New Analysis</Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-omni-muted" />
            <input
              type="text"
              placeholder="Search by filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-omni-bg border border-omni-border text-xs text-omni-text focus:outline-none focus:border-omni-primary"
            />
          </div>

          {/* Media Type Filter */}
          <select
            value={mediaFilter}
            onChange={(e) => setMediaFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-omni-bg border border-omni-border text-xs text-omni-text focus:outline-none focus:border-omni-primary"
          >
            <option value="all">All Media Types</option>
            <option value="image">Images (PNG/JPG/WEBP)</option>
            <option value="audio">Audio (WAV/MP3)</option>
            <option value="video">Video (MP4/MOV)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-omni-bg border border-omni-border text-xs text-omni-text focus:outline-none focus:border-omni-primary"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="detector_not_configured">Detector Unconfigured</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </Card>

      {/* Results List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card className="text-center py-12">
            <History className="w-8 h-8 text-omni-muted mx-auto mb-2" />
            <p className="text-sm font-medium text-omni-text">No matching analyses found</p>
            <p className="text-xs text-omni-muted mt-1">
              Try adjusting your search criteria or media filters.
            </p>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card
              key={item.analysis_id}
              hoverEffect
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
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
                    <span className="text-sm font-semibold text-omni-text truncate max-w-sm">
                      {item.filename}
                    </span>
                    <Badge status={item.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-omni-muted mt-1 font-mono">
                    <span>ID: {item.analysis_id}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(item.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                {item.assessment_score !== null && item.assessment_score !== undefined ? (
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-omni-text">
                      {(item.assessment_score * 100).toFixed(0)}% Score
                    </div>
                    <div className="text-[10px] text-omni-muted">Probabilistic</div>
                  </div>
                ) : (
                  <span className="text-xs text-omni-muted font-mono">
                    {item.status === "detector_not_configured" ? "Unconfigured" : "Pending"}
                  </span>
                )}

                <Link href={`/analyses/${item.analysis_id}`}>
                  <Button variant="outline" size="sm">
                    Inspect
                  </Button>
                </Link>

                <Link href={`/reports/${item.analysis_id}`}>
                  <Button variant="ghost" size="sm">
                    Report
                  </Button>
                </Link>

                {deleteConfirmId === item.analysis_id ? (
                  <div className="flex items-center gap-1 bg-omni-bg p-1 rounded-lg border border-omni-border">
                    <button
                      onClick={() => handleDelete(item.analysis_id)}
                      className="px-2 py-1 text-[11px] rounded bg-rose-600 text-white font-medium hover:bg-rose-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1 text-[11px] text-omni-muted hover:text-omni-text"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(item.analysis_id)}
                    className="p-2 rounded-lg text-omni-muted hover:text-rose-400 hover:bg-omni-surfaceHover transition-colors"
                    title="Delete analysis and wipe media"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
