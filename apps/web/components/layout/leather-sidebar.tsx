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
  LogOut,
  LogIn,
  Radio,
  X,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Rivet } from "@/components/ui/rivet";
import { useAuth } from "@/lib/auth-context";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analyze Media", href: "/analyze", icon: ScanEye },
  { name: "Analysis Archive", href: "/analyses", icon: History },
  { name: "Settings & Privacy", href: "/settings", icon: Settings },
];

export interface LeatherSidebarProps {
  className?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function LeatherSidebar({
  className,
  isOpenMobile = false,
  onCloseMobile,
}: LeatherSidebarProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  const content = (
    <div className="h-full flex flex-col justify-between select-none relative z-20">
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
        <div className="h-20 flex items-center justify-between px-6 border-b border-[#B58A4C]/50 bg-[#102B20]/90 shadow-[0_2px_6px_rgba(18,11,7,0.5)]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#28734A] to-[#173D2D] border border-[#B58A4C] flex items-center justify-center text-[#F0DDB8] shadow-[0_2px_5px_rgba(18,11,7,0.5),inset_0_1px_0_rgba(229,201,149,0.4)]">
              <ShieldAlert className="w-6 h-6 text-[#E5C995] drop-shadow-[0_0_6px_rgba(229,201,149,0.5)]" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wider text-[#F0DDB8] drop-shadow-[0_1px_2px_rgba(18,11,7,0.8)]">
                OMNISCAN
              </h1>
              <p className="text-[10px] text-[#E5C995] uppercase tracking-widest font-mono drop-shadow-[0_1px_1px_rgba(18,11,7,0.6)]">
                Forensic Workstation
              </p>
            </div>
          </Link>

          {/* Mobile close button */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-[#D8B98A] hover:text-[#F0DDB8] rounded hover:bg-[#102B20] cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="p-4 space-y-1.5">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#D8B98A] drop-shadow-[0_1px_1px_rgba(18,11,7,0.8)]">
            Workstation Instruments
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
                onClick={onCloseMobile}
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

      {/* System Status & Session Controls */}
      <div className="p-4 border-t border-[#B58A4C]/50 space-y-3 bg-[#102B20]/80">
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
            Multi-modal evidence pipeline enforced with forensic certainty bounds.
          </p>
        </div>

        {/* User Identity or Sign In Plate */}
        {isAuthenticated && user ? (
          <>
            <div className="px-3 py-2 rounded-lg bg-[#143526] border border-[#B58A4C]/40 text-xs flex items-center gap-2 text-[#D8B98A]">
              <UserIcon className="w-3.5 h-3.5 text-[#E5C995] shrink-0" />
              <div className="truncate min-w-0">
                <div className="text-[11px] font-mono text-[#F0DDB8] truncate font-bold">
                  {user.email}
                </div>
                <div className="text-[10px] text-[#D8B98A] capitalize">
                  {user.role || "Analyst"}
                </div>
              </div>
            </div>

            {/* Tactile Log out Button */}
            <button
              onClick={() => logout()}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-gradient-to-b from-[#3B281A] to-[#24170F] text-[#F0DDB8] text-xs font-semibold border border-[#B58A4C] shadow-[0_2px_4px_rgba(18,11,7,0.5),inset_0_1px_0_rgba(229,201,149,0.2)] hover:border-[#E5C995] active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#E5C995]" />
              <span>Log out</span>
            </button>
          </>
        ) : (
          /* Visible Sign In Link */
          <Link
            href="/login"
            onClick={onCloseMobile}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg bg-gradient-to-b from-[#28734A] to-[#173D2D] text-[#F0DDB8] text-xs font-bold border border-[#B58A4C] shadow-[0_3px_6px_rgba(18,11,7,0.5),inset_0_1px_0_rgba(229,201,149,0.4)] hover:border-[#E5C995] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-[#E5C995]" />
            <span>Sign in to Workstation</span>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex w-64 shrink-0 flex-col skeuo-sidebar-leather",
          className
        )}
      >
        {content}
      </aside>

      {/* Mobile/Tablet Drawer Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-in fade-in"
        />
      )}

      {/* Mobile/Tablet Drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col skeuo-sidebar-leather transition-transform duration-200 ease-out shadow-2xl",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {content}
      </aside>
    </>
  );
}

export const Sidebar = LeatherSidebar;
