/**
 * The identity partner that verifies passports for customers without a Ghana Card (BRL-01).
 * Customers never see the partner's name (designer, 2026-11-16): our screens say "our verification partner" and
 * "the verification window", and the window itself is titled "Identity verification".
 *
 * The partner does the whole check on the customer's phone: it reads the passport, takes a selfie, and returns the
 * result with the passport number. The customer gets to the partner by scanning a QR code, so the photos are never
 * taken or uploaded on the computer. NIBS never asks for passport details. We only use the number it sends back to
 * find the account that was opened with that passport.
 *
 * In production the partner opens in its own browser window (like "Continue with Google") and reports back by
 * `postMessage`. The prototype draws that window in the page (`components/auth/IdentityPartnerWindow.tsx`) and
 * returns a demo result.
 */

/** What the partner tells the page while its window is open. `handoff`: the QR code is up, waiting for the phone. */
export type PartnerProgress = "opening" | "consent" | "handoff" | "checking" | "done";

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

/**
 * What our server gets back when it asks the partner about one session. `pending`: the customer hasn't finished the
 * check yet. The page shows nothing but this, never a result it was handed in the browser.
 */
export type PartnerStatus =
  | { state: "pending" }
  | { state: "passed"; passportNumber: string; expiry: string }
  | { state: "failed"; reason: PartnerFailure; expiry?: string };

let partnerSessionCounter = 0;

/** A new id for each opening of the partner window, so a result from an earlier attempt can never be picked up. */
export function newPartnerSessionId(): number {
  partnerSessionCounter += 1;
  return partnerSessionCounter;
}

/*
 * PROTOTYPE STAND-IN for the partner's side. In production the partner keeps the outcome of each session, and our
 * server asks for it by session id. Here the window's "done" writes into this map, and fetchPartnerStatus reads it back
 * after a delay, so the page goes through the same confirm-and-ask path it will use in production.
 */
const partnerOutcomes = new Map<number, PartnerResult>();

export function recordPartnerOutcome(sessionId: number, result: PartnerResult) {
  partnerOutcomes.set(sessionId, result);
}

export function fetchPartnerStatus(sessionId: number): Promise<PartnerStatus> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const outcome = partnerOutcomes.get(sessionId);
      if (!outcome) {
        resolve({ state: "pending" });
        return;
      }
      resolve(
        outcome.status === "verified"
          ? { state: "passed", passportNumber: outcome.passportNumber, expiry: outcome.expiry }
          : { state: "failed", reason: outcome.reason, expiry: outcome.expiry },
      );
    }, 900);
  });
}

/** "···1567": only the last four characters of a passport number are ever shown. */
export function maskPassport(passport: string): string {
  return `···${passport.slice(-4)}`;
}
