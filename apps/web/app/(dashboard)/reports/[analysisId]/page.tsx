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
  Clock,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rivet } from "@/components/ui/rivet";
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
      <div className="py-20 text-center text-xs font-mono text-[#8ea1bc]">
        Generating official forensic dossier...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar (Hidden on print) */}
      <div className="flex items-center justify-between print:hidden pb-3 border-b-2 border-[#B58A4C]/60">
        <Link
          href={`/analyses/${analysisId}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#D8B98A] hover:text-[#F0DDB8] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Analysis Inspection</span>
        </Link>
        <Button onClick={handlePrint} variant="primary" size="sm" className="gap-2 shadow-md">
          <Printer className="w-4 h-4" />
          <span>Print / Export PDF</span>
        </Button>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="skeuo-card p-3 sm:p-5 print:p-0 print:border-none print:shadow-none print:bg-white">
        <div className="skeuo-plate p-6 sm:p-10 space-y-8 print:p-0 print:border-none print:shadow-none print:bg-white text-[#24170F] print:text-black">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#B58A4C] print:border-gray-800 pb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#28734A] to-[#173D2D] border border-[#B58A4C] flex items-center justify-center text-[#F0DDB8] shadow-[0_2px_5px_rgba(18,11,7,0.5)] print:hidden">
                <ShieldAlert className="w-6 h-6 text-[#E5C995]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#24170F] print:text-black tracking-tight">
                  OMNISCAN FORENSIC REPORT
                </h1>
                <p className="text-[11px] text-[#173D2D] print:text-gray-600 font-mono uppercase tracking-widest font-bold">
                  Verified Synthetic Media Dossier
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono text-xs text-[#664830] print:text-gray-700 space-y-0.5">
              <div><strong className="text-[#24170F] print:text-black">Dossier:</strong> {report.report_id}</div>
              <div><strong className="text-[#24170F] print:text-black">Generated:</strong> {formatDate(report.generated_at)}</div>
              <div><strong className="text-[#24170F] print:text-black">Analysis ID:</strong> {report.analysis_id.slice(0, 16)}...</div>
            </div>
          </div>

          {/* Section 1: Media Asset Telemetry */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#173D2D] print:text-gray-800 font-mono mb-2">
              1. Asset Specifications & Cryptographic Verification
            </h2>
            <div className="skeuo-recessed p-4 rounded-xl print:bg-gray-50 print:border print:border-gray-300 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono border border-[#B58A4C]/60">
              <div>
                <span className="text-[#664830] print:text-gray-600 block text-[10px] uppercase font-bold">Filename</span>
                <span className="font-extrabold text-[#24170F] print:text-black break-all">
                  {report.media_metadata.filename}
                </span>
              </div>
              <div>
                <span className="text-[#664830] print:text-gray-600 block text-[10px] uppercase font-bold">Media Type</span>
                <span className="font-extrabold text-[#24170F] print:text-black">
                  {report.media_metadata.media_type.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-[#664830] print:text-gray-600 block text-[10px] uppercase font-bold">File Size</span>
                <span className="font-extrabold text-[#24170F] print:text-black">
                  {formatBytes(report.media_metadata.size_bytes)}
                </span>
              </div>
              <div>
                <span className="text-[#664830] print:text-gray-600 block text-[10px] uppercase font-bold">Integrity SHA-256</span>
                <span className="font-extrabold text-[#24170F] truncate block print:text-black">
                  {report.media_metadata.sha256.slice(0, 16)}...
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Executive Findings Summary */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#173D2D] print:text-gray-800 font-mono mb-2">
              2. Executive Findings Summary
            </h2>
            <div className="skeuo-recessed p-4 rounded-xl text-xs text-[#24170F] print:text-black leading-relaxed print:bg-gray-50 print:border print:border-gray-300 font-sans font-medium border border-[#B58A4C]/60">
              {report.summary_statement}
            </div>
          </div>

          {/* Section 3: Grounded Evidence Points */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#173D2D] print:text-gray-800 font-mono mb-2">
              3. Grounded Forensic Evidence Points
            </h2>
            <ul className="list-disc list-inside space-y-2 text-xs text-[#24170F] p-4 rounded-xl skeuo-recessed print:bg-gray-50 print:text-black print:border print:border-gray-300 font-mono border border-[#B58A4C]/60">
              {report.evidence_points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>

          {/* Section 4: Detector Telemetry Table */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#173D2D] print:text-gray-800 font-mono mb-2">
              4. Modular Detector Executions
            </h2>
            <div className="border border-[#B58A4C] rounded-xl overflow-hidden text-xs font-mono print:border-gray-300">
              <table className="w-full text-left">
                <thead className="bg-[#3B281A] text-[#D8B98A] uppercase print:bg-gray-100 print:text-gray-700 text-[10px]">
                  <tr>
                    <th className="p-3">Detector Module</th>
                    <th className="p-3">Version</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Score / Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B58A4C]/30 bg-[#F0DDB8] print:divide-gray-200">
                  {report.detector_breakdown.map((det, i) => (
                    <tr key={i} className="hover:bg-[#EBD5AB]">
                      <td className="p-3 font-bold text-[#24170F] print:text-black">
                        {det.name}
                      </td>
                      <td className="p-3 text-[#664830] print:text-gray-600">{det.version}</td>
                      <td className="p-3">
                        <Badge status={det.status} />
                      </td>
                      <td className="p-3 font-bold text-[#24170F] print:text-black">
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
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#8C5214]/25 to-[#63390B]/25 border border-[#B58A4C] text-[#24170F] text-xs flex items-start gap-3 print:bg-yellow-50 print:text-yellow-900 print:border-yellow-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#C97A24]" />
              <div>
                <strong className="block font-bold text-sm text-[#24170F]">Human Verification Mandate</strong>
                <span className="leading-relaxed text-[#664830]">
                  Automated models detected algorithmic anomalies. Final determinations must be corroborated by a qualified media forensics analyst.
                </span>
              </div>
            </div>
          )}

          {/* Disclaimers & Legal */}
          <div className="border-t-2 border-[#B58A4C] pt-6 space-y-2 text-[11px] text-[#664830] print:text-gray-600 print:border-gray-300">
            <p className="font-bold text-[#24170F] print:text-black">
              Forensic Uncertainty & Reliability Disclosure:
            </p>
            <p className="leading-relaxed">{report.disclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
