/**
 * The insurance plans on offer, and every fact about a plan that more than one screen shows: what it is, how long it
 * runs, how it is priced, who it can cover and what can be claimed. Plain data, with no browser code, so server pages
 * can read it. The customer's profile, policies and claims live in `insurance.ts`.
 *
 * Prices, limits and the surrender rule are placeholders until StarLife Assurance confirms its own tables. They live
 * here and nowhere else, so the plan page, the quote, the review and the policy always agree.
 */

export type PlanId =
  | "child-education"
  | "homecall"
  | "wealthmaster"
  | "ultimate-protection"
  | "savings-protection"
  | "vehicle"
  | "travel"
  | "personal-accident";

/**
 * How a plan is priced.
 *  - `savings`: the customer picks a premium or the benefit they want, and the other follows (WealthMaster, Child
 *    Education).
 *  - `protection`: the customer picks the sum assured from a list, and the premium follows (Ultimate Protection).
 *  - `funeral`: the customer picks a cover level for themselves and each person they add (HomeCall).
 */
export type PlanKind = "savings" | "protection" | "funeral";

export type ClaimTypeId =
  | "death"
  | "maturity"
  | "surrender"
  | "refund"
  | "disability"
  | "critical-illness"
  | "loan"
  | "retrenchment"
  | "school-fees"
  | "cashback"
  | "accident"
  | "hospital-cash";

export type { HighlightIcon, PlanHighlight } from "@/lib/product-highlights";
import type { PlanHighlight } from "@/lib/product-highlights";

export interface InsurancePlan {
  id: PlanId;
  name: string;
  /** False for plans the bank has not opened yet: they are listed so the customer knows they are coming. */
  available: boolean;
  /** One line for the plans list. */
  line?: string;
  /** The plan page's opening paragraph. */
  description?: string;
  benefits?: readonly string[];
  /** A picture of the plan for the top of its page, as a path under `public/` (for example `/plans/homecall.webp`). Until one is supplied the page draws a flat scene. */
  image?: string;
  /** The benefits again as icon, label and short value. Shown on the picture; `benefits` is the full wording. */
  highlights?: readonly PlanHighlight[];
  kind?: PlanKind;
  /** Policy term, in whole years. Funeral cover has no term: it runs while premiums are paid. */
  term?: { min: number; max: number };
  claimTypes?: readonly ClaimTypeId[];
  /** What the customer should have ready before filing a claim, shown at the top of the claim form. */
  claimChecklist?: readonly string[];
}

