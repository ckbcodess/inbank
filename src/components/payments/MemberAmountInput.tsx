"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { MAX_AMOUNT } from "@/components/payments/flows/shared";

/** Keeps a typed amount to digits, one point and two decimals. Returns null when it would pass the ceiling, so the keystroke is ignored. */
export function cleanAmount(raw: string): string | null {
  const [whole, ...decimals] = raw.replace(/[^0-9.]/g, "").split(".");
  const value = decimals.length > 0 ? `${whole}.${decimals.join("").slice(0, 2)}` : whole;
  return Number(value) > MAX_AMOUNT ? null : value;
}

/** One member's amount. Plain digits while typing, the money format once they leave the box. */
export function MemberAmountInput({
  name,
  value,
  amount,
  onChange,
}: {
  name: string;
  value: string;
  amount: number;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Input
      inputMode="decimal"
      enterKeyHint="done"
      aria-label={`Amount for ${name}`}
      value={focused ? value : amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      onFocus={(e) => {
        setFocused(true);
        // The value swaps to plain digits on this render, so select after it lands: typing then replaces the amount.
        const el = e.currentTarget;
        requestAnimationFrame(() => el.select());
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const next = cleanAmount(e.target.value);
        if (next !== null) onChange(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className="tabular w-28 text-right"
    />
  );
}
