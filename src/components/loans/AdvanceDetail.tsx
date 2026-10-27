"use client";

/**
 * One advance (Figma "View Loans and Advances" → Salary Advance). A live advance is a balance, so it gets the figure with
 * a lead-in: what clearing it would cost today, which grows by a known amount each day. Every other state has no figure,
 * only rows (CONSTITUTION §3, PATTERNS §5). What needs the customer is the first row, in amber, with its action as a link.
 *
 *  - Waiting for approval: what will be paid in, and where.
 *  - Not approved: the reason, and when to try again (CONSTITUTION §1: a decline names the reason and a way back).
 *  - Overdue: the banner says so, with Repay now; the late charge is stated as a fact.
 *  - Repaid: what was repaid and when.
 *
 * Repay now is the banner under the title (due, or overdue), not a row, so it appears once.
 */

import PageHeader from "@/components/layout/PageHeader";
import { FactsPanel } from "@/components/invest/parts";
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

type Row = [React.ReactNode, React.ReactNode];

export function AdvanceDetail({ advanceId }: { advanceId: string }) {
  const hydrated = useLoansHydrated();
  const { advances, income } = useMyLoans();
  const { showAmounts } = useAmountVisibility();
  const accounts = useTreasuryAccounts();

  if (!hydrated) return <FactsPageSkeleton figure facts={6} actions={0} />;
  const advance = advances.find((a) => a.id === advanceId);
  if (!advance) return <AdvanceNotFound />;

  const product = ADVANCE_PRODUCTS[advance.kind];
  const money = (n: number) => formatMoney(n, "GHS", showAmounts);
  const fees = advanceFees(advance.amount);
  const account = accounts.find((a) => a.id === advance.accountId);
  const active = advance.status === "active";
  const overdue = active && advance.dueOn < MOCK_TODAY;
  const late = lateChargeBy(advance);

  // The state, as the first rows. A live advance has the figure instead of a key row.
  const state: Row[] = overdue
    ? []
    : advance.status === "pending"
      ? [
          ["Requested", <span key="amt" className="text-[20px]">{money(advance.amount)}</span>],
          ["Once approved", `We pay ${money(fees.received)} into ${account?.name ?? "your account"} once it’s approved`],
        ]
      : advance.status === "declined"
        ? [
            ["Asked for", <span key="amt" className="text-[20px]">{money(advance.amount)}</span>],
            ["Not approved", advance.declineReason ?? "This request wasn’t approved."],
            ["Ask again after", formatDate(nextPayday(advance.kind))],
          ]
        : advance.status === "repaid"
          ? [
              ["Repaid", <span key="amt" className="text-[20px]">{money(advance.repaidAmount ?? advance.amount)}</span>],
              ["Repaid on", formatDate(advance.repaidOn ?? "")],
            ]
          : [];

  const facts: Row[] = [
    ...state,
    ...(active || advance.status === "repaid"
      ? ([
          ["Advance", money(advance.amount)],
          ["Paid in", `${money(fees.received)} on ${formatDate(advance.disbursedOn ?? "")}`],
          ["Fees taken up front", money(fees.fees)],
        ] as Row[])
      : []),
    ["Interest rate", `${pct(MONTHLY_RATE)} a month, ${money(dailyInterest(advance.amount))} a day`],
    ...(active ? ([["Interest so far", money(interestBy(advance))]] as Row[]) : []),
    ...(late > 0 ? ([["Late charges", money(late)]] as Row[]) : []),
    ...(advance.status !== "declined" && !overdue ? ([["Repayment date", formatDate(advance.dueOn)]] as Row[]) : []),
    ...(active && !overdue && income ? ([["If your credit is late", `${pct(LATE_CHARGE_RATE)} of the advance a month`]] as Row[]) : []),
    ...(account ? ([["Paid into", `${account.name} · ${account.number}`]] as Row[]) : []),
    ["Reference", advance.reference],
  ];

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title={product.name} backTo={{ href: ADVANCE_PRODUCT_HREF, label: product.name }} />
      <ProductBanner alert={advanceAlert(advance)} />
      <LoansDevTools />
      <div className="flex flex-col gap-10">
        {active && (
          <div className="flex flex-col gap-1 px-1">
            <span className="text-[14px] text-muted-foreground">To clear it today</span>
            <span className="tabular text-[32px] leading-none tracking-[var(--ls-heading)] text-foreground">{money(owedBy(advance))}</span>
          </div>
        )}

        <FactsPanel rows={facts} />
      </div>
    </div>
  );
}
