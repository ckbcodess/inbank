/**
 * The identity partner that verifies passports for customers without a Ghana Card (BRL-01).
 * Customers never see the partner's name (designer, 2026-11-16): our screens say "our verification partner" and
 * "the verification window", and the window itself is titled "Identity verification".
 *
 * The partner does the whole check: it reads the passport, takes a selfie, and returns the result with the passport
 * number. NIBS never asks for passport details. We only use the number it sends back to find the account that was
 * opened with that passport.
 *
 * In production the partner opens in its own browser window (like "Continue with Google") and reports back by
 * `postMessage`. The prototype draws that window in the page (`components/auth/IdentityPartnerWindow.tsx`) and
 * returns a demo result.
 */

/** What the partner tells the page while its window is open. */
/** `handoff`: the customer moved to their phone (no camera on the computer). */
export type PartnerProgress = "opening" | "consent" | "passport" | "selfie" | "handoff" | "checking" | "done";

/** Why a check didn't pass. Expired gets its own message, because trying again won't fix it. */
export type PartnerFailure = "mismatch" | "expired";

export type PartnerResult =
  | { status: "verified"; passportNumber: string; expiry: string }
  | { status: "failed"; reason: PartnerFailure; expiry?: string };

/** Demo outcomes the prototype can return. `no_account` passes the check but matches no GCB account. */
export type PartnerDemoOutcome = "verified" | "mismatch" | "expired" | "no_account";

export const PARTNER_DEMO_OUTCOMES: { id: PartnerDemoOutcome; label: string }[] = [
  { id: "verified", label: "Passes" },
  { id: "mismatch", label: "Fails" },
  { id: "expired", label: "Expired" },
  { id: "no_account", label: "No account" },
];

export function demoPartnerResult(outcome: PartnerDemoOutcome, knownPassport: string): PartnerResult {
  switch (outcome) {
    case "verified":
      return { status: "verified", passportNumber: knownPassport, expiry: "2031-06-30" };
    case "no_account":
      return { status: "verified", passportNumber: "G7730194", expiry: "2030-02-11" };
    case "expired":
      return { status: "failed", reason: "expired", expiry: "2025-03-14" };
    default:
      return { status: "failed", reason: "mismatch" };
  }
}

/** "···1567": only the last four characters of a passport number are ever shown. */
export function maskPassport(passport: string): string {
  return `···${passport.slice(-4)}`;
}
