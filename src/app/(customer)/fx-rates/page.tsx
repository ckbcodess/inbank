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
import {
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  CurrencyLogo,
  CurrencyPairLogos,
  getCurrencyMeta,
} from "@/components/ui/currency-logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListSkeleton } from "@/components/states/ListStates";
import type { BaselineState } from "@/lib/states";
import { FX_PUBLISHED_AT, FX_RATES, formatDateTime } from "@/lib/mock-data";
import { formatValueForDisplay, FormatOn, ThousandStyle } from "numora";
import { TextMorph } from "torph/react";

const BASELINE_STATES: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

const BASELINE_LABEL: Record<BaselineState, string> = {
  loading: "Loading",
  empty: "Empty",
  populated: "Populated",
  error: "Error",
};

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "ZAR", name: "South African Rand" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "NGN", name: "Nigerian Naira" },
];

/** Rates carry more precision than money; minor pairs need more decimals. */
function formatRate(value: number): string {
  const decimals = value < 0.1 ? 6 : 4;
  return value.toFixed(decimals);
}

export default function FxRatesPage() {
  const [state, setState] = useState<BaselineState>("populated");
  const [fromCcy, setFromCcy] = useState("USD");
  const [toCcy, setToCcy] = useState("GHS");
  const [amount, setAmount] = useState("1,000");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const cleanVal = inputVal.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
    if (!cleanVal) {
      setAmount("");
      return;
    }
    const { formatted } = formatValueForDisplay(cleanVal, 2, {
      formatOn: FormatOn.Change,
      thousandSeparator: ",",
      thousandStyle: ThousandStyle.Thousand,
    });
    setAmount(formatted);
  };

  const handleSwap = () => {
    setFromCcy(toCcy);
    setToCcy(fromCcy);
  };

  const conversion = useMemo(() => {
    if (fromCcy === toCcy) {
      return { rate: 1, label: "Parity (1:1)" };
    }
    // Converting to GHS (customer sells foreign currency -> bank buys)
    if (toCcy === "GHS") {
      const r = FX_RATES.find((item) => item.base === fromCcy);
      if (r) return { rate: r.buy, label: "Bank buys" };
      return { rate: 1, label: "Published fixing" };
    }
    // Converting from GHS (customer buys foreign currency -> bank sells)
    if (fromCcy === "GHS") {
      const r = FX_RATES.find((item) => item.base === toCcy);
      if (r && r.sell > 0) return { rate: 1 / r.sell, label: "Bank sells" };
      return { rate: 1, label: "Published fixing" };
    }
    // Cross rate (from foreign -> GHS -> to foreign)
    const fromR = FX_RATES.find((item) => item.base === fromCcy)?.buy ?? 1;
    const toR = FX_RATES.find((item) => item.base === toCcy)?.sell ?? 1;
    const cross = toR > 0 ? fromR / toR : 1;
    return { rate: cross, label: "Indicative cross" };
  }, [fromCcy, toCcy]);

  const amountValue = Number(amount.replace(/,/g, ""));
  const amountValid = amount.trim() !== "" && !Number.isNaN(amountValue) && amountValue > 0;

  const converted = useMemo(() => {
    if (!amountValid) return null;
    return amountValue * conversion.rate;
  }, [amountValid, amountValue, conversion.rate]);

  const convertedFormatted =
    converted === null
      ? "—"
      : converted.toLocaleString("en-GH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

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
          {/* Indicative converter */}
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 w-full">
            <div className="w-full">
              <div className="mb-4">
                <h2 className="text-[15px] font-medium text-foreground">Currency converter</h2>
                <p className="text-[12.5px] text-muted-foreground">
                  Indicative calculator based on today&apos;s published rates.
                </p>
              </div>

              {/* Stacked Pills with Overlap Swap */}
              <div className="flex flex-col w-full">
                {/* Top Input Card */}
                <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 sm:px-5 sm:py-4 shadow-xs transition-colors focus-within:border-foreground/30">
                  <div className="relative flex-1 min-w-0 flex items-center pr-3">
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none whitespace-pre text-2xl sm:text-3xl font-bold tracking-tight tabular-nums select-none leading-none numorainput ${
                        amount ? "text-foreground" : "text-muted-foreground/30"
                      }`}
                    >
                      <TextMorph ease={{ stiffness: 400, damping: 30 }}>
                        {amount || "0.00"}
                      </TextMorph>
                    </span>
                    <input
                      id="fx-amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="0.00"
                      className="numorainput absolute inset-0 w-full h-full m-0 p-0 border-0 bg-transparent text-transparent placeholder-transparent outline-none focus:outline-none text-2xl sm:text-3xl font-bold tracking-tight tabular-nums leading-none caret-primary"
                    />
                  </div>

                  <Select value={fromCcy} onValueChange={(val) => val && setFromCcy(val)}>
                    <SelectTrigger
                      hideChevron
                      className="h-auto w-auto shrink-0 gap-2 border-0 bg-transparent p-1 shadow-none hover:bg-muted/70 focus-visible:ring-0 cursor-pointer rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <CurrencyLogo currency={fromCcy} size={24} />
                        <span className="text-[15px] font-bold text-foreground tabular tracking-tight">
                          {fromCcy}
                        </span>
                        <ChevronDown size={15} strokeWidth={2.2} className="text-muted-foreground" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="end">
                      {CURRENCIES.filter((c) => c.code !== toCcy).map((c) => (
                        <SelectItem key={c.code} value={c.code} label={c.code}>
                          <div className="flex items-center gap-2.5">
                            <CurrencyLogo currency={c.code} size={20} />
                            <span className="font-semibold tabular">{c.code}</span>
                            <span className="text-[12px] text-muted-foreground">· {c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Centered Overlap Swap Button with increased size and spacing */}
                <div className="z-10 -my-2 flex justify-center py-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleSwap}
                    aria-label="Swap currencies"
                    title="Swap currencies"
                    className="size-10 rounded-full border border-border bg-background shadow-xs hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  >
                    <ArrowUpDown size={19} strokeWidth={2.2} aria-hidden="true" />
                  </Button>
                </div>

                {/* Bottom Output Card */}
                <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 sm:px-5 sm:py-4 shadow-xs transition-colors">
                  <div className="min-w-0 flex-1 truncate text-2xl sm:text-3xl font-bold tabular tracking-tight text-foreground numorainput pr-3">
                    <TextMorph ease={{ stiffness: 400, damping: 30 }}>
                      {convertedFormatted}
                    </TextMorph>
                  </div>

                  <Select value={toCcy} onValueChange={(val) => val && setToCcy(val)}>
                    <SelectTrigger
                      hideChevron
                      className="h-auto w-auto shrink-0 gap-2 border-0 bg-transparent p-1 shadow-none hover:bg-muted/70 focus-visible:ring-0 cursor-pointer rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <CurrencyLogo currency={toCcy} size={24} />
                        <span className="text-[15px] font-bold text-foreground tabular tracking-tight">
                          {toCcy}
                        </span>
                        <ChevronDown size={15} strokeWidth={2.2} className="text-muted-foreground" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="end">
                      {CURRENCIES.filter((c) => c.code !== fromCcy).map((c) => (
                        <SelectItem key={c.code} value={c.code} label={c.code}>
                          <div className="flex items-center gap-2.5">
                            <CurrencyLogo currency={c.code} size={20} />
                            <span className="font-semibold tabular">{c.code}</span>
                            <span className="text-[12px] text-muted-foreground">· {c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="mt-3.5 text-center text-[12.5px] font-medium text-muted-foreground tabular">
                1 {fromCcy} = {formatRate(conversion.rate)} {toCcy}
              </p>
            </div>
          </section>

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
                    const meta = getCurrencyMeta(rate.base);
                    return (
                      <tr key={rate.pair} className="transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <CurrencyPairLogos base={rate.base} quote={rate.quote} size={28} />
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground tabular">
                                {rate.pair}
                              </span>
                              <span className="text-[11.5px] text-muted-foreground">
                                {meta.name} · {meta.country}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-foreground tabular font-medium">
                          {formatRate(rate.buy)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-foreground tabular font-medium">
                          {formatRate(rate.sell)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-muted-foreground tabular">
                          {formatRate(rate.mid)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`inline-flex items-center justify-end gap-1 tabular font-medium ${
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
        </>
      )}
    </div>
  );
}
