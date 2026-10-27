"use client";

/**
 * Insure (bancassurance): the customer's insurance profile, policies, the people named on them, and claims, with the
 * pricing math. The plans on offer are in `insurance-plans.ts`, which server pages can read.
 *
 * The profile is created once and kept (one per signed-in customer). Every plan reads it, so what the customer said
 * about themselves, their lifestyle and their health is never asked twice. Beneficiaries and trustees are kept the same
 * way: someone named on one policy is offered as saved on the next.
 *
 * Nothing is taken when a policy is bought: the first premium is deducted in the month and window the customer chose.
 * Paying arrears is the one insurance action that moves money at once.
 *
 * Prototype only: the store lives in this browser. `BANK_RECORDS` stands in for the bank's own customer record
 * (date of birth, gender, ID), which the real service looks up, so the customer never types it.
 */

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSession } from "@/lib/session-store";
import { roundMoney, sumMoney } from "@/lib/money";
import { addMonths, daysBetween, MOCK_TODAY } from "@/lib/treasury";
import {
  COVER_TIERS,
  DEDUCTION_WINDOWS,
  findTier,
  MEMBER_RULES,
  MIN_MONTHLY_PREMIUM,
  NON_MEDICAL_LIMIT,
  PROTECTION_RATE_PER_1000,
  PROTECTION_SUMS,
  SAVINGS_GROWTH,
  type ClaimTypeId,
  type CoverTierId,
  type DeductionWindow,
  type Frequency,
  type MemberRelationship,
  type PlanId,
} from "@/lib/insurance-plans";

/* ── Answers the profile asks for ───────────────────────────────────────────── */

export const INSURANCE_TITLES = [
  "Mr.", "Mrs.", "Ms.", "Miss", "Dr.", "Prof.", "Rev.", "Sir", "Lady", "Lord", "Dame", "Mx.", "Capt.", "Hon.",
  "Nana", "Togbe", "Mama", "Otumfuo", "Oheneba", "Naa", "Obaapayin", "Okyeame", "Barima",
] as const;

export const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed", "Separated"] as const;

export const ALCOHOL_TYPES = [
  "Beer",
  "Wine (Red/white/Rosé)",
  "Spirits (Whisky, Vodka, Gin, Rum, etc.)",
  "Brandy / Cognac",
  "Liqueurs / Cocktails",
  "Cider",
  "Champagne / Sparkling Wine",
] as const;

export const WEEKLY_ALCOHOL = [
  "Occasionally (Less than once a week)",
  "1 - 5 Units",
  "6 - 10 Units",
  "11 - 15 Units",
  "16 - 20 Units",
  "21 - 30 Units",
  "31 - 40 Units",
  "More than 40 Units",
] as const;

export const SMOKE_TYPES = [
  "Cigarettes",
  "Cigars",
  "Cigarillos",
  "Pipe Tobacco",
  "Shisha / Hookah",
  "Electronic Cigarettes",
  "Marijuana / Cannabis",
  "Chewing Tobacco / Snuff",
] as const;

export const SMOKE_QUANTITIES = [
  "Occasionally (Less than 5 per week)",
  "5 - 10 per week",
  "11 - 15 per week",
  "16 - 20 per week",
  "21 - 30 per week",
  "More than 30 per week",
] as const;

/* ── The profile ───────────────────────────────────────────────────────────── */

export interface InsuranceProfile {
  title: string;
  maritalStatus: string;
  occupation: string;
  pep: boolean;
  residentialAddress: string;
  postalAddress: string;
  signature: { name: string; size: number };
  lifestyle: {
    drinks: boolean;
    alcoholTypes: string[];
    alcoholOther: string;
    weeklyAlcohol: string;
    smokes: boolean;
    smokeTypes: string[];
    smokeOther: string;
    smokeQuantity: string;
  };
  medical: {
    goodHealth: boolean;
    condition: boolean;
    conditionDetail: string;
    medication: boolean;
    medicationDetail: string;
    surgery: boolean;
    surgeryDetail: string;
  };
  createdOn: string;
}

/* ── People named on policies ──────────────────────────────────────────────── */

/**
 * Someone the customer names on a policy: a beneficiary, or a trustee who receives a payout for a beneficiary under
 * 18. Kept once per customer, so the next policy offers them as saved instead of asking again.
 */
