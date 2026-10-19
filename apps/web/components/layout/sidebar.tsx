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
  FileText,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        "w-64 border-r border-omni-border bg-omni-surface flex flex-col justify-between shrink-0 select-none",
        className
      )}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-omni-border gap-3">
          <div className="w-8 h-8 rounded-lg bg-omni-primary/10 border border-omni-primary/30 flex items-center justify-center text-omni-primary">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-omni-text">OMNISCAN</h1>
            <p className="text-[10px] text-omni-muted uppercase tracking-widest font-mono">
              Forensics MVP
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="p-4 space-y-1">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-omni-muted">
            Platform
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-omni-primary/10 text-omni-primary border border-omni-primary/30"
                    : "text-omni-muted hover:text-omni-text hover:bg-omni-surfaceHover"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-omni-primary" : "text-omni-muted")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* System Status & Docs Footer */}
      <div className="p-4 border-t border-omni-border/70 space-y-3">
        <div className="p-3 rounded-lg bg-omni-bg border border-omni-border/60 text-xs">
          <div className="flex items-center justify-between text-omni-text font-medium mb-1">
            <span>Integrity Guard</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <p className="text-[11px] text-omni-muted leading-relaxed">
            Forensic inference enforces zero-hallucination disclaimers.
          </p>
        </div>

        <div className="flex items-center justify-between px-2 text-[11px] text-omni-muted">
          <span>v1.0.0-m0</span>
          <Link
            href="/settings"
            className="hover:text-omni-text transition-colors flex items-center gap-1"
          >
            Config <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
