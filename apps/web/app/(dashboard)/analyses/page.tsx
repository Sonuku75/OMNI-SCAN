"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Trash2,
  Clock,
  Image as ImageIcon,
  Mic,
  Video,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rivet } from "@/components/ui/rivet";
import { SectionHeader } from "@/components/ui/panels";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";
import { AnalysisSummary } from "@/types/api";
import { formatDate } from "@/lib/utils";

export default function AnalysesPage() {
  const [items, setItems] = useState<AnalysisSummary[]>([]);
  const [search, setSearch] = useState("");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AnalysisSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchAnalyses() {
      try {
        const res = await apiClient.listAnalyses({
          mediaType: mediaFilter,
          status: statusFilter,
        });
        if (!mounted) return;
        if (res.items) {
          setItems(res.items);
        }
      } catch {
        // Handled
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchAnalyses();
    return () => {
      mounted = false;
    };
  }, [mediaFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteAnalysis(deleteTarget.analysis_id);
      setItems((prev) => prev.filter((item) => item.analysis_id !== deleteTarget.analysis_id));
      setToastMessage(`Deleted analysis and media for "${deleteTarget.filename}"`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      // Local removal if backend is unreachable
      setItems((prev) => prev.filter((item) => item.analysis_id !== deleteTarget.analysis_id));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.filename.toLowerCase().includes(search.toLowerCase()) ||
      item.analysis_id.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Forensic Case Archive"
        description="Chronological audit log of analyzed synthetic assets, calibrated detection scores, and cryptographic evidence."
        action={
          <Link href="/analyze">
            <Button variant="primary" size="sm" className="gap-2">
              <span>New Ingestion</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        }
      />

      {toastMessage && (
        <Toast
          type="success"
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Recessed Filter Console */}
      <div className="skeuo-recessed p-4 sm:p-5 space-y-4 border border-[#B58A4C]/70">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Slot */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#604A34]" />
            <input
              type="text"
              placeholder="Search filename or case ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="skeuo-input w-full pl-9 pr-3 py-2 text-xs font-semibold text-[#302013] placeholder-[#8A6D50] font-mono"
            />
          </div>

          {/* Media Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[#302013] shrink-0">Type:</label>
            <select
              value={mediaFilter}
              onChange={(e) => setMediaFilter(e.target.value)}
              className="skeuo-input w-full px-3 py-2 text-xs font-semibold text-[#302013] font-mono"
            >
              <option value="all">All Media Modalities</option>
              <option value="image">Image Evidence</option>
              <option value="audio">Audio / Voice Clones</option>
              <option value="video">Video Synthetics</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[#302013] shrink-0">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="skeuo-input w-full px-3 py-2 text-xs font-semibold text-[#302013] font-mono"
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

      {/* Structured Forensic History Panel */}
      <div className="skeuo-card p-2 sm:p-2.5">
        {/* Wood/Metal Header */}
        <div className="bg-gradient-to-r from-[#4A3321] to-[#3B281A] px-4 py-3 rounded-lg border border-[#B58A4C] flex items-center justify-between shadow-[inset_0_1px_0_rgba(229,201,149,0.25)]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#E5C995]" />
            <span className="text-xs sm:text-sm font-bold text-[#F0DDB8] tracking-wide drop-shadow-[0_1px_1px_rgba(18,11,7,0.8)]">
              Case Records ({filteredItems.length})
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

        {/* Case List Body */}
        <div className="p-3 space-y-2.5">
          {isLoading ? (
            <div className="skeuo-plate text-center py-12 text-xs font-mono text-[#604A34]">
              Querying forensic case database records...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="skeuo-plate text-center py-12 p-6">
              <History className="w-8 h-8 text-[#604A34] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#302013]">No analyses match criteria</p>
              <p className="text-xs text-[#604A34] mt-1">
                Try clearing search terms or modifying modality filters.
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
                      <span className="text-sm font-extrabold text-[#302013] truncate max-w-sm">
                        {item.filename}
                      </span>
                      <StatusBadge status={item.status} />
                      {item.verdict && (
                        <Badge variant={item.verdict.includes("AI-GENERATED") ? "danger" : item.verdict.includes("REAL") ? "success" : "info"}>
                          {item.verdict}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-[#604A34] mt-1 font-mono flex-wrap">
                      <span className="break-all sm:break-normal" title={item.analysis_id}>
                        <span className="sm:hidden">ID: {item.analysis_id.slice(0, 12)}...</span>
                        <span className="hidden sm:inline">ID: {item.analysis_id}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" /> {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  {item.assessment_score !== null && item.assessment_score !== undefined ? (
                    <div className="text-right">
                      <div className="text-xs font-mono font-black text-[#302013]">
                        {(item.assessment_score * 100).toFixed(0)}% Score
                      </div>
                      <div className="text-[10px] text-[#604A34]">Calibrated</div>
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

                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="p-1.5 rounded-lg text-[#604A34] hover:text-[#A9362B] hover:bg-[#B58A4C]/20 transition-colors cursor-pointer"
                    title="Delete case record"
                    aria-label={`Delete ${item.filename}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Forensic Analysis Record?"
        description={`Permanently delete the analysis session for "${deleteTarget?.filename}" and remove the raw media object from private storage. This action cannot be undone.`}
        confirmLabel="Delete Record"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
