import React from "react";
import { cn } from "@/lib/utils";
import { AnalysisStatus, DetectorStatus } from "@/types/api";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline" | "bronze";
  status?: AnalysisStatus | DetectorStatus | string;
}

export function Badge({ className, variant = "default", status, children, ...props }: BadgeProps) {
  // Map status to variant automatically if provided
  let computedVariant = variant;
  if (status) {
    switch (status) {
      case "completed":
      case "available":
      case "verified":
      case "healthy":
      case "online":
      case "connected":
      case "configured":
        computedVariant = "success";
        break;
      case "processing":
      case "queued":
      case "incomplete":
      case "standby":
      case "degraded":
        computedVariant = "warning";
        break;
      case "failed":
      case "unhealthy":
      case "disconnected":
      case "unavailable":
        computedVariant = "danger";
        break;
      case "detector_not_configured":
      case "not_configured":
      case "not_supported":
      case "disabled":
      case "unknown":
        computedVariant = "info";
        break;
      default:
        computedVariant = "default";
    }
  }

  const variants = {
    // 3D glossy jelly pill styles in rustic workstation theme
    default:
      "bg-gradient-to-b from-[#4A3321] to-[#3B281A] text-[#F0DDB8] border border-[#B58A4C]/70",
    success:
      "bg-gradient-to-b from-[#28734A] to-[#1C5234] text-[#F0DDB8] border border-[#173D2D]",
    warning:
      "bg-gradient-to-b from-[#C97A24] to-[#8C5214] text-[#F0DDB8] border border-[#63390B]",
    danger:
      "bg-gradient-to-b from-[#C43E32] to-[#A9362B] text-[#FFF5F5] border border-[#7A241B]",
    info:
      "bg-gradient-to-b from-[#3177AE] to-[#245C88] text-[#F0DDB8] border border-[#194161]",
    bronze:
      "bg-gradient-to-b from-[#E5C995] to-[#B58A4C] text-[#24170F] border border-[#7A5B2E]",
    outline:
      "bg-[#D8B98A]/45 text-[#302013] border border-[#B58A4C]/80 shadow-[inset_0_1px_2px_rgba(36,23,15,0.25)]",
  };

  const formatStatusText = (text: string) => {
    if (text === "detector_not_configured" || text === "not_configured") return "Not Configured";
    if (text === "configured") return "Configured";
    if (text === "unavailable") return "Unavailable";
    if (text === "unknown") return "Unknown";
    if (text === "no_credentials_found") return "No Credentials";
    return text.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <span
      className={cn(
        "skeuo-jelly inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight select-none",
        variants[computedVariant],
        className
      )}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-[0_0_3px_rgba(255,255,255,0.9)]" />
      <span>{children || (status ? formatStatusText(status) : "")}</span>
    </span>
  );
}

export const StatusBadge = Badge;
