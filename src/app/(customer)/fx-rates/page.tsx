"use client";

/**
 * FX Rates — BRD FR-30.
 *
 * "The system shall provide customers with access to the Bank's published daily
 * foreign exchange (FX) rates." This is a published-rates board: reference
 * data, not a dealing screen. There is no booking or execution action here, and
 * the converter is labelled indicative for that reason.
 *
 * 13.9 classes static/reference screens as baseline-only, so this screen
 * carries Loading / Empty / Populated / Error and nothing more.
 */

import { useMemo, useState } from "react";
import { AlertCircle, ArrowUpDown, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListSkeleton } from "@/components/states/ListStates";
import type { BaselineState } from "@/lib/states";
import { FX_PUBLISHED_AT, FX_RATES, formatDateTime } from "@/lib/mock-data";

const BASELINE_STATES: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

const BASELINE_LABEL: Record<BaselineState, string> = {
  loading: "Loading",
  empty: "Empty",
  populated: "Populated",
  error: "Error",
};

/** Rates carry more precision than money; minor pairs need more decimals. */
function formatRate(value: number): string {
  const decimals = value < 0.1 ? 6 : 4;
  return value.toFixed(decimals);
}

export default function FxRatesPage() {
  const [state, setState] = useState<BaselineState>("populated");
  const [pair, setPair] = useState(FX_RATES[0]?.pair ?? "");
  const [amount, setAmount] = useState("1000");
  const [inverted, setInverted] = useState(false);

  const selected = useMemo(() => FX_RATES.find((r) => r.pair === pair) ?? FX_RATES[0], [pair]);

  const amountValue = Number(amount.replace(/,/g, ""));
  const amountValid = amount.trim() !== "" && !Number.isNaN(amountValue) && amountValue > 0;

  // Converting *to* the quote currency, the customer buys the quote at the
  // Bank's sell rate; the other direction uses the buy rate.
  const converted = useMemo(() => {
    if (!selected || !amountValid) return null;
    return inverted ? amountValue / selected.buy : amountValue * selected.sell;
  }, [selected, amountValid, amountValue, inverted]);

  const fromCcy = inverted ? selected?.quote : selected?.base;
  const toCcy = inverted ? selected?.base : selected?.quote;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="FX rates"
        description="The Bank's published daily foreign exchange rates. Indicative for reference — the rate applied to a transaction is confirmed at the point of execution."
        actions={
          <span className="text-[12px] text-muted-foreground">
            Published {formatDateTime(FX_PUBLISHED_AT)}
          </span>
        }
      />

      <StateSwitcher
        section="13.9"
        states={BASELINE_STATES}
        value={state}
        onChange={setState}
        labels={BASELINE_LABEL}
      />

      {state === "loading" && (
        <div className="rounded-2xl border border-border bg-card">
          <ListSkeleton rows={6} columns={5} />
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle size={20} strokeWidth={1.7} aria-hidden="true" />
          </div>
          <p className="text-[15px] text-foreground">Couldn&apos;t load today&apos;s rates</p>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            Rates are published each business morning. Showing nothing is safer than showing a stale
            rate — try again.
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => setState("populated")}>
            <RefreshCw size={14} strokeWidth={1.8} aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {state === "empty" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <TrendingUp size={20} strokeWidth={1.7} aria-hidden="true" />
          </div>
          <p className="text-[15px] text-foreground">No rates published yet today</p>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            Today&apos;s rates have not been published. Yesterday&apos;s rates are not shown here
            because they may no longer be accurate.
          </p>
        </div>
      )}

      {state === "populated" && (
        <>
          {/* Rates board */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3 font-normal">Currency pair</th>
                    <th className="px-4 py-3 text-right font-normal">Bank buys</th>
                    <th className="px-4 py-3 text-right font-normal">Bank sells</th>
                    <th className="px-4 py-3 text-right font-normal">Mid</th>
                    <th className="px-4 py-3 text-right font-normal">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {FX_RATES.map((rate) => {
                    const up = rate.changePct >= 0;
                    return (
                      <tr key={rate.pair} className="transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3.5">
                          <span className="text-foreground tabular">{rate.pair}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-foreground tabular">
                          {formatRate(rate.buy)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-foreground tabular">
                          {formatRate(rate.sell)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-muted-foreground tabular">
                          {formatRate(rate.mid)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`inline-flex items-center justify-end gap-1 tabular ${
                              up ? "text-[var(--pay-cash,#17c858)]" : "text-destructive"
                            }`}
                          >
                            {up ? (
                              <TrendingUp size={13} strokeWidth={2} aria-hidden="true" />
                            ) : (
                              <TrendingDown size={13} strokeWidth={2} aria-hidden="true" />
                            )}
                            {up ? "+" : ""}
                            {rate.changePct.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Indicative converter */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-[15px] text-foreground">Indicative converter</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Uses today&apos;s published rate. The rate applied to an actual transaction is confirmed
              when that transaction is executed and may differ.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fx-amount">Amount</Label>
                <div className="flex gap-2">
                  <Input
                    id="fx-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="tabular"
                    placeholder="0.00"
                  />
                  <span className="flex min-w-[62px] items-center justify-center rounded-lg border border-border bg-muted px-3 text-[13px] text-muted-foreground tabular">
                    {fromCcy ?? "—"}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setInverted((v) => !v)}
                aria-label="Swap direction"
                className="mb-0.5 hidden sm:flex"
              >
                <ArrowUpDown size={15} strokeWidth={1.9} aria-hidden="true" />
              </Button>

              <div className="flex flex-col gap-2">
                <Label htmlFor="fx-pair">Currency pair</Label>
                <Select
                  value={pair}
                  onValueChange={(val) => val && setPair(val)}
                >
                  <SelectTrigger id="fx-pair" className="h-10 w-full">
                    <SelectValue placeholder="Select pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {FX_RATES.map((r) => (
                      <SelectItem key={r.pair} value={r.pair}>
                        {r.pair}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setInverted((v) => !v)}
              className="mt-3 sm:hidden"
            >
              <ArrowUpDown size={14} strokeWidth={1.9} aria-hidden="true" />
              Swap direction
            </Button>

            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-5">
              <span className="text-[13px] text-muted-foreground">
                {amountValid && selected
                  ? `${amountValue.toLocaleString("en-GH")} ${fromCcy} at ${formatRate(
                      inverted ? selected.buy : selected.sell,
                    )}`
                  : "Enter an amount to convert"}
              </span>
              <span className="text-[22px] leading-tight text-foreground tabular">
                {converted === null
                  ? "—"
                  : `${converted.toLocaleString("en-GH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} ${toCcy}`}
              </span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
