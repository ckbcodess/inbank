"use client";

/**
 * Business Account Details — one account of the company, laid out like the personal account page (the account
 * card with round actions, options beside it). The question it answers is "what can we spend from this account,
 * and who can authorise it?": the available balance on the card, then the mandate and the people on it, the bank
 * contact, and what moved lately. Pay (for inputters), Statement and Share are the actions.
 */

import { use, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight, FileText, Landmark, RefreshCw, Repeat, Send, Share2 } from "@/components/ui/icons";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { ActionTile } from "@/components/ui/action-tile";
import { ListCard } from "@/components/ui/list-card";
import { RoundAction } from "@/components/ui/round-action";
import { SectionHeading } from "@/components/ui/section-heading";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListErrorState } from "@/components/states/ListStates";
import { AccountDetailBody } from "@/components/states/PageSkeletons";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import { TransactionMark } from "@/components/transactions/TransactionMark";
import { ShareDetailsDialog } from "@/components/accounts/ShareDetailsDialog";
import { accountHolderName } from "@/lib/account-holder";
import { explainMandate, findBusinessAccount } from "@/lib/corporate/accounts";
import { formatDate, formatMoney, transactionsForAccount, type Account } from "@/lib/mock-data";
import { canInitiate } from "@/lib/corporate/roles";
import { useSession } from "@/lib/session-store";
import { getTransactionType } from "@/lib/transaction-type";
import type { BaselineState } from "@/lib/states";

const BASELINE: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;
const RECENT = 5;

/** The account card, the same as personal's: the account-card tint and dot map, type and number, the available balance. */
function BalanceCard({ account }: { account: Account }) {
  const needsAttention = account.status !== "Active";
  return (
    <section
      aria-label="Balance"
      className="relative flex min-h-[220px] flex-col justify-between gap-10 overflow-hidden rounded-xl border border-border bg-[var(--account-card)] p-5"
    >
      <Image
        src="/images/figma/account-card-pattern.svg"
        unoptimized
        alt=""
        aria-hidden="true"
        width={430.279}
        height={343.429}
        className="pointer-events-none absolute -right-[207.7px] top-[8.68px] h-[343.429px] w-[430.279px] max-w-none select-none dark:opacity-40"
      />
      <div className="relative flex flex-col gap-2 text-[14px] leading-5 tracking-[-0.005em] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Landmark size={15} aria-hidden="true" />
          {account.type}
          {needsAttention && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-warning-text">{account.status}</span>
            </>
          )}
        </span>
        <span className="tabular">{account.number.replace(/\s+/g, "")}</span>
      </div>
      <RevealingAmount
        amount={account.available}
        currency={account.currency}
        className="relative text-[30px] leading-[1.25] tracking-[-0.015em] text-foreground tabular sm:text-[36px]"
      />
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
  // Reviewers and authorisers don't start payments, so Pay and Standing Orders aren't theirs (BRL-04).
  const initiator = actor ? canInitiate(actor.role) : false;

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
          {/* Laid out like the personal account page: the card and its round actions on the left, the options on
              the right. A company's own facts (the mandate, its signatories, the bank contact) sit under the options. */}
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
            <div className="flex flex-col gap-5 lg:mx-auto lg:w-[78%]">
              <BalanceCard account={account} />
              {uncleared && (
                <p className="text-[12px] text-muted-foreground tabular">
                  {formatMoney(account.balance, account.currency)} in the ledger. The difference is funds not yet cleared or on hold.
                </p>
              )}
              <div className="flex w-full items-start justify-evenly">
                {dormant ? (
                  <RoundAction
                    icon={RefreshCw}
                    label="Reactivate"
                    onClick={() =>
                      toast.success("Reactivation requested", { description: `We'll let you know when ${account.name} is active again.` })
                    }
                  />
                ) : (
                  initiator && <RoundAction icon={Send} label="Pay" href={`/business/payments/supplier?from=${account.id}`} />
                )}
                <RoundAction icon={FileText} label="Statement" href={`/business/accounts/${account.id}/statement`} />
                <RoundAction icon={Share2} label="Share Details" onClick={() => setShareOpen(true)} />
              </div>
            </div>

            <div className="flex flex-col gap-10">
              <nav aria-label="Account options" className="flex flex-col gap-3">
                <ActionTile
                  href={`/business/transactions?account=${account.id}`}
                  icon={ArrowLeftRight}
                  title="Transactions"
                  description="Everything in and out of this account"
                />
                {initiator && <ActionTile href="/business/payments/standing" icon={Repeat} title="Standing Orders" />}
              </nav>

              {account.mandate && (
                <section className="flex flex-col gap-3">
                  <SectionHeading title="Mandate" />
                  <ListCard as="div" className="gap-3 p-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[14px] text-foreground">{account.mandate}</span>
                      <span className="text-[12px] text-muted-foreground">{explainMandate(account.mandate)}</span>
                    </div>
                    {account.signatories && account.signatories.length > 0 && (
                      <ul className="flex flex-col gap-2 border-t border-border pt-3">
                        {account.signatories.map((s) => (
                          <li key={s.email} className="flex flex-col">
                            <span className="truncate text-[14px] text-foreground">{s.name}</span>
                            <span className="truncate text-[12px] text-muted-foreground">{s.role}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </ListCard>
                </section>
              )}

              <section className="flex flex-col gap-3">
                <SectionHeading title="Your Bank Contact" />
                <ListCard as="div" className="gap-1 p-4">
                  {account.relationshipManager ? (
                    <>
                      <span className="text-[14px] text-foreground">{account.relationshipManager.name}</span>
                      <span className="text-[12px] text-muted-foreground">{`Relationship Manager · ${account.relationshipManager.email}`}</span>
                      <span className="text-[12px] text-muted-foreground tabular">{account.relationshipManager.phone}</span>
                    </>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">
                      This account is handled by the Corporate Banking team. Your branch can connect you with them.
                    </p>
                  )}
                </ListCard>
              </section>
            </div>
          </div>

          <section className="flex flex-col gap-3">
            <SectionHeading title="Recent Activity" />
            {recent.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No activity on this account yet. Money in and out will show here.</p>
            ) : (
              <ListCard>
                {recent.map((t) => {
                  const credit = t.direction === "credit";
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/business/transactions/${t.id}`}
                        className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-item-hover sm:px-3"
                      >
                        <TransactionMark transaction={t} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-[14px] text-foreground">{t.counterparty || t.description}</span>
                          <span className="truncate text-[12px] text-muted-foreground">
                            {getTransactionType(t)} · <span className="tabular">{formatDate(t.date)}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-[14px] text-foreground tabular">
                          {credit ? "+ " : "− "}
                          {formatMoney(t.amount, t.currency, true)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ListCard>
            )}
          </section>
        </>
      )}

      <ShareDetailsDialog open={shareOpen} onOpenChange={setShareOpen} account={account} holderName={holder} />
    </div>
  );
}