export const INSURANCE_PLANS: readonly InsurancePlan[] = [
  {
    id: "child-education",
    name: "Child Education Plan",
    available: true,
    line: "Save for school fees with life protection.",
    image: "/plans/child-education.webp",
    description:
      "Save towards your child’s education, with cover that keeps the plan going if something happens to you.",
    benefits: ["Lump sum paid within 48 to 72 hours of an approved claim", "School fees are paid even if you can’t"],
    highlights: [
      { icon: "payout", label: "Fast payout", value: "Within 48 to 72 hours of an approved claim" },
      { icon: "school", label: "School fees stay covered", value: "Paid even if you’re no longer able to" },
    ],
    kind: "savings",
    term: { min: 10, max: 25 },
    claimTypes: ["school-fees", "maturity", "surrender", "loan", "refund", "disability", "retrenchment"],
    claimChecklist: ["Your child’s details", "Proof of school enrolment, for school fees", "A valid ID"],
  },
  {
    id: "homecall",
    name: "HomeCall Plan",
    available: true,
    line: "Financial support for funeral expenses.",
    image: "/plans/homecall.webp",
    description: "Help your family cover funeral expenses in a difficult time. Cover yourself, and add the people close to you.",
    benefits: ["Lump sum paid within 48 to 72 hours of an approved claim", "Cover your spouse, children and parents too", "Accidental deaths are covered from day one"],
    highlights: [
      { icon: "payout", label: "Fast payout", value: "Within 48 to 72 hours of an approved claim" },
      { icon: "family", label: "Your family", value: "Cover your spouse, children and parents too" },
      { icon: "accident", label: "Accidental death", value: "Covered from day one" },
    ],
    kind: "funeral",
    claimTypes: ["death", "accident", "hospital-cash", "cashback", "refund"],
    claimChecklist: [
      "The death certificate",
      "The medical certificate of cause of death",
      "A police report, if the death was accidental",
      "A valid ID",
    ],
  },
  {
    id: "wealthmaster",
    name: "WealthMaster Plan",
    available: true,
    line: "Save regularly with insurance cover.",
    image: "/plans/wealthmaster.webp",
    description: "Save regularly and grow a lump sum, with life cover for the people who depend on you.",
    benefits: ["Lump sum paid within 48 to 72 hours of an approved claim", "Your loved ones are paid if something happens to you"],
    highlights: [
      { icon: "payout", label: "Fast payout", value: "Within 48 to 72 hours of an approved claim" },
      { icon: "family", label: "Your loved ones", value: "Paid if something happens to you" },
    ],
    kind: "savings",
    term: { min: 4, max: 10 },
    claimTypes: ["maturity", "surrender", "loan", "refund", "disability"],
    claimChecklist: ["Your policy details", "Proof of the event, for disability", "A valid ID"],
  },
  {
    id: "ultimate-protection",
    name: "Ultimate Protection Plan",
    available: true,
    line: "Total protection for you and your loved ones.",
    image: "/plans/ultimate-protection.webp",
    description: "Keep an income if illness or disability stops you working, and leave your family a lump sum.",
    benefits: ["Lump sum paid within 48 to 72 hours of an approved claim", "Covers total and permanent disability", "Covers critical illness"],
    highlights: [
      { icon: "payout", label: "Fast payout", value: "Within 48 to 72 hours of an approved claim" },
      { icon: "disability", label: "Disability cover", value: "If you can no longer work, for good" },
      { icon: "illness", label: "Critical illness cover", value: "If you’re diagnosed with a serious illness" },
    ],
    kind: "protection",
    term: { min: 8, max: 20 },
    claimTypes: ["critical-illness", "disability", "maturity", "refund"],
    claimChecklist: ["A medical report for the illness or disability", "A valid ID"],
  },
  { id: "savings-protection", name: "Savings Protection Plan", available: false },
  { id: "vehicle", name: "Vehicle Insurance", available: false },
  { id: "travel", name: "Travel Insurance", available: false },
  { id: "personal-accident", name: "Personal Accident", available: false },
];

export const findPlan = (id: string) => INSURANCE_PLANS.find((p) => p.id === id);

export const INSURE_HOME = "/insure";
export const PROVIDER = "StarLife Assurance";

/* ── Claims ────────────────────────────────────────────────────────────────── */

export const CLAIM_TYPES: Record<ClaimTypeId, { label: string; detail: string }> = {
  death: { label: "Death", detail: "Someone covered on this policy has died." },
  maturity: { label: "Maturity", detail: "The policy has reached the end of its term." },
  surrender: { label: "Surrender Value", detail: "Cash in the policy before it ends. Your cover stops." },
  loan: { label: "Policy Loan", detail: "Borrow against the policy’s cash value. Your cover continues." },
  refund: { label: "Refund", detail: "A premium was taken in error or twice." },
  disability: { label: "Total and Permanent Disability", detail: "An illness or injury means you can no longer work." },
  "critical-illness": { label: "Critical Illness", detail: "You’ve been diagnosed with a covered serious illness." },
  retrenchment: { label: "Retrenchment", detail: "You lost your job, so premiums are paused for you." },
  "school-fees": { label: "School Fees", detail: "Pay this term’s fees from the plan." },
  cashback: { label: "Policy Cashback", detail: "The cash back this plan pays at set points in its life." },
  accident: { label: "Personal Accident", detail: "An accident caused an injury that needed treatment." },
  "hospital-cash": { label: "Hospital Cash Benefit", detail: "A daily amount for each night someone covered spent in hospital." },
};

/** Death claims on HomeCall need these on top of the claimant’s ID. A police report joins them for an accidental death. */
export const DEATH_DOCUMENTS = ["Death Certificate", "Medical Certificate of Cause of Death"] as const;

