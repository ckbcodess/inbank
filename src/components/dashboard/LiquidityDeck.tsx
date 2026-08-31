"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Eye,
  EyeOff,
  Send,
  Receipt,
  Smartphone,
  CreditCard,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { formatMoney, toLocalEquivalent, type Account } from "@/lib/mock-data";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

interface LiquidityDeckProps {
  accounts: Account[];
  isCorporate: boolean;
  onOpenTransfer: () => void;
  onOpenBillPay: () => void;
  onOpenTopUp: () => void;
}

const FX_RATES: Record<string, number> = {
  GHS: 1.0,
  USD: 0.065,
  EUR: 0.060,
  GBP: 0.051
};

export function LiquidityDeck({
  accounts,
  isCorporate,
  onOpenTransfer,
  onOpenBillPay,
  onOpenTopUp
}: LiquidityDeckProps) {
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();
  const [selectedCurrency, setSelectedCurrency] = useState<"GHS" | "USD" | "EUR" | "GBP">("GHS");

  // Sum up total available and ledger balance converted to GHS
  const totalAvailableGhs = accounts.reduce((sum, a) => {
    const val = toLocalEquivalent(a.available, a.currency) ?? a.available;
    return sum + val;
  }, 0);

  const totalBalanceGhs = accounts.reduce((sum, a) => {
    const val = toLocalEquivalent(a.balance, a.currency) ?? a.balance;
    return sum + val;
  }, 0);

  const heldGhs = totalBalanceGhs - totalAvailableGhs;

  // Convert to display currency
  const convertedAmount = totalAvailableGhs * FX_RATES[selectedCurrency];

  // Simulated cashflow metrics for the current cycle
  const monthlyInflow = isCorporate ? 1245000.00 : 18450.00;
  const monthlyOutflow = isCorporate ? 342100.00 : 4210.00;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/40 p-5 md:p-6 shadow-sm">
      {/* Decorative ambient subtle background glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6">
        {/* Top Header: Eyebrow + Currency Switcher + Eye Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet size={15} strokeWidth={2} />
            </span>
            <span className="text-[12.5px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Spendable Liquidity
            </span>
            <button
              type="button"
              onClick={toggleAmountVisibility}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={showAmounts ? "Hide balances" : "Show balances"}
            >
              {showAmounts ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          </div>

          {/* Currency Pill Switcher */}
          <div className="flex items-center gap-1 rounded-xl bg-muted/80 p-1 border border-border/60 text-[11px] font-mono">
            {(["GHS", "USD", "EUR", "GBP"] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setSelectedCurrency(curr)}
                className={`rounded-lg px-2 py-0.5 transition-all ${
                  selectedCurrency === curr
                    ? "bg-background text-foreground font-medium shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* Main Headline Balance */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[32px] md:text-[38px] font-medium text-foreground tracking-tight font-mono">
                {showAmounts ? (
                  <>
                    <span className="text-[20px] md:text-[24px] text-muted-foreground mr-1.5 font-normal">
                      {selectedCurrency}
                    </span>
                    {convertedAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </>
                ) : (
                  "••••••••"
                )}
              </span>
            </div>

            <p className="text-[12px] text-muted-foreground mt-1">
              Across <strong className="text-foreground">{accounts.length}</strong> active account{accounts.length === 1 ? "" : "s"}
              {heldGhs > 0.01 && (
                <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                  · ({formatMoney(heldGhs, "GHS", showAmounts)} in transit)
                </span>
              )}
            </p>
          </div>

          {/* Mini Cashflow Pill */}
          <div className="flex items-center gap-2 bg-muted/50 border border-border/70 rounded-2xl p-2.5 text-[12px] font-mono">
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-border">
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft size={12} strokeWidth={2.5} />
              </span>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">Inflow</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  +{formatMoney(monthlyInflow, "GHS", showAmounts)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pl-1">
              <span className="flex size-5 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ArrowUpRight size={12} strokeWidth={2.5} />
              </span>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">Outflow</span>
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  -{formatMoney(monthlyOutflow, "GHS", showAmounts)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 1-Tap Quick Action Icons Deck (Mobile-First Thumb Reachable) */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={onOpenTransfer}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-xs group cursor-pointer"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-white/20 text-white transition-transform group-hover:scale-110">
              <Send size={16} strokeWidth={2.2} />
            </span>
            <span className="text-[12px] font-medium">Send &amp; Pay</span>
          </button>

          <button
            type="button"
            onClick={onOpenBillPay}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-card border border-border hover:bg-muted/60 active:scale-[0.97] transition-all group cursor-pointer"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-transform group-hover:scale-110">
              <Receipt size={16} strokeWidth={2} />
            </span>
            <span className="text-[12px] font-medium text-foreground">Pay Bills</span>
          </button>

          <button
            type="button"
            onClick={onOpenBillPay}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-card border border-border hover:bg-muted/60 active:scale-[0.97] transition-all group cursor-pointer"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-110">
              <Smartphone size={16} strokeWidth={2} />
            </span>
            <span className="text-[12px] font-medium text-foreground">Airtime/Data</span>
          </button>

          <button
            type="button"
            onClick={onOpenTopUp}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-card border border-border hover:bg-muted/60 active:scale-[0.97] transition-all group cursor-pointer"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110">
              <CreditCard size={16} strokeWidth={2} />
            </span>
            <span className="text-[12px] font-medium text-foreground">Top Up Card</span>
          </button>

          {isCorporate ? (
            <Link
              href="/payments/bulk"
              className="hidden sm:flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-card border border-border hover:bg-muted/60 active:scale-[0.97] transition-all group"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 transition-transform group-hover:scale-110">
                <Layers size={16} strokeWidth={2} />
              </span>
              <span className="text-[12px] font-medium text-foreground">Bulk Payroll</span>
            </Link>
          ) : (
            <Link
              href="/payments"
              className="hidden sm:flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-card border border-border hover:bg-muted/60 active:scale-[0.97] transition-all group"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-transform group-hover:scale-110">
                <Sparkles size={16} strokeWidth={2} />
              </span>
              <span className="text-[12px] font-medium text-foreground">More Services</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
