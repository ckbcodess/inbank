"use client";

/**
 * What the advance says about itself, for its pitch and its About page (the same split as an insurance plan: PATTERNS §24).
 * The benefits are stated from what the app does, and the figures come from the loan tables so a fact reads the same
 * everywhere (CONSTITUTION §1).
 */

import { formatMoney } from "@/lib/mock-data";
import {
  ADVANCE_SHARE,
  FACILITY_FEE_RATE,
  MIN_ADVANCE,
  MONTHLY_RATE,
  PROCESSING_FEE_RATE,
  pct,
} from "@/lib/loans";
import type { PlanHighlight } from "@/lib/product-highlights";


export function advanceHighlights(): PlanHighlight[] {
  return [
    { icon: "payout", label: `Up to ${pct(ADVANCE_SHARE)} of your pay, sent to your account` },
    { icon: "repay", label: "Repaid automatically on payday" },
    { icon: "saving", label: "Interest only for the days you borrow" },
  ];
}

/** The facts for the About page's list card: the costs, then what the limit is based on and the limit itself, last and larger (when the customer has one). */
export function advanceRows(limitNote: string, limit: number | null, showAmounts: boolean): Array<[React.ReactNode, React.ReactNode]> {
  const money = (n: number) => formatMoney(n, "GHS", showAmounts);
  return [
    ["Interest", `${pct(MONTHLY_RATE)} a month, for each day it is out`],
    ["Fees taken up front", pct(PROCESSING_FEE_RATE + FACILITY_FEE_RATE)],
    ["Smallest advance", money(MIN_ADVANCE)],
    ["Repaid", "Taken automatically on your next payday"],
    ...(limit !== null
      ? ([
          ["Based on", limitNote],
          ["Up to", <span key="limit" className="text-[20px]">{money(limit)}</span>],
        ] as Array<[React.ReactNode, React.ReactNode]>)
      : []),
  ];
}
