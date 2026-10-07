"use client";

/**
 * A segmented control: a short row of mutually exclusive choices in one pill (filters, plan types). It is the same
 * look the Payments and Cards pages draw by hand. Each segment is a radio in a radiogroup.
 */

import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for assistive tech. */
  "aria-label": string;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, className, ...rest }: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn("inline-flex w-fit max-w-full flex-nowrap items-center overflow-x-auto no-scrollbar rounded-xl bg-chip p-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12.5px] transition duration-hover sm:px-4 sm:py-2 sm:text-[13px]",
              active
                ? "bg-chip-selected font-medium text-chip-selected-foreground shadow-sm"
                : "text-chip-foreground hover:text-chip-selected-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
