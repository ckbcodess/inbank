"use client";

/**
 * Invest → Term Deposit → one deposit. What it is worth, where it stands, then the three things you can do: change
 * what happens at maturity, take part of it out, or close it. Early redemption shows its cost on its own page.
 */

import { useParams } from "next/navigation";
import { CalendarClock, CircleMinus, XCircle } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { ActionTile } from "@/components/ui/action-tile";
import { DetailPageSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import { Button } from "@/components/ui/button";
import { FactsPanel, INVEST_HOME } from "@/components/invest/parts";
import { DEPOSITS_HOME } from "@/components/invest/term-deposit-parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { daysLeftLabel } from "@/lib/treasury";
import { depositInstructionLabel, paidAtMaturity, termInterest, useDeposit } from "@/lib/term-deposits";
import Link from "next/link";

export default function TermDepositDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hydrated, deposit: d } = useDeposit(id);
  const { showAmounts } = useAmountVisibility();
  const back = { href: INVEST_HOME, label: "Invest" };

  if (!hydrated) return <DetailPageSkeleton />;
  if (!d) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Term Deposit" backTo={back} />
        <TrueEmptyState
          icon={<XCircle size={22} strokeWidth={1.8} />}
          title="We couldn’t find this deposit"
          description="It may have been closed. Your other deposits are still on your Invest page."
          action={
            <Button nativeButton={false} render={<Link href={INVEST_HOME} />}>
              Back to Invest
            </Button>
          }
        />
      </div>
    );
  }

  const money = (n: number) => formatMoney(n, "GHS", showAmounts);
  const base = `${DEPOSITS_HOME}/${d.id}`;
  const open = d.status === "active";
  const rolls = d.instruction === "rollover";

  const rows: Array<[string, React.ReactNode]> = [
    ["Reference", d.reference],
    ["Interest rate", `${d.rate}% a year`],
    ["Deposit period", `${d.tenureDays} days`],
    ["Opened", formatDate(d.createdOn)],
    ["Matures", formatDate(d.maturity)],
    [rolls ? "Interest paid at maturity" : "You receive at maturity", money(open ? paidAtMaturity(d) : 0)],
    ["When it matures", depositInstructionLabel(d.instruction)],
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`${d.tenureDays}-day Term Deposit`} backTo={back} />
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8">
        <section className="flex flex-col gap-1.5 px-1">
          <span className="text-[13px] text-muted-foreground">Deposited</span>
          <span className="tabular text-[40px] leading-none tracking-[-0.02em] text-foreground">{money(open ? d.principal : 0)}</span>
          {open ? (
            <span className="tabular flex gap-1.5 text-[14px] text-muted-foreground">
              <span>{formatDate(d.maturity)}</span>
              <span aria-hidden="true">·</span>
              <span>{daysLeftLabel(d.maturity)}</span>
            </span>
          ) : (
            <span className="text-[14px] text-muted-foreground">{`Closed on ${formatDate(d.closedOn ?? d.maturity)}`}</span>
          )}
        </section>

        <FactsPanel rows={open ? rows : rows.slice(0, 5)} />

        {open && (
          <section className="flex flex-col gap-3">
            <ActionTile icon={CalendarClock} title="Change What Happens at Maturity" description="Choose what happens when it matures" href={`${base}/maturity`} />
            <ActionTile icon={CircleMinus} title="Redeem Part of the Deposit" description="Take some of it out early" href={`${base}/redeem`} />
            <ActionTile icon={XCircle} title="Close the Deposit" description="Take it all out and close it" href={`${base}/close`} />
            <p className="px-1 text-[12px] text-muted-foreground">
              {`It earns ${money(termInterest(d))} in interest if you leave it until maturity. Taking money out early gives up the interest earned so far.`}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
