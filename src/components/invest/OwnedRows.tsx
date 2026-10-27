"use client";

/**
 * What the customer already holds, as it appears on a product page: "Your Term Deposits" on the Term Deposits page and
 * "Your Bills & Bonds" on the Treasury page, never mixed. Plus the securities account's own status (being set up, or ready
 * to carry on with the investment chosen before it was), which belongs to Treasury only. Each is a section that renders
 * nothing when there is nothing to say.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, PiggyBank, ShieldCheck } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { SecurityIcon, TREASURY_HOME } from "@/components/invest/parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { sumMoney } from "@/lib/money";
import { MOCK_TODAY, daysLeftLabel, useMyTreasury, useTreasury } from "@/lib/treasury";
import { termInterest, useMyDeposits } from "@/lib/term-deposits";
import { cn } from "@/lib/utils";

/** Whole days from the prototype's today to a date. */
export const daysUntil = (iso: string) => Math.round((Date.parse(iso) - Date.parse(MOCK_TODAY)) / 86_400_000);

const ROW =
  "flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3";

export function YourDeposits() {
  const { active: deposits } = useMyDeposits();
  const { showAmounts } = useAmountVisibility();
  if (deposits.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading title="Your Term Deposits" />
      <ListCard>
        {[...deposits]
          .sort((a, b) => a.maturity.localeCompare(b.maturity))
          .map((d) => (
            <li key={d.id}>
              <Link href={`/invest/term-deposits/${d.id}`} className={ROW}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                  <PiggyBank size={16} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] text-foreground">{`${d.tenureDays}-day Term Deposit`}</span>
                  <span className={cn("truncate text-[12px]", daysUntil(d.maturity) <= 7 ? "text-warning-text" : "text-muted-foreground")}>{`Matures ${formatDate(d.maturity)}`}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="tabular text-[14px] text-foreground">{formatMoney(sumMoney([d.principal, termInterest(d)]), "GHS", showAmounts)}</span>
                  <span className="tabular text-[12px] text-muted-foreground">{daysLeftLabel(d.maturity)}</span>
                </span>
                <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
      </ListCard>
    </section>
  );
}

export function YourTreasury({ kind }: { kind: "bill" | "bond" }) {
  const { holdings: allHoldings, orders: allOrders } = useMyTreasury();
  const { showAmounts } = useAmountVisibility();
  const holdings = allHoldings.filter((h) => h.kind === kind);
  const orders = allOrders.filter((o) => o.security.kind === kind);
  if (holdings.length === 0 && orders.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading title={kind === "bill" ? "Your Treasury Bills" : "Your Bonds"} />
      <ListCard>
        {[...holdings]
          .sort((a, b) => a.maturity.localeCompare(b.maturity))
          .map((h) => (
            <li key={h.id}>
              <Link href={`${TREASURY_HOME}/holdings/${h.id}`} className={ROW}>
                <SecurityIcon kind={h.kind} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] text-foreground">{h.title}</span>
                  <span className={cn("truncate text-[12px]", daysUntil(h.maturity) <= 7 ? "text-warning-text" : "text-muted-foreground")}>{`${h.kind === "bill" ? "Bill" : "Bond"} · Matures ${formatDate(h.maturity)}`}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="tabular text-[14px] text-foreground">{formatMoney(h.face, "GHS", showAmounts)}</span>
                  <span className="tabular text-[12px] text-muted-foreground">{h.status === "rediscount-pending" ? "Cash-in requested" : daysLeftLabel(h.maturity)}</span>
                </span>
                <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        {orders.map((o) => (
          <li key={o.id} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 sm:px-3">
            <SecurityIcon kind={o.security.kind} muted />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] text-muted-foreground">{o.security.title}</span>
              <span className="truncate text-[12px] text-muted-foreground">
                {o.security.settlement ? `Settles ${formatDate(o.security.settlement)}` : `Placed ${formatDate(o.placedOn)}`}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end">
              <span className="tabular text-[14px] text-muted-foreground">{formatMoney(o.face, "GHS", showAmounts)}</span>
              <span className="text-[12px] text-muted-foreground">Waiting to settle</span>
            </span>
          </li>
        ))}
      </ListCard>
    </section>
  );
}

/** The securities account, only while it has something to say: being set up, or ready to carry on with the choice made before. */
export function TreasuryAccountStatus() {
  const router = useRouter();
  const { ownerId, csd, intent } = useMyTreasury();
  const clearIntent = useTreasury((s) => s.clearIntent);

  if (csd?.status === "pending") {
    return (
      <section className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <ShieldCheck size={20} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-[15px] font-medium text-foreground">Securities account being set up</h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {intent
              ? `Your securities account for Treasury Bills & Bonds will be ready within 7 working days. Your choice, ${intent.label}, is saved. You can still open Term Deposits right away.`
              : `Your securities account for Treasury Bills & Bonds will be ready within 7 working days of ${formatDate(csd.requestedOn)}. You can open Term Deposits right away.`}
          </p>
        </div>
      </section>
    );
  }
  if (csd?.status === "active" && intent) {
    return (
      <section className="flex flex-col gap-2 px-1">
        <h2 className="text-[18px] tracking-[var(--ls-tight)] text-foreground">Your securities account is ready</h2>
        <p className="text-[14px] text-muted-foreground">{`Carry on with ${intent.label}.`}</p>
        <div>
          <Button
            type="button"
            onClick={() => {
              clearIntent(ownerId);
              router.push(intent.href);
            }}
          >
            Continue
          </Button>
        </div>
      </section>
    );
  }
  return null;
}
