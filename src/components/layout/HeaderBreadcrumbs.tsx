"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BackLink } from "@/components/layout/BackLink";

/** The full name of each Send & Pay flow, as the person knows it, never a clipped form of it. */
const RAIL_BREADCRUMB_LABELS: Record<string, string> = {
  bill: "GCB Pay",
  bank: "Bank Transfer",
  ach: "Bank Transfer",
  wallet: "Mobile Money Transfer",
  momo: "Mobile Money Transfer",
  "wallet-to-bank": "Wallet to Bank Transfer",
  proxy: "Proxy Payments",
  group: "Group Payments",
  papss: "PAPSS Payment",
  airtime: "Airtime Top-up",
  data: "Internet Bundle",
  "card-topup": "Card Top-up",
  ecg: "ECG Prepaid",
  ghanagov: "Ghana.gov Payment",
  swift: "Outside Ghana Transfer",
  qr: "QR Payment",
  cardless: "Cardless Withdrawal",
};

/** A route segment, by name. The label is the page's own name in full. */
const ROUTE_LABELS: Record<string, string> = {
  overview: "Home",
  accounts: "My Accounts",
  statement: "Statement",
  expenses: "My Spends",
  requests: "Place a Request",
  payments: "Send & Pay",
  send: "Send Money",
  standing: "Standing Orders",
  payees: "Beneficiaries",
  beneficiaries: "Beneficiaries",
  bills: "GCB Pay",
  bulk: "Bulk Payments",
  cards: "Cards",
  transactions: "Transactions",
  trade: "Trade Finance",
  approvals: "Approvals",
  reports: "Reports",
  administration: "Administration",
  notifications: "Notifications",
  "fx-rates": "Foreign Exchange Rates",
  "locate-us": "Locate Us",
  admin: "Admin",
  customers: "Customers",
  audit: "Audit Log",
  exceptions: "Exceptions",
  "fee-concessions": "Fee Concessions",
  settings: "Settings",
};

/** What a record page under each list is called: "Account Details", never a bare "Details". */
const DETAIL_LABELS: Record<string, string> = {
  accounts: "Account Details",
  cards: "Card Details",
  transactions: "Transaction Details",
  administration: "User Details",
  trade: "Application Details",
  bulk: "Batch Correction",
  standing: "Standing Order Details",
  customers: "Customer Details",
};

/** A "new" page under each list is named for what it creates. */
const NEW_LABELS: Record<string, string> = {
  standing: "New Standing Order",
  trade: "New Trade Request",
  groups: "Create Group",
};

/** Under Cards, "request" is the Request a Card flow (or its replacement variant). */
const CARDS_REQUEST_LABEL = "Request a Card";
const CARDS_REPLACE_LABEL = "Replace a Card";

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
}

function BreadcrumbView({ list }: { list: Crumb[] }) {
  if (list.length === 0) return null;
  const currentCrumb = list[list.length - 1];
  const parentCrumb = list.length > 1 ? list[list.length - 2] : null;

  return (
    <nav aria-label="Breadcrumbs" className="flex items-center min-w-0">
      {/* Mobile: Only current page with left-pointing chevron linking back */}
      <div className="flex sm:hidden items-center min-w-0">
        {parentCrumb ? (
          <BackLink
            href={parentCrumb.href}
            className="group flex items-center gap-1 text-foreground hover:text-foreground transition-colors min-w-0"
            title={`Back to ${parentCrumb.label}`}
          >
            <ChevronLeft
              size={17}
              strokeWidth={2}
              className="text-muted-foreground group-hover:text-foreground shrink-0 transition-colors -ml-1"
              aria-hidden="true"
            />
            <span className="font-medium text-foreground truncate max-w-[180px] text-[13.5px]">
              {currentCrumb.label}
            </span>
          </BackLink>
        ) : (
          <span className="font-medium text-foreground truncate max-w-[200px] text-[13.5px]">
            {currentCrumb.label}
          </span>
        )}
      </div>

      {/* Desktop: Complete breadcrumb trail */}
      <div className="hidden sm:flex items-center gap-1.5 text-[13px] leading-none">
        {list.map((crumb, idx) => (
          <div key={crumb.href || crumb.label} className="flex items-center gap-1.5">
            {idx > 0 && (
              <ChevronRight
                size={13}
                strokeWidth={1.7}
                className="text-muted-foreground/40 shrink-0"
                aria-hidden="true"
              />
            )}
            {crumb.isLast ? (
              <span className="font-medium text-foreground truncate max-w-[320px]">
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
      </div>
    </nav>
  );
}

export default function HeaderBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (!pathname || pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const rail = searchParams.get("rail") ?? "";

  // Dedicated handling for Groups routes under Beneficiaries: Beneficiaries > Create Group / Beneficiaries > Edit Group
  const isBeneficiariesGroups =
    (segments[0]?.toLowerCase() === "beneficiaries" && segments[1]?.toLowerCase() === "groups") ||
    segments[0]?.toLowerCase() === "groups";

  if (isBeneficiariesGroups) {
    const isCreate = segments.includes("new");
    const isEdit = segments.includes("edit");

    const groupCrumbs: Crumb[] = [
      {
        label: "Beneficiaries",
        href: "/beneficiaries?tab=groups",
        isLast: !isCreate && !isEdit,
      },
    ];

    if (isCreate) {
      groupCrumbs.push({
        label: "Create Group",
        href: "/beneficiaries/groups/new",
        isLast: true,
      });
    } else if (isEdit) {
      groupCrumbs.push({
        label: "Edit Group",
        href: pathname,
        isLast: true,
      });
    }

    return <BreadcrumbView list={groupCrumbs} />;
  }

  // An approval is one page, named for what is being approved. Its "payment" or "trade" segment is not a page.
  if (segments[0] === "approvals" && (segments[1] === "payment" || segments[1] === "trade") && segments.length > 2) {
    return (
      <BreadcrumbView
        list={[
          { label: "Approvals", href: "/approvals", isLast: false },
          {
            label: segments[1] === "payment" ? "Payment Approval" : "Trade Approval",
            href: pathname,
            isLast: true,
          },
        ]}
      />
    );
  }

  const crumbs: Crumb[] = [];
  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    const key = segment.toLowerCase();
    const parent = segments[index - 1]?.toLowerCase();

    let label = ROUTE_LABELS[key];

    // Send Money names itself after the rail it is on.
    if (key === "send" && rail && RAIL_BREADCRUMB_LABELS[rail]) {
      label = RAIL_BREADCRUMB_LABELS[rail];
    }

    // Under Cards, "request" is the Request a Card flow.
    if (key === "request" && parent === "cards") {
      label = searchParams.get("replace") ? CARDS_REPLACE_LABEL : CARDS_REQUEST_LABEL;
    }

    // "new" is named for what it creates.
    if (key === "new") {
      label = (parent && NEW_LABELS[parent]) || "New";
    }

    if (!label) {
      const isRecordId = /\d/.test(segment) || /^(acc|acct|card|tx|usr|batch|lc|app|si|so|cust)-/i.test(segment);
      if (isRecordId && parent && DETAIL_LABELS[parent]) {
        label = DETAIL_LABELS[parent];
      } else if (isRecordId) {
        label = "Details";
      } else {
        // Anything unlisted reads as a title: "locate-us" becomes "Locate Us".
        label = segment
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
    }

    crumbs.push({
      label,
      href: currentPath,
      isLast,
    });
  });

  return <BreadcrumbView list={crumbs} />;
}
