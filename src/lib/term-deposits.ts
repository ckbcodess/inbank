"use client";

/**
 * Invest → Term Deposit. The bank's own fixed-term product: lock money for 91, 182 or 364 days at a rate fixed
 * on the day it is opened, and get it back with interest at maturity.
 *
 * Unlike a treasury bill there is no settlement wait: opening, redeeming and closing all complete at once, so they
 * post to the ledger straight away (`recordTransaction`) and View Receipt opens the ordinary receipt.
 *
 * Everything is mock. Rates, the minimum and the early-redemption rule are placeholders until the bank confirms them.
 * Dates are relative to `MOCK_TODAY`, the same fixed "today" the treasury screens use.
 */

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { roundMoney, sumMoney } from "@/lib/money";
import { useSession } from "@/lib/session-store";
import { addDays, daysBetween, MOCK_TODAY, useTreasury, useTreasuryHydrated } from "@/lib/treasury";

/** The smallest deposit that can be opened. */
export const MIN_DEPOSIT = 1000;

/** Per year, in percent, fixed when the deposit is opened. Placeholders (Figma shows 12.5% and 15%). */
export const TENURES: readonly { days: number; rate: number }[] = [
  { days: 91, rate: 12.5 },
  { days: 182, rate: 13.5 },
  { days: 364, rate: 15 },
] as const;

export function rateFor(days: number): number {
  return TENURES.find((t) => t.days === days)?.rate ?? TENURES[0].rate;
}

export type DepositInstruction = "close" | "rollover";

export const DEPOSIT_INSTRUCTIONS: readonly { id: DepositInstruction; label: string; detail: string }[] = [
  {
    id: "close",
    label: "Close on maturity",
    detail: "Your deposit and its interest are paid into your account when it matures.",
  },
  {
    id: "rollover",
    label: "Roll over principal amount",
    detail: "The interest is paid into your account. The principal stays invested for the same period, at the rate on that day.",
  },
] as const;

export function depositInstructionLabel(id: DepositInstruction): string {
  return DEPOSIT_INSTRUCTIONS.find((i) => i.id === id)?.label ?? "Close on maturity";
}

/** Interest on `principal` over `days` at `rate`% a year (simple interest, 365 days). */
export function interestFor(principal: number, rate: number, days: number): number {
  return roundMoney((principal * rate * days) / 100 / 365);
}

export interface TermDeposit {
  id: string;
  ownerId: string;
  /** What the customer sees and quotes: ten digits. */
  reference: string;
  principal: number;
  rate: number;
  tenureDays: number;
  createdOn: string;
  maturity: string;
  instruction: DepositInstruction;
  fromAccountId: string;
  status: "active" | "closed";
  closedOn?: string;
}

/** What the deposit has earned by today. Zero on the day it opens; never more than the full term. */
export function accruedInterest(d: Pick<TermDeposit, "principal" | "rate" | "tenureDays" | "createdOn">): number {
  const elapsed = Math.min(Math.max(daysBetween(d.createdOn, MOCK_TODAY), 0), d.tenureDays);
  return interestFor(d.principal, d.rate, elapsed);
}

/** The interest the whole term pays. */
export const termInterest = (d: Pick<TermDeposit, "principal" | "rate" | "tenureDays">) => interestFor(d.principal, d.rate, d.tenureDays);

/** What lands in the account at maturity: everything on close, only the interest on a rollover (the principal stays in). */
export function paidAtMaturity(d: Pick<TermDeposit, "principal" | "rate" | "tenureDays" | "instruction">): number {
  const interest = termInterest(d);
  return d.instruction === "rollover" ? interest : sumMoney([d.principal, interest]);
}

/**
 * Taking money out early. Placeholder rule until the bank confirms its own: the interest earned so far on the amount
 * taken out is given up, and the amount itself comes back in full. Partial redemption leaves the rest earning.
 */
export function earlyRedemption(d: TermDeposit, amount: number) {
  const share = d.principal > 0 ? amount / d.principal : 0;
  return {
    receive: roundMoney(amount),
    interestGivenUp: roundMoney(accruedInterest(d) * share),
    remaining: roundMoney(d.principal - amount),
  };
}

/* ── The customer's deposits ───────────────────────────────────────────── */

interface NewDeposit {
  ownerId: string;
  principal: number;
  tenureDays: number;
  instruction: DepositInstruction;
  fromAccountId: string;
}

interface DepositState {
  deposits: TermDeposit[];
  /** Dev Mode: the next requests fail, so the failure screen can be walked through. */
  failRequests: boolean;
  /** Counter behind the reference, so each new deposit gets its own. */
  serial: number;

