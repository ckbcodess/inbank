"use client";

/**
 * Loans: the Salary Advance, the one loan GCB offers online today, in its three forms from the SALARY ADVANCE Figma:
 *
 *  - Salary Advance, for anyone whose salary is paid into GCB
 *  - National Service Advance, against the national service allowance
 *  - Pensioner Advance, against a pension
 *
 * Which one a customer gets is never asked: the bank knows what is credited to their account (`income`). They can take
 * up to 80% of one month's income, it is paid in once approved, and it is repaid in one go from the next credit, with
 * interest for the days it was out. Repaying early is allowed and costs less.
 *
 * An advance needs the income to land in a Salary Account. A customer whose salary goes into an ordinary account is told
 * so on the form, and taking the advance switches that account over (same number, its own monthly fee).
 *
 * Every rate, fee and date here is a placeholder until the bank confirms its own. The Figma's example figures are
 * inconsistent with each other (see WORKING_LOG); these keep its percentages and make the arithmetic hold.
 */

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { roundMoney, sumMoney } from "@/lib/money";
import { useSession } from "@/lib/session-store";
import { addDays, addMonths, daysBetween, MOCK_TODAY, useTreasuryAccounts } from "@/lib/treasury";

/* ── The product ──────────────────────────────────────────────────────────── */

export type IncomeKind = "salary" | "national-service" | "pension";

interface AdvanceProduct {
  name: string;
  line: string;
  /** Under the limit: where the figure comes from. */
  limitNote: string;
  /** Day of the month the income is credited (placeholder). */
  payday: number;
  /** The review's closing sentence: when and what is taken back. */
  repaySentence: (date: string, total: string, amount: string, interest: string, days: number) => string;
  /** The form's notice when the income lands in an ordinary account. */
  switchSentence: (account: string, number: string, fee: string) => string;
}

/** One whole sentence per product, so each translates on its own. */
export const ADVANCE_PRODUCTS: Record<IncomeKind, AdvanceProduct> = {
  salary: {
    name: "Salary Advance",
    line: "Take up to 80% of your salary as an advance.",
    limitNote: "80% of one month’s salary",
    payday: 25,
    repaySentence: (date, total, amount, interest, days) =>
      `When your salary arrives on ${date}, we take ${total}: the ${amount} advance and ${interest} interest for ${days} days. Repay sooner and you pay less interest.`,
    switchSentence: (account, number, fee) =>
      `Your salary is paid into ${account} (${number}), and an advance needs a Salary Account. Taking it switches that account over. The number stays the same, and it costs ${fee} a month.`,
  },
  "national-service": {
    name: "National Service Advance",
    line: "Take up to 80% of your national service allowance as an advance.",
    limitNote: "80% of one month’s allowance",
    payday: 28,
    repaySentence: (date, total, amount, interest, days) =>
      `When your allowance arrives on ${date}, we take ${total}: the ${amount} advance and ${interest} interest for ${days} days. Repay sooner and you pay less interest.`,
    switchSentence: (account, number, fee) =>
      `Your allowance is paid into ${account} (${number}), and an advance needs a Salary Account. Taking it switches that account over. The number stays the same, and it costs ${fee} a month.`,
  },
  pension: {
    name: "Pensioner Advance",
    line: "Take up to 80% of your pension as an advance.",
    limitNote: "80% of one month’s pension",
    payday: 20,
    repaySentence: (date, total, amount, interest, days) =>
      `When your pension arrives on ${date}, we take ${total}: the ${amount} advance and ${interest} interest for ${days} days. Repay sooner and you pay less interest.`,
    switchSentence: (account, number, fee) =>
      `Your pension is paid into ${account} (${number}), and an advance needs a Salary Account. Taking it switches that account over. The number stays the same, and it costs ${fee} a month.`,
  },
};

/** Share of one month's income that can be advanced. */
export const ADVANCE_SHARE = 0.8;
export const MIN_ADVANCE = 100;
/** Taken from the advance before it is paid in. */
export const PROCESSING_FEE_RATE = 0.01;
export const FACILITY_FEE_RATE = 0.005;
/** Interest, per month, charged for each day the advance is out. */
export const MONTHLY_RATE = 0.0217;
/** Charged each month on whatever is still owed after the repayment date. */
export const LATE_CHARGE_RATE = 0.05;
/** What a Salary Account costs each month, said before the customer agrees to switch. */
export const SALARY_ACCOUNT_FEE = 10;
export const SALARY_ACCOUNT_FEATURES = [
  "Take up to 80% of your net salary as an advance, here or in the app",
  "Apply for personal loans up to GHS 1 million",
  "No minimum balance, and unlimited withdrawals",
  "Debit or prepaid card, G-Money and a cheque book",
  "No E-Bundle fees",
] as const;

export const pct = (rate: number) => `${Number((rate * 100).toFixed(2))}%`;

