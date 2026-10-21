"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Plus, ShieldCheck, Menu, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rivet } from "@/components/ui/rivet";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export interface WoodHeaderProps {
  onToggleMobile?: () => void;
}

export function WoodHeader({ onToggleMobile }: WoodHeaderProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
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
    if (pathname === "/analyses") return "Case Archive & Evidence";
    if (pathname.startsWith("/reports/")) return "Forensic Inspection Report";
    if (pathname === "/settings") return "Workstation Settings & Retention";
    return "OmniScan Forensics";
  };

  return (
    <header className="h-20 skeuo-wood-header px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Left: Mobile Toggle & Page Title Plaque */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onToggleMobile && (
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-2 rounded-lg bg-[#24170F] border border-[#B58A4C] text-[#F0DDB8] hover:border-[#E5C995] active:translate-y-[1px] cursor-pointer"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5 text-[#E5C995]" />
          </button>
        )}

        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#F0DDB8] tracking-tight drop-shadow-[0_1px_2px_rgba(18,11,7,0.8)]">
            {getPageTitle()}
          </h2>
          <p className="text-[10px] sm:text-[11px] text-[#D8B98A] font-mono tracking-wide hidden sm:block">
            Secure Multi-Modal Media Forensics
          </p>
        </div>
      </div>

      {/* Right: Hardware Telemetry & Auth Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend API Status Jewel */}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#24170F] border border-[#B58A4C]/60 text-xs font-mono shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)]">
          <Activity className="w-3.5 h-3.5 text-[#B58A4C]" />
          <span className="text-[#D8B98A] font-semibold hidden md:inline">API:</span>
          {apiHealth === "checking" ? (
            <span className="text-[#D8B98A] animate-pulse text-[11px]">Connecting...</span>
          ) : apiHealth === "connected" ? (
            <Badge variant="success">Online</Badge>
          ) : (
            <Badge variant="info">Standby</Badge>
          )}
        </div>

        {/* Quick Action Button */}
        {pathname !== "/analyze" && isAuthenticated && (
          <Link href="/analyze">
            <Button
              variant="parchment"
              size="sm"
              className="hidden sm:inline-flex gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4 text-[#173D2D]" />
              <span>New Analysis</span>
            </Button>
          </Link>
        )}

        {/* Visible Auth Controls: Signed In vs Signed Out */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            {/* Real Authenticated Analyst Session Badge */}
            <div className="flex items-center gap-2.5 px-2.5 sm:px-3 py-1 rounded-xl bg-gradient-to-b from-[#4A3321] to-[#2E1E13] border border-[#B58A4C] shadow-[0_2px_5px_rgba(18,11,7,0.5),inset_0_1px_0_rgba(229,201,149,0.25)] text-[#F0DDB8]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#28734A] to-[#173D2D] border border-[#B58A4C] flex items-center justify-center text-[#F0DDB8] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                <ShieldCheck className="w-4 h-4 text-[#E5C995]" />
              </div>
              <div className="hidden md:block text-left max-w-[130px] lg:max-w-[160px]">
                <div className="text-xs font-bold leading-tight drop-shadow-[0_1px_1px_rgba(18,11,7,0.8)] truncate">
                  {user?.full_name || "Analyst Session"}
                </div>
                <div className="text-[10px] text-[#D8B98A] font-mono leading-tight truncate">
                  {user?.email || "Authenticated"}
                </div>
              </div>
              <div className="hidden sm:block ml-0.5">
                <Rivet size="sm" rotation={60} />
              </div>
            </div>

            {/* Visible Log out Button */}
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-b from-[#3B281A] to-[#24170F] text-[#F0DDB8] text-xs font-semibold border border-[#B58A4C] shadow-[0_2px_4px_rgba(18,11,7,0.4),inset_0_1px_0_rgba(229,201,149,0.2)] hover:border-[#E5C995] hover:text-white active:translate-y-[1px] cursor-pointer transition-all"
              title="Log out active session"
              aria-label="Log out"
            >
              <LogOut className="w-3.5 h-3.5 text-[#E5C995]" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        ) : (
          /* Visible Sign In Button When Signed Out */
          <Link href="/login">
            <Button variant="brass" size="sm" className="gap-1.5 shadow-md">
              <LogIn className="w-4 h-4" />
              <span>Sign in</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}

export const Header = WoodHeader;
