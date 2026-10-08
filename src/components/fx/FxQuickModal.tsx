"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ExternalLink,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatValueForDisplay, FormatOn, ThousandStyle } from "numora";
import { TextMorph } from "torph/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyLogo } from "@/components/ui/currency-logo";
import {
  BOG_WEIGHTED_MEDIAN_RATE,
  FX_PUBLISHED_AT,
  FX_RATES,
  FxRate,
} from "@/lib/mock-data";
import { useFxStore } from "@/lib/fx-presentation-store";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
const CONVERTER_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "GBP", name: "British Pound" },
  { code: "EUR", name: "Euro" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "ZAR", name: "South African Rand" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "DKK", name: "Danish Krone" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NGN", name: "Nigerian Naira" },
];

function formatFourDecimals(val: number): string {
  return val.toLocaleString("en-GH", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export function FxQuickModal() {
  const { isOpen, closeModal } = useFxStore();

  const [fromCcy, setFromCcy] = useState("USD");
  const [toCcy, setToCcy] = useState("GHS");
  const [amount, setAmount] = useState("1,000");
  const [searchQuery, setSearchQuery] = useState("");

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Defensive currency options: From and To cannot be identical
  const availableFromList = useMemo(
    () => CONVERTER_CURRENCIES.filter((c) => c.code !== toCcy),
    [toCcy],
  );
  const availableToList = useMemo(
    () => CONVERTER_CURRENCIES.filter((c) => c.code !== fromCcy),
    [fromCcy],
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
    if (!raw) {
      setAmount("");
      return;
    }
    const { formatted } = formatValueForDisplay(raw, 2, {
      formatOn: FormatOn.Change,
      thousandSeparator: ",",
      thousandStyle: ThousandStyle.Thousand,
    });
    setAmount(formatted);
  };

  const handleSwap = () => {
    const prevFrom = fromCcy;
    const prevTo = toCcy;
    setFromCcy(prevTo);
    setToCcy(prevFrom);
    setShowFromPicker(false);
    setShowToPicker(false);
  };

  const handleSelectRateRow = (rate: FxRate) => {
    // If user clicks a row in the BOG table:
    // If current target is GHS, set the source to this currency.
    // If current source is GHS, set the target to this currency.
    // Otherwise set source to this currency and target to GHS.
    if (fromCcy === rate.base) {
      // Toggle direction: GHS -> Base
      setFromCcy("GHS");
      setToCcy(rate.base);
    } else {
      setFromCcy(rate.base);
      if (toCcy === rate.base) {
        setToCcy("GHS");
      }
    }
    setShowFromPicker(false);
    setShowToPicker(false);
  };

  const conversion = useMemo(() => {
    const numericAmount = parseFloat(amount.replace(/,/g, "") || "0");
    if (!numericAmount) {
      return { output: "0.00", rate: 1, note: "Enter an amount" };
    }

    if (fromCcy === toCcy) {
      return {
        output: numericAmount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        rate: 1,
        note: "1:1 Parity",
      };
    }

    // From Foreign -> GHS: Bank BUYS foreign currency at BOG buy rate
    if (toCcy === "GHS") {
      const r = FX_RATES.find((item) => item.base === fromCcy);
      if (r) {
        const result = numericAmount * r.buy;
        return {
          output: result.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          rate: r.buy,
          note: `Bank Buying Rate: 1 ${fromCcy} = ${formatFourDecimals(r.buy)} GHS`,
        };
      }
    }

    // From GHS -> Foreign: Bank SELLS foreign currency at BOG sell rate
    if (fromCcy === "GHS") {
      const r = FX_RATES.find((item) => item.base === toCcy);
      if (r) {
        const result = numericAmount / r.sell;
        const decimals = result < 1 ? 4 : 2;
        return {
          output: result.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }),
          rate: 1 / r.sell,
          note: `Bank Selling Rate: 1 ${toCcy} = ${formatFourDecimals(r.sell)} GHS`,
        };
      }
    }

    // Cross pair: Foreign A -> Foreign B via GHS mid-rates
    const rFrom = FX_RATES.find((item) => item.base === fromCcy);
    const rTo = FX_RATES.find((item) => item.base === toCcy);
    if (rFrom && rTo) {
      const ghsMid = numericAmount * rFrom.mid;
      const result = ghsMid / rTo.mid;
      const crossRate = rFrom.mid / rTo.mid;
      const decimals = result < 1 ? 4 : 2;
      return {
        output: result.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }),
        rate: crossRate,
        note: `Cross Rate: 1 ${fromCcy} ≈ ${crossRate.toFixed(4)} ${toCcy}`,
      };
    }

    return { output: "0.00", rate: 1, note: "Rate unavailable" };
  }, [fromCcy, toCcy, amount]);

  const filteredRates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return FX_RATES;
    return FX_RATES.filter(
      (r) =>
        r.base.toLowerCase().includes(q) ||
        r.pair.toLowerCase().includes(q) ||
        (r.currencyName && r.currencyName.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const publishedDate = useMemo(() => {
    return new Date(FX_PUBLISHED_AT).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent
        size="xl"
        showCloseButton={true}
        className="p-0 sm:max-w-[880px] lg:max-w-[940px] max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/70 px-5 pt-4 pb-3.5 sm:px-6 gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-foreground">
              <ArrowLeftRight size={15} strokeWidth={2} />
            </span>
            <div>
              <DialogTitle className="text-[15px] font-medium tracking-[-0.01em] text-foreground">
                Foreign Exchange & Daily Interbank Rates
              </DialogTitle>
              <p className="text-[12px] text-muted-foreground">
                Official Bank of Ghana (BOG) market fixing · Published {publishedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pr-8 sm:pr-0">
            <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-[11.5px] tabular">
              <span className="text-muted-foreground">Day&apos;s Weighted Median:</span>
              <span className="font-medium text-foreground">
                {formatFourDecimals(BOG_WEIGHTED_MEDIAN_RATE)} GHS
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body: Side-by-Side Split on Desktop, Stacked on Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border/60 overflow-y-auto min-h-0 flex-1">
          {/* Left Column: Interactive Fast Currency Converter */}
          <div className="md:col-span-5 p-5 sm:p-6 flex flex-col justify-between gap-5 bg-card">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-medium tracking-[-0.01em] text-foreground">
                  Quick Converter
                </span>
                <span className="text-[11px] text-muted-foreground">Indicative fixing</span>
              </div>

              {/* Conversion Inputs */}
              <div className="relative flex flex-col gap-2">
                {/* "You Convert" Container */}
                <div className="flex flex-col rounded-xl border border-field-border bg-field p-3 transition-colors focus-within:border-field-border-focus focus-within:bg-field-focus">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>You convert</span>
                    <span className="tabular text-[10.5px]">Available balance</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="relative flex min-w-0 flex-1 items-center">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none whitespace-pre text-2xl font-medium tracking-tight tabular-nums select-none leading-none",
                          amount ? "text-foreground" : "text-muted-foreground/30",
                        )}
                      >
                        <TextMorph ease={{ stiffness: 400, damping: 30 }}>
                          {amount || "0.00"}
                        </TextMorph>
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="0.00"
                        aria-label="Amount to convert"
                        className="absolute inset-0 h-full w-full border-0 bg-transparent text-2xl font-medium tracking-tight tabular-nums text-transparent caret-foreground outline-none focus:outline-none"
                      />
                    </div>

                    {/* From Currency Picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFromPicker((v) => !v);
                          setShowToPicker(false);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-[13px] font-medium text-foreground shadow-xs transition-colors hover:bg-muted cursor-pointer"
                      >
                        <CurrencyLogo currency={fromCcy} size={19} />
                        <span>{fromCcy}</span>
                        <ChevronDown size={13} strokeWidth={2} className="text-muted-foreground" />
                      </button>

                      {showFromPicker && (
                        <div className="absolute right-0 top-full z-30 mt-1 max-h-52 w-48 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
                          {availableFromList.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setFromCcy(c.code);
                                setShowFromPicker(false);
                              }}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-muted cursor-pointer",
                                fromCcy === c.code ? "bg-muted text-foreground" : "text-muted-foreground",
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <CurrencyLogo currency={c.code} size={17} />
                                <span className="text-foreground">{c.code}</span>
                              </span>
                              {fromCcy === c.code && <Check size={13} className="text-foreground" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Floating Swap Button */}
                <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                  <button
                    type="button"
                    onClick={handleSwap}
                    aria-label="Swap currencies"
                    className="flex size-7.5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-transform hover:text-foreground active:scale-95 cursor-pointer"
                  >
                    <ArrowLeftRight size={13} strokeWidth={2} />
                  </button>
                </div>

                {/* "You Receive" Container */}
                <div className="flex flex-col rounded-xl border border-border/80 bg-muted/30 p-3 transition-colors">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>You receive (indicative)</span>
                    <span className="tabular text-[10.5px]">BOG rate applied</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center">
                      <span className="whitespace-pre text-2xl font-medium tracking-tight tabular-nums text-foreground select-none leading-none">
                        <TextMorph ease={{ stiffness: 400, damping: 30 }}>
                          {conversion.output}
                        </TextMorph>
                      </span>
                    </div>

                    {/* To Currency Picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowToPicker((v) => !v);
                          setShowFromPicker(false);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-[13px] font-medium text-foreground shadow-xs transition-colors hover:bg-muted cursor-pointer"
                      >
                        <CurrencyLogo currency={toCcy} size={19} />
                        <span>{toCcy}</span>
                        <ChevronDown size={13} strokeWidth={2} className="text-muted-foreground" />
                      </button>

                      {showToPicker && (
                        <div className="absolute right-0 top-full z-30 mt-1 max-h-52 w-48 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
                          {availableToList.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setToCcy(c.code);
                                setShowToPicker(false);
                              }}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-muted cursor-pointer",
                                toCcy === c.code ? "bg-muted text-foreground" : "text-muted-foreground",
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <CurrencyLogo currency={c.code} size={17} />
                                <span className="text-foreground">{c.code}</span>
                              </span>
                              {toCcy === c.code && <Check size={13} className="text-foreground" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate Detail */}
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-[11.5px] text-muted-foreground">
                <span className="tabular">{conversion.note}</span>
                <span className="tabular text-[10.5px]">Zero commission</span>
              </div>
            </div>

            {/* Transfer Action */}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/payments/send?amount=${encodeURIComponent(conversion.output.replace(/,/g, ""))}&currency=${encodeURIComponent(toCcy)}&returnUrl=/overview`}
                    onClick={() => closeModal()}
                  />
                }
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <span>Transfer {toCcy}</span>
                <ArrowUpRight size={15} strokeWidth={2} />
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Select any currency on the right to load its rate into the converter.
              </p>
            </div>
          </div>

          {/* Right Column: Bank of Ghana Official Daily Interbank Rates Table */}
          <div className="md:col-span-7 p-5 sm:p-6 flex flex-col gap-3.5 bg-muted/15 min-h-0">
            {/* Search and Table Header Bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search
                  size={14}
                  strokeWidth={2}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter currencies (e.g. USD, EUR, GBP)..."
                  className="pl-8 pr-3 focus:border-border"
                />
              </div>

              <span className="shrink-0 text-[11px] text-muted-foreground tabular">
                {filteredRates.length} pair{filteredRates.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Rates Table Container */}
            <div className="flex-1 overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs flex flex-col">
              {/* Fixed Header Row */}
              <div className="grid grid-cols-12 border-b border-border/70 bg-muted/40 px-3.5 py-2 text-[11px] font-medium text-muted-foreground tracking-[-0.01em] select-none shrink-0">
                <span className="col-span-4">Currency Pair</span>
                <span className="col-span-3 text-right">Buying</span>
                <span className="col-span-2 text-right">Selling</span>
                <span className="col-span-3 text-right">Mid Rate</span>
              </div>

              {/* Scrollable Rates List */}
              <div className="divide-y divide-border/40 overflow-y-auto max-h-[300px] md:max-h-[360px] flex-1">
                {filteredRates.length === 0 ? (
                  <div className="p-6 text-center text-[12px] text-muted-foreground">
                    No currency pairs matching &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  filteredRates.map((r) => {
                    const isSelected = fromCcy === r.base || toCcy === r.base;
                    return (
                      <button
                        key={r.pair}
                        type="button"
                        onClick={() => handleSelectRateRow(r)}
                        className={cn(
                          "grid grid-cols-12 w-full items-center px-3.5 py-2.5 text-[12.5px] text-left transition-colors cursor-pointer group",
                          isSelected
                            ? "bg-muted/70 ring-1 ring-inset ring-border/80"
                            : "hover:bg-muted/40",
                        )}
                        title={`Click to load ${r.base} into converter`}
                      >
                        {/* Currency & Pair */}
                        <div className="col-span-4 flex items-center gap-2 min-w-0 pr-1">
                          <CurrencyLogo currency={r.base} size={20} />
                          <div className="flex flex-col min-w-0 leading-tight">
                            <span className="font-medium text-foreground tracking-[-0.01em] tabular truncate">
                              {r.base}
                            </span>
                            <span className="text-[10.5px] text-muted-foreground truncate">
                              {r.currencyName ?? r.pair}
                            </span>
                          </div>
                        </div>

                        {/* Buying Rate */}
                        <div className="col-span-3 text-right tabular text-foreground text-[12px]">
                          {formatFourDecimals(r.buy)}
                        </div>

                        {/* Selling Rate */}
                        <div className="col-span-2 text-right tabular text-foreground text-[12px]">
                          {formatFourDecimals(r.sell)}
                        </div>

                        {/* Mid Rate & 24h Trend */}
                        <div className="col-span-3 flex flex-col items-end leading-tight pl-1">
                          <span className="tabular font-medium text-foreground text-[12px]">
                            {formatFourDecimals(r.mid)}
                          </span>
                          <span
                            className={cn(
                              "flex items-center gap-0.5 text-[10px] tabular",
                              r.changePct >= 0 ? "text-success" : "text-muted-foreground",
                            )}
                          >
                            {r.changePct >= 0 ? (
                              <TrendingUp size={10} strokeWidth={2.2} />
                            ) : (
                              <TrendingDown size={10} strokeWidth={2.2} />
                            )}
                            <span>
                              {r.changePct >= 0 ? "+" : ""}
                              {r.changePct.toFixed(2)}%
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* BOG Attestation & External Link Footer */}
            <div className="flex items-center justify-between pt-0.5 text-[11px] text-muted-foreground">
              <span>Source: Bank of Ghana Interbank Market</span>
              <a
                href="https://www.bog.gov.gh/treasury-and-the-markets/daily-interbank-fx-rates/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-foreground hover:underline"
              >
                <span>bog.gov.gh</span>
                <ExternalLink size={11} strokeWidth={2} />
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
