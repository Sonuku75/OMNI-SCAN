import React from "react";
import { cn } from "@/lib/utils";
import { Rivet } from "./rivet";

export interface RaisedPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  rivets?: boolean;
  hoverEffect?: boolean;
}

export function RaisedPanel({
  className,
  rivets = true,
  hoverEffect = false,
  children,
  ...props
}: RaisedPanelProps) {
  return (
    <div
      className={cn(
        "skeuo-card p-2 sm:p-2.5 relative",
        hoverEffect && "transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(16,10,6,0.75)]",
        className
      )}
      {...props}
    >
      {rivets && (
        <>
          <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none">
            <Rivet size="sm" rotation={35} />
          </div>
          <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
            <Rivet size="sm" rotation={125} />
          </div>
          <div className="absolute bottom-1.5 left-1.5 z-10 pointer-events-none">
            <Rivet size="sm" rotation={75} />
          </div>
          <div className="absolute bottom-1.5 right-1.5 z-10 pointer-events-none">
            <Rivet size="sm" rotation={15} />
          </div>
        </>
      )}

      <div className="skeuo-plate p-4 sm:p-5 text-[#302013] h-full relative z-0 flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}

export interface InsetPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  deep?: boolean;
  screen?: boolean;
}

export function InsetPanel({
  className,
  deep = false,
  screen = false,
  children,
  ...props
}: InsetPanelProps) {
  if (screen) {
    return (
      <div
        className={cn(
          "skeuo-screen p-4 sm:p-5 font-mono text-xs leading-relaxed",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        deep ? "skeuo-recessed-deep" : "skeuo-recessed",
        "p-4 rounded-xl border text-[#302013] text-xs leading-relaxed",
        deep ? "border-[#9A7238]" : "border-[#B58A4C]/70",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeader({
  className,
  title,
  description,
  action,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#B58A4C]/60",
        className
      )}
      {...props}
    >
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#F0DDB8] tracking-tight drop-shadow-[0_1px_2px_rgba(18,11,7,0.8)]">
          {title}
        </h2>
        {description && (
          <p className="text-xs sm:text-sm text-[#D8B98A] mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
