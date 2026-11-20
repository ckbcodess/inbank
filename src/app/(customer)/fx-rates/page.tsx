"use client";

/**
 * Rates: three segments on one page.
 *
 * - FX Rates (BRD FR-30): the Bank's published daily FX rates. Reference data, not a dealing screen, so
 *   the converter is labelled indicative and carries no booking action.
 * - Card Rates: placeholder rows for design review. No card rate sheet exists in the mock data yet.
 * - Fixed Deposits: the tenures and rates the term-deposit flow already uses (`lib/term-deposits.ts`).
 *
 * The active segment lives in the URL (`?tab=card|deposits`) and changes with router.replace, so switching
 * never becomes a Back step (PATTERNS §4).
 */

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "skullet/react";
import { ChevronDown, TrendingDown, TrendingUp } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
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
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListErrorState, TrueEmptyState } from "@/components/states/ListStates";
import { DualAmountFields } from "@/components/payments/flows/shared";
import type { BaselineState } from "@/lib/states";
import { roundMoney } from "@/lib/money";
import { FX_PUBLISHED_AT, FX_RATES, formatDateTime, formatMoney } from "@/lib/mock-data";
import { MIN_DEPOSIT, TENURES, interestFor } from "@/lib/term-deposits";

const BASELINE_STATES: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

const BASELINE_LABEL: Record<BaselineState, string> = {
  loading: "Loading",
  empty: "Empty",
  populated: "Populated",
  error: "Error",
};

type RatesTab = "fx" | "card" | "deposits";

const TABS: readonly { value: RatesTab; label: string }[] = [
  { value: "fx", label: "FX Rates" },
  { value: "card", label: "Card Rates" },
  { value: "deposits", label: "Fixed Deposits" },
];

/**
 * Placeholder card rates for design review. Not from a bank rate sheet; the bank has not confirmed them.
 * Replace with the card pricing feed when it exists.
 */
const CARD_RATES: readonly { use: string; rate: string }[] = [
  { use: "Card purchase in a foreign currency", rate: "Mid rate + 2.5%" },
  { use: "Cash withdrawal abroad", rate: "Mid rate + 3.5%" },
  { use: "Cash withdrawal at another bank’s ATM in Ghana", rate: "GHS 5.00 per withdrawal" },
];

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

function parseTab(value: string | null): RatesTab {
  return value === "card" || value === "deposits" ? value : "fx";
}

function RatesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const selectTab = (next: RatesTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "fx") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Rates" />

      <SegmentedControl options={TABS} value={tab} onChange={selectTab} aria-label="Rates" />

      {tab === "fx" && <FxRatesTab />}
      {tab === "card" && <CardRatesTab />}
      {tab === "deposits" && <FixedDepositsTab />}
    </div>
  );
}

