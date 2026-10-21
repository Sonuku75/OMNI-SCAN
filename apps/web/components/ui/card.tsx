import React from "react";
import { cn } from "@/lib/utils";
import { Rivet } from "./rivet";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "framed" | "plate" | "recessed" | "screen";
  rivets?: boolean;
  hoverEffect?: boolean;
}

export function Card({
  className,
  variant = "framed",
  rivets = true,
  hoverEffect = false,
  children,
  ...props
}: CardProps) {
  if (variant === "recessed") {
    return (
      <div
        className={cn(
          "skeuo-recessed p-4 sm:p-5 text-[#302013] rounded-xl border border-[#B58A4C]/70",
          hoverEffect && "transition-all hover:border-[#B58A4C]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (variant === "screen") {
    return (
      <div
        className={cn(
          "skeuo-screen p-5 text-[#F0DDB8] font-mono",
          hoverEffect && "transition-all hover:border-[#28734A]/60",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (variant === "plate") {
    return (
      <div
        className={cn(
          "skeuo-plate p-5 text-[#302013] relative",
          hoverEffect && "transition-all hover:-translate-y-0.5 hover:shadow-lg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  // Default: "framed" instrument panel with walnut wood casing and warm ivory parchment plate
  return (
    <div
      className={cn(
        "skeuo-card p-2 sm:p-2.5 relative",
        hoverEffect && "transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(16,10,6,0.75)]",
        className
      )}
      {...props}
    >
      {/* Corner Antique Brass Rivets */}
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

      {/* Inner Warm Ivory Working Faceplate with aged parchment texture */}
      <div className="skeuo-plate p-4 sm:p-5 text-[#302013] h-full relative z-0 flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1 pb-3 border-b border-[#B58A4C]/35", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-sm sm:text-base font-bold leading-tight tracking-tight text-[#302013]",
        "drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-[#604A34] leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("pt-3 flex-1 text-[#302013]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center pt-3 border-t border-[#B58A4C]/35 text-xs text-[#604A34]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
