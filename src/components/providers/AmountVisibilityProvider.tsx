"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { RollingText } from "@kitlangton/rolling-number/react";
import "@kitlangton/rolling-number/styles.css";

const STORAGE_KEY = "nibs-show-amounts";

let globalShowAmounts = true;

export function getGlobalShowAmounts(): boolean {
  return globalShowAmounts;
}

export function setGlobalShowAmounts(show: boolean): void {
  globalShowAmounts = show;
}

/**
 * Helper to mask currency strings (e.g. "GHS 124,500.00" -> "GHS ••••••").
 * Only masks strings that explicitly contain a recognized currency symbol/code (GH₵, GHS, $, €, £, USD, EUR, GBP).
 * Non-monetary counts (e.g. "2", "0", "Awaiting 3 approvals") remain completely untouched.
 */
/**
 * Mask an amount for the hidden view: drop grouping commas and the decimal
 * point, then replace every digit with a bullet — so the mask is pure bullets
 * with no punctuation, and its length reflects the magnitude (a 7-figure amount
 * shows 7 bullets). Currency symbols and the +/− sign are left in place.
 */
export function maskDigits(str: string): string {
  return str.replace(/[.,]/g, "").replace(/[0-9]/g, "•");
}

/** Format an amount as a string, masking digits when amounts are hidden. */
function formatMasked(amount: number, currency: string, show: boolean): string {
  const formatted =
    currency.toUpperCase() === "GHS" || currency === "GH₵"
      ? `GHS ${new Intl.NumberFormat("en-GH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount)}`
      : new Intl.NumberFormat("en-GH", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
  return show ? formatted : maskDigits(formatted);
}

/** Fallback formatter for the hook used outside the provider. */
function fallbackFormat(amount: number, currency = "GHS"): string {
  return formatMasked(amount, currency, globalShowAmounts);
}

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

  // Mask only the digits inside a currency-prefixed amount; keep the symbol,
  // sign, commas and decimal point so width and structure are preserved.
  return str.replace(currencyRegex, (match) => maskDigits(match));
}

/**
 * Helper to separate static currency prefix (USD, GHS, $, etc.) from the animated numeric/bullet text.
 * Keeps currency codes like "USD" or "GHS" static so only digits and bullets animate.
 */
export function splitCurrencyAndAmount(
  amount?: number,
  currency = "GHS",
  value?: string,
  showAmounts = true
): { prefix: string; numericText: string } {
  if (amount !== undefined) {
    const currUpper = (currency || "").toUpperCase();
    const symbol =
      !currency
        ? ""
        : currUpper === "USD"
        ? "USD "
        : currUpper === "EUR"
        ? "€"
        : currUpper === "GBP"
        ? "£"
        : currUpper === "GHS" || currUpper === "GH₵"
        ? "GHS "
        : `${currency} `;

    const formatted = new Intl.NumberFormat("en-GH", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return { prefix: symbol, numericText: showAmounts ? formatted : maskDigits(formatted) };
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
        sym = u === "GHS" || symMatch[1] === "GH₵" ? "GHS " : u === "USD" ? "USD " : `${symMatch[1]} `;
      }
      const prefix = `${sign}${sym}`;
      const numericText = showAmounts ? rawBody : maskDigits(rawBody);
      return { prefix, numericText };
    }
    // No currency prefix match — return whole string as numericText
    return { prefix: "", numericText: showAmounts ? str : maskDigits(str) };
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
    (amount: number, currency = "GHS"): string => formatMasked(amount, currency, showAmounts),
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
      formatAmount: (amount: number, currency = "GHS") => fallbackFormat(amount, currency),
      formatMoney: (amount: number, currency = "GHS") => fallbackFormat(amount, currency),
    };
  }
  return context;
}

/**
 * RevealingAmount component with static currency prefix (USD, GHS, etc.) and animated numbers/bullets.
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
      {prefix && <span className="shrink-0 select-none font-normal mr-[0.3em]">{prefix.trim()}</span>}
      <RollingText
        text={numericText}
        transition="direct"
        duration={350}
        motionBlur
      />
    </span>
  );
}