export interface InsuredPerson {
  id: string;
  ownerId: string;
  fullName: string;
  /** yyyy-mm-dd */
  dateOfBirth: string;
  gender: "Female" | "Male";
  relationship: string;
  phone: string;
  /** Trustees only. */
  email?: string;
  address?: string;
}

/** A beneficiary's share of the payout, in whole percent. A policy's shares add up to 100. */
export interface BeneficiaryShare {
  personId: string;
  share: number;
}

/** Someone besides the policyholder covered on a HomeCall policy, at their own cover level. */
export interface CoveredMember {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: "Female" | "Male";
  relationship: MemberRelationship;
  tier: CoverTierId;
}

/* ── Policies ──────────────────────────────────────────────────────────────── */

export type PolicyStatus = "active" | "pending-medical" | "cancel-requested";

export interface Policy {
  id: string;
  ownerId: string;
  planId: PlanId;
  /** What the customer quotes to StarLife. */
  number: string;
  createdOn: string;
  status: PolicyStatus;
  /** The premium per payment, at today's level. */
  premium: number;
  frequency: Frequency;
  increment: number;
  sumAssured: number;
  termYears?: number;
  /** HomeCall: the policyholder's own cover level. */
  tier?: CoverTierId;
  members: CoveredMember[];
  /** yyyy-mm: the month the first premium is taken. */
  startMonth: string;
  window: DeductionWindow;
  accountId: string;
  beneficiaries: BeneficiaryShare[];
  trusteeId?: string;
  /** Premiums taken so far. */
  payments: { date: string; amount: number }[];
  /** Premiums that fell due and weren't taken, oldest first. */
  arrears: { due: string; amount: number }[];
  cancellation?: { reason: string; requestedOn: string };
}

export interface Claim {
  id: string;
  ownerId: string;
  policyId: string;
  type: ClaimTypeId;
  reference: string;
  submittedOn: string;
  /** Who or what it is about: the person who died, the child, or the plan itself. */
  subject: string;
  payoutAccountId: string;
}

interface InsuranceState {
  /** One profile per signed-in customer, by their id. */
  profiles: Record<string, InsuranceProfile>;
  policies: Policy[];
  people: InsuredPerson[];
  claims: Claim[];
  /** Counter behind policy numbers and claim references. */
  serial: number;
  /** Dev Mode: the next requests fail, so the failure screen can be walked through. */
  failRequests: boolean;
  /** Customers who have seen the welcome to insurance. */
  welcomed: Record<string, boolean>;
  markWelcomed: (ownerId: string, seen?: boolean) => void;

  saveProfile: (ownerId: string, profile: InsuranceProfile) => void;
  clearProfile: (ownerId: string) => void;
  /** Adds or updates a person, and returns them. */
  savePerson: (person: Omit<InsuredPerson, "id"> & { id?: string }) => InsuredPerson;
  buy: (input: Omit<Policy, "id" | "number" | "createdOn" | "payments" | "arrears" | "status">) => Policy;
  setBeneficiaries: (policyId: string, beneficiaries: BeneficiaryShare[], trusteeId?: string) => void;
  /** Clears the arrears and records each as paid today. */
  payArrears: (policyId: string, date: string) => void;
  requestCancellation: (policyId: string, reason: string, date: string) => void;
  fileClaim: (input: Omit<Claim, "id" | "reference">) => Claim;
  setFailRequests: (fail: boolean) => void;
  /** Dev Mode: give the customer this many of the sample policies (0 to 4), and arrears on the first or not. */
  seedPolicies: (ownerId: string, accountId: string, count: number, arrears: boolean) => void;
}

