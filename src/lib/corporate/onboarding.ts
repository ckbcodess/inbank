/**
 * Demo data and helpers for business onboarding journeys:
 * - Invited business user activation (/business/activate)
 * - The business door (/business/signup). Companies and sole proprietors apply at /business/signup/enrol
 *   (lib/corporate-enrolment.ts)
 */

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
