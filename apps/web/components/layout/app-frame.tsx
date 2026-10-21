"use client";

import React, { useState } from "react";
import { LeatherSidebar } from "./leather-sidebar";
import { WoodHeader } from "./wood-header";

export interface AppFrameProps {
  children: React.ReactNode;
}

export function AppFrame({ children }: AppFrameProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full wood-backdrop overflow-hidden text-[#F0DDB8]">
      {/* Wooden / Forest Green Leather Sidebar */}
      <LeatherSidebar
        isOpenMobile={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main Forensic Console Desk */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#24170F]/50">
        <WoodHeader onToggleMobile={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
