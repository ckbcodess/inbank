"use client";

/**
 * One advance (Figma "View Loans and Advances" → Salary Advance). Plain rows in clusters (reference; rate and dates; the
 * money), then one large closing figure like a total (designer, 2026-10-28, the same shape as a policy): what clearing a
 * live advance would cost today, or what was repaid once it is. No notes under values. An advance is paid in the moment
 * it is requested, so there is no waiting or declined state.
 *
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
  owedBy,
  pct,
  remainingPrincipal,
  totalRepaid,
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
  const paid = totalRepaid(advance);
  const repayments = advance.repayments ?? [];

  const into = account ? `${account.name} · ${account.number}` : undefined;
  const lateRate = `${pct(LATE_CHARGE_RATE)} of the advance a month`;

  // Plain rows in clusters, then the one figure the page ends on, set large like a total (the same shape as a policy).
  const groups: FactGroup[] = [
    { rows: [{ label: "Reference", value: advance.reference }] },
    {
      rows: [
        ...(!overdue ? [{ label: advance.status === "repaid" ? "Was due" : "Repays on", value: formatDate(advance.dueOn) }] : []),
        { label: "Interest rate", value: `${pct(MONTHLY_RATE)} a month` },
        ...(active ? [{ label: "Daily interest", value: money(dailyInterest(remainingPrincipal(advance))) }] : []),
        ...(active && (late > 0 || income) ? [{ label: "Late charge rate", value: lateRate }] : []),
      ],
    },
    {
      rows: [
        { label: "Advance", value: money(advance.amount) },
        ...(paid > 0 ? [{ label: "Paid so far", value: money(paid) }] : []),
        { label: "Fees", value: money(fees.fees) },
        { label: "You received", value: money(fees.received) },
        ...(advance.disbursedOn ? [{ label: "Paid in on", value: formatDate(advance.disbursedOn) }] : []),
        ...(into ? [{ label: "Went into", value: into }] : []),
        ...(active ? [{ label: "Interest so far", value: money(interestBy(advance)) }] : []),
        ...(late > 0 ? [{ label: "Late charges", value: money(late) }] : []),
        ...(advance.status === "repaid" ? [{ label: "Repaid on", value: formatDate(advance.repaidOn ?? "") }] : []),
      ],
    },
    ...(repayments.length > 0
      ? [
          {
            rows: repayments.map((r) => ({
              label: formatDate(r.date),
              value: money(r.amount),
            })),
          },
        ]
      : []),
    {
      rows: [
        active
          ? { label: "To clear it today", value: money(owedBy(advance)), total: true }
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
