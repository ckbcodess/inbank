"use client";

/**
 * Per-screen state switcher.
 *
 * Every screen in this MVP implements the real state model from section 13
 * rather than a generic toggle, so each screen exposes its own state list here.
 * This is a review affordance — it makes the implemented states inspectable
 * without a backend to drive them.
 */

import { Layers } from "lucide-react";

interface StateSwitcherProps<T extends string> {
  states: readonly T[];
  value: T;
  onChange: (next: T) => void;
  labels?: Partial<Record<T, string>>;
  /** Section reference, e.g. "13.2" */
  section: string;
}

export function StateSwitcher<T extends string>({
  states,
  value,
  onChange,
  labels,
  section,
}: StateSwitcherProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Layers size={12} strokeWidth={2} />
        States · {section}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {states.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={value === s}
            className={`rounded-lg px-2.5 py-1 text-[12px] transition-colors ${
              value === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {labels?.[s] ?? s}
          </button>
        ))}
      </div>
    </div>
  );
}
