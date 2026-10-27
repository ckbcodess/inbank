/**
 * A benefit in three words, for the top of a product page (Insure plan, Loans advance, Invest product): an icon, a label
 * and a short value. Server-safe: the icons live in the component (`ProductPitch.tsx`), this file only names them.
 */

export type HighlightIcon =
  | "payout"
  | "family"
  | "accident"
  | "school"
  | "disability"
  | "illness"
  | "repay"
  | "saving"
  | "rate"
  | "time"
  | "choice"
  | "exit"
  | "market"
  | "government";

export interface PlanHighlight {
  icon: HighlightIcon;
  label: string;
  value: string;
}

/** What a Treasury Bills customer gets, from what the app already does (no figures: those come from the offers). */
export const BILLS_HIGHLIGHTS: readonly PlanHighlight[] = [
  { icon: "government", label: "Lend to the government", value: "Government of Ghana Treasury Bills" },
  { icon: "market", label: "Buy at auction or from others", value: "New issues, or from other investors" },
  { icon: "exit", label: "Sell before it matures", value: "Through a rediscount, with the price shown first" },
];

/** What a Bonds customer gets. */
export const BONDS_HIGHLIGHTS: readonly PlanHighlight[] = [
  { icon: "government", label: "Lend to the government", value: "Government of Ghana Bonds" },
  { icon: "rate", label: "Interest every 6 months", value: "Paid as a coupon until it matures" },
  { icon: "exit", label: "Sell before it matures", value: "Through a rediscount, with the price shown first" },
];
