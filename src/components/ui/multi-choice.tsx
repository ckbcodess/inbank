"use client";

/**
 * A wrap of pills where several can be chosen ("select all that apply"): types of alcohol, kinds of cover. Chosen
 * pills are filled amber, the same as `RangePills`. For one choice only, use `SegmentedControl` or `RangePills`.
 */

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
              "cursor-pointer select-none rounded-full border px-4 py-2 text-left text-[12px] outline-none transition-colors duration-hover focus-visible:ring-1 focus-visible:ring-ring",
              chosen
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border/80 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
