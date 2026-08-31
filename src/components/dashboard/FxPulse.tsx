"use client";

/**
 * FR-30 — the Market Pulse.
 *
 * The bank's published daily rates, inline, with a converter attached. A rates
 * table on its own makes the customer do the arithmetic before they can decide
 * anything; letting them type an amount and read the result is the difference
 * between reference data and an answer.
 *
 * This calculates, it does not deal. The figure is indicative at today's
 * published rate and holds nothing — the actual rate is struck in the
 * transaction flow (S14), which the footer links into.
 *
 * Direction matters and is spelled out: the bank BUYS foreign currency from you
 * at the buy rate and SELLS it to you at the sell rate. Using a single mid rate
 * for both would quietly overstate what the customer receives.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpDown, TrendingDown, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FX_PUBLISHED_AT, FX_RATES, formatDateTime } from "@/lib/mock-data";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

type Direction = "to-ghs" | "from-ghs";

function format(amount: number, currency: string, showAmounts: boolean): string {
  if (!showAmounts) return `${currency} ••••••`;
  return `${currency} ${new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function FxPulse() {
  const { showAmounts } = useAmountVisibility();
  const [base, setBase] = useState(FX_RATES[0]?.base ?? "USD");
  const [direction, setDirection] = useState<Direction>("to-ghs");
  const [amount, setAmount] = useState("1000");

  const rate = FX_RATES.find((r) => r.base === base) ?? FX_RATES[0];
  const parsed = Number(amount.replace(/,/g, ""));
  const valid = Number.isFinite(parsed) && parsed > 0;

  // Buying FCY from the customer uses the buy rate; selling it to them uses
  // the sell rate. The spread is the bank's, and the customer should see which
  // side of it they are on.
  const appliedRate = direction === "to-ghs" ? rate.buy : rate.sell;
  const result = direction === "to-ghs" ? parsed * appliedRate : parsed / appliedRate;

  const fromCurrency = direction === "to-ghs" ? base : "GHS";
  const toCurrency = direction === "to-ghs" ? "GHS" : base;
  const RateTrend = rate.changePct >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[15px] text-foreground">Today&apos;s rates</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Published {formatDateTime(FX_PUBLISHED_AT)}
          </p>
        </div>
        <Link href="/fx-rates" className="text-[12px] text-primary underline-offset-4 hover:underline">
          All rates
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="fx-pair" className="text-[12px] text-muted-foreground">
              Currency
            </Label>
            <Select value={base} onValueChange={(value) => setBase(value ?? base)}>
              <SelectTrigger id="fx-pair" className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FX_RATES.map((r) => (
                  <SelectItem key={r.base} value={r.base}>
                    {r.pair}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="icon-sm"
            className="mb-0.5 size-9 shrink-0"
            onClick={() => setDirection((d) => (d === "to-ghs" ? "from-ghs" : "to-ghs"))}
            aria-label={
              direction === "to-ghs"
                ? `Switch to converting GHS into ${base}`
                : `Switch to converting ${base} into GHS`
            }
            title="Swap direction"
          >
            <ArrowUpDown size={15} strokeWidth={1.9} aria-hidden="true" />
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fx-amount" className="text-[12px] text-muted-foreground">
            Amount in {fromCurrency}
          </Label>
          <Input
            id="fx-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="tabular"
            placeholder="0.00"
          />
        </div>

        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-[12px] text-muted-foreground">You get approximately</p>
          <p className="mt-1 text-[19px] leading-tight text-foreground tabular">
            {valid ? format(result, toCurrency, showAmounts) : "—"}
          </p>
          <p className="mt-1.5 text-[11.5px] text-muted-foreground tabular">
            {direction === "to-ghs" ? "Bank buys" : "Bank sells"} at {appliedRate.toFixed(4)} ·{" "}
            <span className={rate.changePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
              <RateTrend size={11} strokeWidth={2} aria-hidden="true" className="inline align-[-1px]" />{" "}
              {rate.changePct >= 0 ? "+" : "−"}
              {Math.abs(rate.changePct).toFixed(2)}%
            </span>{" "}
            today
          </p>
        </div>

        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          Indicative only. The rate applied to a transfer is struck when you submit it.
        </p>

        <div className="mt-auto pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            nativeButton={false}
            render={<Link href="/payments/send?rail=papss" />}
          >
            Continue to transfer
            <ArrowRight size={14} strokeWidth={1.9} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
