"use client";

/**
 * Invest → Term Deposit → one deposit. What it is worth, where it stands, then the three things you can do: change
 * what happens at maturity, take part of it out, or close it. Early redemption shows its cost on its own page.
 */

import { useParams } from "next/navigation";
import { CalendarClock, CircleMinus, XCircle } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { ActionTile } from "@/components/ui/action-tile";
import { InvestmentDetailSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import { Button } from "@/components/ui/button";
import { FactsPanel, INVEST_HOME } from "@/components/invest/parts";
import { DEPOSITS_HOME } from "@/components/invest/term-deposit-parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { daysLeftLabel } from "@/lib/treasury";
import { depositInstructionLabel, paidAtMaturity, useDeposit } from "@/lib/term-deposits";
import Link from "next/link";

export default function TermDepositDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hydrated, deposit: d } = useDeposit(id);
  const { showAmounts } = useAmountVisibility();
  const back = { href: INVEST_HOME, label: "Invest" };

  if (!hydrated) return <InvestmentDetailSkeleton />;
  if (!d) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
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

  // A live deposit is a balance, so it has the figure; a closed one has only rows (CONSTITUTION §3).
  const rows: Array<[string, React.ReactNode]> = [
    ...(open ? [] : ([["Closed on", formatDate(d.closedOn ?? d.maturity)], ["Deposited", money(d.principal)]] as Array<[string, React.ReactNode]>)),
    ["Reference", d.reference],
    ["Interest rate", `${d.rate}%`],
    ["Deposit period", `${d.tenureDays} days`],
    ["Opened", formatDate(d.createdOn)],
    ["Matures", open ? `${formatDate(d.maturity)} · ${daysLeftLabel(d.maturity)}` : formatDate(d.maturity)],
    ...(open
      ? ([
          [rolls ? "Interest paid at maturity" : "You receive at maturity", money(paidAtMaturity(d))],
          ["When it matures", depositInstructionLabel(d.instruction)],
        ] as Array<[string, React.ReactNode]>)
      : []),
  ];

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title={`${d.tenureDays}-day Term Deposit`} backTo={back} />
      <div className="flex flex-col gap-6">
        {open && (
          <div className="flex flex-col gap-1 px-1">
            <span className="text-[14px] text-muted-foreground">You deposited</span>
            <span className="tabular text-[32px] leading-none tracking-[var(--ls-heading)] text-foreground">{money(d.principal)}</span>
          </div>
        )}

        <FactsPanel rows={rows} />

        {open && (
          <section className="flex flex-col gap-2">
            <ActionTile icon={CalendarClock} title="Change What Happens at Maturity" description="Choose what happens when it matures" href={`${base}/maturity`} />
            <ActionTile icon={CircleMinus} title="Redeem Part of the Deposit" description="Take some of it out early. You give up the interest earned so far." href={`${base}/redeem`} />
            <ActionTile icon={XCircle} title="Close the Deposit" description="Take it all out and close it. You give up the interest earned so far." href={`${base}/close`} />
          </section>
        )}
      </div>
    </div>
  );
}
