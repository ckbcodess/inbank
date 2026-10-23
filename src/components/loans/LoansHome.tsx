"use client";

/**
 * Loans (Figma "Loans and Advances"). One page instead of the Figma's three-option menu (Apply, View, Calculate):
 *
 *  - Your Loans: the advance the customer holds or asked for, and past ones, with what is owed today.
 *  - Apply: the one advance that fits them. The Figma's chooser lists Salary, National Service and Pensioner advances
 *    side by side; the bank already knows which income a customer has, so only theirs is shown.
 *
 * "Calculate Loan Eligibility" belongs to the Personal Loan, which isn't offered online yet, so it isn't here. Someone
 * who doesn't qualify is told why and what would change it, never just "not eligible".
 */

import Link from "next/link";
import { ChevronRight, HandCoins } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { ListPageSkeleton } from "@/components/states/PageSkeletons";
import { ADVANCE_HREF, LoansDevTools } from "@/components/loans/parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { ADVANCE_PRODUCTS, owedBy, useLoansHydrated, useMyLoans, type Advance } from "@/lib/loans";
import { MOCK_TODAY, useTreasuryAccounts } from "@/lib/treasury";
import { cn } from "@/lib/utils";

function statusLine(a: Advance): string {
  switch (a.status) {
    case "pending":
      return "Waiting for approval";
    case "declined":
      return "Not approved";
    case "repaid":
      return `Repaid ${formatDate(a.repaidOn ?? "")}`;
    default:
      return a.dueOn < MOCK_TODAY ? `Overdue since ${formatDate(a.dueOn)}` : `Due ${formatDate(a.dueOn)}`;
  }
}

function AdvanceRow({ advance, showAmounts }: { advance: Advance; showAmounts: boolean }) {
  const overdue = advance.status === "active" && advance.dueOn < MOCK_TODAY;
  const figure = advance.status === "active" ? owedBy(advance) : advance.status === "repaid" ? (advance.repaidAmount ?? advance.amount) : advance.amount;
  const muted = advance.status === "declined" || advance.status === "repaid";
  return (
    <li>
      <Link
        href={`/loans/${advance.id}`}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
      >
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", overdue ? "bg-warning/15 text-warning-text" : "bg-muted text-foreground")}>
          <HandCoins size={16} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn("truncate text-[14px]", muted ? "text-muted-foreground" : "text-foreground")}>{ADVANCE_PRODUCTS[advance.kind].name}</span>
          <span className={cn("tabular truncate text-[12px]", overdue ? "text-warning-text" : "text-muted-foreground")}>{statusLine(advance)}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className={cn("tabular text-[14px]", muted ? "text-muted-foreground" : "text-foreground")}>{formatMoney(figure, "GHS", showAmounts)}</span>
          {advance.status === "active" && <span className="text-[12px] text-muted-foreground">Owed today</span>}
        </span>
        <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

export function LoansHome() {
  const hydrated = useLoansHydrated();
  const { income, advances, open, limit, product } = useMyLoans();
  const { showAmounts } = useAmountVisibility();
  const accounts = useTreasuryAccounts();

  if (!hydrated) return <ListPageSkeleton rows={3} toolbar={false} />;

  const sorted = [...advances].sort((a, b) => Number(Boolean(b === open)) - Number(Boolean(a === open)) || b.requestedOn.localeCompare(a.requestedOn));
  const account = accounts[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Loans" />
      <LoansDevTools />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-10">
        {sorted.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading title="Your Loans" />
            <ListCard>
              {sorted.map((a) => (
                <AdvanceRow key={a.id} advance={a} showAmounts={showAmounts} />
              ))}
            </ListCard>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <SectionHeading title="Apply" />
          {income && product ? (
            <>
              <ListCard>
                <li>
                  {open ? (
                    <div className="flex items-center gap-3 rounded-xl px-2 py-3 sm:px-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <HandCoins size={16} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[14px] text-muted-foreground">{product.name}</span>
                        <span className="truncate text-[12px] text-muted-foreground">{product.line}</span>
                      </span>
                    </div>
                  ) : (
                    <Link
                      href={ADVANCE_HREF}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                        <HandCoins size={16} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[14px] text-foreground">{product.name}</span>
                        <span className="truncate text-[12px] text-muted-foreground">{product.line}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        <span className="tabular text-[14px] text-foreground">{formatMoney(limit, "GHS", showAmounts)}</span>
                        <span className="text-[12px] text-muted-foreground">Up to</span>
                      </span>
                      <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                    </Link>
                  )}
                </li>
              </ListCard>
              {open && (
                <p className="px-1 text-[12px] text-muted-foreground">
                  {open.status === "pending" ? "You can take another once this request is decided and repaid." : "Repay your current advance to take another."}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2 px-1">
              <p className="text-[15px] text-foreground">Advances are for customers paid into GCB</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {account
                  ? `You can take up to 80% of your salary, national service allowance or pension once it’s paid into a GCB account. Ask your employer or pension office to pay into ${account.name} (${account.number}). Your first advance is available after the first credit arrives.`
                  : "You can take up to 80% of your salary, national service allowance or pension once it’s paid into a GCB account."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
