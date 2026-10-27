"use client";

/**
 * Invest → one holding. The number is what it pays at maturity; under it, when. Then the facts, and the three
 * things you can do about it: read the advice, change what happens at maturity, or cash it in early.
 */

import { useParams } from "next/navigation";
import { CalendarClock, FileText, Undo2 } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { ProductBanner } from "@/components/ui/product-banner";
import { holdingAlert } from "@/lib/product-alerts";
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
  // A holding is a balance, so it has the figure. A cash-in in progress is the first row; the figure goes quiet (CONSTITUTION §3).
  const rows: Array<[string, React.ReactNode]> = [
    ...(cashing && h.rediscount
      ? ([["Paid to your account", `${formatMoney(h.rediscount.receive, "GHS", showAmounts)} once it’s processed`]] as Array<[string, React.ReactNode]>)
      : []),
    ["Cost", formatMoney(h.cost, "GHS", showAmounts)],
    [h.kind === "bill" ? "Interest rate" : "Coupon rate", formatRate(h.rate)],
    ...(h.kind === "bond" ? ([["Interest every 6 months", formatMoney(couponPerPeriod(h.face, h.rate), "GHS", showAmounts)]] as Array<[string, React.ReactNode]>) : []),
    ["Bought", formatDate(h.boughtOn)],
    ["Matures", `${formatDate(h.maturity)} · ${daysLeftLabel(h.maturity)}`],
    ["When it matures", instructionLabel(h.instruction)],
    ["Reference", h.code],
    ...(csd ? ([["Securities account", csd.csid]] as Array<[string, React.ReactNode]>) : []),
  ];

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader
        title={h.title}
        badge={<Badge variant="secondary">{kindLabel(h.kind)}</Badge>}
        backTo={{ href: INVEST_HOME, label: "Invest" }}
      />
      <ProductBanner alert={holdingAlert(h)} />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1 px-1">
          <span className="text-[14px] text-muted-foreground">Paid at maturity</span>
          <span className={cn("tabular text-[32px] leading-none tracking-[var(--ls-heading)]", cashing ? "text-muted-foreground" : "text-foreground")}>
            {formatMoney(h.face, "GHS", showAmounts)}
          </span>
        </div>

        <FactsPanel rows={rows} />

        <section className="flex flex-col gap-2">
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
