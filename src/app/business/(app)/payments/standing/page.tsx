"use client";

/**
 * Business Standing Orders — one calm answer up top (what leaves the company's accounts each month), then the
 * orders as quiet rows. Each row opens that order's own page, where pause and cancel live.
 */

import { SectionHeading } from "@/components/ui/section-heading";
import { ListCard } from "@/components/ui/list-card";
import Link from "next/link";
import { ChevronRight, Plus, Repeat } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { TrueEmptyState } from "@/components/states/ListStates";
import PageHeader from "@/components/layout/PageHeader";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { findBusinessAccount } from "@/lib/corporate/accounts";
import { STANDING_INSTRUCTIONS, formatMoney, type StandingInstruction } from "@/lib/mock-data";
import { useSessionHydrated } from "@/lib/session-store";
import { dayLabel, frequencyLabel, orderTitle, orderType, runsPerMonth } from "@/lib/standing-display";
import { cn } from "@/lib/utils";

export default function BusinessStandingOrdersPage() {
  const { showAmounts } = useAmountVisibility();
  const hydrated = useSessionHydrated();

  // Only orders on the company's own accounts.
  const mine = STANDING_INSTRUCTIONS.filter((s) => findBusinessAccount(s.accountId));
  const active = mine.filter((s) => s.status === "Active").sort((a, b) => a.nextRun.localeCompare(b.nextRun));
  const paused = mine.filter((s) => s.status === "Paused").sort((a, b) => orderTitle(a).localeCompare(orderTitle(b)));

  // Paused orders don't leave the account, so they are not counted.
  const perMonth = active.reduce((sum, s) => sum + s.amount * runsPerMonth(s), 0);
  const isEmpty = active.length + paused.length === 0;

  function renderRow(si: StandingInstruction) {
    const isPaused = si.status === "Paused";
    return (
      <li key={si.id}>
        <Link
          href={`/business/payments/standing/${si.id}`}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted",
              isPaused ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <Repeat size={16} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("truncate text-[14px]", isPaused ? "text-muted-foreground" : "text-foreground")}>{orderTitle(si)}</span>
            <span className="truncate text-[12px] text-muted-foreground">
              {orderType(si)} · {frequencyLabel(si)}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className={cn("tabular text-[14px]", isPaused ? "text-muted-foreground" : "text-foreground")}>
              {formatMoney(si.amount, si.currency, showAmounts)}
            </span>
            <span className="tabular text-[12px] text-muted-foreground">{isPaused ? "Paused" : dayLabel(si.nextRun)}</span>
          </span>
          <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
        </Link>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Standing Orders"
        backTo={{ href: "/business/payments", label: "Send & Pay" }}
        actions={
          <Button nativeButton={false} render={<Link href="/business/payments/standing/new" />}>
            <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
            New Standing Order
          </Button>
        }
      />

      {!hydrated ? null : isEmpty ? (
        <TrueEmptyState
          illustration="empty-standing"
          title="No standing orders yet"
          description="Automate rent and other payments that go out on the same day each period."
          action={
            <Button nativeButton={false} render={<Link href="/business/payments/standing/new" />}>
              <Plus size={14} strokeWidth={2} className="mr-2" />
              Create First Standing Order
            </Button>
          }
        />
      ) : (
        <>
          <section className="flex flex-col gap-2 px-1">
            <span className="text-[13px] text-muted-foreground">Leaves your accounts each month</span>
            <span className="tabular text-[32px] leading-none tracking-[var(--ls-tight)] text-foreground">
              {formatMoney(Math.round(perMonth), "GHS", showAmounts)}
            </span>
            {active.length === 0 && <span className="text-[13px] text-muted-foreground">Everything is paused.</span>}
          </section>

          {active.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionHeading title="Coming up" />
              <ListCard>{active.map(renderRow)}</ListCard>
            </section>
          )}

          {paused.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionHeading title="Paused" />
              <ListCard>{paused.map(renderRow)}</ListCard>
            </section>
          )}
        </>
      )}
    </div>
  );
}