/** Interest for one day on `amount`: the monthly rate spread over 30 days. */
export const dailyInterest = (amount: number) => roundMoney((amount * MONTHLY_RATE) / 30);

/** What an advance of `amount` costs up front, and what lands in the account. */
export function advanceFees(amount: number) {
  const processing = roundMoney(amount * PROCESSING_FEE_RATE);
  const facility = roundMoney(amount * FACILITY_FEE_RATE);
  return { processing, facility, fees: sumMoney([processing, facility]), received: roundMoney(amount - processing - facility) };
}

/** The next time `kind` income is credited after `today`: this month's payday if it's still ahead, otherwise next month's. */
export function nextPayday(kind: IncomeKind, today = MOCK_TODAY): string {
  const day = String(ADVANCE_PRODUCTS[kind].payday).padStart(2, "0");
  const thisMonth = `${today.slice(0, 7)}-${day}`;
  return thisMonth > today ? thisMonth : addMonths(thisMonth, 1);
}

/* ── The customer's income, as the bank sees it ───────────────────────────── */

export interface Income {
  kind: IncomeKind;
  /** One month's net income. */
  monthly: number;
  /** The account it is credited to. */
  accountId: string;
  /** Whether that account is already a Salary Account. */
  salaryAccount: boolean;
}

/* ── Advances ────────────────────────────────────────────────────────────── */

export type AdvanceStatus = "pending" | "declined" | "active" | "repaid";

export interface Advance {
  id: string;
  ownerId: string;
  kind: IncomeKind;
  reference: string;
  amount: number;
  processingFee: number;
  facilityFee: number;
  /** Where the advance is paid in. */
  accountId: string;
  requestedOn: string;
  status: AdvanceStatus;
  disbursedOn?: string;
  /** The income credit it is repaid from. */
  dueOn: string;
  repaidOn?: string;
  /** What was repaid, principal and interest together. */
  repaidAmount?: number;
  declineReason?: string;
}

/** Days the advance has been out by `on` (never less than one once paid in: the first day is charged). */
function daysOut(a: Pick<Advance, "disbursedOn">, on: string): number {
  if (!a.disbursedOn) return 0;
  return Math.max(daysBetween(a.disbursedOn, on), 1);
}

/** Interest owed on an active advance by `on`. */
export const interestBy = (a: Advance, on = MOCK_TODAY) => roundMoney(dailyInterest(a.amount) * daysOut(a, on));

/** Late charge owed by `on`: 5% of the advance for each month, or part of one, past the repayment date. */
export function lateChargeBy(a: Advance, on = MOCK_TODAY): number {
  const late = daysBetween(a.dueOn, on);
  if (late <= 0) return 0;
  return roundMoney(a.amount * LATE_CHARGE_RATE * Math.ceil(late / 30));
}

/** Everything owed today to clear the advance. */
export const owedBy = (a: Advance, on = MOCK_TODAY) => sumMoney([a.amount, interestBy(a, on), lateChargeBy(a, on)]);

/** What repaying on the repayment date would come to, worked out before the advance is taken. */
export function repaidOnDue(amount: number, today: string, dueOn: string) {
  const days = Math.max(daysBetween(today, dueOn), 1);
  const interest = roundMoney(dailyInterest(amount) * days);
  return { days, interest, total: sumMoney([amount, interest]) };
}

/* ── Store ───────────────────────────────────────────────────────────────── */

export type IncomeScenario = "salary" | "salary-no-account" | "national-service" | "pension" | "none";

interface LoansState {
  /** What the bank sees credited, per customer. Absent means no regular income lands at GCB. */
  incomes: Record<string, Income | null>;
  advances: Advance[];
  serial: number;
  /** Dev Mode: the next request fails outright, to walk the failure screen. */
  failRequests: boolean;

  request: (input: Pick<Advance, "ownerId" | "kind" | "amount" | "accountId">, switchAccount: boolean) => Advance;
  /** Dev Mode stands in for the bank's decision on pending requests. */
  decide: (ownerId: string, approve: boolean) => void;
  repay: (id: string, amount: number, on: string) => void;
  setFailRequests: (fail: boolean) => void;
  /** Customers who have seen the welcome to loans. */
  welcomed: Record<string, boolean>;
  markWelcomed: (ownerId: string, seen?: boolean) => void;
  /** Dev Mode: set who the customer is (their income), and optionally give them an advance. */
  seed: (ownerId: string, accountId: string, scenario: IncomeScenario, advance: "none" | "active" | "overdue" | "pending") => void;
}

const INCOME_FOR: Record<Exclude<IncomeScenario, "none">, Omit<Income, "accountId">> = {
  salary: { kind: "salary", monthly: 25_000, salaryAccount: true },
  "salary-no-account": { kind: "salary", monthly: 25_000, salaryAccount: false },
  "national-service": { kind: "national-service", monthly: 1_000, salaryAccount: true },
  pension: { kind: "pension", monthly: 3_750, salaryAccount: true },
};

