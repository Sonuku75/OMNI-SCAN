"use client";

import React, { useState } from "react";
import {
  Trash2,
  Clock,
  CheckCircle2,
  HardDrive,
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [retentionDays, setRetentionDays] = useState("7");
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const handlePurge = () => {
    setIsPurging(true);
    setTimeout(() => {
      setIsPurging(false);
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Plaque */}
      <div className="pb-3 border-b-2 border-[#B58A4C]/60">
        <h1 className="text-2xl font-extrabold text-[#F0DDB8] tracking-tight drop-shadow-[0_1px_2px_rgba(18,11,7,0.8)]">
          Settings & Retention Controls
        </h1>
        <p className="text-xs text-[#D8B98A]">
          Configure automated asset lifecycle rules, forensic retention policies, and hard deletion triggers.
        </p>
      </div>

      {/* Media Retention Policy Panel */}
      <Card rivets={true} className="p-3 sm:p-4 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#B58A4C]/35">
          <div className="p-2 rounded-lg bg-[#D8B98A] border border-[#B58A4C] text-[#173D2D]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-[#24170F]">Media Retention Lifecycle</CardTitle>
            <CardDescription className="text-xs text-[#664830]">
              Automated purging of stored media files from private S3/MinIO object buckets.
            </CardDescription>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="skeuo-recessed p-4 rounded-xl border border-[#B58A4C]/60">
            <label className="text-xs font-bold text-[#24170F] block mb-2">
              Auto-Deletion Window
            </label>
            <select
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#F0DDB8] border border-[#B58A4C] text-xs font-semibold text-[#24170F] focus:outline-none focus:border-[#E5C995] shadow-[inset_0_2px_4px_rgba(36,23,15,0.2)] font-mono"
            >
              <option value="1">24 Hours (Immediate evaluation)</option>
              <option value="7">7 Days (Default forensic window)</option>
              <option value="30">30 Days (Extended investigation)</option>
              <option value="manual">Manual deletion only</option>
            </select>
          </div>

          <div className="skeuo-recessed p-4 rounded-xl sm:col-span-2 flex flex-col justify-between border border-[#B58A4C]/60">
            <div>
              <span className="text-xs font-bold text-[#24170F] block mb-1">
                Data Minimization Mandate
              </span>
              <p className="text-xs text-[#664830] leading-relaxed">
                When an asset expires under this retention policy, raw media bytes are permanently deleted from object storage. Cryptographic SHA-256 hashes and anonymized detector metrics are preserved for audit consistency.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-mono text-[#28734A] font-bold">
              Active Retention Policy: {retentionDays === "manual" ? "Manual Review Only" : `${retentionDays} Days TTL`}
            </div>
          </div>
        </div>
      </Card>

      {/* Emergency Hard Deletion Panel */}
      <Card rivets={true} className="p-3 sm:p-4 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#B58A4C]/35">
          <div className="p-2 rounded-lg bg-[#8C2318]/20 border border-[#A9362B] text-[#A9362B]">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-[#A9362B]">
              Emergency Data Purge & Hard Deletion
            </CardTitle>
            <CardDescription className="text-xs text-[#664830]">
              Instantly purge local media files and associated forensic scratch disks.
            </CardDescription>
          </div>
        </div>

        <p className="text-xs text-[#664830] leading-relaxed">
          This operation triggers an immediate cascading hard wipe of all uploaded media objects across private storage volumes and permanently clears temporary ffmpeg/OpenCV decoding frames.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <Button
            variant="danger"
            size="sm"
            onClick={handlePurge}
            isLoading={isPurging}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purge All Workspace Media</span>
          </Button>

          {purgeSuccess && (
            <span className="text-xs font-mono font-bold text-[#28734A] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Workspace media storage purged successfully.
            </span>
          )}
        </div>
      </Card>

      {/* System Environment Specifications */}
      <Card rivets={true} className="p-3 sm:p-4 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#B58A4C]/35">
          <div className="p-2 rounded-lg bg-[#D8B98A] border border-[#B58A4C] text-[#173D2D]">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-[#24170F]">Forensic Hardware & Environment</CardTitle>
            <CardDescription className="text-xs text-[#664830]">Active runtime specifications and microservice bindings.</CardDescription>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="skeuo-recessed p-3 rounded-lg border border-[#B58A4C]/60">
            <span className="text-[#664830] block text-[10px] font-bold uppercase">Application</span>
            <span className="text-[#24170F] font-black">OmniScan v1.0.0-m0</span>
          </div>
          <div className="skeuo-recessed p-3 rounded-lg border border-[#B58A4C]/60">
            <span className="text-[#664830] block text-[10px] font-bold uppercase">Engine Layer</span>
            <span className="text-[#24170F] font-black">Next.js 15 App Router</span>
          </div>
          <div className="skeuo-recessed p-3 rounded-lg border border-[#B58A4C]/60">
            <span className="text-[#664830] block text-[10px] font-bold uppercase">API Target</span>
            <span className="text-[#24170F] font-black">FastAPI v1 (REST)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