/** Funeral cover starts paying for a death from natural causes after this many days. Accidental deaths are covered at once. */
export const WAITING_PERIOD_DAYS = 90;

/* ── Pricing ──────────────────────────────────────────────────────────────── */

export type Frequency = "monthly" | "annually";
export const FREQUENCIES: readonly { value: Frequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "annually", label: "Annually" },
];

/** When in the month the premium is taken. Placeholders for the bank's own deduction windows. */
export type DeductionWindow = "mid" | "end";
export const DEDUCTION_WINDOWS: readonly { value: DeductionWindow; label: string; days: string; day: number }[] = [
  { value: "mid", label: "Mid-Month (12th–16th)", days: "12th to 16th", day: 12 },
  { value: "end", label: "End of Month (26th–31st)", days: "26th to 31st", day: 26 },
];

/** A yearly rise in the premium, to grow what the plan pays. */
export const INCREMENTS: readonly { value: number; label: string }[] = [
  { value: 0, label: "None" },
  { value: 5, label: "5% a year" },
  { value: 10, label: "10% a year" },
];

export const MIN_MONTHLY_PREMIUM = 50;

/**
 * A savings plan pays back what was paid in plus growth. Placeholder: 25% on top of the premiums paid over the term.
 * The figure the plan pays is called the sum assured, and is also paid to the beneficiaries if the customer dies.
 */
export const SAVINGS_GROWTH = 1.25;

/** Above this sum assured StarLife needs a medical assessment before cover starts. */
export const NON_MEDICAL_LIMIT = 500_000;

/** Ultimate Protection: the sums assured on offer, and the yearly premium per GHS 1,000 of cover at 30 (placeholder). */
export const PROTECTION_SUMS = [50_000, 100_000, 200_000, 300_000] as const;
export const PROTECTION_RATE_PER_1000 = 9;
/** Ultimate Protection pays a disability income up to this age. */
export const PROTECTION_BENEFIT_AGE = 70;

/** HomeCall cover levels: the funeral benefit and the monthly premium for a main member, spouse or child. */
export type CoverTierId = "basic" | "standard" | "prestige" | "elite" | "ultimate";
export const COVER_TIERS: readonly { id: CoverTierId; label: string; benefit: number; monthly: number }[] = [
  { id: "basic", label: "Basic", benefit: 2_500, monthly: 8 },
  { id: "standard", label: "Standard", benefit: 5_000, monthly: 15 },
  { id: "prestige", label: "Prestige", benefit: 10_000, monthly: 22 },
  { id: "elite", label: "Elite", benefit: 15_000, monthly: 32 },
  { id: "ultimate", label: "Ultimate", benefit: 30_000, monthly: 60 },
];
export const findTier = (id: CoverTierId) => COVER_TIERS.find((t) => t.id === id) ?? COVER_TIERS[0];

/** Who HomeCall can cover besides the policyholder, with the ages accepted and how their premium compares. */
export type MemberRelationship = "Spouse" | "Child" | "Parent" | "Other family member";
export const MEMBER_RULES: Record<MemberRelationship, { min: number; max: number; factor: number }> = {
  Spouse: { min: 18, max: 64, factor: 1 },
  Child: { min: 0, max: 23, factor: 0.4 },
  Parent: { min: 18, max: 74, factor: 1.8 },
  "Other family member": { min: 18, max: 74, factor: 1.5 },
};
/** The policyholder's own entry ages for HomeCall. */
export const HOLDER_AGES = { min: 18, max: 64 };

/** The relationships a beneficiary or trustee can have to the customer. */
export const RELATIONSHIPS = [
  "Spouse",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Grandparent",
  "Grandchild",
  "Uncle",
  "Aunt",
  "Nephew",
  "Niece",
  "Cousin",
  "Friend",
  "Other",
] as const;

/** Why a customer cancels, from the Figma's cancel row. */
export const CANCEL_REASONS = [
  "Too expensive",
  "Found a better alternative",
  "Poor customer service",
  "Bad claim experience",
  "Dissatisfied with the service",
  "Agent relationship issues",
  "Other",
] as const;
