"use client";

import { useState } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";

export function FxRatesWidget() {
  const [fromAmount, setFromAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("GHS");
  const [toCurrency, setToCurrency] = useState("USD");

  // Rate: 1 GHS = 0.083 USD (approx 1 USD = 12 GHS)
  const rate = fromCurrency === "GHS" && toCurrency === "USD" ? 0.083 : 12.04;

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const calculatedToAmount = (parseFloat(fromAmount || "0") * rate).toFixed(2);

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-medium text-foreground">FX Rates</h2>
        <span className="text-[12px] text-muted-foreground">Last updated: 3 mins ago</span>
      </div>

      {/* Converter Form */}
      <div className="mt-4 flex flex-col items-center gap-2">
        {/* From Input */}
        <div className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-2.5 transition-colors focus-within:border-primary">
          <input
            type="number"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            className="w-1/2 bg-transparent text-[17px] font-medium text-foreground outline-none tabular"
            placeholder="0.00"
          />
          <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[14px] font-medium text-foreground cursor-pointer hover:bg-muted/80">
            <span>{fromCurrency}</span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </div>
        </div>

        {/* Swap Button */}
        <button
          type="button"
          onClick={handleSwap}
          className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer shadow-xs"
          aria-label="Swap currencies"
        >
          <ArrowUpDown size={15} strokeWidth={1.8} />
        </button>

        {/* To Input */}
        <div className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-2.5 transition-colors">
          <span className="w-1/2 text-[17px] font-medium text-foreground tabular">
            {calculatedToAmount}
          </span>
          <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[14px] font-medium text-foreground cursor-pointer hover:bg-muted/80">
            <span>{toCurrency}</span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </div>
        </div>

        {/* Live Rate Label */}
        <div className="mt-2 text-center text-[12px] text-muted-foreground">
          1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
        </div>
      </div>
    </div>
  );
}
