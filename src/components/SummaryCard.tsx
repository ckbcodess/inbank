import type { ReactNode } from "react";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";

/** Compact metric tile used on the overview and operational dashboards. */
export function SummaryCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "warning" | "destructive";
}) {
  useAmountVisibility();

  const toneClass =
    tone === "warning"
      ? "text-warning-text"
      : tone === "destructive"
        ? "text-destructive"
        : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground" aria-hidden="true">{icon}</span>}
      </div>
      <div className={`mt-2 text-[22px] leading-tight tracking-[var(--ls-tight)] tabular ${toneClass}`}>
        <RevealingAmount value={value} />
      </div>
      {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
