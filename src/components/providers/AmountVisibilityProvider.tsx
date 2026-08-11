"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "nibs-show-amounts";

let globalShowAmounts = true;

export function getGlobalShowAmounts(): boolean {
  return globalShowAmounts;
}

export function setGlobalShowAmounts(show: boolean): void {
  globalShowAmounts = show;
}

/** Helper to mask currency strings (e.g. "GH₵ 124,500.00" -> "GH₵ ••••••") */
export function maskCurrencyString(val: string): string {
  if (!val) return val;
  // Matches currency formats like GH₵ 123.45, GHS 123.45, $123.45, €123.45, £123.45, etc.
  return val.replace(/(GH₵|\$|€|£|GHS|USD|EUR|GBP)\s*[\d,]+(?:\.\d{2})?/gi, (match, symbol) => {
    const sym = symbol.toUpperCase() === "GHS" ? "GH₵" : symbol;
    return `${sym} ••••••`;
  });
}

interface AmountVisibilityContextType {
  showAmounts: boolean;
  toggleAmountVisibility: () => void;
  setShowAmounts: (show: boolean) => void;
  formatAmount: (amount: number, currency?: string) => string;
  formatMoney: (amount: number, currency?: string) => string;
}

const AmountVisibilityContext = createContext<AmountVisibilityContextType | undefined>(undefined);

export function AmountVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [showAmounts, setShowAmountsState] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const val = stored === "true";
        setShowAmountsState(val);
        setGlobalShowAmounts(val);
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const setShowAmounts = useCallback((show: boolean) => {
    setShowAmountsState(show);
    setGlobalShowAmounts(show);
    try {
      localStorage.setItem(STORAGE_KEY, String(show));
    } catch {}
  }, []);

  const toggleAmountVisibility = useCallback(() => {
    setShowAmountsState((prev) => {
      const next = !prev;
      setGlobalShowAmounts(next);
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const formatAmount = useCallback(
    (amount: number, currency = "GHS"): string => {
      if (!showAmounts) {
        const symbol =
          currency.toUpperCase() === "USD"
            ? "$"
            : currency.toUpperCase() === "EUR"
            ? "€"
            : currency.toUpperCase() === "GBP"
            ? "£"
            : "GH₵";
        return `${symbol} ••••••`;
      }
      return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    },
    [showAmounts]
  );

  return (
    <AmountVisibilityContext.Provider
      value={{
        showAmounts,
        toggleAmountVisibility,
        setShowAmounts,
        formatAmount,
        formatMoney: formatAmount,
      }}
    >
      {children}
    </AmountVisibilityContext.Provider>
  );
}

export function useAmountVisibility() {
  const context = useContext(AmountVisibilityContext);
  if (!context) {
    return {
      showAmounts: globalShowAmounts,
      toggleAmountVisibility: () => {},
      setShowAmounts: () => {},
      formatAmount: (amount: number, currency = "GHS") => {
        if (!globalShowAmounts) {
          const symbol =
            currency.toUpperCase() === "USD"
              ? "$"
              : currency.toUpperCase() === "EUR"
              ? "€"
              : currency.toUpperCase() === "GBP"
              ? "£"
              : "GH₵";
          return `${symbol} ••••••`;
        }
        return new Intl.NumberFormat("en-GH", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      },
      formatMoney: (amount: number, currency = "GHS") => {
        if (!globalShowAmounts) {
          const symbol =
            currency.toUpperCase() === "USD"
              ? "$"
              : currency.toUpperCase() === "EUR"
              ? "€"
              : currency.toUpperCase() === "GBP"
              ? "£"
              : "GH₵";
          return `${symbol} ••••••`;
        }
        return new Intl.NumberFormat("en-GH", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      },
    };
  }
  return context;
}