export const useInsurance = create<InsuranceState>()(
  persist(
    (set, get) => ({
      profiles: {},
      policies: [],
      people: [],
      claims: [],
      serial: 1,
      failRequests: false,
      welcomed: {},
      markWelcomed: (ownerId, seen = true) => set((s) => ({ welcomed: { ...s.welcomed, [ownerId]: seen } })),

      saveProfile: (ownerId, profile) => set((s) => ({ profiles: { ...s.profiles, [ownerId]: profile } })),
      clearProfile: (ownerId) =>
        set((s) => {
          const profiles = { ...s.profiles };
          delete profiles[ownerId];
          return { profiles };
        }),

      savePerson: (input) => {
        const person: InsuredPerson = { ...input, id: input.id ?? `ip-${Date.now()}-${Math.round(Math.random() * 1000)}` };
        set((s) => ({ people: [...s.people.filter((p) => p.id !== person.id), person] }));
        return person;
      },

      buy: (input) => {
        const serial = get().serial;
        const policy: Policy = {
          ...input,
          id: `pol-${Date.now()}`,
          number: policyNumber(input.planId, serial + 100),
          createdOn: MOCK_TODAY,
          status: input.sumAssured > NON_MEDICAL_LIMIT ? "pending-medical" : "active",
          payments: [],
          arrears: [],
        };
        set((s) => ({ policies: [policy, ...s.policies], serial: s.serial + 1 }));
        return policy;
      },

      setBeneficiaries: (policyId, beneficiaries, trusteeId) =>
        set((s) => ({ policies: s.policies.map((p) => (p.id === policyId ? { ...p, beneficiaries, trusteeId } : p)) })),

      payArrears: (policyId, date) =>
        set((s) => ({
          policies: s.policies.map((p) =>
            p.id === policyId ? { ...p, payments: [...p.payments, ...p.arrears.map((a) => ({ date, amount: a.amount }))], arrears: [] } : p,
          ),
        })),

      requestCancellation: (policyId, reason, date) =>
        set((s) => ({
          policies: s.policies.map((p) => (p.id === policyId ? { ...p, status: "cancel-requested", cancellation: { reason, requestedOn: date } } : p)),
        })),

      fileClaim: (input) => {
        const serial = get().serial;
        const claim: Claim = { ...input, id: `clm-${Date.now()}`, reference: `CLM-${input.submittedOn.slice(0, 4)}-${String(880_000 + serial * 13).slice(-6)}` };
        set((s) => ({ claims: [claim, ...s.claims], serial: s.serial + 1 }));
        return claim;
      },

      setFailRequests: (fail) => set({ failRequests: fail }),

      seedPolicies: (ownerId, accountId, count, arrears) => {
        const sample = samplePolicies(ownerId, accountId, arrears).slice(0, count);
        const people = samplePeople(ownerId);
        set((s) => ({
          policies: [...s.policies.filter((p) => p.ownerId !== ownerId), ...sample],
          people: [...s.people.filter((p) => p.ownerId !== ownerId), ...(count > 0 ? people : [])],
          claims: s.claims.filter((c) => c.ownerId !== ownerId),
        }));
      },
    }),
    { name: "nibs-insurance" },
  ),
);

const PLAN_CODES: Partial<Record<PlanId, string>> = {
  "child-education": "CEP",
  homecall: "HCP",
  wealthmaster: "WMP",
  "ultimate-protection": "UPP",
};

function policyNumber(planId: PlanId, serial: number): string {
  return `${PLAN_CODES[planId] ?? "POL"}/${MOCK_TODAY.slice(0, 4)}/${String(40_000 + serial * 97).padStart(6, "0")}`;
}

/* ── Dates and pricing ─────────────────────────────────────────────────────── */

