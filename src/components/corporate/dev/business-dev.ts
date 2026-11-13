/**
 * Dev Mode data for business banking: the business users (by role) and the role flows. The Dev Mode side panel
 * (`components/dev/DevModePanel.tsx`) draws these whenever a business is signed in, in place of the personal demo
 * customers, so switching never drops you into the personal app. Each user's line reads the control table
 * (`lib/corporate/controls.ts`), so it shows the same role, limit and accounts the screens enforce. A flow signs in
 * as the role it needs first, then opens the screen.
 */

import { COMPANY_USERS, roleHasLimit } from "@/lib/corporate/controls";
import { ACTORS, formatMoney } from "@/lib/mock-data";

/** The business demo users, in the order a payment travels. */
export const BUSINESS_DEV_USERS = ["u-dual", "u-reviewer", "u-approver", "u-corpadmin", "u-sole"] as const;

export const BUSINESS_DEV_FLOWS: { label: string; hint: string; actorId: string; href: string }[] = [
  { label: "Pay a supplier", hint: "Inputter · within their limit", actorId: "u-dual", href: "/business/payments/supplier" },
  { label: "Pay in bulk", hint: "Inputter · upload or enter, fix lines, submit", actorId: "u-dual", href: "/business/payments/bulk" },
  { label: "A released batch", hint: "Inputter · each payment's own status, one failed", actorId: "u-dual", href: "/business/payments/bulk/batch-0090" },
  { label: "A payment waiting for review", hint: "Inputter · the approval path on the receipt", actorId: "u-dual", href: "/business/transactions/txn-apr-001" },
  { label: "A payment sent back", hint: "Inputter · the comment, Edit and Resubmit", actorId: "u-dual", href: "/business/transactions/txn-ret-001" },
  { label: "Review a payment", hint: "Reviewer · pass on or send back", actorId: "u-reviewer", href: "/business/approvals/payment/apr-001" },
  { label: "Authorise a payment", hint: "Authoriser · with a one-time code", actorId: "u-approver", href: "/business/approvals/payment/apr-002" },
  { label: "Above the authoriser's limit", hint: "Authoriser · can't authorise, says why", actorId: "u-approver", href: "/business/approvals/payment/apr-005" },
  { label: "Approve a user change", hint: "Authoriser · the second person", actorId: "u-approver", href: "/business/approvals/user-change/uc-001" },
  { label: "Users and changes waiting", hint: "Admin", actorId: "u-corpadmin", href: "/business/administration" },
  { label: "Add a user", hint: "Admin · signatory or someone else", actorId: "u-corpadmin", href: "/business/administration/new" },
  { label: "Change someone's access", hint: "Admin · narrowing applies now, widening waits", actorId: "u-corpadmin", href: "/business/administration/cu-ransford" },
];

export function businessDevUserLine(actorId: string): { title: string; subtitle: string } {
  const actor = ACTORS.find((a) => a.id === actorId);
  const user = COMPANY_USERS.find((u) => u.actorId === actorId);
  if (!actor) return { title: actorId, subtitle: "" };
  if (!user) return { title: `${actor.name} · Sole Proprietor`, subtitle: "Pays directly after the code, no approvals" };
  const limit = roleHasLimit(user.role) ? `up to ${formatMoney(user.limit, "GHS", true)}` : "no payment limit";
  const accounts = user.accountIds.length === 1 ? "1 account" : `${user.accountIds.length} accounts`;
  return { title: `${actor.name} · ${user.role}`, subtitle: `${limit} · ${accounts}` };
}

/** The Dev Mode badge for a business user: their role, so the header says who you are testing as. */
export function businessDevBadge(actorId: string | undefined): string {
  if (!actorId) return "Business";
  const user = COMPANY_USERS.find((u) => u.actorId === actorId);
  return user?.role ?? (actorId === "u-sole" ? "Sole Proprietor" : "Business");
}
