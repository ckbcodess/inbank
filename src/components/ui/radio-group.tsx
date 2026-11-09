"use client";

/**
 * A group of radio cards for one choice between a few options: a radio dot, a label, and an optional line under it.
 * Use it for every two-option choice in a flow or form (Yes/No, In Full/In Part, Female/Male). Don't use a
 * `SegmentedControl` for those; it stays for filters and view switches on a page.
 *
 * The cards share the row equally. The selected card takes the shared active fill and border.
 */

import { cn } from "@/lib/utils";

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  /** One short line under the label, only when the label alone doesn't say enough. */
  description?: string;
}

interface RadioGroupProps<T extends string> {
  options: readonly RadioOption<T>[];
  /** `null` or `""` means nothing is chosen yet. */
  value: T | null;
  onChange: (value: T) => void;
  /** Names the group for assistive tech. */
  "aria-label": string;
  className?: string;
}

export function RadioGroup<T extends string>({ options, value, onChange, className, ...rest }: RadioGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={rest["aria-label"]} className={cn("flex w-full gap-2", className)}>
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
              "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-2xl border p-3 text-left text-foreground transition duration-hover outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active ? "border-[var(--active-border)] bg-[var(--active-bg)]" : "border-border bg-card hover:bg-muted/50"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                active ? "border-[var(--active-border)] bg-[var(--active-border)]" : "border-border bg-transparent"
              )}
            >
              {active && <span className="size-1.5 rounded-full bg-background" />}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[14px] font-medium leading-tight">{o.label}</span>
              {o.description && <span className="mt-0.5 text-[12px] text-muted-foreground">{o.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
