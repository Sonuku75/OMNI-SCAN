import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "brass" | "parchment" | "secondary" | "wood" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold select-none rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B58A4C]/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-100 tracking-wide";

    const variants = {
      primary: "skeuo-button-forest",
      brass: "skeuo-button-brass",
      parchment: "skeuo-button-parchment",
      secondary: "skeuo-button-wood",
      wood: "skeuo-button-wood",
      outline:
        "bg-[#3B281A] text-[#F0DDB8] border border-[#B58A4C] shadow-[0_2px_4px_rgba(24,15,10,0.4),inset_0_1px_0_rgba(229,201,149,0.25)] hover:bg-[#4A3321] hover:border-[#E5C995] active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(24,15,10,0.7)]",
      ghost:
        "text-[#604A34] hover:text-[#302013] hover:bg-[#B58A4C]/15 active:translate-y-[0.5px]",
      danger: "skeuo-button-danger",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs gap-1.5",
      md: "px-4 py-2 text-sm gap-2",
      lg: "px-5 py-2.5 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export const BrassButton = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
  <Button ref={ref} variant="brass" {...props} />
));
BrassButton.displayName = "BrassButton";
