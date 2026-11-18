"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "@/components/ui/icons";

/**
 * One option in an onboarding funnel ("GCB Account Holder", "With Passport"): an amber icon disc, a title, one line
 * that says who it's for, and a chevron (or another end mark, such as an external-link icon). Tapping it moves on.
 * Stack them in a `flex flex-col gap-2`. Used by `/get-started` and the ID choice on `/activate`.
 */
export default function ChoiceRow({
  icon,
  title,
  description,
  onClick,
  end,
  dataTour,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  /** What sits at the right edge. A chevron unless given. */
  end?: ReactNode;
  dataTour?: string;
}) {
  return (
    <button
      type="button"
      data-tour={dataTour}
      onClick={onClick}
      className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card-item p-4 text-left transition duration-hover hover:bg-card-item-hover hover:shadow-xs"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-heading font-medium tracking-[var(--ls-tight)] text-foreground">{title}</span>
          <span className="mt-0.5 text-body leading-snug text-muted-foreground">{description}</span>
        </div>
      </div>
      {end ?? (
        <ChevronRight
          size={20}
          className="shrink-0 text-foreground/70 transition duration-hover group-hover:text-foreground"
        />
      )}
    </button>
  );
}
