import type { ReactNode } from "react";
import { ListCard } from "@/components/ui/list-card";
import { cn } from "@/lib/utils";

export interface ReviewRow {
  label: string;
  value: ReactNode;
  /** Numbers, dates and account numbers carry `.tabular`. */
  tabular?: boolean;
}

/**
 * The review step before a payment is authorised, in one list box: what it is (from, to, how, when), a dashed line,
 * then what it costs, ending on the total. Rows are separated by whitespace; the dashed line is the only divider.
 * Shared by every payment review so the amount, the recipient and the arrival always read the same way.
 */
export function ReviewSummary({
  details,
  breakdown = [],
  total,
  totalLabel = "Total Debit",
}: {
  details: ReviewRow[];
  /** Amount, fee, rate: the lines above the total. Left out when the total says it all. */
  breakdown?: ReviewRow[];
  /** Already formatted, and already respecting the hide-amounts setting. */
  total: ReactNode;
  totalLabel?: string;
}) {
  return (
    <ListCard as="div">
      {/* A label can repeat (two beneficiaries, two children covered), so rows are keyed by position too. */}
      {details.map((row, i) => (
        <Row key={`${i}-${row.label}`} row={row} />
      ))}

      {/* One box: what it is above, what it costs below, parted by a dashed line */}
      <div
        aria-hidden="true"
        className="mx-3 my-2 h-px bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]"
      />

      {breakdown.map((row, i) => (
        <Row key={`${i}-${row.label}`} row={row} />
      ))}
      <div className="flex items-baseline justify-between gap-4 px-3 py-3">
        <span className="text-[16px] font-medium text-foreground">{totalLabel}</span>
        <span className="tabular text-[24px] leading-none tracking-[var(--ls-heading)] text-foreground">{total}</span>
      </div>
    </ListCard>
  );
}

function Row({ row }: { row: ReviewRow }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <span className="shrink-0 text-[13.5px] text-muted-foreground">{row.label}</span>
      <span className={cn("min-w-0 truncate text-right text-[13.5px] text-foreground", row.tabular && "tabular")}>{row.value}</span>
    </div>
  );
}
