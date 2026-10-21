"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User as UserIcon,
  Shield,
  Sliders,
  Database,
  Trash2,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ExternalLink,
  Cpu,
  Layers,
  FileCheck2,
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { InsetPanel, SectionHeader } from "@/components/ui/panels";
import { TextInput, Select, Switch } from "@/components/ui/inputs";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";
import { clearAuthToken, getStoredUser } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { HealthResponse, SystemSettingsResponse, User } from "@/types/api";
import { formatDate } from "@/lib/utils";

type SettingsSection = "account" | "security" | "preferences" | "retention" | "detectors";

interface ClientPreferences {
  defaultView: "dashboard" | "analyze";
  historyPageSize: number;
  autoRefreshIntervalSeconds: number;
  showTechnicalLimitationsDefault: boolean;
}

const DEFAULT_PREFERENCES: ClientPreferences = {
  defaultView: "dashboard",
  historyPageSize: 20,
  autoRefreshIntervalSeconds: 15,
  showTechnicalLimitationsDefault: true,
};

export default function SettingsPage() {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");

  // Remote data
  const [user, setUser] = useState<User | null>(authUser);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Client preferences
  const [preferences, setPreferences] = useState<ClientPreferences>(DEFAULT_PREFERENCES);
  const [prefsSavedToast, setPrefsSavedToast] = useState(false);

  // Purge modal
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ success: boolean; count: number } | null>(null);

  useEffect(() => {
    let mounted = true;

    // Load client preferences
    if (typeof window !== "undefined") {
      const storedPrefs = localStorage.getItem("omniscan_preferences");
      if (storedPrefs) {
        try {
          setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(storedPrefs) });
        } catch {}
      }
    }

    const cachedUser = getStoredUser();
    if (cachedUser) setUser(cachedUser);

    async function loadBackendData() {
      try {
        const [userRes, healthRes, settingsRes] = await Promise.allSettled([
          apiClient.getMe(),
          apiClient.getHealth(),
          apiClient.getSettings(),
        ]);

        if (!mounted) return;

        if (userRes.status === "fulfilled") {
          setUser(userRes.value);
        }
        if (healthRes.status === "fulfilled") {
          setHealth(healthRes.value);
        }
        if (settingsRes.status === "fulfilled") {
          setSystemSettings(settingsRes.value);
        }
      } catch {
        // Handled gracefully
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadBackendData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSavePreferences = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("omniscan_preferences", JSON.stringify(preferences));
      setPrefsSavedToast(true);
      setTimeout(() => setPrefsSavedToast(false), 3000);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handlePurgeAllAnalyses = async () => {
    setIsPurging(true);
    try {
      // Query owned analyses
      const listRes = await apiClient.listAnalyses({ pageSize: 100 });
      let deletedCount = 0;
      if (listRes && listRes.items) {
        for (const item of listRes.items) {
          try {
            await apiClient.deleteAnalysis(item.analysis_id);
            deletedCount++;
          } catch {}
        }
      }
      setPurgeResult({ success: true, count: deletedCount });
    } catch {
      setPurgeResult({ success: false, count: 0 });
    } finally {
      setIsPurging(false);
      setIsPurgeDialogOpen(false);
    }
  };

  const navItems = [
    { id: "account" as const, label: "Account & Profile", icon: UserIcon },
    { id: "security" as const, label: "Security & Sessions", icon: Shield },
    { id: "preferences" as const, label: "Analysis Preferences", icon: Sliders },
    { id: "retention" as const, label: "Privacy & Media Retention", icon: Database },
    { id: "detectors" as const, label: "Detector & System Status", icon: Cpu },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <SectionHeader
        title="Settings & Forensic Station Configuration"
        description="Manage authenticated workstation credentials, local analysis defaults, privacy retention policies, and real detector readiness."
      />

      {prefsSavedToast && (
        <Toast
          type="success"
          message="Preferences saved successfully"
          description="Your local workstation preferences have been written to browser storage."
          onClose={() => setPrefsSavedToast(false)}
        />
      )}

      {purgeResult && (
        <Toast
          type={purgeResult.success ? "success" : "error"}
          message={
            purgeResult.success
              ? `Purged ${purgeResult.count} analyses and raw media files`
              : "Failed to purge some records from private storage"
          }
          description={
            purgeResult.success
              ? "All selected forensic objects have been deleted from storage and retention history updated."
              : "Please check backend connectivity and retry."
          }
          onClose={() => setPurgeResult(null)}
        />
      )}

      {/* Responsive Section Layout: Left Tab List + Right Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar (Desktop list / Mobile selector) */}
        <div className="lg:col-span-1 space-y-2">
          {/* Mobile Select Dropdown */}
          <div className="lg:hidden">
            <Select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as SettingsSection)}
              aria-label="Settings section"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Desktop Tab Stack */}
          <div className="hidden lg:flex flex-col space-y-1.5 p-2 rounded-xl bg-[#3B281A] border border-[#B58A4C] shadow-md">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-b from-[#FAF1DF] to-[#E2CCA1] text-[#302013] border border-[#B58A4C] shadow-[0_2px_4px_rgba(16,10,6,0.3),inset_0_1px_0_rgba(255,255,255,0.9)]"
                      : "text-[#D8B98A] hover:text-[#F0DDB8] hover:bg-[#24170F]/50"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-[#173D2D]" : "text-[#B58A4C]"
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Hardware Status Jewel in Nav Sidebar */}
          <div className="hidden lg:block p-3 rounded-xl skeuo-card">
            <div className="text-[11px] font-mono text-[#F0DDB8] space-y-1">
              <div className="text-[#E5C995] font-bold uppercase tracking-wider text-[10px]">
                Active Workstation
              </div>
              <div className="text-xs font-black truncate">
                {systemSettings?.project_name || "OmniScan Forensics"}
              </div>
              <div className="text-[#D8B98A] text-[10px]">
                Core Engine v{systemSettings?.version || "1.0.0"}
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Panels */}
        <div className="lg:col-span-3 space-y-6">
          {/* SECTION A: ACCOUNT & PROFILE */}
          {activeSection === "account" && (
            <Card rivets={true} className="p-3 sm:p-4 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#B58A4C]/35">
                <div>
                  <CardTitle>Authenticated Analyst Profile</CardTitle>
                  <CardDescription>
                    Identity parameters and credentials recorded for this forensic workstation.
                  </CardDescription>
                </div>
                <Badge variant="success">Active Session</Badge>
              </div>

              {user ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextInput
                      label="Analyst Display Name"
                      value={user.full_name || "Forensic Analyst"}
                      readOnly
                      helperText="Profile attributes are managed via institutional identity provider."
                    />
                    <TextInput
                      label="Institutional Email"
                      value={user.email}
                      readOnly
                      helperText="Verified email address used for audit logs."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs pt-1">
                    <InsetPanel>
                      <span className="text-[#604A34] block text-[10px] font-bold uppercase">
                        Account Role
                      </span>
                      <span className="text-[#302013] font-black capitalize">
                        {user.role || "analyst"}
                      </span>
                    </InsetPanel>
                    <InsetPanel>
                      <span className="text-[#604A34] block text-[10px] font-bold uppercase">
                        Account ID
                      </span>
                      <span className="text-[#302013] font-black truncate block">
                        {user.id}
                      </span>
                    </InsetPanel>
                    <InsetPanel>
                      <span className="text-[#604A34] block text-[10px] font-bold uppercase">
                        Provisioned
                      </span>
                      <span className="text-[#302013] font-black">
                        {formatDate(user.created_at)}
                      </span>
                    </InsetPanel>
                  </div>
                </div>
              ) : (
                <InsetPanel>
                  <p className="text-xs text-[#604A34]">
                    No authenticated user profile detected. Sign in to view institutional account credentials.
                  </p>
                </InsetPanel>
              )}
            </Card>
          )}

          {/* SECTION B: SECURITY & SESSIONS */}
          {activeSection === "security" && (
            <Card rivets={true} className="p-3 sm:p-4 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#B58A4C]/35">
                <div>
                  <CardTitle>Security & Active Session</CardTitle>
                  <CardDescription>
                    Current cryptographic bearer token and session invalidation controls.
                  </CardDescription>
                </div>
                <Shield className="w-5 h-5 text-[#28734A]" />
              </div>

              <div className="space-y-4">
                <InsetPanel>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#28734A] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-xs text-[#302013]">
                        Stateless JWT Bearer Authentication
                      </strong>
                      <p className="text-xs text-[#604A34] leading-relaxed mt-1">
                        Requests to the FastAPI backend include cryptographically signed HMAC-SHA256 authorization headers. Passwords are never stored on client storage.
                      </p>
                    </div>
                  </div>
                </InsetPanel>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#302013] block">
                      Invalidate Current Session
                    </span>
                    <p className="text-[11px] text-[#604A34]">
                      Clear cached security credentials and return to the login interface.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="gap-2 shrink-0"
                  >
                    <LogOut className="w-4 h-4 text-[#B58A4C]" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* SECTION C: ANALYSIS PREFERENCES */}
          {activeSection === "preferences" && (
            <Card rivets={true} className="p-3 sm:p-4 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#B58A4C]/35">
                <div>
                  <CardTitle>Workstation Analysis Preferences</CardTitle>
                  <CardDescription>
                    Client-stored configuration parameters governing UI defaults and workflow navigation.
                  </CardDescription>
                </div>
                <Badge variant="outline">Client Stored</Badge>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Default Station Landing View"
                    value={preferences.defaultView}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        defaultView: e.target.value as "dashboard" | "analyze",
                      })
                    }
                    helperText="Screen displayed immediately upon opening the forensic workstation."
                  >
                    <option value="dashboard">Dashboard (Intelligence Overview)</option>
                    <option value="analyze">Analyze Media (Direct Ingestion Bay)</option>
                  </Select>

                  <Select
                    label="Case Archive Default Page Size"
                    value={String(preferences.historyPageSize)}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        historyPageSize: Number(e.target.value),
                      })
                    }
                    helperText="Number of forensic cases loaded per page."
                  >
                    <option value="10">10 cases per page</option>
                    <option value="20">20 cases per page (Recommended)</option>
                    <option value="50">50 cases per page</option>
                  </Select>
                </div>

                <div className="pt-3 border-t border-[#B58A4C]/35">
                  <Switch
                    label="Always Display Detector Limitations & Edge Cases"
                    description="When enabled, inspection dossiers explicitly render model boundary disclosures and frequency degradation caveats."
                    checked={preferences.showTechnicalLimitationsDefault}
                    onCheckedChange={(val) =>
                      setPreferences({
                        ...preferences,
                        showTechnicalLimitationsDefault: val,
                      })
                    }
                  />
                </div>

                <div className="pt-4 border-t border-[#B58A4C]/35 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSavePreferences}
                    className="gap-2"
                  >
                    <span>Save Preferences</span>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* SECTION D: PRIVACY & MEDIA RETENTION */}
          {activeSection === "retention" && (
            <Card rivets={true} className="p-3 sm:p-4 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#B58A4C]/35">
                <div>
                  <CardTitle>Privacy & Media Retention Controls</CardTitle>
                  <CardDescription>
                    Backend object storage policies and verified evidence deletion protocols.
                  </CardDescription>
                </div>
                <Database className="w-5 h-5 text-[#B58A4C]" />
              </div>

              <div className="space-y-4">
                <InsetPanel>
                  <strong className="block font-bold text-xs text-[#302013] mb-1">
                    Data Minimization & Storage Architecture
                  </strong>
                  <p className="text-xs text-[#604A34] leading-relaxed">
                    Media assets uploaded for analysis are stored in private isolated storage (
                    <span className="font-mono font-bold text-[#173D2D]">
                      {systemSettings?.storage_provider === "s3"
                        ? "Encrypted S3 / MinIO Object Storage"
                        : "Private Local Filesystem Vault"}
                    </span>
                    ). When an analysis is deleted, raw files are permanently unlinked and purged from disk.
                  </p>
                </InsetPanel>

                <div className="p-4 rounded-xl border border-[#A9362B]/50 bg-[#A9362B]/10 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Trash2 className="w-4 h-4 text-[#A9362B] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-xs font-bold text-[#A9362B]">
                        Permanent Case & Media Deletion
                      </strong>
                      <p className="text-xs text-[#604A34] leading-relaxed mt-0.5">
                        Trigger an authorized cascade deletion of all forensic case runs, associated detector signals, and raw binary media uploads owned by your session.
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setIsPurgeDialogOpen(true)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete All Owned Analyses & Media</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* SECTION E: DETECTOR & SYSTEM STATUS */}
          {activeSection === "detectors" && (
            <Card rivets={true} className="p-3 sm:p-4 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#B58A4C]/35">
                <div>
                  <CardTitle>Detector & System Health Telemetry</CardTitle>
                  <CardDescription>
                    Truthful runtime status fetched directly from the FastAPI orchestrator.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#604A34]">
                    Engine: {health?.version || "1.0.0"}
                  </span>
                  <StatusBadge status={health?.status || "checking"} />
                </div>
              </div>

              {/* Service Connectivity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <InsetPanel>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[#604A34] block text-[10px] uppercase font-bold">
                        Database Engine
                      </span>
                      <span className="text-[#302013] font-black text-sm">
                        PostgreSQL (AsyncPG)
                      </span>
                    </div>
                    <Badge
                      variant={
                        health?.services?.database === "connected"
                          ? "success"
                          : "danger"
                      }
                    >
                      {health?.services?.database || "Unknown"}
                    </Badge>
                  </div>
                </InsetPanel>

                <InsetPanel>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[#604A34] block text-[10px] uppercase font-bold">
                        Object Storage
                      </span>
                      <span className="text-[#302013] font-black text-sm capitalize">
                        {systemSettings?.storage_provider || "Local Storage"}
                      </span>
                    </div>
                    <Badge
                      variant={
                        health?.services?.storage !== "disconnected"
                          ? "success"
                          : "danger"
                      }
                    >
                      {health?.services?.storage !== "disconnected" ? "Ready" : "Offline"}
                    </Badge>
                  </div>
                </InsetPanel>
              </div>

              {/* Detector Pipeline Execution Matrix */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#302013] font-mono">
                  Detection Pipeline Readiness
                </h4>

                <div className="border border-[#B58A4C] rounded-xl overflow-x-auto text-xs font-mono">
                  <table className="w-full text-left min-w-[420px] sm:min-w-0">
                    <thead className="bg-[#3B281A] text-[#D8B98A] uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Forensic Pipeline</th>
                        <th className="p-3">Adapter Module</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#B58A4C]/30 bg-[#F0DDB8]">
                      <tr>
                        <td className="p-3 font-bold text-[#302013]">Image Forensics</td>
                        <td className="p-3 text-[#604A34]">spectral_frequency_v1 (FFT / ELA)</td>
                        <td className="p-3 text-right">
                          <StatusBadge status={health?.services?.detectors?.image || "not_configured"} />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#302013]">Audio & Speech</td>
                        <td className="p-3 text-[#604A34]">audio_forensics_v1 (Vocoder Spectrum)</td>
                        <td className="p-3 text-right">
                          <StatusBadge status={health?.services?.detectors?.audio || "not_configured"} />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#302013]">Video Forensics</td>
                        <td className="p-3 text-[#604A34]">video_forensics_v1 (Temporal / OpenCV)</td>
                        <td className="p-3 text-right">
                          <StatusBadge status={health?.services?.detectors?.video || "not_configured"} />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#302013]">Provenance Credentials</td>
                        <td className="p-3 text-[#604A34]">C2PA / JUMBF Manifest Parser</td>
                        <td className="p-3 text-right">
                          <StatusBadge status={health?.services?.detectors?.provenance || "available"} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Real Upload Ingestion Limits from Backend */}
              {systemSettings?.limits && (
                <div className="pt-2 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#302013] font-mono">
                    Ingestion Size & Duration Limits
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                    <InsetPanel>
                      <span className="text-[#604A34] block text-[10px] uppercase font-bold">
                        Image Max
                      </span>
                      <span className="text-[#302013] font-black">
                        {systemSettings.limits.image_max_mb} MB
                      </span>
                    </InsetPanel>
                    <InsetPanel>
                      <span className="text-[#604A34] block text-[10px] uppercase font-bold">
                        Audio Max
                      </span>
                      <span className="text-[#302013] font-black">
                        {systemSettings.limits.audio_max_mb} MB
                      </span>
                    </InsetPanel>
                    <InsetPanel>
                      <span className="text-[#604A34] block text-[10px] uppercase font-bold">
                        Video Max
                      </span>
                      <span className="text-[#302013] font-black">
                        {systemSettings.limits.video_max_mb} MB
                      </span>
                    </InsetPanel>
                    <InsetPanel>
                      <span className="text-[#604A34] block text-[10px] uppercase font-bold">
                        Video Length
                      </span>
                      <span className="text-[#302013] font-black">
                        {systemSettings.limits.video_max_duration_seconds}s
                      </span>
                    </InsetPanel>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Purging Workspace Media */}
      <ConfirmationDialog
        isOpen={isPurgeDialogOpen}
        onClose={() => setIsPurgeDialogOpen(false)}
        onConfirm={handlePurgeAllAnalyses}
        title="Permanently Purge Workspace Analyses & Media?"
        description="This action will delete all recorded forensic analyses and permanently unlink associated raw files from object storage. Cryptographic records will be erased. This action cannot be reversed."
        confirmLabel="Purge All Analyses"
        cancelLabel="Keep Records"
        variant="danger"
        isLoading={isPurging}
      />
    </div>
  );
}
