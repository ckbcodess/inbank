"use client";

/**
 * A wrap of pills where several can be chosen ("select all that apply"): types of alcohol, kinds of cover. Chosen
 * pills use the shared active fill and border. For one choice only, use `SegmentedControl` or `RangePills`.
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiChoiceProps {
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Names the group for assistive tech. */
  "aria-label": string;
  className?: string;
}

export function MultiChoice({ options, value, onChange, className, ...rest }: MultiChoiceProps) {
  const toggle = (option: string) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);

  return (
    <div role="group" aria-label={rest["aria-label"]} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const chosen = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            role="checkbox"
            aria-checked={chosen}
            onClick={() => toggle(option)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-left text-[13px] outline-none transition-colors duration-hover focus-visible:ring-1 focus-visible:ring-ring",
              chosen
                ? "border-[var(--active-border)] bg-[var(--active-bg)] text-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {chosen && <Check size={14} strokeWidth={1.9} aria-hidden="true" className="shrink-0" />}
            {option}
          </button>
        );
      })}
    </div>
  );
}
