import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#24170F] overflow-hidden text-[#F0DDB8]">
      {/* Skeuomorphic console sidebar */}
      <Sidebar />

      {/* Main Forensic Console Desk */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#24170F]">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
