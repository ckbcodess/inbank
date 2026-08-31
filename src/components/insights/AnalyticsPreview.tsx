"use client";

/**
 * A compact preview of `InsightsSection`, sitting beside the card stack on
 * the overview. Reuses the same cashflow data and chart rather than a
 * second, parallel implementation — "View more" goes to Reports, where the
 * full grain/account controls and the category breakdown live.
 */

import Link from "next/link";
import dynamic from "next/dynamic";
import { insightTotals, cashflowSeries, type ProfileKind } from "@/lib/insights";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { CASHFLOW_CONFIG } from "./CashflowChart";
import { exactMoney } from "./chart-format";

const CashflowChart = dynamic(
  () => import("./CashflowChart").then((m) => m.CashflowChart),
  {
    ssr: false,
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-xl bg-muted/30" />,
  }
);

export function AnalyticsPreview({ profileKind }: { profileKind: ProfileKind }) {
  const { showAmounts } = useAmountVisibility();
  const totals = insightTotals(profileKind, "monthly", undefined);
  const series = cashflowSeries(profileKind, "monthly", undefined);
  const hasFlow = totals.income > 0 || totals.expense > 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] text-foreground">Analytics</h2>
        <Link href="/reports" className="text-[12px] text-primary underline-offset-4 hover:underline">
          View more →
        </Link>
      </div>

      {!hasFlow ? (
        <div className="flex flex-1 items-center justify-center py-8 text-center text-[13px] text-muted-foreground">
          No money moved this month.
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: CASHFLOW_CONFIG.income.color }}
                />
                {CASHFLOW_CONFIG.income.label}
              </span>
              <span className="tabular text-[15px] leading-tight text-foreground">
                {exactMoney(totals.income, showAmounts)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: CASHFLOW_CONFIG.expense.color }}
                />
                {CASHFLOW_CONFIG.expense.label}
              </span>
              <span className="tabular text-[15px] leading-tight text-foreground">
                {exactMoney(totals.expense, showAmounts)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex-1">
            <CashflowChart data={series} />
          </div>
        </>
      )}
    </div>
  );
}
