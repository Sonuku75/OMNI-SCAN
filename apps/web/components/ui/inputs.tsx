import React from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, label, helperText, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="space-y-1.5 w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-[#302013] tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[#604A34] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "skeuo-input w-full px-3 py-2 text-xs sm:text-sm text-[#302013] placeholder-[#8A6D50]",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              error && "border-[#A9362B] focus:border-[#A9362B]",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[#604A34] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-[11px] text-[#A9362B] font-semibold">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[#604A34] leading-relaxed">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
TextInput.displayName = "TextInput";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, helperText, error, children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="space-y-1.5 w-full text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-[#302013] tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "skeuo-input w-full px-3 py-2 pr-9 text-xs sm:text-sm font-semibold text-[#302013] appearance-none cursor-pointer",
              error && "border-[#A9362B]",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#604A34] pointer-events-none">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <p className="text-[11px] text-[#A9362B] font-semibold">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[#604A34] leading-relaxed">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = "Select";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, checked, onChange, disabled, id, ...props }, ref) => {
    const checkId = id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <label
        htmlFor={checkId}
        className={cn(
          "inline-flex items-start gap-2.5 cursor-pointer select-none text-left",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkId}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div
            className={cn(
              "w-4 h-4 rounded border flex items-center justify-center transition-all duration-100",
              checked
                ? "bg-gradient-to-b from-[#28734A] to-[#173D2D] border-[#B58A4C] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_2px_rgba(16,10,6,0.3)]"
                : "bg-[#D8B98A] border-[#B58A4C] shadow-[inset_0_1px_2px_rgba(36,23,15,0.3)]"
            )}
          >
            {checked && <Check className="w-3 h-3 text-[#F0DDB8] stroke-[3]" />}
          </div>
        </div>
        {(label || description) && (
          <div className="text-xs">
            {label && <span className="font-bold text-[#302013] block">{label}</span>}
            {description && <span className="text-[#604A34] block text-[11px] leading-relaxed mt-0.5">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
}: SwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="text-left">
          {label && <span className="text-xs font-bold text-[#302013] block">{label}</span>}
          {description && (
            <span className="text-[11px] text-[#604A34] leading-relaxed block mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          "w-12 h-6 rounded-full p-0.5 border transition-colors duration-150 relative shrink-0 cursor-pointer",
          checked
            ? "bg-gradient-to-b from-[#28734A] to-[#173D2D] border-[#B58A4C] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
            : "bg-[#3B281A] border-[#7A5B2E] shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div
          className={cn(
            "w-5 h-5 rounded-full transition-transform duration-150 border border-[#7A5B2E]",
            "bg-[radial-gradient(circle_at_35%_35%,#FFFFFF_0%,#E5C995_50%,#B58A4C_100%)]",
            "shadow-[0_2px_4px_rgba(16,10,6,0.6),inset_0_1px_1px_rgba(255,255,255,0.8)]",
            checked ? "translate-x-6" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
