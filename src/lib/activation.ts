/**
 * Activation — the one auth flow behind first-time enrolment (section 12.1).
 *
 * The mobile onboarding flow this is derived from runs 12–15 screens because it
 * is an *account-opening* flow: it proves identity from scratch (Ghana Card
 * capture, selfie match, liveness) before it can open an account.
 *
 * Internet banking has a different premise — the person is already a customer,
 * and their identity was proven at account opening. Re-running KYC in a browser
 * asks them to prove it twice, on the device worst suited to it. So activation
 * proves *possession*, not identity:
 *
 *   identify → verify (OTP to the registered channel) → set up sign-in → done
 *
 * Everything the mobile flow collects that is not required to open a session —
 * default account, referral code, transaction PIN, card/wallet linking — moves
 * into the app, behind a dismissible strip on the overview.
 *
 * Two modes share the machine:
 *   retail     — self-service activation from the login screen
 *   corporate  — invite issued by a Corporate Admin (Administration), so the
 *                relationship, role and permissions are already known and the
 *                "how would you like to register?" branch disappears entirely
 */

import { ACTORS } from "./mock-data";
import type { Actor } from "./roles";
import { maskEmail, maskMobile } from "./auth-shared";

export {
  maskEmail,
  maskMobile,
  PASSWORD_RULES,
  passwordMeetsRules,
  APPROVAL_OPTIONS,
} from "./auth-shared";
export type { PasswordRule, ApprovalMethod, ApprovalOption } from "./auth-shared";

/* ── Flow model ────────────────────────────────────────────────────────────── */

export type ActivationMode = "retail" | "corporate";

export type ActivationStep = "identify" | "verify" | "setup" | "done";

/**
 * Variants are the branches *within* a step. Kept separate from the step so the
 * dev switcher can address every reachable combination without the flow needing
 * a state per screen.
 */
export type ActivationVariant =
  | "default"
  | "matched"
  | "notFound"
  | "alreadyActive"
  | "codeError"
  | "codeLocked"
  | "inviteExpired";

export interface ActivationScenario {
  id: string;
  label: string;
  mode: ActivationMode;
  step: ActivationStep;
  variant: ActivationVariant;
}

/**
 * Every reachable instance of the flow, in walk-through order. This is what the
 * Dev Mode switcher lists — picking one jumps straight to that screen so the
 * whole flow can be reviewed without typing through it.
 */
export const ACTIVATION_SCENARIOS: readonly ActivationScenario[] = [
  { id: "retail-identify", label: "Retail · Find account", mode: "retail", step: "identify", variant: "default" },
  { id: "retail-not-found", label: "Retail · No match", mode: "retail", step: "identify", variant: "notFound" },
  { id: "retail-matched", label: "Retail · Match found", mode: "retail", step: "identify", variant: "matched" },
  { id: "retail-already-active", label: "Retail · Already active", mode: "retail", step: "identify", variant: "alreadyActive" },
  { id: "retail-verify", label: "Retail · Enter code", mode: "retail", step: "verify", variant: "default" },
  { id: "retail-code-error", label: "Retail · Code rejected", mode: "retail", step: "verify", variant: "codeError" },
  { id: "retail-code-locked", label: "Retail · Attempts used up", mode: "retail", step: "verify", variant: "codeLocked" },
  { id: "retail-setup", label: "Retail · Set up login", mode: "retail", step: "setup", variant: "default" },
  { id: "retail-done", label: "Retail · Activated", mode: "retail", step: "done", variant: "default" },
  { id: "corp-invite", label: "Corporate · Invitation", mode: "corporate", step: "identify", variant: "default" },
  { id: "corp-invite-expired", label: "Corporate · Invitation expired", mode: "corporate", step: "identify", variant: "inviteExpired" },
  { id: "corp-verify", label: "Corporate · Enter code", mode: "corporate", step: "verify", variant: "default" },
  { id: "corp-setup", label: "Corporate · Set up login", mode: "corporate", step: "setup", variant: "default" },
  { id: "corp-done", label: "Corporate · Activated", mode: "corporate", step: "done", variant: "default" },
];

export const ACTIVATION_SCENARIO_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVATION_SCENARIOS.map((s) => [s.id, s.label]),
);

export const ACTIVATION_SCENARIO_IDS = ACTIVATION_SCENARIOS.map((s) => s.id);

export function findScenario(id: string): ActivationScenario | undefined {
  return ACTIVATION_SCENARIOS.find((s) => s.id === id);
}

/**
 * Resolves the current position back to a scenario id so the switcher's tick
 * follows real navigation, not just the last thing picked from the dropdown.
 */
