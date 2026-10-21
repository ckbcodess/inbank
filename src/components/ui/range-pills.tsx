"use client";

/**
 * A row of small outlined pills that picks one period or range (1w, 1m, 3m...). The chosen one is filled amber, the
 * same as the active item in the sidebar. For a choice between views, use `SegmentedControl` instead.
 */

import { cn } from "@/lib/utils";

interface RangePillsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for assistive tech. */
  "aria-label": string;
  className?: string;
}

export function RangePills<T extends string>({ options, value, onChange, className, ...rest }: RangePillsProps<T>) {
  return (
    <div role="radiogroup" aria-label={rest["aria-label"]} className={cn("flex w-full items-center gap-2", className)}>
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={cn(
              "flex-1 cursor-pointer select-none rounded-full py-1 text-center text-[12px] tabular outline-none transition-colors duration-hover focus-visible:ring-1 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground"
                : "border border-border/80 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
