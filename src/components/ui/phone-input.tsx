"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatNationalMobile, toLocalMobile } from "@/lib/phone";

/**
 * Ghana mobile number field. "+233" is fixed in front; the field takes digits
 * only, stops at nine, groups them as they're typed ("24 123 4567") and cleans
 * up pasted or autofilled numbers ("+233 24…", "024…").
 *
 * `value` may be in any format; `onValueChange` always emits the local form
 * ("0241234567"). `className` styles the outer box (border, height, radius,
 * text size) so each surface keeps its own look.
 */
interface PhoneInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "inputMode" | "className"> {
  value: string;
  onValueChange: (localNumber: string) => void;
  className?: string;
  inputClassName?: string;
}

export function PhoneInput({
  value,
  onValueChange,
  className,
  inputClassName,
  placeholder = "24 123 4567",
  autoComplete = "tel-national",
  disabled,
  ...props
}: PhoneInputProps) {
  return (
    <div
      data-slot="phone-input"
      className={cn(
        "flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3.5 text-[14px] transition-colors focus-within:border-foreground/30 focus-within:ring-3 focus-within:ring-foreground/15 dark:border-white/[0.12] dark:bg-white/[0.07] dark:focus-within:bg-white/[0.10] has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <span className="tabular shrink-0 text-muted-foreground select-none" aria-hidden="true">
        +233
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete={autoComplete}
        value={formatNationalMobile(value)}
        onChange={(e) => onValueChange(toLocalMobile(e.target.value))}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "tabular h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60",
          inputClassName
        )}
        {...props}
      />
    </div>
  );
}
