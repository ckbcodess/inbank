/**
 * Business banking navigation (section 12.4). Lives with the rest of the business code; `lib/navigation.ts`
 * picks it when the active relationship is a business. Every path is a `/business/*` page, so the sidebar never
 * leads out of the business app. Screens business does not have yet (cards, beneficiaries, reports, settings,
 * FX rates) are not listed until they are built.
 */

import type { NavItem } from "../navigation";
import type { Actor } from "../roles";
import { canInitiate, isApprover, isCorporateAdmin } from "./roles";

export function businessNav(actor: Actor): NavItem[] {
  const items: NavItem[] = [
    { key: "overview", label: "Home", path: "/business/overview", icon: "Home", group: "primary" },
    { key: "accounts", label: "Accounts", path: "/business/accounts", icon: "Wallet", group: "primary" },
    // Send & Pay — only for people who start payments. Reviewers and authorisers never initiate (BRL-04).
    ...(canInitiate(actor.role)
      ? [{ key: "payments", label: "Send & Pay", path: "/business/payments", icon: "Send", group: "move" } as NavItem]
      : []),
    { key: "transactions", label: "Transactions", path: "/business/transactions", icon: "ArrowLeftRight", group: "move" },
  ];

  // Trade — hidden when the actor is not trade-eligible (section 12.4).
  if (actor.tradeEligible) {
    items.push({ key: "trade", label: "Trade", path: "/business/trade", icon: "Ship", group: "move" });
  }

  // Approvals — for reviewers and authorisers only (section 12.4).
  if (isApprover(actor.role)) {
    items.push({ key: "approvals", label: "Approvals", path: "/business/approvals", icon: "CheckCircle2", group: "control" });
  }

  // Administration — hidden unless the role is Corporate Admin (section 12.4).
  if (isCorporateAdmin(actor.role)) {
    items.push({ key: "administration", label: "Administration", path: "/business/administration", icon: "Users", group: "control" });
  }

  return items;
}
