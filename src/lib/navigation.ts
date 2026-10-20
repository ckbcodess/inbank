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
import { businessNav } from "./corporate/navigation";

export interface NavItem {
  key: string;
  label: string;
  path: string;
  /** Lucide icon name, resolved in the Sidebar. */
  icon: string;
  group?: string;
}

/** The secondary surfaces, gathered in the collapsible "More Services" dropdown. */
const MORE_SERVICES: NavItem[] = [
  { key: "transactions", label: "Transaction History", path: "/transactions", icon: "ArrowLeftRight", group: "More Services" },
  { key: "beneficiaries", label: "Beneficiaries", path: "/beneficiaries", icon: "UserCheck", group: "More Services" },
  { key: "fx-rates", label: "FX Rates", path: "/fx-rates", icon: "TrendingUp", group: "More Services" },
  { key: "locate-us", label: "Locate Us", path: "/locate-us", icon: "MapPin", group: "More Services" },
  { key: "settings", label: "Settings", path: "/settings", icon: "Settings", group: "More Services" },
  { key: "lifestyle", label: "Lifestyle", path: "/lifestyle", icon: "Sparkles", group: "More Services" },
];

/**
 * Personal banking shell — section 12.4. Groups are separated by spacing, not
 * section titles (the Sidebar renders no group headings), except "More
 * Services", which is a collapsible dropdown.
 */
function retailNav(): NavItem[] {
  return [
    { key: "overview", label: "Home", path: "/overview", icon: "Home", group: "primary" },
    { key: "accounts", label: "Accounts", path: "/accounts", icon: "Wallet", group: "primary" },
    { key: "cards", label: "Cards", path: "/cards", icon: "CreditCard", group: "primary" },
    { key: "payments", label: "Send & Pay", path: "/payments", icon: "Send", group: "move" },
    { key: "insure", label: "Insure", path: "/insure", icon: "Shield", group: "move" },
    { key: "invest", label: "Invest", path: "/invest", icon: "LineChart", group: "move" },
    { key: "loans", label: "Loans", path: "/loans", icon: "Landmark", group: "move" },
    ...MORE_SERVICES,
  ];
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
    items.push({ key: "admin-fees", label: "Fee Concessions", path: "/admin/fee-concessions", icon: "Percent", group: "CONTROL" });
  }

  if (role === "RELATIONSHIP_MANAGER" || role === "OPERATIONS_USER" || role === "BANK_ADMIN") {
    items.push({ key: "admin-enrolments", label: "Enrolments", path: "/admin/enrolments", icon: "ClipboardCheck", group: "OPERATIONS" });
  }

  if (role === "BANK_ADMIN" || role === "OPERATIONS_USER") {
    items.push({ key: "admin-audit", label: "Audit Log", path: "/admin/audit", icon: "Receipt", group: "CONTROL" });
  }

  return items;
}

export function getNavigation(actor: Actor, activeProfile?: Profile | null): NavItem[] {
  if (actor.shell === "admin") return adminNav(actor.role);
  return activeProfile?.kind === "CORPORATE" ? businessNav(actor) : retailNav();
}

/** Landing route after authentication, per shell. */
export function homePathForShell(shell: Shell): string {
  return shell === "admin" ? "/admin" : "/overview";
}

/** Where a signed-in person lands after sign-in: their own surface's home. */
export function homePathForActor(actor: Actor): string {
  return actor.shell === "admin" ? homePathForShell("admin") : homePathForProfile(actor.profiles[0]);
}

/** Where a signed-in customer lands: business banking has its own home, personal banking keeps `/overview`. */
export function homePathForProfile(profile: Profile | null | undefined): string {
  return profile?.kind === "CORPORATE" ? "/business/overview" : "/overview";
}
