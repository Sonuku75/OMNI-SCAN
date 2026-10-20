import React from "react";
import { cn } from "@/lib/utils";

export interface TokenProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: "green" | "bronze" | "blue" | "red" | "purple";
  size?: "sm" | "md" | "lg";
}

export function Token({
  className,
  color = "green",
  size = "md",
  children,
  ...props
}: TokenProps) {
  const sizeClasses = {
    sm: "w-9 h-9 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base",
  };

  const colors = {
    green:
      "bg-[radial-gradient(circle_at_35%_35%,#3FA26B_0%,#28734A_60%,#173D2D_100%)] border-[#173D2D] shadow-[0_4px_10px_rgba(40,115,74,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)]",
    bronze:
      "bg-[radial-gradient(circle_at_35%_35%,#E5C995_0%,#B58A4C_60%,#7A5B2E_100%)] border-[#7A5B2E] shadow-[0_4px_10px_rgba(181,138,76,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)]",
    blue:
      "bg-[radial-gradient(circle_at_35%_35%,#3582BE_0%,#245C88_60%,#163752_100%)] border-[#163752] shadow-[0_4px_10px_rgba(36,92,136,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)]",
    red:
      "bg-[radial-gradient(circle_at_35%_35%,#C94235_0%,#A9362B_60%,#682019_100%)] border-[#682019] shadow-[0_4px_10px_rgba(169,54,43,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)]",
    purple:
      "bg-[radial-gradient(circle_at_35%_35%,#68407B_0%,#4A2B59_60%,#2A1633_100%)] border-[#2A1633] shadow-[0_4px_10px_rgba(74,43,89,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)]",
  };

  return (
    <div
      className={cn(
        "rounded-full p-1 bg-[#24170F] border border-[#B58A4C]/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] shrink-0 select-none",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center text-white border",
          sizeClasses[size],
          colors[color]
        )}
      >
        {children}
      </div>
    </div>
  );
}
