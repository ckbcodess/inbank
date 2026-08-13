"use client";

/**
 * S05 Banking Overview — section 1.
 *
 * Role-aware home. The page is a composition, not an implementation: each block
 * below owns its own behaviour and its own rationale, and this file's job is
 * the reading order.
 *
 * That order answers four questions in the sequence a customer asks them:
 *
 *   1. What can I spend?          → LiquidityCore (FR-04)
 *   2. What do I want to do?      → QuickActionBar (FR-05, FR-33)
 *   3. What needs me right now?   → approvals band, then accounts / cards / FX
 *   4. What has been happening?   → insights, then the activity feed
 *
 * The "requires attention" band renders only for an Approver and the
 * administration shortcut only for a Corporate Admin, matching the nav matrix
 * (section 12.3).
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { BaselineState } from "@/lib/states";
import { useSession } from "@/lib/session-store";
import { isApprover, isCorporateAdmin } from "@/lib/roles";
import {
  accountsForProfile,
  cardsForProfile,
  transactionsForProfile,
  APPROVAL_QUEUE,
} from "@/lib/mock-data";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import { LiquidityCore } from "@/components/dashboard/LiquidityCore";
import { QuickActionBar } from "@/components/dashboard/QuickActionBar";
import { AccountsPanel } from "@/components/dashboard/AccountsPanel";
import { CardsPanel } from "@/components/dashboard/CardsPanel";
import { FxPulse } from "@/components/dashboard/FxPulse";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { InsightsSection } from "@/components/insights/InsightsSection";

const BASELINE_STATES: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

export default function OverviewPage() {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  useAmountVisibility();

  const [pageState, setPageState] = useState<BaselineState>("populated");
  // Card status and balances live in a module-level array that is mutated in
  // place, so blocking or funding a card needs an explicit nudge to re-read.
  const [cardsRevision, setCardsRevision] = useState(0);
  const refreshCards = useCallback(() => setCardsRevision((n) => n + 1), []);
  const [topUpRequest, setTopUpRequest] = useState<string | null>(null);

  if (!actor || !activeProfile) return null;

  const accounts = accountsForProfile(activeProfile.kind);
  void cardsRevision;
  const cards = cardsForProfile(activeProfile.kind);
  const transactions = transactionsForProfile(activeProfile.kind);

  const pendingCount = transactions.filter(
    (t) => t.state === "pending" || t.state === "awaiting-approval",
  ).length;

  const isCorporate = activeProfile.kind === "CORPORATE";
  const showApprovals = isCorporate && isApprover(actor.role);
  const showAdmin = isCorporate && isCorporateAdmin(actor.role);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Good day, ${actor.name.split(" ")[0]}`}
        description={`${activeProfile.name} · ${activeProfile.reference}`}
      />

      <StateSwitcher section="13.9" states={BASELINE_STATES} value={pageState} onChange={setPageState} />

      {/* 1 — What can I spend? */}
      <LiquidityCore
        accounts={accounts}
        pendingCount={pendingCount}
        approvalCount={showApprovals ? APPROVAL_QUEUE.length : null}
      />

      {/* 2 — What do I want to do? */}
      <QuickActionBar
        accounts={accounts}
        cards={cards}
        isCorporate={isCorporate}
        onCardFunded={refreshCards}
        topUpCardId={topUpRequest}
        onTopUpHandled={() => setTopUpRequest(null)}
      />

      {/* 3 — What needs me right now? Approver only (section 12.3). */}
      {showApprovals && (
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-[15px] text-foreground">Requires your attention</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Transactions waiting on your decision
              </p>
            </div>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/approvals" />}>
              Open queue
              <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {APPROVAL_QUEUE.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link
                  href={
                    item.type === "payment"
                      ? `/approvals/payment/${item.id}`
                      : `/approvals/trade/${item.id}`
                  }
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] text-foreground">{item.description}</span>
                    <span className="mt-0.5 text-[12px] text-muted-foreground">
                      {item.submittedBy} · {item.submittedAt}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] text-foreground tabular">
                    <RevealingAmount amount={item.amount} currency={item.currency} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Holdings and market context, side by side — card management sits
          directly beside the account list rather than behind a settings menu. */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <AccountsPanel accounts={accounts} />
        <CardsPanel cards={cards} onTopUp={setTopUpRequest} onChanged={refreshCards} />
        <FxPulse />
      </section>

      {/* 4 — What has been happening? */}
      <InsightsSection profileKind={activeProfile.kind} />

      <ActivityFeed transactions={transactions} />

      {/* Corporate Admin only (section 12.3) */}
      {showAdmin && (
        <section className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Users size={17} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[14px] text-foreground">User administration</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Manage users, roles, limits and approval matrices
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/administration" />}>
            Open administration
            <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />
          </Button>
        </section>
      )}
    </div>
  );
}
