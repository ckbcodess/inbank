"use client";

/**
 * One advance (Figma "View Loans and Advances" → Salary Advance). The one loud number is what clearing it would cost
 * today, which grows by a known amount each day; the line under it says when it is taken automatically. Then the facts
 * and one action, Repay Now.
 *
 *  - Waiting for approval: what will be paid in, and where.
 *  - Not approved: the reason, and when to try again (CONSTITUTION §1: a decline names the reason and a way back).
 *  - Overdue: amber, with the late charge stated as a fact.
 *  - Repaid: what was repaid and when.
 */

import Link from "next/link";
import { AlertCircle, ChevronRight, Wallet } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { ListCard } from "@/components/ui/list-card";
import { FactsPanel } from "@/components/invest/parts";
import { DetailPageSkeleton } from "@/components/states/PageSkeletons";
import { AdvanceNotFound, LOANS_HOME, LoansDevTools } from "@/components/loans/parts";
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
import { cn } from "@/lib/utils";

export function AdvanceDetail({ advanceId }: { advanceId: string }) {
  const hydrated = useLoansHydrated();
  const { advances, income } = useMyLoans();
  const { showAmounts } = useAmountVisibility();
  const accounts = useTreasuryAccounts();

  if (!hydrated) return <DetailPageSkeleton />;
  const advance = advances.find((a) => a.id === advanceId);
  if (!advance) return <AdvanceNotFound />;

  const product = ADVANCE_PRODUCTS[advance.kind];
  const money = (n: number) => formatMoney(n, "GHS", showAmounts);
  const fees = advanceFees(advance.amount);
  const account = accounts.find((a) => a.id === advance.accountId);
  const overdue = advance.status === "active" && advance.dueOn < MOCK_TODAY;
  const late = lateChargeBy(advance);

  const hero =
    advance.status === "active"
      ? { label: "To clear it today", value: owedBy(advance) }
      : advance.status === "repaid"
        ? { label: "Repaid", value: advance.repaidAmount ?? advance.amount }
        : { label: advance.status === "pending" ? "Requested" : "Asked for", value: advance.amount };

  const line =
    advance.status === "pending"
      ? `Waiting for approval. Once it’s approved we pay ${money(fees.received)} into ${account?.name ?? "your account"}.`
      : advance.status === "declined"
        ? `${advance.declineReason ?? "This request wasn’t approved."} You can ask again after your next credit on ${formatDate(nextPayday(advance.kind))}.`
        : advance.status === "repaid"
          ? `Repaid on ${formatDate(advance.repaidOn ?? "")}. Nothing more is owed.`
          : overdue
            ? `This was due on ${formatDate(advance.dueOn)}. A late charge of ${pct(LATE_CHARGE_RATE)} of the advance is added each month until it’s repaid.`
            : `Taken automatically when your next credit arrives on ${formatDate(advance.dueOn)}. It grows by ${money(dailyInterest(advance.amount))} a day until then.`;

  const facts: Array<[string, React.ReactNode]> = [
    ["Advance", money(advance.amount)],
    ...(advance.status === "active" || advance.status === "repaid"
      ? ([
          ["Paid in", `${money(fees.received)} on ${formatDate(advance.disbursedOn ?? "")}`],
          ["Fees taken up front", money(fees.fees)],
        ] as Array<[string, React.ReactNode]>)
      : []),
    ["Interest rate", `${pct(MONTHLY_RATE)} a month, ${money(dailyInterest(advance.amount))} a day`],
    ...(advance.status === "active" ? ([["Interest so far", money(interestBy(advance))]] as Array<[string, React.ReactNode]>) : []),
    ...(late > 0 ? ([["Late charges", money(late)]] as Array<[string, React.ReactNode]>) : []),
    ...(advance.status !== "declined" ? ([["Repayment date", formatDate(advance.dueOn)]] as Array<[string, React.ReactNode]>) : []),
    ...(account ? ([["Paid into", `${account.name} · ${account.number}`]] as Array<[string, React.ReactNode]>) : []),
    ["Reference", advance.reference],
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={product.name} backTo={{ href: LOANS_HOME, label: "Loans" }} />
      <LoansDevTools />
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-10">
        <section className="flex flex-col gap-2 px-1">
          <span className="text-[13px] text-muted-foreground">{hero.label}</span>
          <span className={cn("tabular text-[40px] leading-none tracking-[var(--ls-heading)]", advance.status === "declined" ? "text-muted-foreground" : "text-foreground")}>
            {money(hero.value)}
          </span>
          <p className={cn("text-[13px] leading-relaxed", overdue ? "text-warning-text" : "text-muted-foreground")}>{line}</p>
        </section>

        {advance.status === "active" && (
          <ListCard>
            <li>
              <Link
                href={`/loans/${advance.id}/repay`}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", overdue ? "bg-warning/15 text-warning-text" : "bg-muted text-foreground")}>
                  {overdue ? <AlertCircle size={16} strokeWidth={1.8} aria-hidden="true" /> : <Wallet size={16} strokeWidth={1.8} aria-hidden="true" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] text-foreground">Repay Now</span>
                  <span className="tabular truncate text-[12px] text-muted-foreground">
                    {overdue ? `${money(owedBy(advance))}, including late charges` : "Repaying early costs less"}
                  </span>
                </span>
                <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          </ListCard>
        )}

        <FactsPanel rows={facts} />

        {advance.status === "active" && !overdue && income && (
          <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
            {`If your credit doesn’t arrive by then, a late charge of ${pct(LATE_CHARGE_RATE)} of the advance is added each month until it’s repaid.`}
          </p>
        )}
      </div>
    </div>
  );
}