/** Whole years old on a date. */
export function ageOn(dateOfBirth: string, on = MOCK_TODAY): number {
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** "2026-11" → "November 2026". */
export function monthLabel(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00`);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** The three months a new policy can start in: the next three after today. */
export function startMonths(today = MOCK_TODAY): string[] {
  return [1, 2, 3].map((n) => addMonths(`${today.slice(0, 7)}-01`, n).slice(0, 7));
}

/** The first day of the deduction window in a month, as yyyy-mm-dd. */
export function deductionDate(ym: string, window: DeductionWindow): string {
  const day = DEDUCTION_WINDOWS.find((w) => w.value === window)?.day ?? 12;
  return `${ym}-${String(day).padStart(2, "0")}`;
}

/** "between 12th and 16th November 2026". */
export function firstDeductionLabel(ym: string, window: DeductionWindow): string {
  const w = DEDUCTION_WINDOWS.find((x) => x.value === window) ?? DEDUCTION_WINDOWS[0];
  return `${w.days.replace(" to ", " and ")} ${monthLabel(ym)}`;
}

/** What `annual` comes to per payment. */
export const perPayment = (annual: number, frequency: Frequency) => roundMoney(frequency === "monthly" ? annual / 12 : annual);
/** A payment back to a year's worth. */
export const toAnnual = (premium: number, frequency: Frequency) => roundMoney(frequency === "monthly" ? premium * 12 : premium);

/** Each year's premium relative to the first, summed over the term: with no increment, simply the number of years. */
function growthYears(years: number, increment: number): number {
  let total = 0;
  for (let k = 0; k < years; k++) total += (1 + increment / 100) ** k;
  return total;
}

/** Savings plans: what a first-year premium of `annual` grows to over the term. */
export function savingsSumAssured(annual: number, years: number, increment: number): number {
  return roundMoney(annual * growthYears(years, increment) * SAVINGS_GROWTH);
}

/** Savings plans: the first-year premium that grows to `sumAssured`. */
export function savingsAnnualFor(sumAssured: number, years: number, increment: number): number {
  return roundMoney(sumAssured / (growthYears(years, increment) * SAVINGS_GROWTH));
}

/** Ultimate Protection: the yearly premium for a sum assured. Older customers and longer terms cost more. */
export function protectionAnnual(sumAssured: number, age: number, years: number): number {
  const loading = (1 + Math.max(0, age - 30) * 0.04) * (1 + years * 0.01);
  return roundMoney((sumAssured / 1000) * PROTECTION_RATE_PER_1000 * loading);
}

/**
 * The least a plan costs a month, for the plan cards: the cheapest cover level, for a 30-year-old on the shortest term.
 * It is a "from" price, so the quote on the buy screen (which uses the customer's own age) can only be higher.
 */
export function planFromMonthly(plan: { kind?: "savings" | "protection" | "funeral"; term?: { min: number } }): number | null {
  if (plan.kind === "savings") return MIN_MONTHLY_PREMIUM;
  if (plan.kind === "funeral") return COVER_TIERS[0].monthly;
  if (plan.kind === "protection") return roundMoney(protectionAnnual(PROTECTION_SUMS[0], 30, plan.term?.min ?? 8) / 12);
  return null;
}

/** HomeCall: the monthly premium for one person at a cover level. */
export function memberMonthly(tier: CoverTierId, relationship?: MemberRelationship): number {
  const factor = relationship ? MEMBER_RULES[relationship].factor : 1;
  return roundMoney(findTier(tier).monthly * factor);
}

/** HomeCall: everyone's monthly premiums together. */
export function funeralMonthly(tier: CoverTierId, members: Pick<CoveredMember, "tier" | "relationship">[]): number {
  return sumMoney([memberMonthly(tier), ...members.map((m) => memberMonthly(m.tier, m.relationship))]);
}

/** When a policy with a term ends. */
export const maturityOf = (p: Pick<Policy, "startMonth" | "termYears">) =>
  p.termYears ? addMonths(`${p.startMonth}-01`, p.termYears * 12) : undefined;

/** Premiums paid in so far. */
export const premiumsPaid = (p: Pick<Policy, "payments">) => sumMoney(p.payments.map((x) => x.amount));
export const outstanding = (p: Pick<Policy, "arrears">) => sumMoney(p.arrears.map((a) => a.amount));

/** A policy that needs the customer: missed premiums, a medical assessment to wait for, or a cancellation in progress. */
export const needsAttention = (p: Pick<Policy, "arrears" | "status">) =>
  p.arrears.length > 0 || p.status === "pending-medical" || p.status === "cancel-requested";

/**
 * Savings plans: what cashing the policy in would pay today. Placeholder rule until StarLife confirms its own: nothing
 * in the first two years, then 70% of the premiums paid, rising 5 points a year to 95%.
 */
export function surrenderValue(p: Pick<Policy, "payments" | "startMonth">, today = MOCK_TODAY): number {
  const years = Math.floor(daysBetween(`${p.startMonth}-01`, today) / 365);
  if (years < 2) return 0;
  const rate = Math.min(0.7 + (years - 2) * 0.05, 0.95);
  return roundMoney(premiumsPaid(p) * rate);
}

/** Savings plans: a policy loan is up to 80% of the surrender value. */
export const loanLimit = (p: Pick<Policy, "payments" | "startMonth">) => roundMoney(surrenderValue(p) * 0.8);

/* ── Sample customers, for Dev Mode ────────────────────────────────────────── */

function samplePeople(ownerId: string): InsuredPerson[] {
  const base = { ownerId };
  return [
    { ...base, id: `ip-${ownerId}-1`, fullName: "Naa Shika Mensah", dateOfBirth: "1994-04-18", gender: "Female", relationship: "Sister", phone: "0244123456" },
    { ...base, id: `ip-${ownerId}-2`, fullName: "Nii Noye Bortey", dateOfBirth: "1989-09-02", gender: "Male", relationship: "Brother", phone: "0201234567" },
    { ...base, id: `ip-${ownerId}-3`, fullName: "Prince Nii Mills", dateOfBirth: "2014-06-15", gender: "Male", relationship: "Son", phone: "0544123456" },
    {
      ...base,
      id: `ip-${ownerId}-4`,
      fullName: "John Akuffo",
      dateOfBirth: "1984-09-14",
      gender: "Male",
      relationship: "Uncle",
      phone: "0241234567",
      email: "akuffo011@gmail.com",
      address: "House 1, Lomotey Street, Accra",
    },
  ];
}

/** Monthly premiums taken from `from` (yyyy-mm) up to and including `to`. */
function monthlyPayments(from: string, to: string, window: DeductionWindow, amount: number) {
  const out: { date: string; amount: number }[] = [];
  for (let ym = from; ym <= to; ym = addMonths(`${ym}-01`, 1).slice(0, 7)) out.push({ date: deductionDate(ym, window), amount });
  return out;
}

function samplePolicies(ownerId: string, accountId: string, arrears: boolean): Policy[] {
  const id = (n: number) => `pol-${ownerId}-${n}`;
  const person = (n: number) => `ip-${ownerId}-${n}`;
  const common = { ownerId, accountId, status: "active" as const, members: [] as CoveredMember[], increment: 0, frequency: "monthly" as const };

  const wealthPremium = 500;
  const wealth: Policy = {
    ...common,
    id: id(1),
    planId: "wealthmaster",
    number: "WMP/2024/041203",
    createdOn: "2024-01-20",
    premium: wealthPremium,
    termYears: 5,
    sumAssured: savingsSumAssured(toAnnual(wealthPremium, "monthly"), 5, 0),
    startMonth: "2024-02",
    window: "mid",
    beneficiaries: [
      { personId: person(1), share: 60 },
      { personId: person(2), share: 40 },
    ],
    payments: monthlyPayments("2024-02", arrears ? "2026-07" : "2026-09", "mid", wealthPremium),
    arrears: arrears
      ? [
          { due: "2026-08-12", amount: wealthPremium },
          { due: "2026-09-12", amount: wealthPremium },
        ]
      : [],
  };

  const funeralMembers: CoveredMember[] = [
    { id: `cm-${ownerId}-1`, fullName: "Prince Nii Mills", dateOfBirth: "2014-06-15", gender: "Male", relationship: "Child", tier: "standard" },
  ];
  const funeralPremium = funeralMonthly("prestige", funeralMembers);
  const funeral: Policy = {
    ...common,
    id: id(2),
    planId: "homecall",
    number: "HCP/2025/045880",
    createdOn: "2025-05-28",
    premium: funeralPremium,
    tier: "prestige",
    members: funeralMembers,
    sumAssured: sumMoney([findTier("prestige").benefit, findTier("standard").benefit]),
    startMonth: "2025-06",
    window: "end",
    beneficiaries: [{ personId: person(1), share: 100 }],
    payments: monthlyPayments("2025-06", "2026-09", "end", funeralPremium),
    arrears: [],
  };

  const educationPremium = 300;
  const education: Policy = {
    ...common,
    id: id(3),
    planId: "child-education",
    number: "CEP/2023/040318",
    createdOn: "2023-08-30",
    premium: educationPremium,
    termYears: 15,
    sumAssured: savingsSumAssured(toAnnual(educationPremium, "monthly"), 15, 0),
    startMonth: "2023-09",
    window: "mid",
    beneficiaries: [{ personId: person(3), share: 100 }],
    trusteeId: person(4),
    payments: monthlyPayments("2023-09", "2026-09", "mid", educationPremium),
    arrears: [],
  };

  const protectionSum = 100_000;
  const protectionPremium = perPayment(protectionAnnual(protectionSum, 35, 10), "monthly");
  const protection: Policy = {
    ...common,
    id: id(4),
    planId: "ultimate-protection",
    number: "UPP/2026/046077",
    createdOn: "2025-12-15",
    premium: protectionPremium,
    termYears: 10,
    sumAssured: protectionSum,
    startMonth: "2026-01",
    window: "end",
    beneficiaries: [
      { personId: person(1), share: 50 },
      { personId: person(3), share: 50 },
    ],
    trusteeId: person(4),
    payments: monthlyPayments("2026-01", "2026-09", "end", protectionPremium),
    arrears: [],
  };

  return [wealth, funeral, education, protection];
}

/** A finished sample profile, so Dev Mode can jump past the questionnaire. */
export function sampleProfile(): InsuranceProfile {
  return {
    title: "Mr.",
    maritalStatus: "Married",
    occupation: "Accountant",
    pep: false,
    residentialAddress: "House No. 14, 5th Avenue, East Legon",
    postalAddress: "P.O. Box CT 1234",
    signature: { name: "my_signature.jpg", size: 5_120 },
    lifestyle: { drinks: false, alcoholTypes: [], alcoholOther: "", weeklyAlcohol: "", smokes: false, smokeTypes: [], smokeOther: "", smokeQuantity: "" },
    medical: { goodHealth: true, condition: false, conditionDetail: "", medication: false, medicationDetail: "", surgery: false, surgeryDetail: "" },
    createdOn: MOCK_TODAY,
  };
}

/** True once the saved insurance records have been read back (they only exist in the browser). */
export function useInsuranceHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const api = useInsurance.persist;
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

/** The signed-in customer's insurance picture, from the one store. */
export function useMyInsurance() {
  const ownerId = useSession((s) => s.actor?.id) ?? "guest";
  const profiles = useInsurance((s) => s.profiles);
  const allPolicies = useInsurance((s) => s.policies);
  const allPeople = useInsurance((s) => s.people);
  const allClaims = useInsurance((s) => s.claims);
  const welcomedAll = useInsurance((s) => s.welcomed);
  return useMemo(() => {
    const policies = allPolicies.filter((p) => p.ownerId === ownerId);
    const people = allPeople.filter((p) => p.ownerId === ownerId);
    return {
      ownerId,
      profile: profiles[ownerId] as InsuranceProfile | undefined,
      policies,
      people,
      claims: allClaims.filter((c) => c.ownerId === ownerId),
      welcomed: Boolean(welcomedAll[ownerId]),
      personOf: (id: string | undefined) => people.find((p) => p.id === id),
    };
  }, [ownerId, profiles, allPolicies, allPeople, allClaims, welcomedAll]);
}

/** One policy by id, with its claims, for the policy screens. */
export function usePolicy(id: string) {
  const mine = useMyInsurance();
  return useMemo(
    () => ({ ...mine, policy: mine.policies.find((p) => p.id === id), policyClaims: mine.claims.filter((c) => c.policyId === id) }),
    [mine, id],
  );
}

/* ── What the bank already knows ───────────────────────────────────────────── */

export interface BankRecord {
  dateOfBirth: string;
  gender: "Female" | "Male";
  idType: string;
  idNumber: string;
}

/** Prototype stand-in for the bank's customer record, by actor id. A customer not listed here has no record to show. */
const BANK_RECORDS: Record<string, BankRecord> = {
  "u-retail": { dateOfBirth: "1991-03-14", gender: "Male", idType: "Ghana Card", idNumber: "GHA-723456789-1" },
  "u-clean": { dateOfBirth: "1995-11-02", gender: "Male", idType: "Ghana Card", idNumber: "GHA-612345678-4" },
  "u-single": { dateOfBirth: "1988-07-21", gender: "Male", idType: "Ghana Card", idNumber: "GHA-534567890-7" },
};

export const bankRecordOf = (actorId: string | undefined): BankRecord | undefined => (actorId ? BANK_RECORDS[actorId] : undefined);

/** 1993-05-27 → "27th May 1993". */
export function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${day}${suffix} ${d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
}

/** "Beer, Wine" from the chosen types and an optional "other" the customer typed. */
export function joinChoices(types: string[], other: string): string {
  return [...types.map((t) => t.replace(/\s*\(.*\)$/, "")), ...(other.trim() ? [other.trim()] : [])].join(", ");
}
