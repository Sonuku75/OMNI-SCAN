import React from "react";
import { cn } from "@/lib/utils";

export interface RivetProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  rotation?: number;
}

export function Rivet({ className, size = "md", rotation = 45, ...props }: RivetProps) {
  const sizeClasses = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  };

  const slotSizes = {
    sm: "w-1.5 h-[1.5px]",
    md: "w-2 h-[1.5px]",
    lg: "w-2.5 h-[2px]",
  };

  return (
    <div
      className={cn(
        "rounded-full relative shrink-0 select-none",
        "border border-[#7A5B2E]",
        "bg-[radial-gradient(circle_at_35%_35%,#E5C995_0%,#B58A4C_55%,#7A5B2E_100%)]",
        "shadow-[0_1px_2px_rgba(24,15,10,0.6),inset_0_1px_0_rgba(255,255,255,0.4)]",
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
      {...props}
    >
      {/* 45° Cross slotted screw drive in dark walnut */}
      <div
        className={cn(
          "absolute inset-0 m-auto bg-[#24170F] shadow-[0_0.5px_0_rgba(229,201,149,0.3)]",
          slotSizes[size]
        )}
        style={{ transform: `rotate(${rotation}deg)` }}
      />
    </div>
  );
}
