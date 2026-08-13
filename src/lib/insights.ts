/**
 * Dashboard insights — cash flow over time and spend by category.
 *
 * Why this module exists rather than reading TRANSACTIONS directly: the curated
 * ledger is a hand-built fixture for the state model (section 13) — thirteen
 * records across eight days. That is enough to demonstrate a transaction list,
 * but not a trend. A "monthly" view over it would draw a single bar.
 *
 * So the ledger below is twelve months deep: generated background activity over
 * the whole window, with the fixture's own SETTLED records laid on top, so the
 * days Recent activity shows also register in the daily chart. Only settled
 * money moves — pending, failed and reversed records are instructions, not cash
 * flow, and counting them would overstate spend.
 *
 * Generation is deterministic: a seeded PRNG and a fixed `TODAY` anchor, so the
 * server and the client compute identical numbers and the page hydrates cleanly.
 * All date arithmetic is UTC-based for the same reason — a local-timezone Date
 * would bucket differently on a server in another zone.
 */

import {
  CORPORATE_CATEGORIES,
  RETAIL_CATEGORIES,
  TRANSACTIONS,
  accountsForProfile,
  type SpendCategory,
} from "./mock-data";

export type ProfileKind = "RETAIL" | "CORPORATE";

/** Time grain the dashboard is read at. Each grain carries its own window. */
export type Grain = "daily" | "weekly" | "monthly";

export const GRAIN_LABEL: Record<Grain, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** How far back each grain looks, and how many buckets it draws. */
const GRAIN_WINDOW: Record<Grain, { buckets: number; caption: string }> = {
  daily: { buckets: 14, caption: "Last 14 days" },
  weekly: { buckets: 12, caption: "Last 12 weeks" },
  monthly: { buckets: 12, caption: "Last 12 months" },
};

export function grainCaption(grain: Grain): string {
  return GRAIN_WINDOW[grain].caption;
}

/** The app's fixed "now" — the curated fixtures run up to this date. */
const TODAY = "2026-08-11";

/**
 * Twice the longest chart window (12 months), so every grain can be compared
 * against a preceding window of the same length rather than against a partial
 * bucket. Only the most recent 12 months are ever plotted.
 */
const HISTORY_MONTHS = 24;

/* ── UTC date helpers ──────────────────────────────────────────────────────── */

function fromKey(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

function addMonths(d: Date, n: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + n);
  return next;
}

