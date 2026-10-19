import React from "react";
import { cn } from "@/lib/utils";
import { AnalysisStatus, DetectorStatus } from "@/types/api";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
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
        computedVariant = "success";
        break;
      case "processing":
      case "queued":
      case "incomplete":
        computedVariant = "warning";
        break;
      case "failed":
      case "unhealthy":
        computedVariant = "danger";
        break;
      case "detector_not_configured":
      case "not_configured":
      case "not_supported":
      case "disabled":
        computedVariant = "info";
        break;
      default:
        computedVariant = "default";
    }
  }

  const variants = {
    default: "bg-omni-surfaceHover text-omni-muted border-omni-border",
    success: "bg-emerald-950/60 text-emerald-400 border-emerald-800/50",
    warning: "bg-amber-950/60 text-amber-400 border-amber-800/50",
    danger: "bg-rose-950/60 text-rose-400 border-rose-800/50",
    info: "bg-omni-secondary/10 text-omni-secondary border-omni-secondary/30",
    outline: "bg-transparent text-omni-text border-omni-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border font-mono tracking-tight",
        variants[computedVariant],
        className
      )}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {children || status}
    </span>
  );
}
