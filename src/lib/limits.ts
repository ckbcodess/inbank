"use client";

/**
 * Personal daily limits (Settings → Limits). The bank sets a ceiling for each kind of payment; the customer can set
 * their own daily limit anywhere up to it. Lowering is instant (stopping is never harder than starting). Raising asks
 * for a one-time code, because it widens what a stolen session could move.
 *
 * Every figure here is a placeholder until the bank gives its retail limits (WORKING_LOG). Payments don't check these
 * yet; that's a logged gap.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TRANSACTIONS } from "@/lib/mock-data";
import { transactionRail } from "@/lib/transaction-type";
import { sumMoney } from "@/lib/money";

export type LimitKind = "transfers" | "wallets" | "bills" | "international";

export interface LimitDef {
  kind: LimitKind;
  label: string;
  /** What it covers, in a few words. */
  covers: string;
  /** The bank's ceiling: the most a customer can set. */
  max: number;
  /** Where every customer starts. */
  standard: number;
}

export const LIMITS: LimitDef[] = [
  { kind: "transfers", label: "Bank transfers", covers: "GCB and other Ghana banks", max: 100_000, standard: 20_000 },
  { kind: "wallets", label: "Mobile money", covers: "Wallets, airtime and data", max: 20_000, standard: 5_000 },
  { kind: "bills", label: "Bills", covers: "Utilities, TV, school fees", max: 50_000, standard: 10_000 },
  { kind: "international", label: "Outside Ghana", covers: "PAPSS and SWIFT", max: 100_000, standard: 10_000 },
];

interface LimitsState {
  /** Customer-set limits, by actor, over the standard ones. */
  custom: Record<string, Partial<Record<LimitKind, number>>>;
  setLimit: (actorId: string, kind: LimitKind, amount: number) => void;
}

export const useLimits = create<LimitsState>()(
  persist(
    (set) => ({
      custom: {},
      setLimit: (actorId, kind, amount) =>
        set((s) => ({ custom: { ...s.custom, [actorId]: { ...s.custom[actorId], [kind]: amount } } })),
    }),
    { name: "nibs-limits" },
  ),
);

export function limitFor(custom: Partial<Record<LimitKind, number>> | undefined, def: LimitDef): number {
  return custom?.[def.kind] ?? def.standard;
}

/* ── What's gone today ─────────────────────────────────────────────────────── */


/** Which payment rails count against each limit. Moving money between your own accounts counts against none. */
const RAILS: Record<LimitKind, string[]> = {
  transfers: ["other-banks"],
  wallets: ["wallet", "airtime-data"],
  bills: ["bill"],
  international: ["outside-ghana"],
};

/** What's been sent today on this kind of payment, from the ledger (completed and pending debits, not failed). */
export function usedToday(kind: LimitKind, accountIds: string[], now = new Date()): number {
  const today = now.toISOString().slice(0, 10);
  return sumMoney(
    TRANSACTIONS.filter(
      (t) =>
        t.direction === "debit" &&
        t.date.slice(0, 10) === today &&
        accountIds.includes(t.accountId) &&
        !String(t.state).includes("fail") &&
        RAILS[kind].includes(transactionRail(t)),
    ).map((t) => Math.abs(t.amount)),
  );
}
