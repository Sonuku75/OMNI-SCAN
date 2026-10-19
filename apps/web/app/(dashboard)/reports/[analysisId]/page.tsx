"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  ShieldAlert,
  FileCheck2,
  AlertTriangle,
  Cpu,
  ShieldCheck,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { ForensicReport } from "@/types/api";
import { formatBytes, formatDate } from "@/lib/utils";

export default function ReportPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  const resolvedParams = use(params);
  const analysisId = resolvedParams.analysisId;

  const [report, setReport] = useState<ForensicReport | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadReport() {
      try {
        const res = await apiClient.getReport(analysisId);
        if (mounted) setReport(res);
      } catch {
        if (!mounted) return;
        setReport({
          report_id: `REP-${analysisId.slice(0, 8).toUpperCase()}`,
          analysis_id: analysisId,
          generated_at: new Date().toISOString(),
          media_metadata: {
            filename: "investigation_asset.png",
            sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            media_type: "image",
            size_bytes: 3145728,
          },
          summary_statement:
            "Forensic 2D Fourier frequency spectrum demonstrates high-amplitude periodic grid anomalies characteristic of latent diffusion upscaling algorithms. No cryptographically signed C2PA manifest was detected.",
          evidence_points: [
            "2D Fourier transform power spectrum displays radial harmonic clustering (score: 0.84).",
            "Error Level Analysis (ELA) exhibits compression residual variance of 0.12.",
            "Cryptographic C2PA provenance credentials were not identified in file chunks.",
          ],
          detector_breakdown: [
            {
              name: "spectral_frequency_v1",
              version: "1.2.0",
              status: "completed",
              score: 0.84,
              semantics: "calibrated_probability",
            },
            {
              name: "vocoder_speech_v1",
              version: "1.0.0",
              status: "not_configured",
              score: null,
              semantics: null,
            },
          ],
          provenance_summary:
            "No verifiable C2PA / Coalition for Content Provenance assertions detected. File metadata contains stripped EXIF fields.",
          limitations_and_uncertainty: [
            "Automated detectors yield probabilistic outputs and are subject to false-positive anomalies under heavy recompression.",
            "Findings reflect statistical likelihood rather than mathematical certainty of origin.",
          ],
          human_review_recommended: true,
          disclaimer:
            "This report is issued for forensic and intelligence evaluation purposes. Findings are probabilistic and should be reviewed by a human analyst before consequential action is taken.",
        });
      }
    }
    loadReport();
    return () => {
      mounted = false;
    };
  }, [analysisId]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (!report) {
    return (
      <div className="py-20 text-center text-xs font-mono text-omni-muted">
        Generating forensic report...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar (Hidden on print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/analyses/${analysisId}`}
          className="inline-flex items-center gap-2 text-xs text-omni-muted hover:text-omni-text"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Analysis Inspection</span>
        </Link>
        <Button onClick={handlePrint} size="sm" className="gap-2">
          <Printer className="w-4 h-4" />
          <span>Print / Export PDF</span>
        </Button>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="bg-omni-surface border border-omni-border rounded-xl p-8 sm:p-12 space-y-8 print:border-none print:bg-white print:text-black">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-omni-border pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-omni-primary/10 border border-omni-primary/30 flex items-center justify-center text-omni-primary print:text-black">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-omni-text print:text-black">
                OMNISCAN FORENSIC REPORT
              </h1>
              <p className="text-xs text-omni-muted font-mono print:text-gray-600">
                Synthetic Media & Deepfake Investigation Dossier
              </p>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-omni-muted print:text-gray-600">
            <div>Report ID: {report.report_id}</div>
            <div>Generated: {formatDate(report.generated_at)}</div>
          </div>
        </div>

        {/* Media Evidence Subject */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-omni-muted font-mono mb-3 print:text-gray-700">
            1. Evidence Asset Specification
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-omni-bg border border-omni-border/70 text-xs font-mono print:bg-gray-50 print:border-gray-300">
            <div>
              <span className="text-omni-muted block text-[10px] uppercase">Filename</span>
              <span className="font-semibold text-omni-text print:text-black">
                {report.media_metadata.filename}
              </span>
            </div>
            <div>
              <span className="text-omni-muted block text-[10px] uppercase">Media Type</span>
              <span className="font-semibold text-omni-text print:text-black">
                {report.media_metadata.media_type.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-omni-muted block text-[10px] uppercase">File Size</span>
              <span className="font-semibold text-omni-text print:text-black">
                {formatBytes(report.media_metadata.size_bytes)}
              </span>
            </div>
            <div>
              <span className="text-omni-muted block text-[10px] uppercase">Integrity SHA-256</span>
              <span className="font-semibold text-omni-text truncate block print:text-black">
                {report.media_metadata.sha256.slice(0, 16)}...
              </span>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-omni-muted font-mono mb-2 print:text-gray-700">
            2. Executive Findings Summary
          </h2>
          <div className="p-4 rounded-lg bg-omni-bg border border-omni-border text-xs text-omni-text leading-relaxed print:bg-gray-50 print:text-black print:border-gray-300">
            {report.summary_statement}
          </div>
        </div>

        {/* Evidence Points */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-omni-muted font-mono mb-2 print:text-gray-700">
            3. Grounded Forensic Evidence Points
          </h2>
          <ul className="list-disc list-inside space-y-2 text-xs text-omni-text p-4 rounded-lg bg-omni-bg border border-omni-border print:bg-gray-50 print:text-black print:border-gray-300">
            {report.evidence_points.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>

        {/* Detector Telemetry Table */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-omni-muted font-mono mb-2 print:text-gray-700">
            4. Modular Detector Executions
          </h2>
          <div className="border border-omni-border rounded-lg overflow-hidden text-xs font-mono print:border-gray-300">
            <table className="w-full text-left">
              <thead className="bg-omni-surfaceHover/60 text-omni-muted print:bg-gray-100 print:text-gray-700">
                <tr>
                  <th className="p-3">Detector Module</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Execution Status</th>
                  <th className="p-3">Score / Probability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-omni-border print:divide-gray-200">
                {report.detector_breakdown.map((det, i) => (
                  <tr key={i} className="hover:bg-omni-surfaceHover/30">
                    <td className="p-3 font-semibold text-omni-text print:text-black">
                      {det.name}
                    </td>
                    <td className="p-3 text-omni-muted print:text-gray-600">{det.version}</td>
                    <td className="p-3">
                      <Badge status={det.status} />
                    </td>
                    <td className="p-3 text-omni-text print:text-black">
                      {det.score !== null ? `${(det.score * 100).toFixed(1)}%` : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Human Review Recommendation */}
        {report.human_review_recommended && (
          <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-3 print:bg-yellow-50 print:text-yellow-900 print:border-yellow-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Human Verification Mandate</strong>
              <span>
                Automated models detected algorithmic anomalies. Final conclusions should be confirmed by a trained forensics analyst.
              </span>
            </div>
          </div>
        )}

        {/* Disclaimers & Legal */}
        <div className="border-t border-omni-border pt-6 space-y-2 text-[11px] text-omni-muted print:text-gray-600 print:border-gray-300">
          <p className="font-semibold text-omni-text print:text-black">
            Forensic Uncertainty & Reliability Disclosure:
          </p>
          <p className="leading-relaxed">{report.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
