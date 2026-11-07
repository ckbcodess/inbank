"use client";

/**
 * A segmented control: a short row of mutually exclusive choices in one pill (filters, plan types). It is the same
 * look the Payments and Cards pages draw by hand. Each segment is a radio in a radiogroup.
 *
 * Its height is `--control-md` (40px), the toolbar height, so it lines up with a `Button size="md"`, a
 * `SelectTrigger size="md"`, a search field and the filter trigger when they share a row. Give a neighbour that
 * height by size, never with a raw `h-*`.
 */

import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string; /** A small figure beside the label, such as how many are in that segment. */ count?: number }[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for assistive tech. */
  "aria-label": string;
  className?: string;
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  fullWidth = false,
  ...rest
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn(
        fullWidth
          ? "flex h-(--control-md) w-full items-center rounded-xl bg-chip p-1"
          : "inline-flex h-(--control-md) w-fit max-w-full flex-nowrap items-center overflow-x-auto no-scrollbar rounded-xl bg-chip p-1",
        className
      )}
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
              "flex h-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2 text-[12px] transition duration-hover sm:px-3 sm:text-[13px]",
              fullWidth ? "flex-1" : "shrink-0",
              active
                ? "bg-chip-selected font-medium text-chip-selected-foreground shadow-sm"
                : "text-chip-foreground hover:text-chip-selected-foreground"
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="text-[11px] font-normal text-muted-foreground tabular">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
