"use client";

/**
 * Send & Pay — Standing Orders
 *
 * One calm answer up top (what leaves your accounts each month, and what goes next), then the
 * orders as quiet rows. Each row opens that order's own page, where pause and cancel live.
 */

import Link from "next/link";
import { ChevronRight, Plus, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrueEmptyState } from "@/components/states/ListStates";
import PageHeader from "@/components/layout/PageHeader";
import { STANDING_INSTRUCTIONS, findAccount, formatMoney, type StandingInstruction } from "@/lib/mock-data";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import { dayLabel, frequencyLabel, orderTitle, orderType, runsPerMonth } from "@/lib/standing-display";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { cn } from "@/lib/utils";

export default function StandingOrdersPage() {
  const { showAmounts } = useAmountVisibility();

  // Only the signed-in profile's orders (personal and business orders live on different accounts).
  const kind = useSession((s) => s.activeProfile?.kind) ?? "CORPORATE";
  const mine = STANDING_INSTRUCTIONS.filter((s) => (findAccount(s.accountId)?.profileKind ?? "CORPORATE") === kind);
  const active = mine.filter((s) => s.status === "Active").sort((a, b) => a.nextRun.localeCompare(b.nextRun));
  const paused = mine.filter((s) => s.status === "Paused").sort((a, b) => orderTitle(a).localeCompare(orderTitle(b)));

  // Paused orders don't leave the account, so they are not counted. GHS only until orders carry FX.
  const perMonth = active.reduce((sum, s) => sum + s.amount * runsPerMonth(s), 0);

  const isEmpty = active.length + paused.length === 0;
  const hydrated = useSessionHydrated();

  function renderRow(si: StandingInstruction) {
    const isPaused = si.status === "Paused";
    return (
      <li key={si.id}>
        <Link
          href={`/payments/standing/${si.id}`}
          className="flex w-full items-center gap-4 rounded-xl px-3 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-4"
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted",
              isPaused ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <Repeat size={16} strokeWidth={1.8} aria-hidden="true" />
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
          <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
        </Link>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Standing Orders"
        backTo={{ href: "/payments", label: "Payments" }}
        actions={
          <Button nativeButton={false} render={<Link href="/payments/standing/new" />}>
            <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
            New standing order
          </Button>
        }
      />

      {!hydrated ? null : isEmpty ? (
        <TrueEmptyState
          illustration="empty-standing"
          icon={<Repeat size={22} strokeWidth={1.8} />}
          title="No standing orders yet"
          description="Automate rent, susu contributions, family stipends, airtime, data or savings transfers."
          action={
            <Button size="sm" nativeButton={false} render={<Link href="/payments/standing/new" />}>
              <Plus size={14} strokeWidth={2} className="mr-1.5" />
              Create First Standing Order
            </Button>
          }
        />
      ) : (
        <>
          {/* The glance: one number. The list below is already in date order, so no "next up" line. */}
          <section className="flex flex-col gap-2 px-1">
            <span className="text-[13px] text-muted-foreground">Leaves your accounts each month</span>
            <span className="tabular text-[32px] leading-none tracking-[-0.01em] text-foreground">
              {formatMoney(Math.round(perMonth), "GHS", showAmounts)}
            </span>
            {active.length === 0 && <span className="text-[13px] text-muted-foreground">Everything is paused.</span>}
          </section>

          {active.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex min-h-8 items-center px-1">
                <h2 className="text-[16px] font-medium tracking-[-0.01em] text-foreground">Coming up</h2>
              </div>
              <ul className="flex flex-col gap-0.5 rounded-2xl border border-border bg-card p-2">
                {active.map(renderRow)}
              </ul>
            </section>
          )}

          {paused.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex min-h-8 items-center px-1">
                <h2 className="text-[16px] font-medium tracking-[-0.01em] text-foreground">Paused</h2>
              </div>
              <ul className="flex flex-col gap-0.5 rounded-2xl border border-border bg-card p-2">
                {paused.map(renderRow)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
