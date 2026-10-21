"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AppFrame } from "@/components/layout/app-frame";
import { useAuth } from "@/lib/auth-context";
import { RefreshCw } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
      router.push(redirectUrl);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="h-screen w-full wood-backdrop flex flex-col items-center justify-center p-4 text-[#F0DDB8]">
        <div className="skeuo-card p-6 text-center space-y-3 max-w-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-[#E5C995] mx-auto" />
          <div className="text-xs font-mono font-bold text-[#F0DDB8]">
            Validating analyst credentials...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppFrame>{children}</AppFrame>;
}
