/**
 * Pay again, worked out from the ledger: who a customer pays again and again, ranked by how likely they are to pay
 * them now. Pure: give it transactions and today's date, get back suggestions.
 *
 * - **Who:** one entry per rail and recipient (the account, number or biller reference), never per amount, so a bill
 *   that changes every month is still one person.
 * - **Which payments count:** completed debits to a recipient the deep link can reopen (wallet, airtime, data, bank,
 *   bill). Scan & Pay, card, cash-out codes, own-account moves, bulk and trade are not repeatable this way.
 * - **Enough history:** at least MIN_PAYMENTS in the last WINDOW_DAYS. Less than that is a guess, so it is left out.
 * - **Rank:** each payment is worth less the older it is (it halves every HALF_LIFE_DAYS), so someone the customer
 *   stopped paying fades out. A recipient paid on a rhythm, whose next payment is about due, goes to the front.
 * - **Amount:** the usual one if it clearly dominates, otherwise the last one, and the entry says which.
 */

import type { Transaction } from "./mock-data";
import type { PayAgainPayee } from "./payees";

const WINDOW_DAYS = 90;
const MIN_PAYMENTS = 3;
const HALF_LIFE_DAYS = 60;
/** How many days before the usual gap runs out a payment counts as due, and how far past it still does. */
const DUE_EARLY_DAYS = 3;
const DUE_LATE_FACTOR = 1.5;
const DUE_BOOST = 2;
/** How far each gap may stray from the usual one (as a share of it) and still count as a rhythm. */
const RHYTHM_TOLERANCE = 0.15;
/** An amount that makes up at least this share of the payments is "the usual". */
const USUAL_SHARE = 0.5;
const MAX_SUGGESTIONS = 8;

type Rail = "wallet" | "bank" | "airtime" | "data" | "bill";

/** The rail a payment method reopens in Send & Pay, or null when it can't be repeated from a tile. */
const RAIL_FOR_METHOD: Record<string, Rail | undefined> = {
  momo: "wallet",
  airtime: "airtime",
  data: "data",
  gip: "bank",
  ach: "bank",
  bill: "bill",
};

const DETAIL_FOR_RAIL: Record<Rail, string> = {
  wallet: "Mobile money",
  airtime: "Airtime",
  data: "Data",
  bank: "Bank",
  bill: "Bill",
};

/** What a suggestion knows about why it is there. Every line is read from the payments, so every line is true. */
export interface PayAgainHistory {
  count: number;
  /** The date of the oldest payment counted, "2026-08-04". */
  since: string;
  lastAmount: number | null;
  /** The amount the tile fills in is the usual one, not just the last. */
  usualAmount: boolean;
  /** They pay about this often, in days, when the gaps are steady. */
  everyDays?: number;
  /** The day of the month they usually pay, when it is monthly and steady. */
  usualDay?: number;
  /** Their next payment is about due. */
  due: boolean;
}

const DAY = 86_400_000;
const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** The recipient as the flow can look it up: the digits of a phone number or account, or a biller reference as written. */
function identityOf(t: Transaction): string {
  const digits = t.counterpartyAccount.replace(/\D/g, "");
  return digits.length >= 8 && /^[\d\s]+$/.test(t.counterpartyAccount) ? digits : t.counterpartyAccount.trim();
}

function hrefFor(rail: Rail, t: Transaction, amount: number | null): string {
  const q = new URLSearchParams({ rail });
  if (rail === "bill") {
    q.set("recipient", t.counterparty);
    if (t.counterpartyAccount) q.set("ref", t.counterpartyAccount.trim());
  } else {
    // As written ("0244 123 456"): Send & Pay matches it against the people it already knows before it looks it up.
    q.set("recipient", t.counterpartyAccount.trim());
    if (rail === "bank" && t.counterpartyBank) q.set("bank", t.counterpartyBank);
  }
  // Data bundles are priced by the bundle, so they have no amount to repeat.
  if (amount !== null && rail !== "data") q.set("amount", String(amount));
  return `/payments/send?${q.toString()}`;
}

export function rankPayAgain(transactions: Transaction[], today: string): PayAgainPayee[] {
  const now = dayNumber(today);
  const groups = new Map<string, { rail: Rail; payments: Transaction[] }>();

  for (const t of transactions) {
    if (t.direction !== "debit" || t.state !== "completed" || t.kind !== "single") continue;
    const rail = t.paymentMethod ? RAIL_FOR_METHOD[t.paymentMethod] : undefined;
    if (!rail || /charges?$/i.test(t.counterparty)) continue;
    const age = now - dayNumber(t.date);
    if (age < 0 || age > WINDOW_DAYS) continue;
    const key = `${rail}:${identityOf(t).toLowerCase()}`;
    const group = groups.get(key) ?? { rail, payments: [] };
    group.payments.push(t);
    groups.set(key, group);
  }

  const ranked: Array<{ score: number; payee: PayAgainPayee }> = [];

  for (const { rail, payments } of groups.values()) {
    if (payments.length < MIN_PAYMENTS) continue;
    const sorted = [...payments].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];

    let score = sorted.reduce((sum, t) => sum + Math.pow(0.5, (now - dayNumber(t.date)) / HALF_LIFE_DAYS), 0);

    // A steady rhythm: the gaps between payments are all close to the usual gap.
    const gaps = sorted.slice(1).map((t, i) => dayNumber(t.date) - dayNumber(sorted[i].date));
    const usualGap = median(gaps);
    const steady = usualGap >= 5 && gaps.every((g) => Math.abs(g - usualGap) <= usualGap * RHYTHM_TOLERANCE);
    const sinceLast = now - dayNumber(last.date);
    const due = steady && sinceLast >= usualGap - DUE_EARLY_DAYS && sinceLast <= usualGap * DUE_LATE_FACTOR;
    if (due) score += DUE_BOOST;

    const counts = new Map<number, number>();
    for (const t of sorted) counts.set(t.amount, (counts.get(t.amount) ?? 0) + 1);
    const [topAmount, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    const usualAmount = topCount / sorted.length >= USUAL_SHARE;
    const amount = usualAmount ? topAmount : last.amount;

    const monthly = steady && usualGap >= 26 && usualGap <= 35;
    const history: PayAgainHistory = {
      count: sorted.length,
      since: sorted[0].date.slice(0, 10),
      lastAmount: amount,
      usualAmount,
      due,
      ...(steady ? { everyDays: Math.round(usualGap) } : {}),
      ...(monthly ? { usualDay: Math.round(median(sorted.map((t) => Number(t.date.slice(8, 10))))) } : {}),
    };

    ranked.push({
      score,
      payee: {
        name: last.counterparty,
        detail: rail === "bank" && last.counterpartyBank ? last.counterpartyBank : DETAIL_FOR_RAIL[rail],
        href: hrefFor(rail, last, amount),
        history,
      },
    });
  }

  return ranked
    .sort((a, b) => b.score - a.score || a.payee.name.localeCompare(b.payee.name))
    .slice(0, MAX_SUGGESTIONS)
    .map((r) => r.payee);
}
