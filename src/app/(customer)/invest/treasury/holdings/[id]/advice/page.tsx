"use client";

/**
 * Invest → one holding → its advice: what was bought, what it paid, and what it will pay. Reading your own advice
 * moves nothing, so unlike the Figma draft it isn't behind a PIN. Bonds list their coming interest payments;
 * bills have one payment, at maturity.
 */

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { escapeHtml, printDocument } from "@/lib/print-document";
import { SectionHeading } from "@/components/ui/section-heading";
import { ListCard } from "@/components/ui/list-card";
import { useParams } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
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
    ["Paid from", source ? `${source.name} · ${source.number}` : "Your account"],
    ["Face value", money(h.face)],
    [h.kind === "bill" ? "Interest rate" : "Coupon rate", formatRate(h.rate)],
    ...(h.kind === "bill"
      ? ([["Interest at maturity", money(billInterest(h.kind, h.face, h.cost))]] as Array<[string, React.ReactNode]>)
      : ([["Interest every 6 months", money(coupon)]] as Array<[string, React.ReactNode]>)),
    ["Matures", formatDate(h.maturity)],
    ["Time left", daysLeft === 1 ? "1 day" : `${daysLeft} days`],
    ["When it matures", instructionLabel(h.instruction)],
  ];

  // The advice as a document, for the customer who needs proof of the investment. It always carries the figures: asking
  // for a PDF is a deliberate act, unlike a screen that may be looked at over a shoulder.
  const savePdf = () => {
    const m = (n: number) => formatMoney(n, "GHS", true);
    const facts: Array<[string, string]> = [
      ["Investment", h.title],
      ["Amount paid", m(h.cost)],
      ["Bought on", formatDate(h.boughtOn)],
      ...(source ? ([["Paid from", `${source.name} (${source.number})`]] as Array<[string, string]>) : []),
      ["Face value", m(h.face)],
      [h.kind === "bill" ? "Interest rate" : "Coupon rate", formatRate(h.rate)],
      ...(h.kind === "bill"
        ? ([["Interest at maturity", m(billInterest(h.kind, h.face, h.cost))]] as Array<[string, string]>)
        : ([["Interest every 6 months", m(coupon)]] as Array<[string, string]>)),
      ["Matures", formatDate(h.maturity)],
      ["When it matures", instructionLabel(h.instruction)],
    ];
    const pays: Array<[string, string]> = [
      ...coupons.map((d): [string, string] => [formatDate(d), m(coupon)]),
      [formatDate(h.maturity), m(h.kind === "bond" ? sumMoney([h.face, coupon]) : h.face)],
    ];
    const rowsHtml = (rows: Array<[string, string]>) =>
      rows.map(([k, v]) => `<div class="row"><span class="label">${escapeHtml(k)}</span><span class="val">${escapeHtml(v)}</span></div>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>GCB-Advice-${escapeHtml(h.title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; margin: 40px auto; max-width: 480px; }
  .kind { font-size: 13px; color: #666; text-align: center; margin-bottom: 6px; }
  .amount { font-size: 32px; font-weight: 500; text-align: center; margin: 0 0 32px; }
  h2 { font-size: 15px; font-weight: 500; margin: 28px 0 4px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13.5px; }
  .label { color: #777; }
  .val { text-align: right; }
</style></head><body>
  <div class="kind">${escapeHtml(`Advice · ${h.title}`)}</div>
  <div class="amount">${escapeHtml(m(h.cost))}</div>
  ${rowsHtml(facts)}
  <h2>What it pays</h2>
  ${rowsHtml(pays)}
</body></html>`;
    if (!printDocument(html)) toast.error("Couldn't prepare the PDF");
  };

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader
        title="Advice"
        backTo={{ href: `${TREASURY_HOME}/holdings/${h.id}`, label: h.title }}
      />

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2 px-1">
          <span className="text-[14px] text-muted-foreground">You paid</span>
          <span className="tabular text-[40px] leading-none tracking-[var(--ls-heading)] text-foreground">{money(h.cost)}</span>
          <span className="text-[14px] text-muted-foreground">{`${h.title} · bought ${formatDate(h.boughtOn)}`}</span>
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

        <Button type="button" variant="outline" size="md" className="w-full" onClick={savePdf}>
          Download PDF
        </Button>
      </div>
    </div>
  );
}
