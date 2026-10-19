"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Plus, ShieldCheck, User } from "lucide-react";
import { Button } from "@/lib/../components/ui/button";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/lib/../components/ui/badge";

export function Header() {
  const pathname = usePathname();
  const [apiHealth, setApiHealth] = useState<"checking" | "connected" | "disconnected">("checking");

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getHealth()
      .then((res) => {
        if (!isMounted) return;
        setApiHealth(res.status === "healthy" ? "connected" : "disconnected");
      })
      .catch(() => {
        if (!isMounted) return;
        setApiHealth("disconnected");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Forensic Intelligence Dashboard";
    if (pathname === "/analyze") return "Analyze Media Asset";
    if (pathname.startsWith("/analyses/")) return "Analysis Inspection Detail";
    if (pathname === "/analyses") return "Analysis History & Forensics";
    if (pathname.startsWith("/reports/")) return "Printable Forensic Report";
    if (pathname === "/settings") return "Settings & Retention Controls";
    return "OmniScan Forensics";
  };

  return (
    <header className="h-16 border-b border-omni-border bg-omni-surface/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-sm font-semibold text-omni-text tracking-tight">
            {getPageTitle()}
          </h2>
          <p className="text-[11px] text-omni-muted font-mono">
            Secure Multi-Modal Forensic Pipeline
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* API Status Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-omni-bg border border-omni-border text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-omni-muted" />
          <span className="text-omni-muted hidden sm:inline">Backend API:</span>
          {apiHealth === "checking" ? (
            <span className="text-omni-muted animate-pulse">Checking...</span>
          ) : apiHealth === "connected" ? (
            <Badge variant="success">Online</Badge>
          ) : (
            <Badge variant="info">Standby (M0/M1)</Badge>
          )}
        </div>

        {/* Quick Action */}
        {pathname !== "/analyze" && (
          <Link href="/analyze">
            <Button size="sm" className="hidden sm:inline-flex gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </Button>
          </Link>
        )}

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-omni-border/70">
          <div className="w-8 h-8 rounded-full bg-omni-secondary/15 border border-omni-secondary/30 flex items-center justify-center text-omni-secondary">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-medium text-omni-text leading-tight">Analyst Session</div>
            <div className="text-[10px] text-omni-muted font-mono">analyst@omniscan</div>
          </div>
        </div>
      </div>
    </header>
  );
}
