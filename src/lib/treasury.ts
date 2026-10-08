"use client";

/**
 * Invest → Treasury Bills & Bonds. One place for what is for sale, how it is priced, and what this customer
 * holds, so the list, the buy flow, the review, the holding and the advice all read the same numbers.
 *
 * Everything is mock. The pricing is a simple stand-in (see `costFromFace`): the real rates, auction results and
 * settlement come from the Central Securities Depository. Dates are fixed to `MOCK_TODAY` so the catalogue
 * never goes stale and "days left" is always true to the data.
 */

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { roundMoney, sumMoney } from "@/lib/money";
import { useSession } from "@/lib/session-store";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import type { Account } from "@/lib/mock-data";

/** The prototype's "today". Every date in the catalogue and the seed holdings is relative to it. */
export const MOCK_TODAY = "2026-10-08";
export const SUPPORT_PHONE = "0800 422 422";
/** How long the CSD takes to set up an securities account. */
export const SETUP_WORKING_DAYS = 7;
/** The rate the bank applies when a holding is cashed in early (rediscounted). Placeholder until the bank confirms. */
export const REDISCOUNT_RATE = 18.5;
/** One source for the issuer: every security on sale is a Government of Ghana issue. */
export const ISSUER = "Government of Ghana";

/* ── Dates ─────────────────────────────────────────────────────────────── */

const DAY_MS = 86_400_000;
const toUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  return toIso(new Date(toUtc(iso).getTime() + days * DAY_MS));
}

