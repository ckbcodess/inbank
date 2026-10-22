"use client";

/**
 * Business home. The question a finance officer opens it with is "what can we spend, and what is waiting
 * for me?". So: one figure (available cash across the accounts this person can see, derived from the ledger), then
 * what is waiting, which depends on the role:
 *   Inputter     payments sent back to them, and how many of theirs are still on their approval path
 *   Reviewer     payments to review
 *   Authoriser   payments to authorise, and user changes to approve
 *   Admin        user changes still waiting for a second person
 * Then the accounts it is made of, and, for inputters, the two payment doors. Nothing sits between the person and
 * the balance.
 */

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import { toLocalEquivalent } from "@/lib/mock-data";
import { APPROVAL_QUEUE, queueFor } from "@/lib/corporate/approvals";
import { pendingUserChanges, userChangesToApprove, useControlsVersion } from "@/lib/corporate/controls";
import { sumMoney } from "@/lib/money";
import { canInitiate, isCorporateAdmin } from "@/lib/corporate/roles";
import { businessAccounts, businessTransactions } from "@/lib/corporate/accounts";
import { useSession } from "@/lib/session-store";

export default function BusinessOverviewPage() {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  useControlsVersion();
  // Re-read when the person changes (Dev Mode switches role without leaving the page).
  const accounts = useMemo(() => (actor ? businessAccounts() : []), [actor]);

  const totalAvailable = useMemo(
    () => sumMoney(accounts.map((a) => toLocalEquivalent(a.available, a.currency) ?? a.available)),
    [accounts],
  );

  const waiting = queueFor(actor);
  const userChanges = userChangesToApprove(actor).length;
  const urgent = waiting.filter((item) => item.priority === "urgent").length;
  const admin = actor ? isCorporateAdmin(actor.role) : false;
  const changesWaiting = admin ? pendingUserChanges().length : 0;

  // An inputter's own payments: those sent back to them, and those still on their approval path.
  const mine = actor && actor.role === "CORPORATE_INPUTTER" ? APPROVAL_QUEUE.filter((i) => i.type === "payment" && i.submittedBy === actor.name) : [];
  const sentBack = mine.filter((i) => i.status === "returned");
  const inFlight = mine.filter((i) => i.status === "open").length;
  const records = businessTransactions();

  const cashLine = accounts.length === 1 ? "Available in 1 account" : `Available across ${accounts.length} accounts`;
  const waitingLine =
    actor?.role === "CORPORATE_REVIEWER"
      ? waiting.length === 1
        ? "1 payment to review"
        : `${waiting.length} payments to review`
      : waiting.length === 1
        ? "1 request to authorise"
        : `${waiting.length} requests to authorise`;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={activeProfile?.name ?? "Business Banking"} />

      <section className="flex flex-col gap-3" aria-label="Available cash">
        <div className="text-[13px] text-muted-foreground">{cashLine}</div>
        <div className="tabular text-[40px] font-normal leading-none tracking-[var(--ls-heading)] sm:text-[56px]">
          <RevealingAmount amount={totalAvailable} currency="GHS" />
        </div>
      </section>

      {sentBack.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="min-h-6 text-[16px] font-medium">Sent Back to You</h2>
          <ul className="flex flex-col">
            {sentBack.map((item) => {
              const record = records.find((t) => t.reference === item.reference);
              const by = [...item.trail].reverse().find((e) => e.action === "returned");
              return (
                <li key={item.id}>
                  <Link
                    href={record ? `/business/transactions/${record.id}` : "/business/transactions"}
                    className="-mx-3 flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors duration-hover ease-settle hover:bg-muted/50"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] text-foreground">{item.counterparty}</span>
                      <span className="truncate text-[12px] text-muted-foreground">{by ? `${by.by}: “${by.comment ?? ""}”` : item.description}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular text-[14px] text-foreground">
                        <RevealingAmount amount={item.amount} currency={item.currency} />
                      </span>
                      <ChevronRight size={16} strokeWidth={1.7} className="text-muted-foreground" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {inFlight > 0 && (
            <p className="text-[12px] text-muted-foreground">
              {inFlight === 1 ? "1 more of yours is waiting for approval." : `${inFlight} more of yours are waiting for approval.`}
            </p>
          )}
        </section>
      )}

      {changesWaiting > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="min-h-6 text-[16px] font-medium">Waiting for Approval</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-foreground">
              {changesWaiting === 1 ? "1 user change needs a second person" : `${changesWaiting} user changes need a second person`}
            </p>
            <Button variant="outline" nativeButton={false} render={<Link href="/business/administration" />}>
              Open Administration
            </Button>
          </div>
        </section>
      )}

      {(waiting.length > 0 || userChanges > 0) && (
        <section className="flex flex-col gap-3">
          <h2 className="min-h-6 text-[16px] font-medium">Waiting for you</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-foreground">
              {waiting.length > 0 && waitingLine}
              {urgent > 0 && <span className="text-muted-foreground"> {`· ${urgent} marked urgent`}</span>}
              {userChanges > 0 && (
                <span className={waiting.length > 0 ? "text-muted-foreground" : undefined}>
                  {waiting.length > 0 ? " · " : ""}
                  {userChanges === 1 ? "1 user change to approve" : `${userChanges} user changes to approve`}
                </span>
              )}
            </p>
            <Button nativeButton={false} render={<Link href="/business/approvals" />}>
              Open Approvals
            </Button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="min-h-6 text-[16px] font-medium">Accounts</h2>
        {accounts.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No accounts are linked to this business yet.</p>
        ) : (
          <ul className="flex flex-col">
            {accounts.map((account) => (
              <li key={account.id}>
                <Link
                  href={`/business/accounts/${account.id}`}
                  className="-mx-3 flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors duration-hover hover:bg-muted/50"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[14px] text-foreground">{account.name}</span>
                    <span className="tabular text-[12px] text-muted-foreground">•••• {account.number.replace(/\s/g, "").slice(-4)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular text-[14px] text-foreground">
                      <RevealingAmount amount={account.available} currency={account.currency} />
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {actor && canInitiate(actor.role) && (
        <section className="flex flex-wrap gap-3">
          <Button variant="outline" nativeButton={false} render={<Link href="/business/payments/supplier" />}>
            Send a Payment
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/business/payments/bulk" />}>
            Pay in Bulk
          </Button>
        </section>
      )}
    </div>
  );
}
