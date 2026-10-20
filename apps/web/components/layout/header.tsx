"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Rivet } from "@/components/ui/rivet";

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
    <header className="h-20 border-b-2 border-[#B58A4C] bg-[#3B281A] px-6 flex items-center justify-between sticky top-0 z-20 shadow-[0_4px_12px_rgba(18,11,7,0.6)] select-none"
      style={{
        backgroundImage: "linear-gradient(180deg, #4A3321 0%, #3B281A 100%)",
      }}
    >
      {/* Page Title Plaque */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#F0DDB8] tracking-tight drop-shadow-[0_1px_2px_rgba(18,11,7,0.8)]">
            {getPageTitle()}
          </h2>
          <p className="text-[11px] text-[#D8B98A] font-mono tracking-wide">
            Secure Multi-Modal Forensic Workstation
          </p>
        </div>
      </div>

      {/* Hardware Telemetry & Analyst Controls */}
      <div className="flex items-center gap-3">
        {/* Backend API Status Jewel */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#24170F] border border-[#B58A4C]/60 text-xs font-mono shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)]">
          <Activity className="w-3.5 h-3.5 text-[#B58A4C]" />
          <span className="text-[#D8B98A] font-semibold hidden md:inline">API:</span>
          {apiHealth === "checking" ? (
            <span className="text-[#D8B98A] animate-pulse">Scanning...</span>
          ) : apiHealth === "connected" ? (
            <Badge variant="success">Online</Badge>
          ) : (
            <Badge variant="info">Standby</Badge>
          )}
        </div>

        {/* Quick Action Button */}
        {pathname !== "/analyze" && (
          <Link href="/analyze">
            <Button
              variant="parchment"
              size="sm"
              className="hidden sm:inline-flex gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#173D2D]" />
              <span>New Analysis</span>
            </Button>
          </Link>
        )}

        {/* Analyst Session Badge with Rivets */}
        <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-gradient-to-b from-[#4A3321] to-[#2E1E13] border border-[#B58A4C] shadow-[0_2px_5px_rgba(18,11,7,0.5),inset_0_1px_0_rgba(229,201,149,0.25)] text-[#F0DDB8]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#28734A] to-[#173D2D] border border-[#B58A4C] flex items-center justify-center text-[#F0DDB8] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
            <ShieldCheck className="w-4 h-4 text-[#E5C995]" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold leading-tight drop-shadow-[0_1px_1px_rgba(18,11,7,0.8)]">
              Analyst Session
            </div>
            <div className="text-[10px] text-[#D8B98A] font-mono leading-tight">
              analyst@omniscan
            </div>
          </div>
          <div className="hidden sm:block ml-1">
            <Rivet size="sm" rotation={60} />
          </div>
        </div>
      </div>
    </header>
  );
}
