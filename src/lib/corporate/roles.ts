/**
 * Business banking's role checks (BRD v2 §17, BRL-03, BRL-04). The role list itself stays in `lib/roles.ts`,
 * because the session and the admin portal share it; these predicates are only ever asked on the business side.
 *
 *   Inputter    prepares payments within their limit; never approves (need not be on the mandate)
 *   Reviewer    checks a payment and passes it on, or sends it back with a comment (on the mandate)
 *   Authoriser  gives the final approval that releases it, with a one-time code (on the mandate)
 *   Admin       looks after users; holds no payment role in the prototype (scope is an open question)
 */

import type { Role } from "../roles";

/** The approval step a role acts on, if any. */
export type ApprovalStepKind = "review" | "authorise";

export function stepFor(role: Role): ApprovalStepKind | null {
  if (role === "CORPORATE_REVIEWER") return "review";
  if (role === "CORPORATE_AUTHORISER") return "authorise";
  return null;
}

/** Approvals nav and the home "waiting for you" band are for reviewers and authorisers only. */
export function isApprover(role: Role): boolean {
  return stepFor(role) !== null;
}

/** Who can start a payment: an Inputter, or a sole proprietor paying directly. */
export function canInitiate(role: Role): boolean {
  return role === "CORPORATE_INPUTTER" || role === "SOLE_PROPRIETOR";
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