export function scenarioIdFor(
  mode: ActivationMode,
  step: ActivationStep,
  variant: ActivationVariant,
): string {
  const exact = ACTIVATION_SCENARIOS.find(
    (s) => s.mode === mode && s.step === step && s.variant === variant,
  );
  if (exact) return exact.id;

  // A variant that has no entry of its own (e.g. "matched" carried into a later
  // step) still belongs to that step's default screen.
  const fallback = ACTIVATION_SCENARIOS.find(
    (s) => s.mode === mode && s.step === step && s.variant === "default",
  );
  return fallback?.id ?? ACTIVATION_SCENARIOS[0].id;
}

/* ── Identity lookup & Personas ───────────────────────────────────────────── */

export interface DiscoveredAccount {
  id: string;
  name: string;
  number: string;
  type: "Current" | "Savings" | "Foreign Currency";
  currency: string;
  balance: number;
  isJoint?: boolean;
  jointHolders?: string[];
  mandate?: string;
  isPrimaryDefault?: boolean;
}

export interface ActivationPersonaConfig {
  id: "single" | "multi" | "joint" | "mobile_sync";
  name: string;
  tag: string;
  description: string;
  ghanaCard: string;
  holderName: string;
  phone: string;
  email: string;
  actorId: string;
  accounts: DiscoveredAccount[];
  isJoint?: boolean;
  jointMandate?: string;
  jointHolders?: string[];
  coSignatoryPhone?: string;
  mobileAppLinked?: boolean;
}

export const ACTIVATION_PERSONAS: Record<
  "single" | "multi" | "joint" | "mobile_sync",
  ActivationPersonaConfig
> = {
  multi: {
    id: "multi",
    name: "Kwame Mensah",
    tag: "Multi-Account Holder",
    description: "Customer with Personal, Joint, and Savings accounts — selects primary account",
    ghanaCard: "GHA-998877665-1",
    holderName: "Kwame Mensah",
    phone: "+233 24 555 9812",
    email: "kwame.mensah@example.com",
    actorId: "u-joint",
    accounts: [
      {
        id: "acc-current-1",
        name: "Personal Current Account",
        number: "1001 4821 4561",
        type: "Current",
        currency: "GHS",
        balance: 42300.0,
        isPrimaryDefault: true,
      },
      {
        id: "acc-joint-1",
        name: "Joint Premier Savings",
        number: "3300 8844 9922",
        type: "Savings",
        currency: "GHS",
        balance: 245800.0,
        isJoint: true,
        jointHolders: ["Kwame Mensah", "Efua Mensah"],
        mandate: "Both to sign (2 of 2)",
      },
      {
        id: "acc-savings-2",
        name: "Reserve High-Yield Savings",
        number: "3300 1122 5566",
        type: "Savings",
        currency: "GHS",
        balance: 128450.0,
      },
      {
        id: "acc-fx-1",
        name: "USD Foreign Currency Account",
        number: "7700 9944 1092",
        type: "Foreign Currency",
        currency: "USD",
        balance: 14250.0,
      },
    ],
  },
  single: {
    id: "single",
    name: "Ama Serwaa",
    tag: "Single Account",
    description: "Existing retail customer with one savings account",
    ghanaCard: "GHA-0123456789-0",
    holderName: "Ama Serwaa",
    phone: "+233 24 123 4567",
    email: "ama.serwaa@example.com",
    actorId: "u-retail",
    accounts: [
      {
        id: "acc-savings-1",
        name: "Reserve High-Yield Savings",
        number: "3300 1122 5566",
        type: "Savings",
        currency: "GHS",
        balance: 128450.0,
        isPrimaryDefault: true,
      },
    ],
  },
  joint: {
    id: "joint",
    name: "Kwame Mensah",
    tag: "Multi-Account (with Joint)",
    description: "Customer with Personal and Joint accounts",
    ghanaCard: "GHA-998877665-1",
    holderName: "Kwame Mensah",
    phone: "+233 24 555 9812",
    email: "kwame.mensah@example.com",
    actorId: "u-joint",
    accounts: [
      {
        id: "acc-current-1",
        name: "Personal Current Account",
        number: "1001 4821 4561",
        type: "Current",
        currency: "GHS",
        balance: 42300.0,
        isPrimaryDefault: true,
      },
      {
        id: "acc-joint-1",
        name: "Joint Premier Savings",
        number: "3300 8844 9922",
        type: "Savings",
        currency: "GHS",
        balance: 245800.0,
        isJoint: true,
        jointHolders: ["Kwame Mensah", "Efua Mensah"],
        mandate: "Both to sign (2 of 2)",
      },
    ],
  },
  mobile_sync: {
    id: "mobile_sync",
    name: "Abena Osei",
    tag: "Mobile App Sync",
    description: "Existing GCB Mobile app user activating Web Banking",
    ghanaCard: "GHA-554433221-0",
    holderName: "Abena Osei",
    phone: "+233 24 888 2234",
    email: "abena.osei@example.com",
    actorId: "u-abena",
    mobileAppLinked: true,
    accounts: [
      {
        id: "acc-mobile-1",
        name: "Personal Current Account",
        number: "1001 4821 4821",
        type: "Current",
        currency: "GHS",
        balance: 18200.0,
        isPrimaryDefault: true,
      },
      {
        id: "acc-mobile-2",
        name: "Smart Goal Savings",
        number: "3300 4455 9012",
        type: "Savings",
        currency: "GHS",
        balance: 5400.0,
      },
    ],
  },
};

