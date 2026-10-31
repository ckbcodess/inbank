import { BILLERS, type Biller } from "@/lib/mock-data";

/**
 * How each biller behaves in Bills. Billers differ in two ways, and a screen should only ask what the biller can answer:
 *
 *  - `verify`: the biller can say who owns the reference, so the name is checked and shown before any money moves. Only
 *    billers we expect a direct link with have it. Everyone else is paid on the reference as typed, and nothing is shown
 *    as "verified" that wasn't.
 *  - `current`: the biller can say what is running or owed on the account (a TV package, an outstanding balance, a
 *    premium), so it is fetched once the reference is in and shown like a broadband package. The amount can still be edited.
 *
 * The lookups are stand-ins: the same reference always gives the same answer, so a demo reads the same each time.
 */

export interface CurrentCharge {
  /** What it is: "DStv Compact Plus", "Outstanding balance". */
  title: string;
  /** When it is due, already worded. */
  detail: string;
  amount: number;
}

export interface BillerRule {
  verify?: boolean;
  current?: {
    /** The label above the card. */
    heading: string;
    /** The words for putting the amount back after it was edited. */
    resetLabel: string;
    lookup: (reference: string) => CurrentCharge;
  };
}

const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

function dueIn(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `Due ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

function packageLookup(plans: { name: string; amount: number }[]) {
  return (reference: string): CurrentCharge => {
    const h = hash(reference);
    const plan = plans[h % plans.length];
    return { title: plan.name, detail: dueIn(3 + (h % 24)), amount: plan.amount };
  };
}

function balanceLookup(title: string, min: number, spread: number) {
  return (reference: string): CurrentCharge => {
    const h = hash(reference);
    return { title, detail: dueIn(5 + (h % 20)), amount: min + (h % spread) };
  };
}

const PACKAGE = { heading: "Your Active Package", resetLabel: "Use the package amount" };
const BALANCE = { heading: "Amount Due", resetLabel: "Use the amount due" };

const RULES: Record<string, BillerRule> = {
  // Electricity: the meter or account names its owner
  "bil-001": { verify: true },
  "bil-001b": { verify: true, current: { ...BALANCE, lookup: balanceLookup("Outstanding balance", 85, 320) } },
  "bil-001c": { verify: true },
  "bil-002": { verify: true, current: { ...BALANCE, lookup: balanceLookup("Outstanding balance", 40, 160) } },
  "bil-002b": { verify: true },
  // Tax
  "bil-004": { verify: true },
  // TV: the smartcard names its owner and knows its package
  "bil-006": {
    verify: true,
    current: {
      ...PACKAGE,
      lookup: packageLookup([
        { name: "DStv Premium", amount: 650 },
        { name: "DStv Compact Plus", amount: 380 },
        { name: "DStv Compact", amount: 260 },
        { name: "DStv Family", amount: 150 },
        { name: "DStv Access", amount: 80 },
      ]),
    },
  },
  "bil-007b": {
    verify: true,
    current: {
      ...PACKAGE,
      lookup: packageLookup([
        { name: "GOtv Supa Plus", amount: 175 },
        { name: "GOtv Supa", amount: 125 },
        { name: "GOtv Max", amount: 90 },
        { name: "GOtv Plus", amount: 55 },
      ]),
    },
  },
  "bil-007": {
    verify: true,
    current: {
      ...PACKAGE,
      lookup: packageLookup([
        { name: "StarTimes Super", amount: 130 },
        { name: "StarTimes Smart", amount: 75 },
        { name: "StarTimes Basic", amount: 45 },
      ]),
    },
  },
  // Insurance: the policy knows its premium
  "bil-005": { current: { heading: "Premium Due", resetLabel: "Use the premium due", lookup: balanceLookup("Premium", 120, 280) } },
  "bil-005b": { current: { heading: "Premium Due", resetLabel: "Use the premium due", lookup: balanceLookup("Premium", 150, 350) } },
};

export function billerRule(billerId?: string | null): BillerRule | undefined {
  return billerId ? RULES[billerId] : undefined;
}

/** Whether the biller's name check applies. */
export function needsNameCheck(billerId?: string | null): boolean {
  return Boolean(billerRule(billerId)?.verify);
}

export function findBiller(billerId?: string | null): Biller | undefined {
  return BILLERS.find((b) => b.id === billerId);
}
