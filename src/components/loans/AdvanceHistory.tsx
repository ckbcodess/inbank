"use client";

/**
 * Every advance that has been repaid, newest first and grouped by year, each year saying how many and how much was
 * borrowed. It is where the advance page's "Past Advances" row goes, so that page stays about what is owed now however
 * long the history grows.
 */

import PageHeader from "@/components/layout/PageHeader";
import { NARROW_COLUMN } from "@/lib/page-layout";
import { ListCard } from "@/components/ui/list-card";
import { TrueEmptyState } from "@/components/states/ListStates";
import { ListPageSkeleton } from "@/components/states/PageSkeletons";
import { AdvanceRow } from "@/components/loans/AdvanceProductPage";
import { ADVANCE_PRODUCT_HREF } from "@/components/loans/parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatMoney } from "@/lib/mock-data";
import { sumMoney } from "@/lib/money";
import { useLoansHydrated, useMyLoans, type Advance } from "@/lib/loans";

const whenOf = (a: Advance) => a.repaidOn ?? a.requestedOn;

export function AdvanceHistory() {
  const hydrated = useLoansHydrated();
  const { advances } = useMyLoans();
  const { showAmounts } = useAmountVisibility();

  if (!hydrated) return <ListPageSkeleton rows={6} toolbar={false} action={false} />;

  const repaid = advances.filter((a) => a.status === "repaid").sort((a, b) => whenOf(b).localeCompare(whenOf(a)));
  const years = [...new Set(repaid.map((a) => whenOf(a).slice(0, 4)))];
  const back = { href: ADVANCE_PRODUCT_HREF, label: "Salary Advance" };

  return (
    <div className={NARROW_COLUMN}>
      <PageHeader title="Past Advances" backTo={back} />
      {repaid.length === 0 ? (
        <TrueEmptyState title="No past advances yet" description="Advances you have repaid will be listed here." />
      ) : (
        <div className="flex flex-col gap-6">
          {years.map((year) => {
            const inYear = repaid.filter((a) => whenOf(a).startsWith(year));
            return (
              <section key={year} className="flex flex-col gap-2">
                <div className="tabular flex items-baseline justify-between gap-4 px-1 text-[13px] text-muted-foreground">
                  <span>{year}</span>
                  <span>{`${inYear.length} ${inYear.length === 1 ? "advance" : "advances"} · ${formatMoney(sumMoney(inYear.map((a) => a.amount)), "GHS", showAmounts)}`}</span>
                </div>
                <ListCard>
                  {inYear.map((a) => (
                    <AdvanceRow key={a.id} advance={a} showAmounts={showAmounts} />
                  ))}
                </ListCard>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