const referenceFor = (serial: number) => `SAD-${MOCK_TODAY.slice(0, 4)}-${String(310_000 + serial * 41).slice(-6)}`;

export const useLoans = create<LoansState>()(
  persist(
    (set, get) => ({
      incomes: {},
      advances: [],
      serial: 1,
      failRequests: false,
      welcomed: {},
      markWelcomed: (ownerId, seen = true) => set((s) => ({ welcomed: { ...s.welcomed, [ownerId]: seen } })),

      request: (input, switchAccount) => {
        const serial = get().serial;
        const fees = advanceFees(input.amount);
        const advance: Advance = {
          ...input,
          id: `adv-${Date.now()}`,
          reference: referenceFor(serial),
          processingFee: fees.processing,
          facilityFee: fees.facility,
          requestedOn: MOCK_TODAY,
          status: "pending",
          dueOn: nextPayday(input.kind),
        };
        set((s) => {
          const income = s.incomes[input.ownerId];
          const incomes = switchAccount && income ? { ...s.incomes, [input.ownerId]: { ...income, salaryAccount: true } } : s.incomes;
          return { advances: [advance, ...s.advances], serial: s.serial + 1, incomes };
        });
        return advance;
      },

      decide: (ownerId, approve) =>
        set((s) => ({
          advances: s.advances.map((a) =>
            a.ownerId === ownerId && a.status === "pending"
              ? approve
                ? { ...a, status: "active", disbursedOn: MOCK_TODAY }
                : {
                    ...a,
                    status: "declined",
                    declineReason: "Your salary credits over the last three months were lower than this amount needs.",
                  }
              : a,
          ),
        })),

      repay: (id, amount, on) =>
        set((s) => ({ advances: s.advances.map((a) => (a.id === id ? { ...a, status: "repaid", repaidOn: on, repaidAmount: amount } : a)) })),

      setFailRequests: (fail) => set({ failRequests: fail }),

      seed: (ownerId, accountId, scenario, advance) =>
        set((s) => {
          const income = scenario === "none" ? null : { ...INCOME_FOR[scenario], accountId };
          const others = s.advances.filter((a) => a.ownerId !== ownerId);
          if (!income || advance === "none") return { incomes: { ...s.incomes, [ownerId]: income }, advances: others };
          const amount = roundMoney(income.monthly * ADVANCE_SHARE * 0.4);
          const fees = advanceFees(amount);
          const overdue = advance === "overdue";
          const disbursedOn = addDays(MOCK_TODAY, overdue ? -48 : -12);
          const seeded: Advance = {
            id: `adv-${ownerId}-seed`,
            ownerId,
            kind: income.kind,
            reference: referenceFor(7),
            amount,
            processingFee: fees.processing,
            facilityFee: fees.facility,
            accountId,
            requestedOn: disbursedOn,
            status: advance === "pending" ? "pending" : "active",
            disbursedOn: advance === "pending" ? undefined : disbursedOn,
            dueOn: overdue ? addDays(MOCK_TODAY, -13) : nextPayday(income.kind),
          };
          return { incomes: { ...s.incomes, [ownerId]: { ...income, salaryAccount: true } }, advances: [seeded, ...others] };
        }),
    }),
    { name: "nibs-loans" },
  ),
);

/** True once the saved loans have been read back (they only exist in the browser). */
export function useLoansHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const api = useLoans.persist;
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
 * The signed-in customer's loans and what they can take. A customer the store has never seen gets the default: a
 * salary paid into their first account, already a Salary Account, so the advance works out of the box.
 */
export function useMyLoans() {
  const accounts = useTreasuryAccounts();
  const defaultAccountId = accounts[0]?.id ?? "";
  const ownerId = useSession((s) => s.actor?.id) ?? "guest";
  const incomes = useLoans((s) => s.incomes);
  const all = useLoans((s) => s.advances);
  const welcomedAll = useLoans((s) => s.welcomed);
  return useMemo(() => {
    const stored = incomes[ownerId];
    const income: Income | null =
      stored === undefined ? (defaultAccountId ? { ...INCOME_FOR.salary, accountId: defaultAccountId } : null) : stored;
    const advances = all.filter((a) => a.ownerId === ownerId);
    const open = advances.find((a) => a.status === "pending" || a.status === "active");
    const limit = income ? Math.floor((income.monthly * ADVANCE_SHARE) / 10) * 10 : 0;
    return { ownerId, income, advances, open, limit, welcomed: Boolean(welcomedAll[ownerId]), product: income ? ADVANCE_PRODUCTS[income.kind] : undefined };
  }, [ownerId, incomes, all, welcomedAll, defaultAccountId]);
}
