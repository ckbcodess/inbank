/**
 * Demo data and helpers for business onboarding journeys:
 * - Sole proprietor self-onboarding (/business/signup/sole-proprietor)
 * - Invited business user activation (/business/activate)
 * - The business door (/business/signup). Companies apply online at /business/signup/enrol (lib/corporate-enrolment.ts)
 */

import { cleanAccountNumber, lookupCorporateAccount } from "../corporate-enrolment";

/** Sole proprietors prove who they are with the account number and their date of birth on file. No Ghana Card
 *  (designer, 2026-11-26), as with invited business users. */
export const SOLE_PROPRIETOR_DEMO = {
  accountNumber: "1001556677880",
  dateOfBirthOnRecord: "1986-07-14",
  holderName: "Akosua Darko",
  businessName: "Akosua Darko Enterprises",
  mobile: "+233244300414",
  actorId: "u-sole",
  accountIds: ["acc-sole-1", "acc-sole-2"],
};

/** Which outcome a typed account number leads to (demo only). A company's account sends them to the company
 *  application; any number that isn't the sole proprietor's is not found. */
export function soleProprietorOutcome(accountNumber: string): "ok" | "no-account" | "company" {
  if (lookupCorporateAccount(accountNumber)) return "company";
  return cleanAccountNumber(accountNumber) === SOLE_PROPRIETOR_DEMO.accountNumber ? "ok" : "no-account";
}

export type BusinessUserRole = "Inputter" | "Reviewer" | "Authoriser";

export const BUSINESS_ROLE_LINE: Record<BusinessUserRole, string> = {
  Inputter: "You prepare payments. Someone else reviews and authorises them.",
  Reviewer: "You check payments, then pass them on or send them back.",
  Authoriser: "You give the final approval that sends a payment.",
};

export const BUSINESS_INVITE_DEMO = {
  companyName: "Adinkra Textiles Ltd",
  inviteeName: "Ransford Gyasi",
  role: "Inputter" as BusinessUserRole,
  /** From the signed request letter, or the mandate for a signatory. */
  dateOfBirthOnRecord: "1988-03-21",
  mobile: "+233244300411",
  actorId: "u-dual",
  accountIds: ["acc-001", "acc-002"],
};

export const INVITE_MAX_ATTEMPTS = 3;
