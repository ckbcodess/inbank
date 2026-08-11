/**
 * Actor model — Screen Consolidation v2, section 12.
 *
 * Section 12.1: two firewalled shells sharing only Login (S01) and MFA (S02).
 * A single identity can never hold both a customer profile and an internal
 * operations role (BRD ADM-2, ADM-16, NFR-03), so `shell` is a property of the
 * actor, not a runtime toggle.
 */

export type Shell = "customer" | "admin";

export type Role =
  // Customer / Corporate shell
  | "RETAIL_CUSTOMER"
  | "CORPORATE_MAKER"
  | "CORPORATE_APPROVER"
  | "CORPORATE_ADMIN"
  // Admin Portal shell — internal staff only
  | "TRADE_OFFICER"
  | "OPERATIONS_USER"
  | "BANK_ADMIN";

/** Banking relationship a customer identity holds (section 12.2). */
export type ProfileKind = "RETAIL" | "CORPORATE";

export interface Profile {
  id: string;
  kind: ProfileKind;
  name: string;
  /** Masked primary identifier shown in the switcher. */
  reference: string;
}

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: Role;
  shell: Shell;
  /**
   * Banking relationships this identity holds. Section 12.4: Profile Selection
   * (S03) is only shown when the identity holds 2+ relationships. Internal
   * staff hold none — they never see the switcher (section 12.2).
   */
  profiles: Profile[];
  /** Trade eligibility gates the Trade nav item for retail (section 12.4). */
  tradeEligible: boolean;
}

export const ROLE_LABEL: Record<Role, string> = {
  RETAIL_CUSTOMER: "Retail Customer",
  CORPORATE_MAKER: "Corporate Maker",
  CORPORATE_APPROVER: "Corporate Approver",
  CORPORATE_ADMIN: "Corporate Admin",
  TRADE_OFFICER: "Trade Officer",
  OPERATIONS_USER: "Operations User",
  BANK_ADMIN: "Bank Admin",
};

export const SHELL_OF_ROLE: Record<Role, Shell> = {
  RETAIL_CUSTOMER: "customer",
  CORPORATE_MAKER: "customer",
  CORPORATE_APPROVER: "customer",
  CORPORATE_ADMIN: "customer",
  TRADE_OFFICER: "admin",
  OPERATIONS_USER: "admin",
  BANK_ADMIN: "admin",
};

/** Approvals nav is visible only to an Approver (section 12.3 / 12.4). */
export function isApprover(role: Role): boolean {
  return role === "CORPORATE_APPROVER";
}

/** Administration nav is visible only to a Corporate Admin (section 12.3 / 12.4). */
export function isCorporateAdmin(role: Role): boolean {
  return role === "CORPORATE_ADMIN";
}

export function isInternalStaff(role: Role): boolean {
  return SHELL_OF_ROLE[role] === "admin";
}
