"use client";

/**
 * Business home, built like personal banking's (a greeting, the hero panel with the balance, panels rising on a
 * sheet) so the two read as one product, in business's smoke ash.
 *
 * The question a finance officer opens it with is "what can we spend, and what is waiting for me?". So the hero
 * holds one figure: available cash across the accounts this person can see, from the ledger, hidden until they
 * choose to show it (the same eye as personal). The first panel is what's waiting, which depends on the role:
 *   Inputter     payments sent back to them, then theirs still on the approval path
 *   Reviewer     payments to review
 *   Authoriser   payments to authorise, and user changes to approve
 *   Admin        user changes waiting for a second person
 * Then recent activity and the accounts. Inputters get the payment buttons beside the greeting, where personal
 * keeps Send. Nothing sits between the person and the balance.
 */

import Link from "next/link";
import { useMemo } from "react";
import { Eye, EyeOff } from "@/components/ui/icons";
import { HeroStack, HeroSurface } from "@/components/hero/hero-frame";
import { Panel, PanelEmpty, PanelHeader, PanelRow } from "@/components/corporate/home/panel";
import { Button } from "@/components/ui/button";
import { RevealingAmount, useBalanceVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney, toLocalEquivalent } from "@/lib/mock-data";
import { APPROVAL_QUEUE, currentStep, queueFor } from "@/lib/corporate/approvals";
import { companyUserFor, findCompanyUser, pendingUserChanges, userChangesToApprove, useControlsVersion } from "@/lib/corporate/controls";
import { sumMoney } from "@/lib/money";
import { canInitiate, isCorporateAdmin } from "@/lib/corporate/roles";
import { businessAccounts, businessTransactions } from "@/lib/corporate/accounts";
import { useSession } from "@/lib/session-store";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function lastFour(number: string): string {
  return `•••• ${number.replace(/\s/g, "").slice(-4)}`;
}