/** Calendar months, clamped to the last day of the month (31 Aug + 6 months is 28 Feb, not 3 Mar). */
export function addMonths(iso: string, months: number): string {
  const d = toUtc(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toIso(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / DAY_MS);
}

/** "28 days left", "1 day left", "Matures today", or "Matured". */
export function daysLeftLabel(maturity: string, today = MOCK_TODAY): string {
  const n = daysBetween(today, maturity);
  if (n < 0) return "Matured";
  if (n === 0) return "Matures today";
  return n === 1 ? "1 day left" : `${n} days left`;
}

/* ── What is for sale ──────────────────────────────────────────────────── */

export type Market = "primary" | "secondary";
export type SecurityKind = "bill" | "bond";

export interface Security {
  id: string;
  market: Market;
  kind: SecurityKind;
  title: string;
  /** Per year, in percent. Primary rates are indicative until the auction. */
  rate: number;
  /** Primary bills: the life of the bill. Secondary bills price off the days left instead. */
  tenorDays?: number;
  maturity: string;
  /** Primary only. */
  auction?: number;
  settlement?: string;
  /** Secondary only: the most face value on offer. */
  available?: number;
  /** Bonds only: what 100 of face value costs. */
  price?: number;
}

const PRIMARY_SETTLEMENT = addDays(MOCK_TODAY, 8);

export const SECURITIES: readonly Security[] = [
  {
    id: "p-1500",
    market: "primary",
    kind: "bill",
    title: "91-day Treasury Bill",
    rate: 13.304,
    tenorDays: 91,
    auction: 1500,
    settlement: PRIMARY_SETTLEMENT,
    maturity: addDays(PRIMARY_SETTLEMENT, 91),
  },
  {
    id: "p-1540",
    market: "primary",
    kind: "bill",
    title: "182-day Treasury Bill",
    rate: 15,
    tenorDays: 182,
    auction: 1540,
    settlement: PRIMARY_SETTLEMENT,
    maturity: addDays(PRIMARY_SETTLEMENT, 182),
  },
  {
    id: "p-1400",
    market: "primary",
    kind: "bond",
    title: "15-Year Bond",
    rate: 14.23,
    auction: 1400,
    settlement: addDays(MOCK_TODAY, 22),
    maturity: addMonths(addDays(MOCK_TODAY, 22), 15 * 12),
    price: 100,
  },
  {
    id: "s-bond-15",
    market: "secondary",
    kind: "bond",
    title: "15-Year Bond",
    rate: 13.304,
    maturity: "2028-02-02",
    available: 10_000,
    price: 99.2,
  },
  {
    id: "s-bill-364",
    market: "secondary",
    kind: "bill",
    title: "364-day Bill",
    rate: 14.23,
    maturity: addDays(MOCK_TODAY, 28),
    available: 10_000,
  },
] as const;

export function findSecurity(id: string | null | undefined): Security | undefined {
  return SECURITIES.find((s) => s.id === id);
}

export function securitiesFor(market: Market): Security[] {
  return SECURITIES.filter((s) => s.market === market);
}

/* ── Pricing ───────────────────────────────────────────────────────────── */

/** Days the money is invested: the bill's life when it's new, the days left when it's bought second-hand. */
function investedDays(sec: Pick<Security, "market" | "tenorDays" | "maturity">): number {
  return sec.market === "primary" && sec.tenorDays ? sec.tenorDays : Math.max(daysBetween(MOCK_TODAY, sec.maturity), 0);
}

/**
 * What it costs today to receive `face` at maturity. Bills are bought at a discount that earns the quoted rate
 * over the days invested (simple interest, 365 days). Bonds are bought at their price per 100 of face value.
 * Stand-in maths: the real figures come from the auction and the CSD.
 */
export function costFromFace(sec: Security, face: number): number {
  if (sec.kind === "bond") return roundMoney((face * (sec.price ?? 100)) / 100);
  return roundMoney(face / (1 + ((sec.rate / 100) * investedDays(sec)) / 365));
}

/** The face value that `cost` buys. The inverse of `costFromFace`. */
export function faceFromCost(sec: Security, cost: number): number {
  if (sec.kind === "bond") return roundMoney((cost * 100) / (sec.price ?? 100));
  return roundMoney(cost * (1 + ((sec.rate / 100) * investedDays(sec)) / 365));
}

/** Interest a bill earns by maturity. Bonds pay interest as coupons instead, so this is 0 for them. */
export function billInterest(kind: SecurityKind, face: number, cost: number): number {
  return kind === "bill" ? roundMoney(face - cost) : 0;
}

/** A bond's coupon: interest paid every six months. */
export function couponPerPeriod(face: number, rate: number): number {
  return roundMoney((face * rate) / 100 / 2);
}

/** The next coupon dates after today, six months apart, counted back from maturity. */
export function nextCouponDates(maturity: string, count = 4, today = MOCK_TODAY): string[] {
  const dates: string[] = [];
  for (let k = 0; ; k++) {
    const d = addMonths(maturity, -6 * k);
    if (daysBetween(today, d) <= 0) break;
    dates.unshift(d);
  }
  return dates.slice(0, count);
}

/** What cashing in `face` early pays today: its value at maturity, discounted over the days left. */
export function rediscountNet(face: number, maturity: string, rate = REDISCOUNT_RATE): number {
  const days = Math.max(daysBetween(MOCK_TODAY, maturity), 0);
  return roundMoney(face / (1 + ((rate / 100) * days) / 365));
}

/* ── Maturity instructions ─────────────────────────────────────────────── */

export type MaturityInstructionId = "same-face" | "same-cost" | "with-interest" | "none";

export const MATURITY_INSTRUCTIONS: readonly { id: MaturityInstructionId; label: string; detail: string }[] = [
  {
    id: "none",
    label: "Do not rollover",
    detail: "The full face value is paid into your account at maturity.",
  },
  {
    id: "same-face",
    label: "Rollover same face value",
    detail: "Buy a new one at maturity with the same face value. What it costs depends on the next auction’s rate.",
  },
  {
    id: "same-cost",
    label: "Rollover same cost",
    detail: "Reinvest what you paid. The new face value depends on the next auction’s rate.",
  },
  {
    id: "with-interest",
    label: "Rollover with interest",
    detail: "Reinvest everything you receive at maturity, interest included.",
  },
] as const;

export function instructionLabel(id: MaturityInstructionId): string {
  return MATURITY_INSTRUCTIONS.find((m) => m.id === id)?.label ?? "Do not rollover";
}

/** Rolling over commits future money, so it is authorised; stopping a rollover is not. */
export const isRollover = (id: MaturityInstructionId) => id !== "none";

/* ── The customer's records ────────────────────────────────────────────── */

export interface CsdAccount {
  status: "pending" | "active";
  /** The securities account number (the "CSID"). */
  csid: string;
  requestedOn: string;
  /** The bank account the customer linked when applying. */
  linkedAccountId: string;
}

export interface Rediscount {
  full: boolean;
  /** Face value being cashed in. */
  face: number;
  /** What is paid out. */
  receive: number;
  toAccountId: string;
  requestedOn: string;
}

export interface Holding {
  id: string;
  ownerId: string;
  /** The instrument's reference at the CSD, such as GOG-BL-1488. */
  code: string;
  title: string;
  kind: SecurityKind;
  rate: number;
  /** Paid out at maturity. */
  face: number;
  /** What was paid. */
  cost: number;
  boughtOn: string;
  maturity: string;
  instruction: MaturityInstructionId;
  fromAccountId: string;
  status: "active" | "rediscount-pending" | "closed";
  rediscount?: Rediscount;
  closedOn?: string;
}

/** A purchase that has been submitted but has not settled yet. */
export interface Order {
  id: string;
  ownerId: string;
  security: Security;
  face: number;
  cost: number;
  instruction: MaturityInstructionId;
  fromAccountId: string;
  placedOn: string;
}

/** Where a customer was headed when they stopped to create their securities account, so Invest can pick it back up. */
export interface AccountIntent {
  /** The screen that starts that investment. */
  href: string;
  /** What it is, in the customer's words: "91-day Treasury Bill". */
  label: string;
}

type OwnerAccountStatus = "none" | CsdAccount["status"];

interface TreasuryState {
  /** Dev Mode: the CSD market can be shut for primary and secondary alike. */
  marketOpen: boolean;
  csd: Record<string, CsdAccount>;
  holdings: Holding[];
  orders: Order[];
  /** Customers who have seen the welcome to investments. */
  welcomed: Record<string, boolean>;
  intent: Record<string, AccountIntent>;

  setMarketOpen: (open: boolean) => void;
  markWelcomed: (ownerId: string, seen?: boolean) => void;
  clearIntent: (ownerId: string) => void;
  /** The customer applied: the account is pending until the CSD sets it up. */
  requestAccount: (ownerId: string, linkedAccountId: string, intent?: AccountIntent) => void;
  /** Dev Mode: jump the account to a state. */
  setAccountStatus: (ownerId: string, status: OwnerAccountStatus, linkedAccountId: string) => void;
  /** Dev Mode: give the customer this many treasury holdings (0 to 3), whatever they have now. */
  setHoldingsSeed: (ownerId: string, linkedAccountId: string, count: number) => void;
  placeOrder: (order: Omit<Order, "id" | "placedOn">) => Order;
  setInstruction: (holdingId: string, instruction: MaturityInstructionId) => void;
  requestRediscount: (holdingId: string, rediscount: Omit<Rediscount, "requestedOn">) => void;
  /** Dev Mode: the CSD works through everything waiting on it. */
  settleAll: (ownerId: string) => void;
}

const csidFor = (ownerId: string) => {
  let h = 7;
  for (const ch of ownerId) h = (h * 31 + ch.charCodeAt(0)) % 100_000_000;
  return String(100_000_000 + h);
};

const priceBill = (face: number, rate: number, days: number) => roundMoney(face / (1 + ((rate / 100) * days) / 365));

/** The demo holdings, `count` of the three active ones (a 91-day bill, a 364-day bill, a bond) plus one closed, for Statement. */
function seedHoldings(ownerId: string, fromAccountId: string, count = 3): Holding[] {
  const base = { ownerId, fromAccountId, status: "active" as const, instruction: "none" as MaturityInstructionId };
  const all: Holding[] = [
    {
      ...base,
      id: `h-${ownerId}-1488`,
      code: "GOG-BL-1488",
      title: "91-day Treasury Bill",
      kind: "bill",
      rate: 13.1,
      face: 10_000,
      cost: priceBill(10_000, 13.1, 91),
      boughtOn: addDays(MOCK_TODAY, -35),
      maturity: addDays(MOCK_TODAY, 56),
    },
    {
      ...base,
      id: `h-${ownerId}-1461`,
      code: "GOG-BL-1461",
      title: "364-day Treasury Bill",
      kind: "bill",
      rate: 14.9,
      face: 5_000,
      cost: priceBill(5_000, 14.9, 364),
      boughtOn: addDays(MOCK_TODAY, -200),
      maturity: addDays(MOCK_TODAY, 164),
      instruction: "same-cost",
    },
    {
      ...base,
      id: `h-${ownerId}-1203`,
      code: "GOG-BD-1203",
      title: "6-Year Fixed Bond",
      kind: "bond",
      rate: 14.5,
      face: 20_000,
      cost: 20_000,
      boughtOn: "2025-02-17",
      maturity: "2031-02-17",
    },
    {
      ...base,
      id: `h-${ownerId}-1390`,
      code: "GOG-BL-1390",
      title: "182-day Treasury Bill",
      kind: "bill",
      rate: 12.4,
      face: 8_000,
      cost: priceBill(8_000, 12.4, 182),
      boughtOn: addDays(MOCK_TODAY, -230),
      maturity: addDays(MOCK_TODAY, -48),
      status: "closed",
      closedOn: addDays(MOCK_TODAY, -48),
    },
  ];
  const active = all.filter((h) => h.status === "active").slice(0, count);
  const closed = all.filter((h) => h.status === "closed");
  return count > 0 ? [...active, ...closed] : [];
}

export const useTreasury = create<TreasuryState>()(
  persist(
    (set, get) => ({
      marketOpen: true,
      csd: {},
      holdings: [],
      orders: [],
      welcomed: {},
      intent: {},

      setMarketOpen: (open) => set({ marketOpen: open }),

      markWelcomed: (ownerId, seen = true) => set((s) => ({ welcomed: { ...s.welcomed, [ownerId]: seen } })),

      clearIntent: (ownerId) =>
        set((s) => {
          const intent = { ...s.intent };
          delete intent[ownerId];
          return { intent };
        }),

      requestAccount: (ownerId, linkedAccountId, intent) =>
        set((s) => ({
          csd: { ...s.csd, [ownerId]: { status: "pending", csid: csidFor(ownerId), requestedOn: MOCK_TODAY, linkedAccountId } },
          welcomed: { ...s.welcomed, [ownerId]: true },
          intent: intent ? { ...s.intent, [ownerId]: intent } : s.intent,
        })),

      setAccountStatus: (ownerId, status, linkedAccountId) =>
        set((s) => {
          const csd = { ...s.csd };
          if (status === "none") {
            delete csd[ownerId];
            const welcomed = { ...s.welcomed };
            const intent = { ...s.intent };
            delete welcomed[ownerId];
            delete intent[ownerId];
            return {
              csd,
              welcomed,
              intent,
              holdings: s.holdings.filter((h) => h.ownerId !== ownerId),
              orders: s.orders.filter((o) => o.ownerId !== ownerId),
            };
          }
          csd[ownerId] = {
            status,
            csid: csd[ownerId]?.csid ?? csidFor(ownerId),
            requestedOn: csd[ownerId]?.requestedOn ?? addDays(MOCK_TODAY, -10),
            linkedAccountId: csd[ownerId]?.linkedAccountId ?? linkedAccountId,
          };
          return { csd };
        }),

      setHoldingsSeed: (ownerId, linkedAccountId, count) =>
        set((s) => ({ holdings: [...s.holdings.filter((h) => h.ownerId !== ownerId), ...(count > 0 ? seedHoldings(ownerId, linkedAccountId, count) : [])] })),

      placeOrder: (order) => {
        const placed: Order = { ...order, id: `ord-${Date.now()}`, placedOn: MOCK_TODAY };
        set((s) => ({ orders: [placed, ...s.orders] }));
        return placed;
      },

      setInstruction: (holdingId, instruction) =>
        set((s) => ({ holdings: s.holdings.map((h) => (h.id === holdingId ? { ...h, instruction } : h)) })),

      requestRediscount: (holdingId, rediscount) =>
        set((s) => ({
          holdings: s.holdings.map((h) =>
            h.id === holdingId ? { ...h, status: "rediscount-pending", rediscount: { ...rediscount, requestedOn: MOCK_TODAY } } : h,
          ),
        })),

      settleAll: (ownerId) => {
        const { orders, holdings } = get();
        const settled: Holding[] = orders
          .filter((o) => o.ownerId === ownerId)
          .map((o) => ({
            id: `h-${o.id}`,
            ownerId,
            code: `GOG-${o.security.kind === "bill" ? "BL" : "BD"}-${o.security.auction ?? o.security.id.slice(-4)}`,
            title: o.security.title,
            kind: o.security.kind,
            rate: o.security.rate,
            face: o.face,
            cost: o.cost,
            boughtOn: o.security.settlement ?? MOCK_TODAY,
            maturity: o.security.maturity,
            instruction: o.instruction,
            fromAccountId: o.fromAccountId,
            status: "active",
          }));
        const next = holdings.map((h): Holding => {
          if (h.ownerId !== ownerId || h.status !== "rediscount-pending" || !h.rediscount) return h;
          if (h.rediscount.full) return { ...h, status: "closed", closedOn: MOCK_TODAY, rediscount: undefined };
          const kept = roundMoney(h.face - h.rediscount.face);
          return { ...h, status: "active", face: kept, cost: roundMoney((h.cost * kept) / h.face), rediscount: undefined };
        });
        set({ holdings: [...next, ...settled], orders: orders.filter((o) => o.ownerId !== ownerId) });
      },
    }),
    { name: "nibs-treasury" },
  ),
);

/** True once the saved treasury records have been read back (they only exist in the browser). */
export function useTreasuryHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const api = useTreasury.persist;
    if (!api) {
      setHydrated(true);
      return;
    }
    const unsub = api.onFinishHydration(() => setHydrated(true));
    if (api.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

/** The signed-in customer's treasury picture, from the one store. */
export function useMyTreasury() {
  const ownerId = useSession((s) => s.actor?.id) ?? "guest";
  const csdAll = useTreasury((s) => s.csd);
  const holdingsAll = useTreasury((s) => s.holdings);
  const ordersAll = useTreasury((s) => s.orders);
  const marketOpen = useTreasury((s) => s.marketOpen);
  const welcomedAll = useTreasury((s) => s.welcomed);
  const intentAll = useTreasury((s) => s.intent);

  return useMemo(() => {
    const mine = holdingsAll.filter((h) => h.ownerId === ownerId);
    const active = mine.filter((h) => h.status !== "closed").sort((a, b) => a.maturity.localeCompare(b.maturity));
    return {
      ownerId,
      marketOpen,
      welcomed: Boolean(welcomedAll[ownerId]),
      intent: intentAll[ownerId] as AccountIntent | undefined,
      csd: csdAll[ownerId],
      holdings: active,
      closed: mine.filter((h) => h.status === "closed"),
      orders: ordersAll.filter((o) => o.ownerId === ownerId),
      /** Face value due to the customer at maturity, across everything they hold. */
      dueAtMaturity: sumMoney(active.map((h) => h.face)),
    };
  }, [ownerId, csdAll, holdingsAll, ordersAll, marketOpen, welcomedAll, intentAll]);
}

/** Accounts a treasury purchase can be paid from, or a payout paid into: active, in cedis, and a bank account. */
export function useTreasuryAccounts(): Account[] {
  const { accounts } = useCustomerAccounts();
  return useMemo(
    () => accounts.filter((a) => a.status === "Active" && a.currency === "GHS" && a.type !== "Wallet" && a.type !== "Foreign Currency"),
    [accounts],
  );
}

/** 13.304 → "13.304%", 15 → "15%", 14.23 → "14.23%". */
export function formatRate(rate: number): string {
  return `${Number(rate.toFixed(3))}%`;
}

/** What the customer sees as a security's kind. */
export const kindLabel = (kind: SecurityKind) => (kind === "bill" ? "Bill" : "Bond");

/** One of the customer's holdings by id, with everything the detail screens need. */
export function useHolding(id: string) {
  const hydrated = useTreasuryHydrated();
  const t = useMyTreasury();
  const holding = useMemo(() => [...t.holdings, ...t.closed].find((h) => h.id === id), [t.holdings, t.closed, id]);
  return { ...t, hydrated, holding };
}

/** Titles a customer can be addressed by, for the securities account form. */
export const INVESTOR_TITLES = ["Mr", "Mrs", "Miss", "Ms", "Dr", "Prof", "Rev"] as const;
