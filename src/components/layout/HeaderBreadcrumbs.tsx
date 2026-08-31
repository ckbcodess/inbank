"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  overview: "Dashboard",
  accounts: "Accounts",
  statement: "Statement",
  payments: "Send & Pay",
  send: "Send Money",
  standing: "Standing Orders",
  new: "New",
  payees: "Beneficiaries",
  bulk: "Bulk Payments",
  cards: "Cards",
  transactions: "Transactions",
  trade: "Trade Finance",
  approvals: "Approvals",
  payment: "Payment Approval",
  reports: "Reports",
  administration: "Administration",
  notifications: "Notifications",
  "fx-rates": "FX Rates",
  admin: "Admin",
  customers: "Customers",
  audit: "Audit Log",
  exceptions: "Exceptions",
  "fee-concessions": "Fee Concessions",
  settings: "Settings",
};

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
}

export default function HeaderBreadcrumbs() {
  const pathname = usePathname();
  if (!pathname || pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: Crumb[] = [];
  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Check if known route label
    let label = ROUTE_LABELS[segment.toLowerCase()];

    // If not found in known dict, check if it's an ID segment (e.g. acc-01, card-02, tx-99)
    if (!label) {
      if (/^acc-|^acct-|^card-|^tx-|^usr-|^batch-|^lc-|^app-/i.test(segment)) {
        const parent = segments[index - 1];
        if (parent === "accounts") label = "Account Details";
        else if (parent === "cards") label = "Card Details";
        else if (parent === "transactions") label = "Transaction Details";
        else if (parent === "administration") label = "User Details";
        else if (parent === "trade") label = "Application Details";
        else if (parent === "bulk") label = "Batch Details";
        else label = "Details";
      } else {
        // Capitalize segment as fallback
        label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
      }
    }

    crumbs.push({
      label,
      href: currentPath,
      isLast,
    });
  });

  return (
    <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-[13px] leading-none">
      {crumbs.map((crumb, idx) => (
        <div key={crumb.href} className="flex items-center gap-1.5">
          {idx > 0 && (
            <ChevronRight
              size={13}
              strokeWidth={1.7}
              className="text-muted-foreground/40 shrink-0"
              aria-hidden="true"
            />
          )}
          {crumb.isLast ? (
            <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[320px]">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
