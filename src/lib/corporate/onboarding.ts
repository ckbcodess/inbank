/**
 * Demo data and helpers for business onboarding journeys:
 * - Sole proprietor self-onboarding (/business/signup/sole-proprietor)
 * - Invited business user activation (/business/activate)
 * - The business door (/business/signup). Companies apply online at /business/signup/enrol (lib/corporate-enrolment.ts)
 */

import { formatGhanaCard } from "../ghana-card";

export const SOLE_PROPRIETOR_DEMO = {
  ghanaCard: "GHA-445566778-2",
  holderName: "Akosua Darko",
  businessName: "Akosua Darko Enterprises",
  mobile: "+233244300414",
  actorId: "u-sole",
  accountIds: ["acc-sole-1", "acc-sole-2"],
};

/** Which outcome a typed Ghana Card number leads to (demo only). Anything else is the sole proprietor. */
export function soleProprietorOutcome(card: string): "ok" | "not-verified" | "no-account" | "company" {
  const digits = card.replace(/\D/g, "");
  if (digits.includes("999999999")) return "not-verified";
  if (digits.includes("111111111")) return "no-account";
  if (digits.includes("223344556")) return "company";
  return "ok";
}

export type BusinessUserRole = "Inputter" | "Reviewer" | "Authoriser";

export const BUSINESS_ROLE_LINE: Record<BusinessUserRole, string> = {
  Inputter: "You prepare payments. Someone else reviews and authorises them.",
  Reviewer: "You check payments and pass them on, or send them back with a comment.",
  Authoriser: "You give the final approval that sends a payment.",
};

export const BUSINESS_INVITE_DEMO = {
  companyName: "Adinkra Textiles Ltd",
  inviteeName: "Kwame Boateng",
  role: "Inputter" as BusinessUserRole,
  ghanaCardOnRecord: "GHA-334455667-8",
  mobile: "+233244300411",
  actorId: "u-dual",
  accountIds: ["acc-001", "acc-002"],
};

export const INVITE_MAX_ATTEMPTS = 3;
export const FIND_BRANCH_URL = "https://www.gcbbank.com.gh";
export const GHANA_CARD_LINKAGE_URL = "https://www.gcbbank.com.gh";

export function normalizeGhanaCard(raw: string): string {
  return formatGhanaCard(raw);
}
