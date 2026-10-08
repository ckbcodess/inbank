"use client";

/**
 * A selectable tile for choosing one option from a short list (a broadband package, for example): a title, an
 * optional line under it, and a value on the right. Selected uses the shared active fill and border. Give the
 * group `role="radiogroup"`; each tile is a radio.
 */

import { cn } from "@/lib/utils";

interface OptionTileProps {
  title: string;
  /** One line under the title, only when the title alone doesn't say enough. */
  detail?: string;
  /** What this option costs or amounts to, on the right. Carries `.tabular`. */
  value?: string;
  selected: boolean;
  onSelect: () => void;
}

export function OptionTile({ title, detail, value, selected, onSelect }: OptionTileProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors duration-hover outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-[var(--active-border)] bg-[var(--active-bg)]"
          : "border-border bg-card hover:bg-muted/50",
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium text-foreground">{title}</span>
        {detail && <span className="text-[12px] text-muted-foreground">{detail}</span>}
      </span>
      {value && <span className="tabular shrink-0 text-[15px] text-foreground">{value}</span>}
    </button>
  );
}
