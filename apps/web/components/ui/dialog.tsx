"use client";

import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";
import { Rivet } from "./rivet";
import { cn } from "@/lib/utils";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmationDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-md skeuo-card p-2 sm:p-2.5 relative shadow-[0_20px_50px_rgba(0,0,0,0.85)] animate-in zoom-in-95 duration-150"
      >
        {/* Corner Rivets */}
        <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none">
          <Rivet size="sm" rotation={45} />
        </div>
        <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
          <Rivet size="sm" rotation={135} />
        </div>
        <div className="absolute bottom-1.5 left-1.5 z-10 pointer-events-none">
          <Rivet size="sm" rotation={85} />
        </div>
        <div className="absolute bottom-1.5 right-1.5 z-10 pointer-events-none">
          <Rivet size="sm" rotation={15} />
        </div>

        {/* Inner Parchment Plate */}
        <div className="skeuo-plate p-5 sm:p-6 text-[#302013] space-y-4">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#B58A4C]/35">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "p-2 rounded-lg border",
                  variant === "danger"
                    ? "bg-[#C43E32]/15 border-[#A9362B] text-[#A9362B]"
                    : "bg-[#173D2D]/15 border-[#173D2D] text-[#173D2D]"
                )}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3
                id="dialog-title"
                className="text-base font-bold text-[#302013] tracking-tight"
              >
                {title}
              </h3>
            </div>
            {!isLoading && (
              <button
                onClick={onClose}
                className="p-1 rounded text-[#604A34] hover:text-[#302013] hover:bg-[#B58A4C]/20 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-xs text-[#604A34] leading-relaxed">
            {description}
          </p>

          <div className="pt-3 border-t border-[#B58A4C]/35 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="parchment"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={variant === "danger" ? "danger" : "primary"}
              size="sm"
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
