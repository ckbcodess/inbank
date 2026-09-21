/**
 * Dashboard insights derived from the real ledger.
 *
 * A money screen that invents numbers is dishonest, so both the spend breakdown
 * and the balance trend are computed straight from `TRANSACTIONS` /
 * `ACCOUNTS` — never hardcoded demo data. Colours come from the categorical
 * identity scale (`--cat-1..5`, `--cat-other`) in globals.css.
 */

import { roundMoney, sumMoney } from "./money";
import {
  accountsForProfile,
  transactionsForProfile,
  cardsForProfile,
  type Account,
  type Transaction,
} from "./mock-data";

export interface Slice {
  label: string;
  amount: number;
  /** Share of the whole, 0–1. */
  share: number;
  /** A `--cat-*` CSS variable reference, ready for `background`. */
  color: string;
}

const CAT_COLORS = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
  "var(--cat-5)",
] as const;
const OTHER_COLOR = "var(--cat-other)";

/** Rank amounts, cap at five named slices, fold the rest into "Other". */
function toSlices(entries: { label: string; amount: number }[]): {
  total: number;
  slices: Slice[];
} {
  const ranked = entries
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = sumMoney(ranked.map((r) => r.amount));
  if (total <= 0) return { total: 0, slices: [] };

  const named = ranked.slice(0, 5);
  const rest = ranked.slice(5);
  const slices: Slice[] = named.map((r, i) => ({
    label: r.label,
    amount: r.amount,
    share: r.amount / total,
    color: CAT_COLORS[i],
  }));
  if (rest.length > 0) {
    const otherAmount = sumMoney(rest.map((r) => r.amount));
    slices.push({
      label: "Other",
      amount: otherAmount,
      share: otherAmount / total,
      color: OTHER_COLOR,
    });
  }
  return { total, slices };
}

export interface SpendBreakdown {
  total: number;
  slices: Slice[];
  count: number;
}

/** Spend by category, from settled debits that carry a category. */
export function spendBreakdownForProfile(
  kind: "RETAIL" | "CORPORATE" = "RETAIL",
): SpendBreakdown {
  const debits = transactionsForProfile(kind).filter(
    (t) =>
      t.direction === "debit" && t.state !== "failed-single" && t.category,
  );
  const byCategory = new Map<string, number>();
  for (const t of debits) {
    const label = t.category as string;
    byCategory.set(
      label,
      sumMoney([byCategory.get(label) ?? 0, Math.abs(t.amount)]),
    );
  }
  const { total, slices } = toSlices(
    [...byCategory.entries()].map(([label, amount]) => ({ label, amount })),
  );
  return { total, slices, count: debits.length };
}

/** Account balances as allocation slices — for a net-worth style bar. */
export function accountAllocation(accounts: Account[]): {
  total: number;
  slices: Slice[];
} {
  return toSlices(
    accounts.map((a) => ({
      label: a.name.replace("Personal ", "").replace(" Account", ""),
      amount: a.balance ?? 0,
    })),
  );
}

export interface BalancePoint {
  date: string;
  value: number;
}

export interface BalanceTrend {
  points: BalancePoint[];
  current: number;
  delta: number;
  deltaPct: number;
  spanDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reconstruct a real end-of-day balance series by walking the settled ledger.
 * The current total is known; every completed transaction is a known signed
 * movement, so working forward from an implied opening balance reproduces the
 * true balance on each day money moved.
 */
export function balanceTrendForProfile(
  kind: "RETAIL" | "CORPORATE" = "RETAIL",
): BalanceTrend {
  const current = sumMoney(accountsForProfile(kind).map((a) => a.balance ?? 0));
  const completed = transactionsForProfile(kind)
    .filter((t) => t.state === "completed")
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const effect = (t: Transaction) =>
    t.direction === "credit" ? Math.abs(t.amount) : -Math.abs(t.amount);

  const totalEffect = sumMoney(completed.map(effect));
  let running = roundMoney(current - totalEffect);

  const byDate = new Map<string, number>();
  for (const t of completed) {
    running = roundMoney(running + effect(t));
    byDate.set(t.date, running);
  }

  const points: BalancePoint[] = [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length < 2) {
    return { points, current, delta: 0, deltaPct: 0, spanDays: 0 };
  }
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const delta = roundMoney(last - first);
  const deltaPct = first !== 0 ? delta / Math.abs(first) : 0;
  const spanDays = Math.max(
    1,
    Math.round(
      (new Date(points[points.length - 1].date).getTime() -
        new Date(points[0].date).getTime()) /
        DAY_MS,
    ),
  );
  return { points, current, delta, deltaPct, spanDays };
}

/* ── Needs attention ─────────────────────────────────────────────────────── */

export type AttentionTone = "destructive" | "warning" | "muted";

export interface AttentionItem {
  id: string;
  tone: AttentionTone;
  title: string;
  detail: string;
  href: string;
}

/** End-of-month date for an "MM/YY" expiry string. */
function parseExpiry(expiry: string): Date | null {
  const m = /^(\d{2})\/(\d{2})$/.exec(expiry.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return null;
  return new Date(year, month, 0); // day 0 of next month = last day of this one
}

/**
 * The high-priority items a customer should not miss — failed payments to
 * retry, blocked or soon-expiring cards, dormant accounts. Derived from real
 * data so the band only appears when something genuinely needs action. Capped so
 * it stays a glanceable strip, never a wall.
 */
export function attentionItemsForProfile(
  kind: "RETAIL" | "CORPORATE" = "RETAIL",
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const now = Date.now();
  const DAYS_90 = 90 * DAY_MS;

  for (const t of transactionsForProfile(kind)) {
    if (typeof t.state === "string" && t.state.startsWith("failed")) {
      items.push({
        id: `fail-${t.id}`,
        tone: "destructive",
        title: "Payment failed",
        detail: t.counterparty || t.description,
        href: `/transactions/${t.id}`,
      });
    }
  }

  for (const c of cardsForProfile(kind)) {
    if (c.status === "Blocked") {
      items.push({
        id: `card-blocked-${c.id}`,
        tone: "destructive",
        title: "Card blocked",
        detail: `${c.name} · ${c.maskedNumber}`,
        href: "/cards",
      });
    } else if (c.status === "Expired") {
      items.push({
        id: `card-exp-${c.id}`,
        tone: "warning",
        title: "Card expired",
        detail: `${c.name} · ${c.maskedNumber}`,
        href: "/cards",
      });
    } else {
      const exp = parseExpiry(c.expiry);
      if (exp && exp.getTime() > now && exp.getTime() - now < DAYS_90) {
        items.push({
          id: `card-expsoon-${c.id}`,
          tone: "warning",
          title: "Card expiring soon",
          detail: `${c.name} · expires ${c.expiry}`,
          href: "/cards",
        });
      }
    }
    if (c.deliveryStatus === "ready_for_pickup") {
      items.push({
        id: `card-pickup-${c.id}`,
        tone: "muted",
        title: "Card ready for pickup",
        detail: c.name,
        href: "/cards",
      });
    }
  }

  for (const a of accountsForProfile(kind)) {
    if (a.status === "Dormant") {
      items.push({
        id: `acct-dormant-${a.id}`,
        tone: "muted",
        title: "Account dormant",
        detail: a.name.replace("Personal ", "").replace(" Account", ""),
        href: `/accounts/${a.id}`,
      });
    }
  }

  return items.slice(0, 4);
}