export function getPersonaByGhanaCard(card: string): ActivationPersonaConfig {
  const norm = card.trim().toUpperCase();
  if (norm.includes("554433221") || norm.includes("MOBILE")) return ACTIVATION_PERSONAS.mobile_sync;
  if (norm.includes("0123456789") || norm.includes("SINGLE")) return ACTIVATION_PERSONAS.single;
  return ACTIVATION_PERSONAS.multi;
}

export interface ActivationMatch {
  actor: Actor;
  maskedMobile: string;
  maskedEmail: string;
  accountLabel: string;
  alreadyEnrolled: boolean;
  persona?: ActivationPersonaConfig;
}

export interface DemoIdentifier {
  value: string;
  outcome: string;
  alreadyEnrolled: boolean;
  personaKey?: "single" | "multi" | "joint" | "mobile_sync";
}

export const DEMO_IDENTIFIERS: readonly DemoIdentifier[] = [
  { value: "GHA-0123456789-0", outcome: "Single Account · Ama Serwaa", alreadyEnrolled: false, personaKey: "single" },
  { value: "GHA-998877665-1", outcome: "Multi-Account · Kwame Boateng (Pick Primary)", alreadyEnrolled: false, personaKey: "multi" },
  { value: "GHA-001234567-9", outcome: "Joint Account · Kwame & Efua Mensah", alreadyEnrolled: false, personaKey: "joint" },
  { value: "GHA-554433221-0", outcome: "Mobile Sync · Abena Osei", alreadyEnrolled: false, personaKey: "mobile_sync" },
  { value: "3300 1122 5566", outcome: "Already activated", alreadyEnrolled: true },
];

export const DEMO_MOBILE = "+233241234567";

export function matchIdentity(identifier: string, mobile: string): ActivationMatch | null {
  const id = identifier.trim().replace(/\s+/g, " ").toUpperCase();
  const known = DEMO_IDENTIFIERS.find((d) => d.value.toUpperCase() === id);
  const mobileDigits = mobile.replace(/\D/g, "");
  const mobileMatches = mobileDigits.length >= 9 && DEMO_MOBILE.endsWith(mobileDigits.slice(-9));

  if (!known || !mobileMatches) return null;

  const persona = known.personaKey ? ACTIVATION_PERSONAS[known.personaKey] : ACTIVATION_PERSONAS.single;
  const actor = ACTORS.find((a) => a.id === persona.actorId) || ACTORS[0];

  return {
    actor,
    maskedMobile: maskMobile(persona.phone),
    maskedEmail: maskEmail(persona.email),
    accountLabel: persona.accounts[0] ? `${persona.accounts[0].name} ···· ${persona.accounts[0].number.slice(-4)}` : "Reserve Savings ···· 5566",
    alreadyEnrolled: known.alreadyEnrolled,
    persona,
  };
}

export function demoIdentifierFor(alreadyEnrolled: boolean, personaKey?: "single" | "multi" | "joint" | "mobile_sync"): string {
  if (personaKey && ACTIVATION_PERSONAS[personaKey]) {
    return ACTIVATION_PERSONAS[personaKey].ghanaCard;
  }
  return (
    DEMO_IDENTIFIERS.find((d) => d.alreadyEnrolled === alreadyEnrolled)?.value ??
    DEMO_IDENTIFIERS[0].value
  );
}

/* ── Corporate invitation ──────────────────────────────────────────────────── */

export interface CorporateInvite {
  actor: Actor;
  company: string;
  invitedBy: string;
  roleLabel: string;
  maskedMobile: string;
  maskedEmail: string;
  expiresIn: string;
}

export function getCorporateInvite(): CorporateInvite | null {
  const actor = ACTORS.find((a) => a.id === "u-dual");
  if (!actor) return null;

  return {
    actor,
    company: "Adinkra Textiles Ltd",
    invitedBy: "Yaw Oppong",
    roleLabel: "Corporate Maker",
    maskedMobile: maskMobile(DEMO_MOBILE),
    maskedEmail: maskEmail(actor.email),
    expiresIn: "6 days",
  };
}


