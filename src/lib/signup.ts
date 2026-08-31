/**
 * Signup — a brand-new individual opening a GCB account entirely on the web,
 * with internet banking active the moment it's approved.
 *
 * This is the one retail flow where the mobile onboarding's KYC — a Ghana
 * Card number, a selfie matched against it — is actually earning its place
 * rather than repeating a check the Bank already ran. Activation
 * (`src/lib/activation.ts`) could cut identity proofing because the customer
 * already has an account; here there is no account yet, so there is nothing
 * to lean on.
 *
 * What's still cut, for the same reasons as activation:
 *   - the splash carousel — this URL already answers "what is this"
 *   - the registration-type modal — the URL itself is the branch
 *   - the doubled selfie screens — one screen, state-driven
 *   - referral (3 screens) — doesn't serve this moment
 *   - the transaction PIN — replaced by the same OTP/soft-token approval used
 *     everywhere else on the web
 *   - card/wallet linking — becomes an in-app "add a funding source"
 *
 *   start → identity (Ghana Card + mobile) → confirm → selfie → verify (OTP)
 *         → set up sign-in → done
 */

import type { Actor, Profile } from "./roles";

/* ── Flow model ────────────────────────────────────────────────────────────── */

export type SignupStep = "start" | "identity" | "confirm" | "selfie" | "verify" | "setup" | "done";

export type SignupVariant =
  | "default"
  | "notFound"
  | "existingCustomer"
  | "selfieMismatch"
  | "codeError"
  | "codeLocked";

export interface SignupScenario {
  id: string;
  label: string;
  step: SignupStep;
  variant: SignupVariant;
}

export const SIGNUP_SCENARIOS: readonly SignupScenario[] = [
  { id: "start", label: "Before you start", step: "start", variant: "default" },
  { id: "identity", label: "Ghana Card & mobile", step: "identity", variant: "default" },
  { id: "identity-not-found", label: "Card not recognised", step: "identity", variant: "notFound" },
  { id: "identity-existing", label: "Already a customer", step: "identity", variant: "existingCustomer" },
  { id: "confirm", label: "Confirm your details", step: "confirm", variant: "default" },
  { id: "selfie", label: "Selfie match", step: "selfie", variant: "default" },
  { id: "selfie-mismatch", label: "Selfie didn't match", step: "selfie", variant: "selfieMismatch" },
  { id: "verify", label: "Enter code", step: "verify", variant: "default" },
  { id: "verify-error", label: "Code rejected", step: "verify", variant: "codeError" },
  { id: "verify-locked", label: "Attempts used up", step: "verify", variant: "codeLocked" },
  { id: "setup", label: "Set up sign-in", step: "setup", variant: "default" },
  { id: "done", label: "Account opened", step: "done", variant: "default" },
];

export const SIGNUP_SCENARIO_LABELS: Record<string, string> = Object.fromEntries(
  SIGNUP_SCENARIOS.map((s) => [s.id, s.label]),
);

export const SIGNUP_SCENARIO_IDS = SIGNUP_SCENARIOS.map((s) => s.id);

export function findSignupScenario(id: string): SignupScenario | undefined {
  return SIGNUP_SCENARIOS.find((s) => s.id === id);
}

export function signupScenarioIdFor(step: SignupStep, variant: SignupVariant): string {
  const exact = SIGNUP_SCENARIOS.find((s) => s.step === step && s.variant === variant);
  if (exact) return exact.id;
  const fallback = SIGNUP_SCENARIOS.find((s) => s.step === step && s.variant === "default");
  return fallback?.id ?? SIGNUP_SCENARIOS[0].id;
}

/* ── Ghana Card lookup (mock NIA registry) ────────────────────────────────── */

export interface NiaRecord {
  cardNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

/**
 * Same card number activation.ts recognises as "not yet activated" — one
 * person, one identity, consistent across both flows. Typing it here
 * correctly reports "you already bank with us" rather than starting a
 * duplicate account.
 */
const EXISTING_CUSTOMER_CARD = "GHA-0123456789-0";

const NIA_RECORDS: Record<string, NiaRecord> = {
  "GHA-0555555555-5": {
    cardNumber: "GHA-0555555555-5",
    firstName: "Kwabena",
    lastName: "Asare",
    dateOfBirth: "14 Mar 1994",
  },
};

export type IdentityLookupResult =
  | { kind: "new"; record: NiaRecord }
  | { kind: "existingCustomer" }
  | { kind: "notFound" };

/**
 * A real Ghana Card lookup returns the name and date of birth on the card, so
 * the customer never retypes what the ID already contains — they only add
 * what it doesn't carry (email). This mirrors the National Identification
 * Authority verification the Bank's real KYC already depends on.
 */
export function lookupGhanaCard(cardNumber: string): IdentityLookupResult {
  const id = cardNumber.trim().toUpperCase();
  if (id === EXISTING_CUSTOMER_CARD) return { kind: "existingCustomer" };
  const record = NIA_RECORDS[id];
  if (record) return { kind: "new", record };
  return { kind: "notFound" };
}

export const DEMO_NEW_CARD = "GHA-0555555555-5";
export const DEMO_EXISTING_CARD = EXISTING_CUSTOMER_CARD;
export const DEMO_SIGNUP_MOBILE = "+233201234567";

/* ── New actor ─────────────────────────────────────────────────────────────── */

let signupSequence = 0;

/** Builds the fresh identity + account a completed signup produces. */
export function buildNewRetailActor(record: NiaRecord, email: string): Actor {
  signupSequence += 1;
  const profile: Profile = {
    id: `prof-signup-${signupSequence}`,
    kind: "RETAIL",
    name: "Personal Banking",
    reference: `•••• ${String(4000 + signupSequence).slice(-4)}`,
  };

  return {
    id: `u-signup-${signupSequence}`,
    name: `${record.firstName} ${record.lastName}`,
    email,
    role: "RETAIL_CUSTOMER",
    shell: "customer",
    profiles: [profile],
    tradeEligible: false,
  };
}
