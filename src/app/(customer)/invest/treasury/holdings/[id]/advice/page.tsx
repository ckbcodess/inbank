"use client";

/**
 * Invest → one holding → its advice: what was bought, what it paid, and what it will pay. Reading your own advice
 * moves nothing, so unlike the Figma draft it isn't behind a PIN. Bonds list their coming interest payments;
 * bills have one payment, at maturity.
 */

import { SectionHeading } from "@/components/ui/section-heading";
import { ListCard } from "@/components/ui/list-card";
import { useParams } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { InvestmentDetailSkeleton } from "@/components/states/PageSkeletons";
import { FactsPanel, HoldingNotFound, TREASURY_HOME } from "@/components/invest/parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { findAccount, formatDate, formatMoney } from "@/lib/mock-data";
import {
  billInterest,
  couponPerPeriod,
  daysBetween,
  formatRate,
  instructionLabel,
  kindLabel,
  MOCK_TODAY,
  nextCouponDates,
  useHolding,
} from "@/lib/treasury";
import { sumMoney } from "@/lib/money";

export default function HoldingAdvicePage() {
  const { id } = useParams<{ id: string }>();
  const { hydrated, holding: h } = useHolding(id);
  const { showAmounts } = useAmountVisibility();

  if (!hydrated) return <InvestmentDetailSkeleton />;
  if (!h) return <HoldingNotFound title="Advice" />;

  const money = (n: number) => formatMoney(n, "GHS", showAmounts);
  const source = findAccount(h.fromAccountId);
  const daysLeft = Math.max(daysBetween(MOCK_TODAY, h.maturity), 0);
  const coupon = couponPerPeriod(h.face, h.rate);
  const coupons = h.kind === "bond" ? nextCouponDates(h.maturity) : [];

  const rows: Array<[string, React.ReactNode]> = [
    ["Face value", money(h.face)],
    [h.kind === "bill" ? "Interest rate" : "Coupon rate", formatRate(h.rate)],
    ...(h.kind === "bill"
      ? ([["Interest at maturity", money(billInterest(h.kind, h.face, h.cost))]] as Array<[string, React.ReactNode]>)
      : ([["Interest every 6 months", money(coupon)]] as Array<[string, React.ReactNode]>)),
    ["Matures", formatDate(h.maturity)],
    ["Time left", daysLeft === 1 ? "1 day" : `${daysLeft} days`],
    ["When it matures", instructionLabel(h.instruction)],
  ];

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader
        title="Advice"
        badge={<Badge variant="secondary">{kindLabel(h.kind)}</Badge>}
        backTo={{ href: `${TREASURY_HOME}/holdings/${h.id}`, label: h.title }}
      />

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2 px-1">
          <span className="text-[14px] text-muted-foreground">{h.title}</span>
          <span className="tabular text-[40px] leading-none tracking-[var(--ls-heading)] text-foreground">{money(h.cost)}</span>
          <span className="text-[14px] leading-relaxed text-muted-foreground">
            {source
              ? `Bought for you and paid from ${source.name} (${source.number}) on ${formatDate(h.boughtOn)}.`
              : `Bought for you and paid from your account on ${formatDate(h.boughtOn)}.`}
          </span>
        </section>

        <FactsPanel rows={rows} />

        <section className="flex flex-col gap-3">
          <SectionHeading title="What it pays" />
          <ListCard className="text-[14px]">
            {coupons.map((d, i) => (
              <li key={d} className="flex items-center justify-between gap-5 rounded-xl px-2 py-3">
                <span className="flex items-center gap-2 text-foreground">
                  <span className="tabular">{formatDate(d)}</span>
                  {i === 0 && <span className="text-[12px] text-muted-foreground">Next</span>}
                </span>
                <span className="tabular text-foreground">{money(coupon)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-5 rounded-xl px-2 py-3">
              <span className="tabular text-foreground">{formatDate(h.maturity)}</span>
              <span className="tabular text-foreground">{money(h.kind === "bond" ? sumMoney([h.face, coupon]) : h.face)}</span>
            </li>
          </ListCard>
          <p className="px-1 text-[12px] text-muted-foreground">
            {h.kind === "bond"
              ? "The last payment is the face value plus the final interest payment."
              : "A bill pays its face value once, at maturity."}
          </p>
        </section>
      </div>
    </div>
  );
}
