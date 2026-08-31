/**
 * Business signup — a company applying to bank with GCB for the first time.
 *
 * This is not "retail signup with company fields." A business has no Ghana
 * Card and no selfie to match — it has incorporation documents, a TIN, and
 * people authorised to act on its behalf, and the Bank has to check all of
 * that before anyone touches the company's money. That review can't be
 * instant, so this flow does not end in a session the way retail signup and
 * activation do. It ends in a submitted application: a reference number, a
 * stated timeline, and a plain description of what happens next.
 *
 * Promising instant corporate access would be the same anti-pattern activation
 * was built to avoid — simplicity theatre on a decision that genuinely needs
 * verification — just relocated to a bigger, more consequential form.
 *
 *   company → contact → signatories → documents → review → submitted
 *
 * Once approved, the primary contact becomes the company's first Corporate
 * Admin and receives the same invite that `/activate?invite=1` already
 * handles — this flow's payoff is that it rejoins work that already exists
 * rather than inventing a second way to get a corporate user logged in.
 * Every corporate identity beyond that first admin is still provisioned by
 * that admin through Administration — this flow never grants self-service
 * corporate access, on purpose (section 12.2).
 */

/* ── Flow model ────────────────────────────────────────────────────────────── */

export type BusinessSignupStep =
  | "company"
  | "contact"
  | "signatories"
  | "documents"
  | "review"
  | "submitted";

export type BusinessSignupVariant = "default" | "existingCustomer";

export interface BusinessSignupScenario {
  id: string;
  label: string;
  step: BusinessSignupStep;
  variant: BusinessSignupVariant;
}

export const BUSINESS_SIGNUP_SCENARIOS: readonly BusinessSignupScenario[] = [
  { id: "company", label: "Company details", step: "company", variant: "default" },
  { id: "company-existing", label: "Company already a customer", step: "company", variant: "existingCustomer" },
  { id: "contact", label: "Primary contact", step: "contact", variant: "default" },
  { id: "signatories", label: "Authorised signatories", step: "signatories", variant: "default" },
  { id: "documents", label: "Documents", step: "documents", variant: "default" },
  { id: "review", label: "Review & submit", step: "review", variant: "default" },
  { id: "submitted", label: "Application submitted", step: "submitted", variant: "default" },
];

export const BUSINESS_SIGNUP_SCENARIO_LABELS: Record<string, string> = Object.fromEntries(
  BUSINESS_SIGNUP_SCENARIOS.map((s) => [s.id, s.label]),
);

export const BUSINESS_SIGNUP_SCENARIO_IDS = BUSINESS_SIGNUP_SCENARIOS.map((s) => s.id);

export function findBusinessScenario(id: string): BusinessSignupScenario | undefined {
  return BUSINESS_SIGNUP_SCENARIOS.find((s) => s.id === id);
}

export function businessScenarioIdFor(
  step: BusinessSignupStep,
  variant: BusinessSignupVariant,
): string {
  const exact = BUSINESS_SIGNUP_SCENARIOS.find((s) => s.step === step && s.variant === variant);
  if (exact) return exact.id;
  const fallback = BUSINESS_SIGNUP_SCENARIOS.find((s) => s.step === step && s.variant === "default");
  return fallback?.id ?? BUSINESS_SIGNUP_SCENARIOS[0].id;
}

/* ── TIN lookup ────────────────────────────────────────────────────────────── */

/**
 * Same company activation.ts's corporate invite already knows — recognising
 * it here means a second application for a company that already banks with
 * GCB gets redirected to "ask your admin", not a duplicate record.
 */
export const EXISTING_COMPANY_TIN = "C0012345678";
export const EXISTING_COMPANY_NAME = "Adinkra Textiles Ltd";

export function lookupTin(tin: string): "existingCustomer" | "new" {
  return tin.trim().toUpperCase() === EXISTING_COMPANY_TIN ? "existingCustomer" : "new";
}

/* ── Business types ────────────────────────────────────────────────────────── */

export const BUSINESS_TYPES = [
  "Limited Liability Company",
  "Sole Proprietorship",
  "Partnership",
  "NGO / Non-profit",
] as const;

export const SIGNATORY_ROLES = [
  "Director",
  "Company Secretary",
  "Finance Manager",
  "Managing Partner",
  "Other authorised officer",
] as const;

/* ── Form shape ────────────────────────────────────────────────────────────── */

export interface CompanyDetails {
  name: string;
  tin: string;
  businessType: string;
}

export interface PrimaryContact {
  name: string;
  role: string;
  ghanaCard: string;
  mobile: string;
  email: string;
}

export interface Signatory {
  id: string;
  name: string;
  role: string;
  mobile: string;
}

/* ── Documents ─────────────────────────────────────────────────────────────── */

export interface DocumentRequirement {
  id: string;
  label: string;
  hint: string;
}

/**
 * What Bank of Ghana KYB expects before a corporate account can be opened.
 * Submit stays disabled until every one of these is attached — real friction
 * the regulator requires, not accidental friction the form adds.
 */
export const REQUIRED_DOCUMENTS: readonly DocumentRequirement[] = [
  { id: "incorporation", label: "Certificate of Incorporation", hint: "Issued by the Registrar General" },
  { id: "registration", label: "Business Registration Certificate", hint: "Registrar General's Department" },
  { id: "tin", label: "TIN Certificate", hint: "Ghana Revenue Authority" },
  { id: "contact-id", label: "Primary contact's Ghana Card", hint: "A clear photo of both sides" },
];

/* ── Submission ────────────────────────────────────────────────────────────── */

let applicationSequence = 0;

/** "GCB-APP-2026-004821" — enough structure to read back over the phone. */
export function generateReference(): string {
  applicationSequence += 1;
  const year = new Date().getFullYear();
  const serial = String(4800 + applicationSequence).padStart(6, "0");
  return `GCB-APP-${year}-${serial}`;
}

export const REVIEW_TIMELINE = "2 business days";
export const SUPPORT_LINE = "+233 302 664 914";