/** Monday-anchored week start, so weekly buckets line up with banking weeks. */
function startOfWeek(d: Date): Date {
  const offset = (d.getUTCDay() + 6) % 7;
  return addDays(d, -offset);
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* ── Deterministic PRNG ────────────────────────────────────────────────────── */

/** mulberry32 — small, fast, and stable across runtimes. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Ledger ────────────────────────────────────────────────────────────────── */

export interface LedgerEntry {
  date: string;
  direction: "credit" | "debit";
  amount: number;
  /** Debits only — a credit is income, not a spend line. */
  category: SpendCategory | null;
  /** Which account the money moved on, so insights can be scoped to one. */
  accountId: string;
  /**
   * A leg of a transfer between two of the customer's own accounts. Real for
   * one account (the payroll account genuinely receives its funding), but not
   * income or spend for the relationship as a whole — so these count when the
   * view is scoped to one account and are excluded from "All accounts", where
   * counting both legs would inflate money in AND money out by the same amount.
   */
  internal?: boolean;
}

/**
 * A category's shape over time. `perMonth` is the expected number of debits;
 * `dayOfMonth` pins the fixed commitments (payroll, rent) to a real date so the
 * daily view shows the spikes a treasurer would expect.
 */
interface CategoryModel {
  category: SpendCategory;
  perMonth: number;
  min: number;
  max: number;
  dayOfMonth?: number;
}

/** Credits are modelled as streams too — a salary is one stream, ad-hoc
 *  receipts another, so retail income is not a flat line every month. */
interface IncomeModel {
  perMonth: number;
  min: number;
  max: number;
  dayOfMonth?: number;
  /** Where the credit lands. Defaults to the profile's primary account. */
  accountId?: string;
}

/** A recurring movement between two of the customer's own accounts. */
interface TransferModel {
  from: string;
  to: string;
  perMonth: number;
  min: number;
  max: number;
  dayOfMonth?: number;
}

interface ProfileModel {
  seed: number;
  categories: CategoryModel[];
  income: IncomeModel[];
  /** The operating account most activity runs through. */
  primaryAccount: string;
  /** Categories that settle somewhere other than the primary account. */
  categoryAccounts?: Partial<Record<SpendCategory, string>>;
  transfers?: TransferModel[];
}

const MODELS: Record<ProfileKind, ProfileModel> = {
  CORPORATE: {
    seed: 0x1b_a5e1,
    categories: [
      { category: "Payroll", perMonth: 1, min: 268_000, max: 302_000, dayOfMonth: 25 },
      { category: "Suppliers", perMonth: 16, min: 4_200, max: 46_000 },
      { category: "Trade & imports", perMonth: 2, min: 42_000, max: 128_000 },
      { category: "Rent & facilities", perMonth: 1, min: 17_800, max: 18_900, dayOfMonth: 1 },
      { category: "Utilities", perMonth: 4, min: 900, max: 4_800 },
      { category: "Travel", perMonth: 6, min: 1_100, max: 9_600 },
      { category: "Taxes & levies", perMonth: 1, min: 22_000, max: 46_000, dayOfMonth: 15 },
      { category: "Bank charges", perMonth: 10, min: 25, max: 480 },
    ],
    // Spread across more, smaller receipts than a handful of large ones, so the
    // daily view is not mostly empty bars.
    income: [{ perMonth: 10, min: 30_000, max: 280_000 }],
    primaryAccount: "acc-001",
    // Salaries are disbursed from the dedicated payroll account, so scoping
    // insights to it shows payroll alone — which is the point of scoping.
    categoryAccounts: { Payroll: "acc-002" },
    // …and that account is funded from the current account the day before, so
    // scoping to it shows a funded account rather than one paying out of
    // nowhere.
    transfers: [
      { from: "acc-001", to: "acc-002", perMonth: 1, min: 272_000, max: 304_000, dayOfMonth: 24 },
    ],
  },
  RETAIL: {
    // Sized so a salaried customer runs a realistic surplus: ~GH₵ 8.6k in
    // against ~GH₵ 6k out. Categories that over-spend the salary would make
    // every month read as a loss.
    seed: 0x2c0f_fee0,
    categories: [
      { category: "Groceries", perMonth: 8, min: 120, max: 330 },
      { category: "Transport", perMonth: 12, min: 25, max: 92 },
      { category: "Shopping", perMonth: 3, min: 120, max: 480 },
      { category: "Utilities", perMonth: 3, min: 140, max: 325 },
      { category: "Dining", perMonth: 6, min: 45, max: 155 },
      { category: "Cash & MoMo", perMonth: 4, min: 100, max: 300 },
      { category: "Airtime & data", perMonth: 4, min: 20, max: 105 },
      { category: "Health", perMonth: 1, min: 80, max: 420 },
    ],
    income: [{ perMonth: 1, min: 8_400, max: 8_800, dayOfMonth: 25 }],
    primaryAccount: "acc-ret-002",
    // Money put aside each month. It leaves the current account and arrives in
    // savings, so it is a transfer — not income, and not spending.
    transfers: [
      { from: "acc-ret-002", to: "acc-ret-001", perMonth: 1, min: 400, max: 1_600, dayOfMonth: 26 },
    ],
  },
};

/** Settled states only — an instruction that never moved money is not cash flow. */
function isSettled(state: string): boolean {
  return state === "completed";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Builds the twelve-month ledger for a profile: generated background activity
 * across the whole window, with the curated fixtures laid on top. The fixtures
 * are distinct events rather than a complete ledger, so adding them does not
 * double-count — it just means the days Recent activity shows are also visible
 * in the daily chart.
 */
function buildLedger(kind: ProfileKind): LedgerEntry[] {
  const model = MODELS[kind];
  const rand = mulberry32(model.seed);

  const curated = TRANSACTIONS.filter(
    (t) => (t.profileKind ?? "CORPORATE") === kind && isSettled(t.state),
  );

  const entries: LedgerEntry[] = [];
  const today = fromKey(TODAY);
  const firstMonth = startOfMonth(addMonths(today, -(HISTORY_MONTHS - 1)));

  for (let m = 0; m < HISTORY_MONTHS; m++) {
    const monthStart = addMonths(firstMonth, m);
    const daysInMonth = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
    ).getUTCDate();

    const push = (dayOfMonth: number, entry: Omit<LedgerEntry, "date">) => {
      const day = Math.min(Math.max(dayOfMonth, 1), daysInMonth);
      const date = toKey(
        new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day)),
      );
      // The ledger never runs past the app's fixed "now".
      if (date > TODAY) return;
      entries.push({ date, ...entry });
    };

    for (const cat of model.categories) {
      for (let i = 0; i < cat.perMonth; i++) {
        const day = cat.dayOfMonth ?? 1 + Math.floor(rand() * daysInMonth);
        const amount = cat.min + rand() * (cat.max - cat.min);
        // A little month-to-month drift so the trend is not a flat line.
        const drift = 0.86 + rand() * 0.3;
        push(day, {
          direction: "debit",
          amount: round2(amount * drift),
          category: cat.category,
          accountId: model.categoryAccounts?.[cat.category] ?? model.primaryAccount,
        });
      }
    }

    for (const stream of model.income) {
      for (let i = 0; i < stream.perMonth; i++) {
        const day = stream.dayOfMonth ?? 1 + Math.floor(rand() * daysInMonth);
        const amount = stream.min + rand() * (stream.max - stream.min);
        push(day, {
          direction: "credit",
          amount: round2(amount),
          category: null,
          accountId: stream.accountId ?? model.primaryAccount,
        });
      }
    }

    for (const transfer of model.transfers ?? []) {
      for (let i = 0; i < transfer.perMonth; i++) {
        const day = transfer.dayOfMonth ?? 1 + Math.floor(rand() * daysInMonth);
        const amount = round2(transfer.min + rand() * (transfer.max - transfer.min));
        // Both legs, so each account sees its own side of the movement.
        push(day, { direction: "debit", amount, category: null, accountId: transfer.from, internal: true });
        push(day, { direction: "credit", amount, category: null, accountId: transfer.to, internal: true });
      }
    }
  }

  // A curated record whose counterparty is one of the customer's OWN accounts
  // is a transfer, not income or spend — e.g. "Transfer to Savings". Matching
  // on name and number rather than a flag, because the fixtures carry no flag.
  const ownAccounts = new Set(
    accountsForProfile(kind).flatMap((a) => [
      a.name.toLowerCase(),
      a.number.replace(/\s/g, ""),
    ]),
  );

  for (const t of curated) {
    const internal =
      ownAccounts.has(t.counterparty.toLowerCase()) ||
      ownAccounts.has(t.counterpartyAccount.replace(/\s/g, ""));
    entries.push({
      date: t.date,
      direction: t.direction,
      amount: t.amount,
      category: t.direction === "debit" ? (t.category ?? null) : null,
      accountId: t.accountId,
      ...(internal ? { internal: true } : {}),
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

const LEDGER_CACHE = new Map<ProfileKind, LedgerEntry[]>();

/**
 * @param accountId scope to a single account; omit for every account on the
 *   relationship. Filtering here means every selector below is scoped by
 *   construction and the charts can never disagree about the window.
 */
function ledger(kind: ProfileKind, accountId?: string): LedgerEntry[] {
  let cached = LEDGER_CACHE.get(kind);
  if (!cached) {
    cached = buildLedger(kind);
    LEDGER_CACHE.set(kind, cached);
  }
  return accountId
    ? cached.filter((e) => e.accountId === accountId)
    : // Relationship-wide, a transfer between the customer's own accounts is
      // not money in or out — both legs would cancel while inflating each total.
      cached.filter((e) => !e.internal);
}

/* ── Bucketing ─────────────────────────────────────────────────────────────── */

export interface CashflowBucket {
  /** Inclusive start date of the bucket, as a sort/read key. */
  key: string;
  /** Axis tick — short by design; the tooltip carries the full range. */
  label: string;
  /** Full range, spelled out for the tooltip. */
  rangeLabel: string;
  income: number;
  expense: number;
  /** True for the bucket "today" falls inside — it is still filling up, so it
   *  reads low against complete buckets and the tooltip says so. */
  partial: boolean;
}

/**
 * Bucket boundaries for a grain, oldest first. `offset` shifts the whole window
 * back by its own length: 0 is the current window, 1 the one before it.
 */
function bucketStarts(grain: Grain, offset = 0): Date[] {
  const today = fromKey(TODAY);
  const { buckets } = GRAIN_WINDOW[grain];
  const shift = offset * buckets;
  const starts: Date[] = [];

  for (let i = buckets - 1 + shift; i >= shift; i--) {
    if (grain === "daily") starts.push(addDays(today, -i));
    else if (grain === "weekly") starts.push(addDays(startOfWeek(today), -i * 7));
    else starts.push(addMonths(startOfMonth(today), -i));
  }
  return starts;
}

function bucketEnd(start: Date, grain: Grain): Date {
  if (grain === "daily") return start;
  if (grain === "weekly") return addDays(start, 6);
  return addDays(addMonths(start, 1), -1);
}

function labelFor(start: Date, grain: Grain): string {
  const day = start.getUTCDate();
  const month = MONTH_NAMES[start.getUTCMonth()];
  if (grain === "daily") return `${day} ${month}`;
  if (grain === "weekly") return `${day} ${month}`;
  return start.getUTCMonth() === 0
    ? `${month} ${String(start.getUTCFullYear()).slice(2)}`
    : month;
}

function rangeLabelFor(start: Date, grain: Grain): string {
  const end = bucketEnd(start, grain);
  const fmt = (d: Date) => `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
  if (grain === "daily") return `${fmt(start)} ${start.getUTCFullYear()}`;
  if (grain === "weekly") return `${fmt(start)} – ${fmt(end)}`;
  return `${MONTH_NAMES[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
}

/**
 * The date range a window covers. `offset` 0 is the current window; 1 is the
 * preceding window of the same length, which is what deltas compare against.
 */
export function grainRange(grain: Grain, offset = 0): { from: string; to: string } {
  const starts = bucketStarts(grain, offset);
  if (offset === 0) return { from: toKey(starts[0]), to: TODAY };
  const currentStart = bucketStarts(grain, offset - 1)[0];
  return { from: toKey(starts[0]), to: toKey(addDays(currentStart, -1)) };
}

export function cashflowSeries(
  kind: ProfileKind,
  grain: Grain,
  accountId?: string,
): CashflowBucket[] {
  const starts = bucketStarts(grain);
  const buckets: CashflowBucket[] = starts.map((start, i) => ({
    key: toKey(start),
    label: labelFor(start, grain),
    rangeLabel: rangeLabelFor(start, grain),
    income: 0,
    expense: 0,
    // Only the final bucket can contain "today"; a daily bucket for today is
    // a whole day's worth of records already, so it is not flagged.
    partial: grain !== "daily" && i === starts.length - 1,
  }));

  const boundaries = starts.map((s) => toKey(s));
  const { to } = grainRange(grain);

  for (const entry of ledger(kind, accountId)) {
    if (entry.date < boundaries[0] || entry.date > to) continue;
    // Last boundary at or before the entry's date owns it.
    let index = 0;
    for (let i = boundaries.length - 1; i >= 0; i--) {
      if (entry.date >= boundaries[i]) {
        index = i;
        break;
      }
    }
    if (entry.direction === "credit") buckets[index].income += entry.amount;
    else buckets[index].expense += entry.amount;
  }

  return buckets.map((b) => ({
    ...b,
    income: round2(b.income),
    expense: round2(b.expense),
  }));
}

/* ── Category breakdown ────────────────────────────────────────────────────── */

export interface CategorySlice {
  category: string;
  amount: number;
  /** 0–1 share of total spend in the window. */
  share: number;
  /** Palette slot — fixed per rank so a slice keeps its colour as data updates. */
  color: string;
}

/**
 * Slots are capped at five plus "Other": the categorical palette has five
 * validated slots, and a sixth generated hue would be indistinguishable from an
 * existing one under colour-blind simulation.
 */
const SLOT_COLORS = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
  "var(--cat-5)",
];
const OTHER_COLOR = "var(--cat-other)";
const MAX_SLICES = 5;

export function spendByCategory(
  kind: ProfileKind,
  grain: Grain,
  accountId?: string,
): CategorySlice[] {
  const { from, to } = grainRange(grain);
  const totals = new Map<string, number>();

  for (const entry of ledger(kind, accountId)) {
    if (entry.direction !== "debit" || !entry.category) continue;
    if (entry.date < from || entry.date > to) continue;
    totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amount);
  }

  const ranked = [...totals.entries()]
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);

  const total = ranked.reduce((sum, r) => sum + r.amount, 0);
  if (total === 0) return [];

  const head = ranked.slice(0, MAX_SLICES);
  const tail = ranked.slice(MAX_SLICES);

  const slices: CategorySlice[] = head.map((r, i) => ({
    category: r.category,
    amount: r.amount,
    share: r.amount / total,
    color: SLOT_COLORS[i],
  }));

  if (tail.length > 0) {
    const amount = round2(tail.reduce((sum, r) => sum + r.amount, 0));
    slices.push({
      category: "Other",
      amount,
      share: amount / total,
      color: OTHER_COLOR,
    });
  }

  return slices;
}

/* ── Headline totals ───────────────────────────────────────────────────────── */

export interface InsightTotals {
  income: number;
  expense: number;
  net: number;
  /**
   * Same figures for the preceding window of equal length. Comparing whole
   * windows avoids the usual dashboard lie of measuring a part-finished period
   * against a complete one.
   */
  previous: { income: number; expense: number; net: number };
  /** Ratio change in spend vs the previous window. Null when there was no
   *  prior spend — a percentage against zero states nothing. */
  expenseChange: number | null;
  /** What the delta is measured against, e.g. "previous 14 days". */
  comparisonLabel: string;
}

function windowTotals(kind: ProfileKind, grain: Grain, offset: number, accountId?: string) {
  const { from, to } = grainRange(grain, offset);
  let income = 0;
  let expense = 0;

  for (const entry of ledger(kind, accountId)) {
    if (entry.date < from || entry.date > to) continue;
    if (entry.direction === "credit") income += entry.amount;
    else expense += entry.amount;
  }

  return { income: round2(income), expense: round2(expense), net: round2(income - expense) };
}

const COMPARISON_LABEL: Record<Grain, string> = {
  daily: "previous 14 days",
  weekly: "previous 12 weeks",
  monthly: "previous 12 months",
};

export function insightTotals(
  kind: ProfileKind,
  grain: Grain,
  accountId?: string,
): InsightTotals {
  const current = windowTotals(kind, grain, 0, accountId);
  const previous = windowTotals(kind, grain, 1, accountId);

  return {
    ...current,
    previous,
    expenseChange:
      previous.expense > 0 ? (current.expense - previous.expense) / previous.expense : null,
    comparisonLabel: COMPARISON_LABEL[grain],
  };
}

/** Categories available to a profile — the taxonomy, not the observed spend. */
export function categoriesFor(kind: ProfileKind): readonly string[] {
  return kind === "RETAIL" ? RETAIL_CATEGORIES : CORPORATE_CATEGORIES;
}
