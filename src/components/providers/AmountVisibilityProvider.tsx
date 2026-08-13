"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Calligraph } from "calligraph";

const STORAGE_KEY = "nibs-show-amounts";

let globalShowAmounts = true;

export function getGlobalShowAmounts(): boolean {
  return globalShowAmounts;
}

export function setGlobalShowAmounts(show: boolean): void {
  globalShowAmounts = show;
}

/**
 * Helper to mask currency strings (e.g. "GH₵ 124,500.00" -> "GH₵ ••••••").
 * Only masks strings that explicitly contain a recognized currency symbol/code (GH₵, GHS, $, €, £, USD, EUR, GBP).
 * Non-monetary counts (e.g. "2", "0", "Awaiting 3 approvals") remain completely untouched.
 */
export function maskCurrencyString(val: string | number): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (!str) return str;

  // Regex requiring an explicit currency symbol or code before numbers
  const currencyRegex = /([+\-−]?\s*(?:GH₵|\$|€|£|GHS|USD|EUR|GBP)\s*[\d,]+(?:\.\d{1,4})?)/gi;

  if (!currencyRegex.test(str)) {
    // No currency symbol found — return original string unchanged
    return str;
  }

  return str.replace(currencyRegex, (match) => {
    const trimmed = match.trim();
    const sign = trimmed.startsWith("+") ? "+" : trimmed.startsWith("-") || trimmed.startsWith("−") ? "−" : "";
    const symMatch = match.match(/(GH₵|\$|€|£|GHS|USD|EUR|GBP)/i);
    const rawSym = symMatch ? symMatch[1] : "GH₵";
    const sym = rawSym.toUpperCase() === "GHS" ? "GH₵" : rawSym;
    return `${sign}${sym} ••••••`;
  });
}

/**
 * Helper to separate static currency prefix (USD, GH₵, $, etc.) from the animated numeric/bullet text.
 * Keeps currency codes like "USD" static so only digits and bullets animate.
 */
export function splitCurrencyAndAmount(
  amount?: number,
  currency = "GHS",
  value?: string,
  showAmounts = true
): { prefix: string; numericText: string } {
  if (amount !== undefined) {
    const currUpper = currency.toUpperCase();
    const symbol =
      currUpper === "USD"
        ? "USD "
        : currUpper === "EUR"
        ? "€"
        : currUpper === "GBP"
        ? "£"
        : currUpper === "GHS"
        ? "GH₵ "
        : `${currency} `;

    if (!showAmounts) {
      return { prefix: symbol, numericText: "••••••" };
    }
    const formatted = new Intl.NumberFormat("en-GH", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return { prefix: symbol, numericText: formatted };
  }

  if (value !== undefined) {
    const str = String(value);
    const currencyMatch = str.match(/^([+\-−]?\s*(?:GH₵|\$|€|£|GHS|USD|EUR|GBP)\s*)(.*)$/i);
    if (currencyMatch) {
      const rawPrefix = currencyMatch[1];
      const rawBody = currencyMatch[2];
      const trimmedPrefix = rawPrefix.trim();
      const sign = trimmedPrefix.startsWith("+") ? "+" : trimmedPrefix.startsWith("-") || trimmedPrefix.startsWith("−") ? "−" : "";
      const symMatch = rawPrefix.match(/(GH₵|\$|€|£|GHS|USD|EUR|GBP)/i);
      let sym = "";
      if (symMatch) {
        const u = symMatch[1].toUpperCase();
        sym = u === "GHS" ? "GH₵ " : u === "USD" ? "USD " : `${symMatch[1]} `;
      }
      const prefix = `${sign}${sym}`;
      const numericText = !showAmounts ? "••••••" : rawBody;
      return { prefix, numericText };
    }
    // No currency prefix match — return whole string as numericText
    return { prefix: "", numericText: !showAmounts ? maskCurrencyString(str) : str };
  }

  return { prefix: "", numericText: "" };
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

  // Memoised: an inline object here is a new value on every provider render,
  // which re-renders every consumer in the tree whether or not the flag
  // actually changed.
  const value = useMemo(
    () => ({
      showAmounts,
      toggleAmountVisibility,
      setShowAmounts,
      formatAmount,
      formatMoney: formatAmount,
    }),
    [showAmounts, toggleAmountVisibility, setShowAmounts, formatAmount],
  );

  return (
    <AmountVisibilityContext.Provider value={value}>
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

/**
 * RevealingAmount component with static currency prefix (USD, GH₵, etc.) and animated numbers/bullets.
 * The currency prefix remains static so only numeric digits and bullets animate upwards.
 */
export function RevealingAmount({
  amount,
  currency = "GHS",
  value,
  className = "",
}: {
  amount?: number;
  currency?: string;
  value?: string;
  className?: string;
}) {
  const { showAmounts } = useAmountVisibility();

  const { prefix, numericText } = splitCurrencyAndAmount(amount, currency, value, showAmounts);

  return (
    <span className={`inline-flex items-center select-none ${className}`}>
      {prefix && <span className="shrink-0 select-none font-normal">{prefix}</span>}
      <Calligraph
        variant="text"
        animation="snappy"
        trend={1}
        drift={{ x: 0, y: 24 }}
        autoSize
      >
        {numericText}
      </Calligraph>
    </span>
  );
}
