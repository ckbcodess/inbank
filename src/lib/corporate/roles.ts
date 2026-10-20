/**
 * Business banking's role checks (section 12.3 / 12.4). The role list itself stays in `lib/roles.ts`,
 * because the session and the admin portal share it; these predicates are only ever asked on the business side.
 */

import type { Role } from "../roles";

/** Approvals nav is visible only to an Approver. */
export function isApprover(role: Role): boolean {
  return role === "CORPORATE_APPROVER";
}

/** Administration nav is visible only to a Corporate Admin. */
export function isCorporateAdmin(role: Role): boolean {
  return role === "CORPORATE_ADMIN";
}

/**
 * A sole proprietor is the business's only user, so there is no one else to approve their payments: the
 * one-time code is the authorisation (designer decision 2026-10-20; BRL-04's segregation needs two people).
 */
export function paysWithoutApproval(role: Role): boolean {
  return role === "SOLE_PROPRIETOR";
}
