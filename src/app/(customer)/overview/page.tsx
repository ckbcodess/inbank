"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { BaselineState } from "@/lib/states";
import { useSession } from "@/lib/session-store";
import { isApprover, isCorporateAdmin } from "@/lib/roles";
import {
  accountsForProfile,
  transactionsForProfile,
  APPROVAL_QUEUE,
} from "@/lib/mock-data";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";

import { TotalBalanceCard } from "@/components/dashboard/TotalBalanceCard";
import { SuggestedForYouCard } from "@/components/dashboard/SuggestedForYouCard";
import { DashboardCardsWidget } from "@/components/dashboard/DashboardCardsWidget";
import { ActionRequiredWidget } from "@/components/dashboard/ActionRequiredWidget";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { DashboardAnalyticsWidget } from "@/components/dashboard/DashboardAnalyticsWidget";
import { FxRatesWidget } from "@/components/dashboard/FxRatesWidget";
import { MobilePromoBanner } from "@/components/dashboard/MobilePromoBanner";
import { useState } from "react";

const BASELINE_STATES: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

export default function OverviewPage() {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  useAmountVisibility();

  const [pageState, setPageState] = useState<BaselineState>("populated");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  if (!actor || !activeProfile) return null;

  const accounts = accountsForProfile(activeProfile.kind);
  const allTransactions = transactionsForProfile(activeProfile.kind);
  const transactions = pageState === "empty" 
    ? [] 
    : selectedAccountId
    ? allTransactions.filter((t) => t.accountId === selectedAccountId)
    : allTransactions;

  const isCorporate = activeProfile.kind === "CORPORATE";
  const showApprovals = isCorporate && isApprover(actor.role);
  const showAdmin = isCorporate && isCorporateAdmin(actor.role);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* State Switcher for prototype testing */}
      <StateSwitcher section="13.9" states={BASELINE_STATES} value={pageState} onChange={setPageState} />

      {/* Greeting & Last Login Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[24px] font-medium tracking-tight text-foreground sm:text-[26px]">
              Good morning, {actor.name.split(" ")[0]} 👋🏾
            </h1>
            {actor.id === "u-joint" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3D6] border border-amber-500/30 px-3 py-0.5 text-[12px] font-semibold text-[#B27B00] dark:bg-amber-500/20 dark:text-amber-300">
                <Users size={13} />
                Joint Mandate · Both to sign
              </span>
            )}
          </div>
          <span className="text-[13.5px] text-muted-foreground">
            Last login: 21 August, 2026 8:43 am
          </span>
        </div>
      </div>

      {pageState === "error" && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
          <h3 className="text-[16px] font-medium">Unable to load dashboard data</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">Network request timed out while fetching core banking ledgers.</p>
          <button
            type="button"
            onClick={() => setPageState("populated")}
            className="mt-4 rounded-xl bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:bg-foreground/90 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {pageState === "loading" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-pulse">
          <div className="h-[280px] rounded-2xl bg-muted/60" />
          <div className="h-[280px] rounded-2xl bg-muted/60" />
          <div className="h-[280px] rounded-2xl bg-muted/60" />
          <div className="h-[280px] rounded-2xl bg-muted/60" />
        </div>
      )}

      {pageState !== "error" && pageState !== "loading" && (
        <>

      {/* Corporate Approvals Band (if applicable) */}
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

      {/* Row 1: Total Balance Card + Suggested For You Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <TotalBalanceCard
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
        />
        <SuggestedForYouCard />
      </div>

      {/* Row 2: Cards Widget + Action Required Widget */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <DashboardCardsWidget />
        <ActionRequiredWidget />
      </div>

      {/* Row 3: Recent Activity + Analytics Widget */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <RecentActivityWidget transactions={transactions} />
        <DashboardAnalyticsWidget />
      </div>

      {/* Row 4: FX Rates Widget + Mobile App Promo Banner */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <FxRatesWidget />
        <MobilePromoBanner />
      </div>

      {/* Corporate Admin shortcut (if applicable) */}
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
      </>
      )}
    </div>
  );
}
