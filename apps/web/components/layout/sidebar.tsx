"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  ScanEye,
  History,
  Settings,
  ExternalLink,
  LogOut,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Rivet } from "@/components/ui/rivet";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analyze Media", href: "/analyze", icon: ScanEye },
  { name: "Analysis History", href: "/analyses", icon: History },
  { name: "Settings & Privacy", href: "/settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "w-64 bg-[#173D2D] border-r-2 border-[#B58A4C] flex flex-col justify-between shrink-0 select-none relative z-20 shadow-[4px_0_16px_rgba(18,11,7,0.6)]",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(180deg, #1C4A37 0%, #173D2D 50%, #102B20 100%)",
      }}
    >
      {/* Decorative Corner Antique Brass Rivets */}
      <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
        <Rivet size="sm" rotation={45} />
      </div>
      <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
        <Rivet size="sm" rotation={135} />
      </div>
      <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none">
        <Rivet size="sm" rotation={25} />
      </div>
      <div className="absolute bottom-2.5 right-2.5 z-20 pointer-events-none">
        <Rivet size="sm" rotation={115} />
      </div>

      <div>
        {/* Brand Header Plate in Walnut / Forest */}
        <div className="h-20 flex items-center px-6 border-b border-[#B58A4C]/50 bg-[#102B20]/90 gap-3 shadow-[0_2px_6px_rgba(18,11,7,0.5)]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#28734A] to-[#173D2D] border border-[#B58A4C] flex items-center justify-center text-[#F0DDB8] shadow-[0_2px_5px_rgba(18,11,7,0.5),inset_0_1px_0_rgba(229,201,149,0.4)]">
            <ShieldAlert className="w-6 h-6 text-[#E5C995] drop-shadow-[0_0_6px_rgba(229,201,149,0.5)]" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wider text-[#F0DDB8] drop-shadow-[0_1px_2px_rgba(18,11,7,0.8)]">
              OMNISCAN
            </h1>
            <p className="text-[10px] text-[#E5C995] uppercase tracking-widest font-mono drop-shadow-[0_1px_1px_rgba(18,11,7,0.6)]">
              Forensic Lab Console
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-4 space-y-1.5">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#D8B98A] drop-shadow-[0_1px_1px_rgba(18,11,7,0.8)]">
            Instruments
          </div>
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 relative",
                  isActive
                    ? "bg-gradient-to-b from-[#225741] to-[#173D2D] text-[#F0DDB8] border border-[#B58A4C] shadow-[0_3px_8px_rgba(18,11,7,0.5),inset_0_1px_0_rgba(229,201,149,0.35)]"
                    : "text-[#D8B98A] hover:text-[#F0DDB8] hover:bg-[#102B20]/60 active:translate-y-[0.5px]"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-transform",
                    isActive
                      ? "text-[#E5C995] drop-shadow-[0_0_6px_rgba(229,201,149,0.6)]"
                      : "text-[#B58A4C] drop-shadow-[0_1px_1px_rgba(18,11,7,0.7)]"
                  )}
                />
                <span className="drop-shadow-[0_1px_1px_rgba(18,11,7,0.8)]">
                  {item.name}
                </span>

                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#28734A] shadow-[0_0_6px_#28734A]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* System Status & Console Footer */}
      <div className="p-4 border-t border-[#B58A4C]/50 space-y-3 bg-[#102B20]/75">
        {/* Integrity Guard Status Plate */}
        <div className="p-3 rounded-xl bg-[#24170F] border border-[#B58A4C]/50 text-xs shadow-[inset_0_2px_5px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between text-[#F0DDB8] font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#28734A] animate-pulse" />
              <span>Integrity Guard</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#28734A] shadow-[0_0_8px_#28734A]" />
          </div>
          <p className="text-[11px] text-[#D8B98A] leading-relaxed">
            Forensic inference enforces zero-hallucination disclaimers.
          </p>
        </div>

        {/* Console Telemetry Info */}
        <div className="flex items-center justify-between px-2 text-[11px] text-[#B58A4C]">
          <span className="font-mono">v1.0.0-m0</span>
          <Link
            href="/settings"
            className="hover:text-[#E5C995] transition-colors flex items-center gap-1 font-medium"
          >
            <span>Config</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Tactile Logout Switch */}
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-gradient-to-b from-[#3B281A] to-[#24170F] text-[#F0DDB8] text-xs font-semibold border border-[#B58A4C] shadow-[0_2px_4px_rgba(18,11,7,0.5),inset_0_1px_0_rgba(229,201,149,0.2)] hover:border-[#E5C995] active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] transition-all"
        >
          <LogOut className="w-3.5 h-3.5 text-[#B58A4C]" />
          <span>Exit Workstation</span>
        </Link>
      </div>
    </aside>
  );
}
