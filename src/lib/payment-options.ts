/**
 * The choices behind Send Money / Pay Bill / Top-Up, in one place.
 *
 * The dashboard's action pickers and the payment flow read these lists, so an
 * option added here shows up in both. Every `href` deep-links into
 * `PaymentFlow` with the choice already made (`?rail=` / `?category=`), so the
 * flow never asks the same question again.
 */

import {
  Building2,
  Church,
  CreditCard,
  GraduationCap,
  Heart,
  Landmark,
  Plus,
  Receipt,
  Repeat,
  Smartphone,
  Store,
  Tv,
  Wallet,
  Wifi,
} from "lucide-react";
import type { BillerCategory } from "@/lib/mock-data";

type OptionIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export interface PaymentOption {
  id: string;
  title: string;
  /** Only when the title alone doesn't say what's behind it. */
  hint?: string;
  href: string;
  icon: OptionIcon;
}

export interface PaymentOptionGroup {
  /** Omitted for a single, unlabelled list. */
  label?: string;
  options: PaymentOption[];
}

/** Append `from=<account>` so a flow opens on the account the customer is looking at. */
export function withFrom(href: string, accountId: string | null): string {
  if (!accountId) return href;
  return `${href}${href.includes("?") ? "&" : "?"}from=${encodeURIComponent(accountId)}`;
}

export const GCB_PAY_CATEGORIES: { id: BillerCategory; title: string; icon: OptionIcon }[] = [
  { id: "Bills & Utilities", title: "Bills & Utilities", icon: Receipt },
  { id: "Education", title: "Education", icon: GraduationCap },
  { id: "Giving & Donations", title: "Giving & Donations", icon: Church },
  { id: "Government Services", title: "Government Services", icon: Building2 },
  { id: "Healthcare", title: "Healthcare", icon: Heart },
  { id: "Merchant Payments", title: "Merchant Payments", icon: Store },
  { id: "Others", title: "Others", icon: Plus },
  { id: "Subscriptions", title: "Subscriptions", icon: Tv },
];

/*
 * The dashboard pickers are for speed, not completeness (Hick's law): each
 * shows only the few most-used choices, most-used first, capped at four, and
 * one "more" link hands everything else to the full hub. Rarer rails — proxy,
 * groups, PAPSS, SWIFT, wallet-to-bank, cardless, Scan & Pay — live there.
 */

/** Where the money is going. Mobile money leads — it's the most-used rail in Ghana. */
export function sendOptions({ hasOtherAccounts }: { hasOtherAccounts: boolean }): PaymentOptionGroup[] {
  return [
    {
      options: [
        {
          id: "momo",
          title: "Mobile money",
          hint: "MTN, Telecel, AT",
          // No category: lands on "Which wallet do you want to send to?" (recent wallets, self or someone else).
          href: "/payments/send?rail=wallet",
          icon: Wallet,
        },
        { id: "gcb", title: "Another GCB account", href: "/payments/send?rail=bank&category=gcb", icon: Landmark },
        { id: "other-bank", title: "Another bank", href: "/payments/send?rail=bank&category=other", icon: Building2 },
        // Only meaningful with somewhere else of your own to move money to.
        ...(hasOtherAccounts
          ? [{ id: "own", title: "Between my accounts", href: "/payments/send?rail=bank&category=own", icon: Repeat }]
          : []),
      ],
    },
  ];
}

/** The categories people pay most; the rest are one tap away on the full bills page. */
const FREQUENT_BILLS: BillerCategory[] = ["Bills & Utilities", "Subscriptions", "Education", "Government Services"];

/** Bills open straight on their category's billers. */
export function billOptions(): PaymentOptionGroup[] {
  return [
    {
      options: FREQUENT_BILLS.map((id) => GCB_PAY_CATEGORIES.find((c) => c.id === id)!).map((c) => ({
        id: c.id,
        title: c.title,
        href: `/payments/bills?category=${encodeURIComponent(c.id)}`,
        icon: c.icon,
      })),
    },
  ];
}

export function topUpOptions(): PaymentOptionGroup[] {
  return [
    {
      options: [
        { id: "airtime", title: "Airtime", href: "/payments/send?rail=airtime", icon: Smartphone },
        { id: "data", title: "Data bundle", href: "/payments/send?rail=data", icon: Wifi },
        { id: "card", title: "Prepaid card", href: "/payments/send?rail=card-topup", icon: CreditCard },
      ],
    },
  ];
}