  /** Dev Mode: give the customer this many deposits (0 to 2), whatever they have now. */
  setSeed: (ownerId: string, fromAccountId: string, count: number) => void;
  setFailRequests: (fail: boolean) => void;
  open: (input: NewDeposit) => TermDeposit;
  setInstruction: (id: string, instruction: DepositInstruction) => void;
  /** Takes `amount` out of the deposit. When that is the whole principal the deposit closes. */
  redeem: (id: string, amount: number) => void;
}

const referenceFor = (serial: number, ownerId: string) => {
  let h = 11;
  for (const ch of ownerId) h = (h * 31 + ch.charCodeAt(0)) % 10_000;
  return String(1_000_000_000 + h * 100_000 + serial * 37).slice(0, 10);
};

function seedFor(ownerId: string, fromAccountId: string, count = 2): TermDeposit[] {
  const base = { ownerId, fromAccountId, status: "active" as const };
  const make = (n: number, principal: number, tenureDays: number, createdOn: string, instruction: DepositInstruction): TermDeposit => ({
    ...base,
    id: `td-${ownerId}-${n}`,
    reference: referenceFor(n, ownerId),
    principal,
    tenureDays,
    rate: rateFor(tenureDays),
    createdOn,
    maturity: addDays(createdOn, tenureDays),
    instruction,
  });
  return [make(1, 10_000, 91, addDays(MOCK_TODAY, -49), "close"), make(2, 20_000, 364, addDays(MOCK_TODAY, -210), "rollover")].slice(0, count);
}

export const useTermDeposits = create<DepositState>()(
  persist(
    (set, get) => ({
      deposits: [],
      failRequests: false,
      serial: 1,

      setSeed: (ownerId, fromAccountId, count) =>
        set((s) => ({ deposits: [...s.deposits.filter((d) => d.ownerId !== ownerId), ...seedFor(ownerId, fromAccountId, count)] })),

      setFailRequests: (fail) => set({ failRequests: fail }),

      open: (input) => {
        const serial = get().serial;
        const deposit: TermDeposit = {
          id: `td-${Date.now()}`,
          ownerId: input.ownerId,
          reference: referenceFor(serial + 100, input.ownerId),
          principal: input.principal,
          rate: rateFor(input.tenureDays),
          tenureDays: input.tenureDays,
          createdOn: MOCK_TODAY,
          maturity: addDays(MOCK_TODAY, input.tenureDays),
          instruction: input.instruction,
          fromAccountId: input.fromAccountId,
          status: "active",
        };
        set((s) => ({ deposits: [deposit, ...s.deposits], serial: s.serial + 1 }));
        return deposit;
      },

      setInstruction: (id, instruction) => set((s) => ({ deposits: s.deposits.map((d) => (d.id === id ? { ...d, instruction } : d)) })),

      redeem: (id, amount) =>
        set((s) => ({
          deposits: s.deposits.map((d) => {
            if (d.id !== id) return d;
            const remaining = roundMoney(d.principal - amount);
            return remaining <= 0 ? { ...d, principal: 0, status: "closed", closedOn: MOCK_TODAY } : { ...d, principal: remaining };
          }),
        })),
    }),
    { name: "nibs-term-deposits" },
  ),
);

/** True once the saved deposits have been read back (they only exist in the browser). */
export function useDepositsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const api = useTermDeposits.persist;
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

/**
 * The signed-in customer's deposits. Deposits belong to the securities account, so they only show once it is active.
 * Dev Mode decides how many exist (none, one or two), independently of treasury. `hydrated` waits for both the deposits
 * and the account to be read back.
 */
export function useMyDeposits() {
  const depositsReady = useDepositsHydrated();
  const treasuryReady = useTreasuryHydrated();
  const hydrated = depositsReady && treasuryReady;
  const ownerId = useSession((s) => s.actor?.id) ?? "guest";
  const live = useTreasury((s) => s.csd[ownerId]?.status === "active");
  const all = useTermDeposits((s) => s.deposits);

  return useMemo(() => {
    const mine = live ? all.filter((d) => d.ownerId === ownerId) : [];
    const active = mine.filter((d) => d.status === "active").sort((a, b) => a.maturity.localeCompare(b.maturity));
    return {
      hydrated,
      ownerId,
      active,
      closed: mine.filter((d) => d.status === "closed"),
      /** Money locked in deposits right now. */
      locked: sumMoney(active.map((d) => d.principal)),
    };
  }, [all, ownerId, hydrated, live]);
}

/** One deposit by id, for the detail and redeem screens. */
export function useDeposit(id: string) {
  const mine = useMyDeposits();
  const deposit = useMemo(() => [...mine.active, ...mine.closed].find((d) => d.id === id), [mine.active, mine.closed, id]);
  return { ...mine, deposit };
}
