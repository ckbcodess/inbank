/**
 * Navigation model — Screen Consolidation v2, sections 12.3, 12.4, 12.5.
 *
 * Nav is derived from the actor, never static. Two rules from the doc govern
 * everything here:
 *
 *  - Section 12.4/12.5: only LEVEL 1 (primary) and LEVEL 2 (object
 *    collections) appear in navigation. Object destinations — Account Details,
 *    Transaction Details, Payment Approval Details, User Details — are reached
 *    from their parent list and are deliberately absent from this file.
 *  - Section 12.3: items are hidden, not disabled, when the actor lacks the
 *    role. "Never Visible" in the matrix means absent from the DOM.
 */

import type { Actor, Profile, Role, Shell } from "./roles";
import { isApprover, isCorporateAdmin } from "./roles";

export interface NavItem {
  key: string;
  label: string;
  path: string;
  /** Lucide icon name, resolved in the Sidebar. */
  icon: string;
  group?: string;
}

/**
 * Customer / Corporate shell — section 12.4.
 *
 * Nav is context-aware: corporate-only functions (Approvals, Administration)
 * appear only when an active CORPORATE profile/relationship is selected.
 */
function customerNav(actor: Actor, activeProfile?: Profile | null): NavItem[] {
  const isCorporate = activeProfile ? activeProfile.kind === "CORPORATE" : true;

  const items: NavItem[] = [
    { key: "overview", label: "Overview", path: "/overview", icon: "LayoutDashboard", group: "BANKING" },
    { key: "accounts", label: "Accounts", path: "/accounts", icon: "Wallet", group: "BANKING" },
    { key: "transactions", label: "Transactions", path: "/transactions", icon: "ArrowLeftRight", group: "BANKING" },
    { key: "cards", label: "Cards", path: "/cards", icon: "CreditCard", group: "BANKING" },
    { key: "payments", label: "Send & Pay", path: "/payments", icon: "Send", group: "MOVE MONEY" },
    { key: "beneficiaries", label: "Beneficiaries", path: "/beneficiaries", icon: "UserCheck", group: "MOVE MONEY" },
  ];

  // Trade — hidden if not eligible or if retail profile (section 12.4).
  if (isCorporate && actor.tradeEligible) {
    items.push({ key: "trade", label: "Trade", path: "/trade", icon: "Ship", group: "MOVE MONEY" });
  }

  // Approvals — hidden unless active relationship is Corporate and role = Approver (section 12.4).
  if (isCorporate && isApprover(actor.role)) {
    items.push({ key: "approvals", label: "Approvals", path: "/approvals", icon: "CheckCircle2", group: "CONTROL" });
  }

  // Administration — hidden unless active relationship is Corporate and role = Corporate Admin (section 12.4).
  if (isCorporate && isCorporateAdmin(actor.role)) {
    items.push({ key: "administration", label: "Administration", path: "/administration", icon: "Users", group: "CONTROL" });
  }

  // Reference surfaces.
  items.push(
    { key: "reports", label: "Reports", path: "/reports", icon: "BarChart3", group: "REFERENCE" },
    { key: "fx-rates", label: "FX rates", path: "/fx-rates", icon: "TrendingUp", group: "REFERENCE" },
  );

  return items;
}

/**
 * Admin Portal shell — section 12.5.
 */
function adminNav(role: Role): NavItem[] {
  const items: NavItem[] = [
    { key: "admin-overview", label: "Overview", path: "/admin", icon: "LayoutDashboard", group: "OPERATIONS" },
  ];

  if (role === "OPERATIONS_USER") {
    items.push(
      { key: "admin-transactions", label: "Transactions", path: "/admin/transactions", icon: "ArrowLeftRight", group: "OPERATIONS" },
      { key: "admin-exceptions", label: "Exceptions", path: "/admin/exceptions", icon: "AlertTriangle", group: "OPERATIONS" },
    );
  }

  if (role === "TRADE_OFFICER") {
    items.push({ key: "admin-trade", label: "Trade", path: "/admin/trade", icon: "Ship", group: "OPERATIONS" });
  }

  if (role === "BANK_ADMIN") {
    items.push({ key: "admin-customers", label: "Customers", path: "/admin/customers", icon: "Building2", group: "OPERATIONS" });
    items.push({ key: "admin-fees", label: "Fee concessions", path: "/admin/fee-concessions", icon: "Percent", group: "CONTROL" });
  }

  if (role === "BANK_ADMIN" || role === "OPERATIONS_USER") {
    items.push({ key: "admin-audit", label: "Audit log", path: "/admin/audit", icon: "Receipt", group: "CONTROL" });
  }

  return items;
}

export function getNavigation(actor: Actor, activeProfile?: Profile | null): NavItem[] {
  return actor.shell === "admin" ? adminNav(actor.role) : customerNav(actor, activeProfile);
}

/** Landing route after authentication, per shell. */
export function homePathForShell(shell: Shell): string {
  return shell === "admin" ? "/admin" : "/overview";
}
