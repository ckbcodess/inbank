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
      ? "text-amber-600 dark:text-amber-400"
      : tone === "destructive"
        ? "text-destructive"
        : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground" aria-hidden="true">{icon}</span>}
      </div>
      <div className={`mt-2 text-[22px] leading-tight tracking-[-0.01em] tabular ${toneClass}`}>
        <RevealingAmount value={value} />
      </div>
      {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
