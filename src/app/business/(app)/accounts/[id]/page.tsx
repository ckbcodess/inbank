"use client";

/**
 * Business Account Details — one account of the company. The question it answers is "what can we spend from this
 * account, and who can authorise it?": the available balance first, then what moved lately, then the mandate and
 * the people on it. Pay and Statement are the two things a finance officer does from here.
 */

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListErrorState } from "@/components/states/ListStates";
import { AccountDetailBody } from "@/components/states/PageSkeletons";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import { TransactionMark } from "@/components/transactions/TransactionMark";
import { ShareDetailsDialog } from "@/components/accounts/ShareDetailsDialog";
import { accountHolderName } from "@/lib/account-holder";
import { explainMandate, findBusinessAccount } from "@/lib/corporate/accounts";
import { formatDate, formatMoney, transactionsForAccount, type Account } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { getTransactionType } from "@/lib/transaction-type";
import type { BaselineState } from "@/lib/states";
import { cn } from "@/lib/utils";

const BASELINE: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;
const RECENT = 5;

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-[14px] text-foreground tabular">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="min-h-6 text-[16px] font-medium">{title}</h2>
      {children}
    </section>
  );
}

export default function BusinessAccountDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  const [state, setState] = useState<BaselineState>("populated");
  const [shareOpen, setShareOpen] = useState(false);

  const account: Account | undefined = useMemo(() => findBusinessAccount(id), [id]);

  if (!account) {
    return (
      <div className="flex flex-col gap-2">
        <PageHeader title="Account Not Found" backTo={{ href: "/business/accounts", label: "Accounts" }} />
        <p className="pl-10 text-[13px] text-muted-foreground">This account isn&apos;t one of this business&apos;s accounts.</p>
      </div>
    );
  }

  const recent = state === "empty" ? [] : transactionsForAccount(account.id).slice(0, RECENT);
  const dormant = account.status === "Dormant";
  const uncleared = account.balance !== account.available;
  const holder = accountHolderName(account, activeProfile, actor);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={account.name}
        backTo={{ href: "/business/accounts", label: "Accounts" }}
        badge={dormant ? <Badge variant="warning">Dormant</Badge> : null}
      />

      <StateSwitcher section="13.9 baseline" states={BASELINE} value={state} onChange={setState} />

      {state === "loading" && <AccountDetailBody />}

      {state === "error" && (
        <div className="rounded-2xl border border-border bg-card">
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't load this account. Your money hasn't moved — try again."
          />
        </div>
      )}

      {(state === "populated" || state === "empty") && (
        <>
          <section className="flex flex-col gap-3" aria-label="Balance">
            <div className="text-[13px] text-muted-foreground tabular">
              {account.type} · {account.number}
            </div>
            <div className="tabular text-[40px] font-normal leading-none tracking-[var(--ls-heading)] sm:text-[56px]">
              <RevealingAmount amount={account.available} currency={account.currency} />
            </div>
            {uncleared && (
              <p className="text-[12px] text-muted-foreground tabular">
                {formatMoney(account.balance, account.currency)} in the ledger. The difference is funds not yet cleared or on hold.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {dormant ? (
                <Button
                  onClick={() =>
                    toast.success("Reactivation requested", {
                      description: `We'll let you know when ${account.name} is active again.`,
                    })
                  }
                >
                  Request Reactivation
                </Button>
              ) : (
                <Button nativeButton={false} render={<Link href={`/business/payments/supplier?from=${account.id}`} />}>
                  Pay From This Account
                </Button>
              )}
              <Button variant="outline" nativeButton={false} render={<Link href={`/business/accounts/${account.id}/statement`} />}>
                Statement
              </Button>
              <Button variant="outline" onClick={() => setShareOpen(true)}>
                Share Details
              </Button>
            </div>
          </section>

          <Section title="Recent activity">
            {recent.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No activity on this account yet. Money in and out will show here.</p>
            ) : (
              <>
                <ul className="flex flex-col">
                  {recent.map((t) => {
                    const credit = t.direction === "credit";
                    return (
                      <li key={t.id}>
                        <Link
                          href={`/business/transactions/${t.id}`}
                          className="-mx-3 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-hover ease-settle hover:bg-muted/50"
                        >
                          <TransactionMark transaction={t} />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[14px] text-foreground">{t.counterparty || t.description}</span>
                            <span className="truncate text-[12px] text-muted-foreground">
                              {getTransactionType(t)} · <span className="tabular">{formatDate(t.date)}</span>
                            </span>
                          </span>
                          <span className={cn("shrink-0 text-[14px] tabular", credit ? "text-success" : "text-foreground")}>
                            {credit ? "+ " : "− "}
                            {formatMoney(t.amount, t.currency, true)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div>
                  <Button variant="ghost" nativeButton={false} render={<Link href={`/business/transactions?account=${account.id}`} />}>
                    See All Transactions
                  </Button>
                </div>
              </>
            )}
          </Section>

          <Section title="Details">
            <dl className="flex flex-col divide-y divide-border">
              <DetailRow label="Account holder">{holder}</DetailRow>
              <DetailRow label="Account number">{account.number}</DetailRow>
              <DetailRow label="Currency">{account.currency}</DetailRow>
              <DetailRow label="Status">{account.status}</DetailRow>
              {account.mandate && (
                <DetailRow label="Mandate">
                  <span className="flex flex-col items-end gap-0.5">
                    <span>{account.mandate}</span>
                    <span className="text-[12px] text-muted-foreground">{explainMandate(account.mandate)}</span>
                  </span>
                </DetailRow>
              )}
            </dl>
          </Section>

          {account.signatories && account.signatories.length > 0 && (
            <Section title="Signatories">
              <ul className="flex flex-col divide-y divide-border">
                {account.signatories.map((s) => (
                  <li key={s.email} className="flex items-center justify-between gap-4 py-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] text-foreground">{s.name}</span>
                      <span className="truncate text-[12px] text-muted-foreground">{s.role}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="text-[12px] text-muted-foreground">{s.email}</span>
                      <span className="text-[12px] text-muted-foreground tabular">{s.mobile}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Your bank contact">
            {account.relationshipManager ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] text-foreground">{account.relationshipManager.name}</span>
                <span className="text-[12px] text-muted-foreground">{account.relationshipManager.email}</span>
                <span className="text-[12px] text-muted-foreground tabular">{account.relationshipManager.phone}</span>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                This account is handled by the Corporate Banking team. Your branch can connect you with them.
              </p>
            )}
          </Section>
        </>
      )}

      <ShareDetailsDialog open={shareOpen} onOpenChange={setShareOpen} account={account} holderName={holder} />
    </div>
  );
}
