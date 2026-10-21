import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  type?: "success" | "error" | "info" | "warning";
  message: string;
  description?: string;
  onClose?: () => void;
  className?: string;
}

export function Toast({
  type = "info",
  message,
  description,
  onClose,
  className,
}: ToastProps) {
  const styles = {
    success: {
      border: "border-[#28734A]",
      bg: "bg-[#28734A]/15",
      text: "text-[#1C5234]",
      icon: <CheckCircle2 className="w-4 h-4 text-[#28734A] shrink-0" />,
    },
    error: {
      border: "border-[#A9362B]",
      bg: "bg-[#A9362B]/15",
      text: "text-[#8C2318]",
      icon: <AlertCircle className="w-4 h-4 text-[#A9362B] shrink-0" />,
    },
    warning: {
      border: "border-[#C97A24]",
      bg: "bg-[#C97A24]/15",
      text: "text-[#8C5214]",
      icon: <AlertCircle className="w-4 h-4 text-[#C97A24] shrink-0" />,
    },
    info: {
      border: "border-[#B58A4C]",
      bg: "bg-[#B58A4C]/15",
      text: "text-[#302013]",
      icon: <Info className="w-4 h-4 text-[#B58A4C] shrink-0" />,
    },
  };

  const current = styles[type];

  return (
    <div
      role="alert"
      className={cn(
        "skeuo-plate p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs shadow-md",
        current.border,
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">{current.icon}</div>
        <div>
          <strong className="block font-bold text-[#302013]">{message}</strong>
          {description && (
            <p className="text-[#604A34] text-[11px] mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-[#604A34] hover:text-[#302013] p-1 rounded hover:bg-[#B58A4C]/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