/** A currency code the customer can change, shown in the amount box where the code sits. */
function CurrencyPicker({
  value,
  other,
  onChange,
}: {
  value: string;
  other: string;
  onChange: (code: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(val) => val && onChange(val)}>
      <SelectTrigger hideChevron className="h-auto w-auto shrink-0 gap-2 border-0 bg-transparent p-1 hover:bg-muted/70 cursor-pointer">
        <div className="flex items-center gap-2">
          <CurrencyLogo currency={value} size={24} />
          <span className="text-h4 font-medium text-foreground tabular">{value}</span>
          <ChevronDown size={15} className="text-muted-foreground" />
        </div>
      </SelectTrigger>
      <SelectContent align="start">
        {CURRENCIES.filter((c) => c.code !== other).map((c) => (
          <SelectItem key={c.code} value={c.code} label={c.code}>
            <div className="flex items-center gap-2">
              <CurrencyLogo currency={c.code} size={20} />
              <span className="font-medium tabular">{c.code}</span>
              <span className="text-caption text-muted-foreground">· {c.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FxRatesTab() {
  const [state, setState] = useState<BaselineState>("populated");
  const [fromCcy, setFromCcy] = useState("USD");
  const [toCcy, setToCcy] = useState("GHS");
  // The box the customer typed in is the source; the other is worked out from it (as DualAmountFields does).
  const [entry, setEntry] = useState<{ side: "from" | "to"; value: string }>({ side: "from", value: "1000" });

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

  const rate = conversion.rate;
  const toNumber = (v: string) => Number(v.replace(/,/g, "")) || 0;
  const toAmount =
    entry.side === "to" ? entry.value : toNumber(entry.value) > 0 && rate > 0 ? String(roundMoney(toNumber(entry.value) * rate)) : "";

  const handleSwap = () => {
    // The amount the customer sees on the right becomes the left one, in the swapped currencies.
    setEntry({ side: "from", value: toAmount });
    setFromCcy(toCcy);
    setToCcy(fromCcy);
  };

  return (
    <div className="flex flex-col gap-6">
      <StateSwitcher section="13.9" states={BASELINE_STATES} value={state} onChange={setState} labels={BASELINE_LABEL} />

      {state === "error" && (
        <ListErrorState
          onRetry={() => setState("populated")}
          description="Rates are published each business morning. Showing nothing is safer than showing a stale rate — try again."
        />
      )}

      {state === "empty" && (
        <TrueEmptyState
          illustration="empty-rates"
          title="No rates published yet today"
          description="Yesterday's rates aren't shown; they may be out of date."
        />
      )}

      {(state === "populated" || state === "loading") && (
        <Skeleton loading={state === "loading"}>
          <div className="flex flex-col gap-6">
            {/* Indicative converter: the shared two-box amount field used for PAPSS and wire transfers */}
            <section className="flex w-full flex-col gap-2">
              <DualAmountFields
                ghs={entry.side === "from" ? entry.value : ""}
                foreign={toAmount}
                rate={rate}
                toForeign={(n) => roundMoney(n * rate)}
                toGhs={(n) => (rate > 0 ? roundMoney(n / rate) : 0)}
                sendCurrency={
                  <CurrencyPicker value={fromCcy} other={toCcy} onChange={setFromCcy} />
                }
                foreignCurrency={
                  <CurrencyPicker value={toCcy} other={fromCcy} onChange={setToCcy} />
                }
                labels={{ send: "From", get: "To" }}
                onChange={({ ghs, foreign }) =>
                  setEntry(ghs !== "" ? { side: "from", value: ghs } : { side: "to", value: foreign })
                }
                onSwap={handleSwap}
              />

              <div className="flex flex-col items-end gap-0.5 text-right">
                <p className="text-caption font-medium text-foreground tabular">
                  1 {fromCcy} = {formatRate(rate)} {toCcy}
                </p>
                <p className="text-caption text-muted-foreground">Indicative calculator based on today&apos;s published rates.</p>
              </div>
            </section>

            {/* Rates board */}
            <section className="flex flex-col gap-2">
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {/* Phone: one row per pair */}
                <div className="divide-y divide-border sm:hidden">
                  {FX_RATES.map((r) => {
                    const up = r.changePct >= 0;
                    const meta = getCurrencyMeta(r.base);
                    return (
                      <div key={r.pair} className="flex items-center justify-between gap-2 p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <CurrencyPairLogos base={r.base} quote={r.quote} size={26} />
                          <div className="flex min-w-0 flex-col">
                            <span className="text-body font-medium text-foreground tabular">{r.pair}</span>
                            <span className="truncate text-caption text-muted-foreground">{meta.name}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end">
                          <div className="flex items-center gap-2 text-body font-medium text-foreground tabular">
                            <span>Buy {formatRate(r.buy)}</span>
                            <span className="text-muted-foreground/50">·</span>
                            <span>Sell {formatRate(r.sell)}</span>
                          </div>
                          <span
                            className={`mt-0.5 inline-flex items-center gap-1 text-caption font-medium tabular ${
                              up ? "text-success-text" : "text-destructive"
                            }`}
                          >
                            {up ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
                            {up ? "+" : ""}
                            {r.changePct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tablet and up: the pair table */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[560px] text-body">
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
                      {FX_RATES.map((r) => {
                        const up = r.changePct >= 0;
                        const meta = getCurrencyMeta(r.base);
                        return (
                          <tr key={r.pair} className="transition-colors hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <CurrencyPairLogos base={r.base} quote={r.quote} size={28} />
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground tabular">{r.pair}</span>
                                  <span className="text-caption text-muted-foreground">
                                    {meta.name} · {meta.country}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-foreground tabular">{formatRate(r.buy)}</td>
                            <td className="px-4 py-3 text-right font-medium text-foreground tabular">{formatRate(r.sell)}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground tabular">{formatRate(r.mid)}</td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`inline-flex items-center justify-end gap-1 font-medium tabular ${
                                  up ? "text-success-text" : "text-destructive"
                                }`}
                              >
                                {up ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
                                {up ? "+" : ""}
                                {r.changePct.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-caption text-muted-foreground tabular">Published {formatDateTime(FX_PUBLISHED_AT)}</p>
            </section>
          </div>
        </Skeleton>
      )}
    </div>
  );
}

function CardRatesTab() {
  return (
    <section className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-normal">Card use</th>
              <th className="px-4 py-3 text-right font-normal">Rate or fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CARD_RATES.map((row) => (
              <tr key={row.use} className="transition-colors hover:bg-muted/50">
                <td className="px-4 py-3 text-foreground">{row.use}</td>
                <td className="px-4 py-3 text-right font-medium text-foreground tabular">{row.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-caption text-muted-foreground">Placeholder rates for design review. The bank has not confirmed them.</p>
    </section>
  );
}

function FixedDepositsTab() {
  return (
    <section className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-normal">Tenure</th>
              <th className="px-4 py-3 text-right font-normal">Rate per year</th>
              <th className="px-4 py-3 text-right font-normal">Interest on minimum deposit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {TENURES.map((t) => (
              <tr key={t.days} className="transition-colors hover:bg-muted/50">
                <td className="px-4 py-3 text-foreground tabular">{`${t.days} days`}</td>
                <td className="px-4 py-3 text-right font-medium text-foreground tabular">{`${t.rate.toFixed(1)}%`}</td>
                <td className="px-4 py-3 text-right text-foreground tabular">
                  {formatMoney(interestFor(MIN_DEPOSIT, t.rate, t.days))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-caption text-muted-foreground tabular">Minimum deposit {formatMoney(MIN_DEPOSIT)}</p>
    </section>
  );
}

export default function RatesPage() {
  // The search params need a Suspense boundary (see beneficiaries/page.tsx).
  return (
    <Suspense fallback={null}>
      <RatesContent />
    </Suspense>
  );
}
