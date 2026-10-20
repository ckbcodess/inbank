"use client";

import React, { useEffect, useState } from "react";
import { RollingText } from "@kitlangton/rolling-number/react";
import "@kitlangton/rolling-number/styles.css";

const BALANCE_STORAGE_KEY = "nibs-show-balance";

/**
 * Mask an amount's digits: drop grouping commas and the decimal point, then
 * replace every digit with a centred asterisk (∗), so the mask has no
 * punctuation and its length follows the magnitude. Currency symbols and the
 * +/− sign stay in place.
 */
export function maskDigits(str: string): string {
  return str.replace(/[.,]/g, "").replace(/[0-9]/g, "∗");
}

/** Format an amount for display, with its digits masked when `show` is false. */
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

export function splitCurrencyAndAmount(
  amount?: number,
  currency = "GHS",
  value?: string,
  showAmounts = false
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


/**
 * Whether the dashboard balance is showing. It starts hidden, and the
 * customer's choice is remembered on this device. Only the balance figure on
 * Home reads it; nothing else in the app is tied to it.
 */
export function useBalanceVisibility(): [boolean, () => void] {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BALANCE_STORAGE_KEY);
      if (stored !== null) setShow(stored === "true");
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const toggle = () => {
    setShow((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(BALANCE_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  return [show, toggle];
}

/**
 * Amounts outside the dashboard balance always show. The hook keeps the
 * formatting call sites as they are.
 */
export function useAmountVisibility() {
  return {
    showAmounts: true,
    formatAmount: (amount: number, currency = "GHS") => formatMasked(amount, currency, true),
    formatMoney: (amount: number, currency = "GHS") => formatMasked(amount, currency, true),
  };
}

/**
 * RevealingAmount component with static currency prefix (USD, GHS, etc.) and animated numbers/asterisks.
 * The currency prefix remains static so only numeric digits and asterisks animate upwards.
 */
export function RevealingAmount({
  amount,
  currency = "GHS",
  value,
  className = "",
  showAmounts = true,
}: {
  amount?: number;
  currency?: string;
  value?: string;
  className?: string;
  showAmounts?: boolean;
}) {
  const { prefix, numericText } = splitCurrencyAndAmount(amount, currency, value, showAmounts);

  return (
    <span className={`inline-flex items-center select-none ${className}`}>
      {prefix && <span className="shrink-0 select-none font-normal mr-[0.3em]">{prefix.trim()}</span>}
      {/*
        The reel clips and softly fades its top and bottom edges. At a tight line height that
        cut through the comma's tail, so give the viewport room below the baseline (cancelled
        by the negative margin, so layout doesn't move) and keep the fade to a sliver.
      */}
      <RollingText
        text={numericText}
        transition="direct"
        duration={350}
        motionBlur
        className="-my-[0.15em] leading-[1.3]"
        style={{ "--rn-edge-fade": "0.05em" } as React.CSSProperties}
      />
    </span>
  );
}
