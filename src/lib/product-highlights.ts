/**
 * A benefit in one short sentence, for a product page (Insure plan, Loans advance, Invest product): an icon and the
 * sentence. Server-safe: the icons live in the component (`ProductPitch.tsx`), this file only names them.
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

/** The label is the whole benefit, one line (designer, 2026-11-11). */
export interface PlanHighlight {
  icon: HighlightIcon;
  label: string;
}

/** What a Treasury Bills customer gets, from what the app already does (no figures: those come from the offers). */
export const TREASURY_HIGHLIGHTS: readonly PlanHighlight[] = [
  { icon: "government", label: "Lend to the Government of Ghana" },
  { icon: "market", label: "Buy new issues at auction or from other investors" },
  { icon: "exit", label: "Sell early through a rediscount, with the price shown first" },
];

export const BILLS_HIGHLIGHTS: readonly PlanHighlight[] = [
  { icon: "government", label: "Lend to the Government of Ghana" },
  { icon: "market", label: "Buy new issues at auction or from other investors" },
  { icon: "exit", label: "Sell early through a rediscount, with the price shown first" },
];

/** What a Bonds customer gets. */
export const BONDS_HIGHLIGHTS: readonly PlanHighlight[] = [
  { icon: "government", label: "Lend to the Government of Ghana" },
  { icon: "rate", label: "Interest paid every 6 months until it matures" },
  { icon: "exit", label: "Sell early through a rediscount, with the price shown first" },
];
