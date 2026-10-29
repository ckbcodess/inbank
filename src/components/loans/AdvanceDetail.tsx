"use client";

/**
 * One advance (Figma "View Loans and Advances" → Salary Advance). Plain rows in clusters (reference; rate and dates; the
 * money), then one large closing figure like a total (designer, 2026-10-28, the same shape as a policy): what clearing a
 * live advance would cost today, or the amount asked for, requested or repaid in the other states. No notes under values.
 *
 *  - Waiting for approval: what will be paid in, and where.
 *  - Not approved: the reason, and when to try again (CONSTITUTION §1: a decline names the reason and a way back).
 *  - Overdue: the banner says so, with Repay now; the late charge is stated as a fact.
 *  - Repaid: what was repaid and when.
 *
 * Repay now is the banner under the title (due, or overdue), not a row, so it appears once.
 */

import PageHeader from "@/components/layout/PageHeader";
import { FactGroups, type FactGroup } from "@/components/invest/parts";
import { ProductBanner } from "@/components/ui/product-banner";
import { advanceAlert } from "@/lib/product-alerts";
import { FactsPageSkeleton } from "@/components/states/PageSkeletons";
import { ADVANCE_PRODUCT_HREF, AdvanceNotFound, LoansDevTools } from "@/components/loans/parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { MOCK_TODAY, useTreasuryAccounts } from "@/lib/treasury";
import {
  ADVANCE_PRODUCTS,
  advanceFees,
  dailyInterest,
  interestBy,
  LATE_CHARGE_RATE,
  lateChargeBy,
  MONTHLY_RATE,
  nextPayday,
  owedBy,
  pct,
  useLoansHydrated,
  useMyLoans,
} from "@/lib/loans";

export function AdvanceDetail({ advanceId }: { advanceId: string }) {
  const hydrated = useLoansHydrated();
  const { advances, income } = useMyLoans();
  const { showAmounts } = useAmountVisibility();
  const accounts = useTreasuryAccounts();

  if (!hydrated) return <FactsPageSkeleton facts={6} actions={0} />;
  const advance = advances.find((a) => a.id === advanceId);
  if (!advance) return <AdvanceNotFound />;

  const product = ADVANCE_PRODUCTS[advance.kind];
  const money = (n: number) => formatMoney(n, "GHS", showAmounts);
  const fees = advanceFees(advance.amount);
  const account = accounts.find((a) => a.id === advance.accountId);
  const active = advance.status === "active";
  const overdue = active && advance.dueOn < MOCK_TODAY;
  const late = lateChargeBy(advance);

  const into = account ? `${account.name} · ${account.number}` : undefined;
  const received = advance.status === "pending" ? "You’ll receive" : "You received";
  const paidOut = active || advance.status === "repaid";
  const lateRate = `${pct(LATE_CHARGE_RATE)} of the advance a month`;

  // Plain rows in clusters, then the one figure the page ends on, set large like a total (the same shape as a policy).
  const groups: FactGroup[] = [
    { rows: [{ label: "Reference", value: advance.reference }] },
    {
      rows: [
        ...(advance.status !== "declined" && !overdue ? [{ label: advance.status === "repaid" ? "Was due" : "Repays on", value: formatDate(advance.dueOn) }] : []),
        { label: "Interest rate", value: `${pct(MONTHLY_RATE)} a month` },
        ...(active ? [{ label: "Daily interest", value: money(dailyInterest(advance.amount)) }] : []),
        ...(active && (late > 0 || income) ? [{ label: "Late charge rate", value: lateRate }] : []),
      ],
    },
    {
      rows:
        advance.status === "declined"
          ? [
              { label: "Not approved", value: advance.declineReason ?? "This request wasn’t approved." },
              { label: "Ask again after", value: formatDate(nextPayday(advance.kind)) },
            ]
          : [
              ...(paidOut ? [{ label: "Advance", value: money(advance.amount) }] : []),
              { label: "Fees", value: money(fees.fees) },
              { label: received, value: money(fees.received) },
              ...(paidOut && advance.disbursedOn ? [{ label: "Paid in on", value: formatDate(advance.disbursedOn) }] : []),
              ...(into ? [{ label: advance.status === "pending" ? "Goes into" : "Went into", value: into }] : []),
              ...(active ? [{ label: "Interest so far", value: money(interestBy(advance)) }] : []),
              ...(late > 0 ? [{ label: "Late charges", value: money(late) }] : []),
              ...(advance.status === "repaid" ? [{ label: "Repaid on", value: formatDate(advance.repaidOn ?? "") }] : []),
            ],
    },
    {
      rows: [
        active
          ? { label: "To clear it today", value: money(owedBy(advance)), total: true }
          : advance.status === "pending"
            ? { label: "Requested", value: money(advance.amount), total: true }
            : advance.status === "declined"
              ? { label: "Asked for", value: money(advance.amount), total: true }
              : { label: "Repaid", value: money(advance.repaidAmount ?? advance.amount), total: true },
      ],
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title={product.name} backTo={{ href: ADVANCE_PRODUCT_HREF, label: product.name }} />
      <ProductBanner alert={advanceAlert(advance)} />
      <LoansDevTools />
      <div className="flex flex-col gap-10">
        <FactGroups groups={groups} boxed />
      </div>
    </div>
  );
}
