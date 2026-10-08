"use client";

/**
 * Invest → one holding. The number is what it pays at maturity; under it, when. Then the facts, and the three
 * things you can do about it: read the advice, change what happens at maturity, or cash it in early.
 */

import { useParams } from "next/navigation";
import { CalendarClock, FileText, Undo2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { ActionTile } from "@/components/ui/action-tile";
import { InvestmentDetailSkeleton } from "@/components/states/PageSkeletons";
import { FactsPanel, HoldingNotFound, TREASURY_HOME, INVEST_HOME } from "@/components/invest/parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { couponPerPeriod, daysLeftLabel, formatRate, instructionLabel, kindLabel, useHolding } from "@/lib/treasury";
import { cn } from "@/lib/utils";

export default function HoldingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hydrated, holding: h, csd } = useHolding(id);
  const { showAmounts } = useAmountVisibility();

  if (!hydrated) return <InvestmentDetailSkeleton />;
  if (!h) return <HoldingNotFound />;

  const base = `${TREASURY_HOME}/holdings/${h.id}`;
  const cashing = h.status === "rediscount-pending";
  const rows: Array<[string, React.ReactNode]> = [
    ["Cost", formatMoney(h.cost, "GHS", showAmounts)],
    [h.kind === "bill" ? "Interest rate" : "Coupon rate", formatRate(h.rate)],
    ...(h.kind === "bond" ? ([["Interest every 6 months", formatMoney(couponPerPeriod(h.face, h.rate), "GHS", showAmounts)]] as Array<[string, React.ReactNode]>) : []),
    ["Bought", formatDate(h.boughtOn)],
    ["Matures", formatDate(h.maturity)],
    ["When it matures", instructionLabel(h.instruction)],
    ["Reference", h.code],
    ...(csd ? ([["Securities account", csd.csid]] as Array<[string, React.ReactNode]>) : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={h.title}
        badge={<Badge variant="secondary">{kindLabel(h.kind)}</Badge>}
        backTo={{ href: INVEST_HOME, label: "Invest" }}
      />

      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8">
        <section className="flex flex-col gap-1.5 px-1">
          <span className="text-[13px] text-muted-foreground">Face value, paid at maturity</span>
          <span className={cn("tabular text-[40px] leading-none tracking-[-0.02em]", cashing ? "text-muted-foreground" : "text-foreground")}>
            {formatMoney(h.face, "GHS", showAmounts)}
          </span>
          {cashing && h.rediscount ? (
            <span className="tabular text-[14px] text-muted-foreground">
              {`Cash-in requested: ${formatMoney(h.rediscount.receive, "GHS", showAmounts)} will be paid to your account once it’s processed.`}
            </span>
          ) : (
            <span className="tabular flex gap-1.5 text-[14px] text-muted-foreground">
              <span>{formatDate(h.maturity)}</span>
              <span aria-hidden="true">·</span>
              <span>{daysLeftLabel(h.maturity)}</span>
            </span>
          )}
        </section>

        <FactsPanel rows={rows} />

        <section className="flex flex-col gap-3">
          <ActionTile icon={FileText} title="Advice" description="Your investment confirmation" href={`${base}/advice`} />
          <ActionTile
            icon={CalendarClock}
            title="Change Maturity Instruction"
            description="Choose what happens when it matures"
            href={`${base}/maturity`}
            disabled={cashing}
          />
          <ActionTile icon={Undo2} title="Rediscount" description="Cash in all or part of it early" href={`${base}/rediscount`} disabled={cashing} />
          {cashing && (
            <p className="px-1 text-[12px] text-muted-foreground">
              A cash-in is on its way, so changes aren’t available until it’s processed.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
