"use client";

/**
 * Account Details — object destination, reached only from the Accounts list
 * (12.4). State model: baseline per 13.9 (object-detail-derived), plus the
 * screen-specific actions defined in section 9.
 *
 * Section 2: account identity + balance + activity, with Statement
 * Configuration reached from here.
 */

import { use, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight, Copy, CreditCard, FileText, Send } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TransactionList from "@/components/TransactionList";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListSkeleton } from "@/components/states/ListStates";
import type { BaselineState } from "@/lib/states";
import { cardsForProfile, findAccount, formatMoney, transactionsForAccount } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { MiniCardThumbnail } from "@/components/cards/MiniCardThumbnail";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";

const BASELINE: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

export default function AccountDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  useAmountVisibility();
  const { id } = use(params);
  const account = findAccount(id);
  const activeProfile = useSession((s) => s.activeProfile);
  const [state, setState] = useState<BaselineState>("populated");

  if (!account) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Account not found" backTo={{ href: "/accounts", label: "Accounts" }} />
        <p className="text-[13px] text-muted-foreground">
          This account isn&apos;t available under the current banking relationship.
        </p>
      </div>
    );
  }

  const profileCards = cardsForProfile(activeProfile?.kind);
  const linkedCards = profileCards.filter((c) => c.linkedAccountId === account.id || account.id === "acc-001");
  const transactions = transactionsForAccount(account.id);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={account.name}
        description={`${account.type} · ${account.number}`}
        backTo={{ href: "/accounts", label: "Accounts" }}
        actions={
          <>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/accounts/${account.id}/statement`} />}>
              <FileText size={14} strokeWidth={1.9} aria-hidden="true" />
              Statement
            </Button>
            <Button size="sm" nativeButton={false} render={<Link href="/payments" />}>
              <Send size={14} strokeWidth={1.9} aria-hidden="true" />
              Pay from this account
            </Button>
          </>
        }
      />

      <StateSwitcher section="13.9 baseline" states={BASELINE} value={state} onChange={setState} />

      {state === "loading" && (
        <div className="rounded-2xl border border-border bg-card">
          <ListSkeleton rows={5} columns={4} />
        </div>
      )}

      {state === "error" && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <AlertCircle size={17} strokeWidth={1.8} aria-hidden="true" className="mt-px shrink-0 text-destructive" />
          <div>
            <p className="text-[14px] text-foreground">Couldn&apos;t load this account</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              The balance shown may be out of date. Try again in a moment.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setState("populated")}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {state === "empty" && (
        <>
          <AccountIdentity account={account} />
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center">
            <p className="text-[15px] text-foreground">No activity on this account yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
              Transactions will appear here once money moves in or out.
            </p>
          </div>
        </>
      )}

      {state === "populated" && (
        <>
          <AccountIdentity account={account} />

          {linkedCards.length > 0 && (
            <div className="rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} strokeWidth={1.8} className="text-muted-foreground" />
                  <h2 className="text-[15px] text-foreground">Linked payment cards</h2>
                </div>
                <Link href="/cards" className="text-[12px] text-primary underline-offset-4 hover:underline">
                  Manage cards
                </Link>
              </div>
              <ul className="divide-y divide-border">
                {linkedCards.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/cards/${c.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MiniCardThumbnail card={c} />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-[13px] font-medium text-foreground">{c.name}</span>
                          <span className="mt-0.5 text-[11px] text-muted-foreground tabular">
                            {c.scheme} {c.type} · {c.maskedNumber}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={c.status === "Active" ? "success" : "destructive"}>{c.status}</Badge>
                        <ChevronRight size={15} strokeWidth={1.8} className="text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-[15px] text-foreground">Activity</h2>
            {/* Reusable Transaction List, scoped to this account (section 2) */}
            <TransactionList
              transactions={transactions}
              showStateSwitcher={false}
              emptyTitle="No activity on this account yet"
              emptyDescription="Transactions will appear here once money moves in or out."
            />
          </div>
        </>
      )}
    </div>
  );
}

function AccountIdentity({ account }: { account: ReturnType<typeof findAccount> }) {
  if (!account) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">Available balance</span>
            {account.status === "Dormant" && <Badge variant="warning">Dormant</Badge>}
          </div>
          <p className="mt-1.5 text-[28px] leading-none tracking-[-0.02em] text-foreground tabular">
            <RevealingAmount amount={account.available} currency={account.currency} />
          </p>
          <p className="mt-2 text-[12.5px] text-muted-foreground tabular">
            Ledger balance <RevealingAmount amount={account.balance} currency={account.currency} />
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
          <div>
            <dt className="text-[12px] text-muted-foreground">Account number</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-foreground tabular">
              {account.number}
              <button
                type="button"
                aria-label="Copy account number"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Copy size={13} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted-foreground">Currency</dt>
            <dd className="mt-0.5 text-foreground">{account.currency}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted-foreground">Type</dt>
            <dd className="mt-0.5 text-foreground">{account.type}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted-foreground">Status</dt>
            <dd className="mt-0.5 text-foreground">{account.status}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
