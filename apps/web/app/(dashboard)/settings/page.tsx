"use client";

import React, { useState } from "react";
import {
  Shield,
  Trash2,
  Clock,
  Lock,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      <div>
        <h1 className="text-xl font-bold text-omni-text tracking-tight">
          Settings & Retention Controls
        </h1>
        <p className="text-xs text-omni-muted mt-1">
          Configure security, automated media retention policies, and verify detector availability.
        </p>
      </div>

      {/* Media Retention Policy */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-omni-primary/10 border border-omni-primary/30 text-omni-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Media Retention Policy</CardTitle>
            <CardDescription>
              Automatic purging of stored media files from private S3/MinIO buckets.
            </CardDescription>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-omni-bg border border-omni-border">
            <label className="text-xs font-semibold text-omni-text block mb-2">
              Auto-Deletion Window
            </label>
            <select
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-omni-surface border border-omni-border text-xs text-omni-text focus:outline-none focus:border-omni-primary"
            >
              <option value="1">24 Hours (Immediate evaluation)</option>
              <option value="7">7 Days (Default forensic window)</option>
              <option value="30">30 Days (Extended investigation)</option>
              <option value="manual">Manual deletion only</option>
            </select>
          </div>

          <div className="p-4 rounded-xl bg-omni-bg border border-omni-border sm:col-span-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-omni-text block mb-1">
                Data Minimization Principle
              </span>
              <p className="text-xs text-omni-muted leading-relaxed">
                When an asset expires under this retention policy, raw media bytes are permanently deleted from object storage. Cryptographic hashes and anonymized detector metrics can be retained for audit consistency.
              </p>
            </div>
            <div className="mt-2 text-[11px] font-mono text-omni-primary">
              Status: Active policy ({retentionDays} days)
            </div>
          </div>
        </div>
      </Card>

      {/* Manual Hard Deletion Controls */}
      <Card className="p-6 space-y-4 border-rose-900/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-rose-300">
              Emergency Data Purge & Hard Deletion
            </CardTitle>
            <CardDescription>
              Instantly delete all local media files and associated forensic analysis cache.
            </CardDescription>
          </div>
        </div>

        <p className="text-xs text-omni-muted leading-relaxed">
          This operation triggers an immediate cascading hard wipe of all uploaded media objects in private storage and clears temporary decoding scratch disks.
        </p>

        <div className="flex items-center justify-between pt-2">
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
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Media purge executed successfully.
            </span>
          )}
        </div>
      </Card>

      {/* Environment & Platform Metadata */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-omni-secondary/10 border border-omni-secondary/30 text-omni-secondary">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Environment & System Version</CardTitle>
            <CardDescription>Active build configuration and runtime specifications.</CardDescription>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-omni-bg border border-omni-border">
            <span className="text-omni-muted block text-[10px] uppercase">Application</span>
            <span className="text-omni-text font-semibold">OmniScan v1.0.0-m0</span>
          </div>
          <div className="p-3 rounded-lg bg-omni-bg border border-omni-border">
            <span className="text-omni-muted block text-[10px] uppercase">Frontend Engine</span>
            <span className="text-omni-text font-semibold">Next.js 15 App Router</span>
          </div>
          <div className="p-3 rounded-lg bg-omni-bg border border-omni-border">
            <span className="text-omni-muted block text-[10px] uppercase">API Target</span>
            <span className="text-omni-text font-semibold">FastAPI v1 (REST)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
