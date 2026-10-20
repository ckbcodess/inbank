/**
 * Business banking navigation (section 12.4). Lives with the rest of the business code; `lib/navigation.ts`
 * picks it when the active relationship is a business, and passes in the "More Services" group the two
 * customer shells share.
 */

import type { NavItem } from "../navigation";
import type { Actor } from "../roles";
import { isApprover, isCorporateAdmin } from "./roles";

/**
 * Business banking shell — section 12.4. Trade, Approvals and Administration
 * appear by role (section 12.3); the rest are the pages business shares with
 * personal banking until they get business versions of their own.
 */
export function businessNav(actor: Actor, moreServices: NavItem[]): NavItem[] {
  const items: NavItem[] = [
    { key: "overview", label: "Home", path: "/business/overview", icon: "Home", group: "primary" },
    { key: "accounts", label: "Accounts", path: "/accounts", icon: "Wallet", group: "primary" },
    { key: "cards", label: "Cards", path: "/cards", icon: "CreditCard", group: "primary" },
    { key: "payments", label: "Send & Pay", path: "/payments", icon: "Send", group: "move" },
    { key: "insure", label: "Insure", path: "/insure", icon: "Shield", group: "move" },
    { key: "invest", label: "Invest", path: "/invest", icon: "LineChart", group: "move" },
    { key: "loans", label: "Loans", path: "/loans", icon: "Landmark", group: "move" },
  ];

  // Trade — hidden when the actor is not trade-eligible (section 12.4).
  if (actor.tradeEligible) {
    items.push({ key: "trade", label: "Trade", path: "/business/trade", icon: "Ship", group: "move" });
  }

  // Approvals — hidden unless the role is Approver (section 12.4).
  if (isApprover(actor.role)) {
    items.push({ key: "approvals", label: "Approvals", path: "/business/approvals", icon: "CheckCircle2", group: "control" });
  }

  // Administration — hidden unless the role is Corporate Admin (section 12.4).
  if (isCorporateAdmin(actor.role)) {
    items.push({ key: "administration", label: "Administration", path: "/business/administration", icon: "Users", group: "control" });
  }

  return [...items, ...moreServices];
}
