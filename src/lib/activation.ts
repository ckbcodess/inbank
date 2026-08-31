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
  { id: "retail-setup", label: "Retail · Set up sign-in", mode: "retail", step: "setup", variant: "default" },
  { id: "retail-done", label: "Retail · Activated", mode: "retail", step: "done", variant: "default" },
  { id: "corp-invite", label: "Corporate · Invitation", mode: "corporate", step: "identify", variant: "default" },
  { id: "corp-invite-expired", label: "Corporate · Invitation expired", mode: "corporate", step: "identify", variant: "inviteExpired" },
  { id: "corp-verify", label: "Corporate · Enter code", mode: "corporate", step: "verify", variant: "default" },
  { id: "corp-setup", label: "Corporate · Set up sign-in", mode: "corporate", step: "setup", variant: "default" },
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

/* ── Identity lookup ───────────────────────────────────────────────────────── */

export interface ActivationMatch {
  actor: Actor;
  maskedMobile: string;
  maskedEmail: string;
  /** Masked account the activation was matched against. */
  accountLabel: string;
  /**
   * Internet banking is already switched on for this customer. A third lookup
   * outcome rather than an error: they are who they say they are, they just
   * arrived at the wrong door, and the fix is to sign in.
   */
  alreadyEnrolled: boolean;
}

export interface DemoIdentifier {
  value: string;
  /** What this identifier demonstrates, shown beside it on the identify step. */
  outcome: string;
  alreadyEnrolled: boolean;
}

/**
 * Demo identifiers accepted by the identify step. The real service matches a
 * Ghana Card *or* an account number — one field, because making the customer
 * choose which kind of number they are about to type is a decision that buys
 * nothing.
 */
export const DEMO_IDENTIFIERS: readonly DemoIdentifier[] = [
  { value: "GHA-0123456789-0", outcome: "Not yet activated", alreadyEnrolled: false },
  { value: "3300 1122 5566", outcome: "Already activated", alreadyEnrolled: true },
];

export const DEMO_MOBILE = "+233241234567";

/**
 * Note on enumeration: the reset flow deliberately never confirms whether an
 * account exists. Activation *does* — it shows a masked match — because the
 * customer cannot sensibly consent to "we're about to text this number" without
 * seeing which number. The trade is contained by requiring two secrets (the ID
 * number and the registered mobile) before anything is revealed, and by keeping
 * the failure copy generic. Rate limiting is the server's half of the bargain.
 */
export function matchIdentity(identifier: string, mobile: string): ActivationMatch | null {
  const id = identifier.trim().replace(/\s+/g, " ").toUpperCase();
  const known = DEMO_IDENTIFIERS.find((d) => d.value.toUpperCase() === id);
  const mobileDigits = mobile.replace(/\D/g, "");
  const mobileMatches = mobileDigits.length >= 9 && DEMO_MOBILE.endsWith(mobileDigits.slice(-9));

  if (!known || !mobileMatches) return null;

  const actor = ACTORS.find((a) => a.id === "u-retail");
  if (!actor) return null;

  return {
    actor,
    maskedMobile: maskMobile(DEMO_MOBILE),
    maskedEmail: maskEmail(actor.email),
    accountLabel: known.alreadyEnrolled ? "Personal Current ···· 4821" : "Reserve Savings ···· 5566",
    alreadyEnrolled: known.alreadyEnrolled,
  };
}

/** The identifier a given branch needs, so the dev switcher can seed itself. */
export function demoIdentifierFor(alreadyEnrolled: boolean): string {
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
  /** Plain-language expiry, stated before the customer invests any effort. */
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