export default function BusinessOverviewPage() {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  const version = useControlsVersion();
  const [showBalance, toggleBalance] = useBalanceVisibility();

  // Re-read when the person changes (Dev Mode switches role without leaving the page).
  const accounts = useMemo(() => (actor ? businessAccounts() : []), [actor]);
  const records = useMemo(() => (actor ? businessTransactions() : []), [actor]);
  const totalAvailable = useMemo(
    () => sumMoney(accounts.map((a) => toLocalEquivalent(a.available, a.currency) ?? a.available)),
    [accounts],
  );
  const hasForeign = accounts.some((a) => a.currency !== "GHS");

  const role = companyUserFor(actor)?.role ?? (actor?.role === "SOLE_PROPRIETOR" ? "Sole Proprietor" : undefined);
  const sole = actor?.role === "SOLE_PROPRIETOR";
  const initiator = actor ? canInitiate(actor.role) : false;
  const admin = actor ? isCorporateAdmin(actor.role) : false;

  const waiting = useMemo(() => queueFor(actor), [actor]);
  const changes = useMemo(() => {
    void version;
    return admin ? pendingUserChanges() : userChangesToApprove(actor);
  }, [actor, admin, version]);
  const mine = useMemo(
    () => (actor?.role === "CORPORATE_INPUTTER" ? APPROVAL_QUEUE.filter((i) => i.type === "payment" && i.submittedBy === actor.name) : []),
    [actor],
  );
  const sentBack = mine.filter((i) => i.status === "returned");
  const inFlight = mine.filter((i) => i.status === "open");
  const recordHref = (reference: string) => {
    const r = records.find((t) => t.reference === reference);
    return r ? `/business/transactions/${r.id}` : "/business/transactions";
  };
  const changeTitle = (c: (typeof changes)[number]) => {
    const name = c.userId ? (findCompanyUser(c.userId)?.name ?? c.after.name) : c.after.name;
    return c.kind === "add" ? `Add ${name}` : c.kind === "reactivate" ? `Reactivate ${name}` : `Change ${name}'s access`;
  };

  const firstName = actor?.name.split(" ")[0] ?? "";
  const cashLine = accounts.length === 1 ? "Available in 1 account" : `Available across ${accounts.length} accounts`;

  return (
    <div className="flex flex-col gap-5 sm:gap-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1
            className="text-[18px] font-medium leading-[24px] tracking-[var(--ls-heading)] text-foreground sm:text-[20px] sm:leading-[28px] lg:text-[22px]"
            suppressHydrationWarning
          >
            {`${greeting(new Date().getHours())}, ${firstName}`}
          </h1>
          <span className="text-[12px] text-muted-foreground">
            {role ? `${activeProfile?.name ?? "Business Banking"} · ${role}` : activeProfile?.name}
          </span>
        </div>
        {initiator && (
          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} render={<Link href="/business/payments/supplier" />}>
              Send a Payment
            </Button>
            {!sole && (
              <Button variant="outline" nativeButton={false} render={<Link href="/business/payments/bulk" />}>
                Pay in Bulk
              </Button>
            )}
          </div>
        )}
      </div>

      <HeroStack
        hero={
          <HeroSurface className="flex flex-col items-center gap-3 rounded-t-3xl px-3 pb-12 pt-12 sm:pb-24 sm:pt-16">
            <span className="text-[13px] text-[color-mix(in_oklch,var(--hero-foreground)_72%,transparent)]">{cashLine}</span>
            <div className="flex items-center gap-2 text-[var(--hero-balance-foreground)]">
              <span className="tabular whitespace-nowrap text-[28px] leading-[32px] tracking-[var(--ls-heading)] sm:text-[44px] sm:leading-[48px]">
                GHS <RevealingAmount amount={totalAvailable} currency="" showAmounts={showBalance} />
              </span>
              <button
                type="button"
                onClick={toggleBalance}
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-hover hover:bg-[color-mix(in_oklch,var(--hero-foreground)_12%,transparent)]"
                aria-label={showBalance ? "Hide balance" : "Show balance"}
              >
                {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            {hasForeign && (
              <span className="text-[12px] text-[color-mix(in_oklch,var(--hero-foreground)_60%,transparent)]">
                Foreign currency counted in GHS at today&apos;s rate
              </span>
            )}
          </HeroSurface>
        }
      >
        <div className="dash-grid items-stretch gap-2 sm:gap-4">
          {/* What's waiting, by role. A sole proprietor has no approvals, so the panel isn't there. */}
          {actor?.role === "CORPORATE_INPUTTER" && (
            <Panel>
              <PanelHeader title={sentBack.length > 0 ? "Sent Back to You" : "Your Payments in Approval"} href="/business/transactions" />
              {sentBack.length + inFlight.length === 0 ? (
                <PanelEmpty text="Nothing of yours is waiting for approval." />
              ) : (
                <ul className="flex flex-col">
                  {[...sentBack, ...inFlight].slice(0, 3).map((item) => {
                    const returned = [...item.trail].reverse().find((e) => e.action === "returned");
                    const step = currentStep(item);
                    return (
                      <PanelRow
                        key={item.id}
                        href={recordHref(item.reference)}
                        title={item.counterparty}
                        meta={
                          returned
                            ? `Sent back by ${returned.by}`
                            : step?.kind === "review"
                              ? "Waiting for a Reviewer"
                              : "Waiting for an Authoriser"
                        }
                        figure={formatMoney(item.amount, item.currency, true)}
                      />
                    );
                  })}
                </ul>
              )}
            </Panel>
          )}

          {admin && (
            <Panel>
              <PanelHeader title="Waiting for Approval" href="/business/administration" />
              {changes.length === 0 ? (
                <PanelEmpty text="No user changes are waiting." />
              ) : (
                <ul className="flex flex-col">
                  {changes.slice(0, 3).map((c) => (
                    <PanelRow key={c.id} href="/business/administration" title={changeTitle(c)} meta={`Proposed by ${c.proposedBy}`} />
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {(actor?.role === "CORPORATE_REVIEWER" || actor?.role === "CORPORATE_AUTHORISER") && (
            <Panel>
              <PanelHeader title={actor.role === "CORPORATE_REVIEWER" ? "To Review" : "To Authorise"} href="/business/approvals" />
              {waiting.length + changes.length === 0 ? (
                <PanelEmpty text="Nothing is waiting on you." />
              ) : (
                <ul className="flex flex-col">
                  {waiting.slice(0, changes.length > 0 ? 2 : 3).map((item) => (
                    <PanelRow
                      key={item.id}
                      href={item.type === "payment" ? `/business/approvals/payment/${item.id}` : `/business/approvals/trade/${item.id}`}
                      title={item.counterparty}
                      meta={`From ${item.submittedBy}${item.priority === "urgent" ? " · urgent" : ""}`}
                      figure={formatMoney(item.amount, item.currency, true)}
                    />
                  ))}
                  {changes.slice(0, 1).map((c) => (
                    <PanelRow
                      key={c.id}
                      href={`/business/approvals/user-change/${c.id}`}
                      title={changeTitle(c)}
                      meta={`User change from ${c.proposedBy}`}
                    />
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Recent Activity" href="/business/transactions" />
            {records.length === 0 ? (
              <PanelEmpty text="Payments in and out of your accounts show here." />
            ) : (
              <ul className="flex flex-col">
                {records.slice(0, 3).map((t) => (
                  <PanelRow
                    key={t.id}
                    href={`/business/transactions/${t.id}`}
                    title={t.counterparty}
                    meta={formatDate(t.date)}
                    figure={`${t.direction === "debit" ? "−" : "+"}${formatMoney(t.amount, t.currency, true)}`}
                  />
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Accounts" href="/business/accounts" />
            {accounts.length === 0 ? (
              <PanelEmpty text="No accounts are linked to this business yet." />
            ) : (
              <ul className="flex flex-col">
                {accounts.slice(0, 3).map((a) => (
                  <PanelRow
                    key={a.id}
                    href={`/business/accounts/${a.id}`}
                    title={a.name}
                    meta={lastFour(a.number)}
                    figure={<RevealingAmount amount={a.available} currency={a.currency} />}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </HeroStack>
    </div>
  );
}
