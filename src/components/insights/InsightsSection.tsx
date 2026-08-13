"use client";

/**
 * "Where your money goes" — the analytical half of the dashboard.
 *
 * Both controls sit in ONE row that scopes BOTH charts, rather than each card
 * carrying its own filter: two filters that can disagree produce two numbers
 * that can disagree, and the reader has no way to tell which window they are
 * looking at. Change the account or the period and every figure below moves
 * together.
 *
 * Monthly is the default. Daily is available but corporate cash flow is lumpy
 * day to day — a single GH₵ 512k receipt flattens every other bar — so the
 * grain that reads cleanest leads.
 */

import { useMemo, useState } from "react";
import { PieChart, TrendingDown, TrendingUp } from "lucide-react";
import {
  GRAIN_LABEL,
  cashflowSeries,
  grainCaption,
  insightTotals,
  spendByCategory,
  type Grain,
  type ProfileKind,
} from "@/lib/insights";
import { accountsForProfile } from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { CashflowChart, CASHFLOW_CONFIG } from "./CashflowChart";
import { SpendByCategory } from "./SpendByCategory";
import { exactMoney, formatSignedPercent } from "./chart-format";

const GRAINS: readonly Grain[] = ["daily", "weekly", "monthly"] as const;

/** Sentinel for "no account filter" — Select needs a non-empty value. */
const ALL_ACCOUNTS = "all";

function GrainSwitch({ value, onChange }: { value: Grain; onChange: (next: Grain) => void }) {
  return (
    <div
      role="group"
      aria-label="Period"
      className="inline-flex w-fit rounded-xl bg-muted p-1"
    >
      {GRAINS.map((grain) => (
        <button
          key={grain}
          type="button"
          onClick={() => onChange(grain)}
          aria-pressed={value === grain}
          className={`rounded-lg px-3 py-1.5 text-[12px] transition-all ${
            value === grain
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {GRAIN_LABEL[grain]}
        </button>
      ))}
    </div>
  );
}

/** Money-in / money-out readouts that double as the cash-flow chart's legend. */
function FlowTotal({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-[2px]"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className="text-[15px] leading-tight text-foreground tabular">{value}</span>
    </div>
  );
}

export function InsightsSection({ profileKind }: { profileKind: ProfileKind }) {
  const { showAmounts } = useAmountVisibility();
  const [grain, setGrain] = useState<Grain>("monthly");
  const [account, setAccount] = useState<string>(ALL_ACCOUNTS);

  const accounts = useMemo(() => accountsForProfile(profileKind), [profileKind]);
  const accountId = account === ALL_ACCOUNTS ? undefined : account;
  const scopeLabel =
    accountId ? (accounts.find((a) => a.id === accountId)?.name ?? "this account") : "all accounts";

  const series = useMemo(
    () => cashflowSeries(profileKind, grain, accountId),
    [profileKind, grain, accountId],
  );
  const slices = useMemo(
    () => spendByCategory(profileKind, grain, accountId),
    [profileKind, grain, accountId],
  );
  const totals = useMemo(
    () => insightTotals(profileKind, grain, accountId),
    [profileKind, grain, accountId],
  );

  const spendUp = totals.expenseChange !== null && totals.expenseChange > 0;
  const TrendIcon = spendUp ? TrendingUp : TrendingDown;
  const hasFlow = totals.income > 0 || totals.expense > 0;

  return (
    <section className="flex flex-col gap-3">
      {/* One filter row, above everything it scopes. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] text-foreground">Where your money goes</h2>
          {/* Say out loud how the figures are built. A reader who adds up the
              individual accounts and gets a different total than "all
              accounts" should find the reason here, not have to guess. */}
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {grainCaption(grain)} · {scopeLabel} · settled only,{" "}
            {accountId
              ? "own-account transfers included"
              : "own-account transfers excluded"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={account}
            onValueChange={(value) => setAccount(value ?? ALL_ACCOUNTS)}
          >
            <SelectTrigger className="h-9 w-[210px]" aria-label="Account">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL_ACCOUNTS}>All accounts</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <GrainSwitch value={grain} onChange={setGrain} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          {!hasFlow ? (
            // A dormant account genuinely has nothing to plot. Say so, rather
            // than drawing twelve empty bars and letting the reader wonder
            // whether the chart is broken.
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-1.5 text-center">
              <p className="text-[13px] text-foreground">No money moved in this period</p>
              <p className="max-w-xs text-[12px] text-muted-foreground">
                {scopeLabel} has no settled transactions across {grainCaption(grain).toLowerCase()}.
                Try a longer period or another account.
              </p>
            </div>
          ) : (
          <>
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <FlowTotal
                label={CASHFLOW_CONFIG.income.label}
                value={exactMoney(totals.income, showAmounts)}
                color={CASHFLOW_CONFIG.income.color}
              />
              <FlowTotal
                label={CASHFLOW_CONFIG.expense.label}
                value={exactMoney(totals.expense, showAmounts)}
                color={CASHFLOW_CONFIG.expense.color}
              />
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-muted-foreground">Net</span>
                <span className="text-[15px] leading-tight text-foreground tabular">
                  {exactMoney(totals.net, showAmounts)}
                </span>
              </div>
            </div>

            {totals.expenseChange !== null && (
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <TrendIcon size={14} strokeWidth={1.9} aria-hidden="true" />
                <span>
                  Spending {formatSignedPercent(totals.expenseChange)} vs{" "}
                  {totals.comparisonLabel}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4">
            <CashflowChart data={series} />
          </div>
          </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[14px] text-foreground">Spending by category</h3>
            <PieChart size={15} strokeWidth={1.8} aria-hidden="true" className="text-muted-foreground" />
          </div>
          <div className="mt-4">
            <SpendByCategory slices={slices} />
          </div>
        </div>
      </div>
    </section>
  );
}
