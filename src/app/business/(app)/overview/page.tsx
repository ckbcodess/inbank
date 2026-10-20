"use client";

/**
 * Business home. The question a finance officer opens it with is "what can we spend, and what is waiting
 * for me?". So: one figure (available cash across the company's accounts, derived from the ledger), what
 * needs the person's approval (approvers only), the accounts it is made of, and the two payment doors.
 * Nothing sits between the person and the balance.
 */

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import { toLocalEquivalent } from "@/lib/mock-data";
import { APPROVAL_QUEUE } from "@/lib/corporate/approvals";
import { sumMoney } from "@/lib/money";
import { isApprover } from "@/lib/corporate/roles";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import { useSession } from "@/lib/session-store";

export default function BusinessOverviewPage() {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  const { accounts } = useCustomerAccounts();

  const totalAvailable = useMemo(
    () => sumMoney(accounts.map((a) => toLocalEquivalent(a.available, a.currency) ?? a.available)),
    [accounts],
  );

  const waiting = actor && isApprover(actor.role) ? APPROVAL_QUEUE : [];
  const urgent = waiting.filter((item) => item.priority === "urgent").length;

  const cashLine = accounts.length === 1 ? "Available in 1 account" : `Available across ${accounts.length} accounts`;
  const waitingLine = waiting.length === 1 ? "1 request needs your approval" : `${waiting.length} requests need your approval`;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={activeProfile?.name ?? "Business Banking"} />

      <section className="flex flex-col gap-3" aria-label="Available cash">
        <div className="text-[13px] text-muted-foreground">{cashLine}</div>
        <div className="tabular text-[40px] font-normal leading-none tracking-[var(--ls-heading)] sm:text-[56px]">
          <RevealingAmount amount={totalAvailable} currency="GHS" />
        </div>
      </section>

      {waiting.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="min-h-6 text-[16px] font-medium">Waiting for you</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-foreground">
              {waitingLine}
              {urgent > 0 && <span className="text-muted-foreground"> {`· ${urgent} marked urgent`}</span>}
            </p>
            <Button nativeButton={false} render={<Link href="/business/approvals" />}>
              Review Approvals
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
                  className="-mx-3 flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors duration-hover ease-settle hover:bg-muted/50"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[14px] text-foreground">{account.name}</span>
                    <span className="tabular text-[12px] text-muted-foreground">•••• {account.number.replace(/\s/g, "").slice(-4)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular text-[14px] text-foreground">
                      <RevealingAmount amount={account.available} currency={account.currency} />
                    </span>
                    <ChevronRight size={16} strokeWidth={1.7} className="text-muted-foreground" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-wrap gap-3">
        <Button variant="outline" nativeButton={false} render={<Link href="/payments" />}>
          Send a Payment
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/business/payments/bulk" />}>
          Pay in Bulk
        </Button>
      </section>
    </div>
  );
}
