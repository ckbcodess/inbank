"use client";

/**
 * Send & Pay Hub — 1:1 Match to Figma Design (Node 916:36785)
 *
 * Structure:
 *   - Header: "Send & Pay" with "Manage Beneficiaries" and "Standing Orders" pill buttons
 *   - Send: 6 cards (To Bank, To Wallet, To Proxy, To Group, Wallet to Bank, PAPSS Payments)
 *   - Pay: 4 cards (GCB Pay, Data Bundle, Airtime, Card Top up)
 */

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import {
  ArrowLeftRight,
  ChevronRight,
  CreditCard,
  Globe,
  Landmark,
  Receipt,
  Repeat,
  Smartphone,
  User,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";

interface PaymentAction {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

const SEND_ACTIONS: PaymentAction[] = [
  {
    id: "bank",
    title: "To Bank",
    href: "/payments/send?rail=bank",
    icon: Landmark,
  },
  {
    id: "wallet",
    title: "To Wallet",
    href: "/payments/send?rail=wallet",
    icon: Wallet,
  },
  {
    id: "proxy",
    title: "To Proxy",
    href: "/payments/send?rail=proxy",
    icon: User,
  },
  {
    id: "group",
    title: "To Group",
    href: "/payments/send?rail=group",
    icon: Users,
  },
  {
    id: "wallet-to-bank",
    title: "Wallet to Bank",
    href: "/payments/send?rail=wallet-to-bank",
    icon: ArrowLeftRight,
  },
  {
    id: "papss",
    title: "PAPSS Payments",
    href: "/payments/send?rail=papss",
    icon: Globe,
  },
];

const PAY_ACTIONS: PaymentAction[] = [
  {
    id: "gcb-pay",
    title: "GCB Pay",
    href: "/payments/send?rail=bill",
    icon: Receipt,
  },
  {
    id: "data",
    title: "Data Bundle",
    href: "/payments/send?rail=data",
    icon: Wifi,
  },
  {
    id: "airtime",
    title: "Airtime",
    href: "/payments/send?rail=airtime",
    icon: Smartphone,
  },
  {
    id: "card-topup",
    title: "Card Top up",
    href: "/payments/send?rail=card-topup",
    icon: CreditCard,
  },
];

function ActionSection({
  title,
  actions,
}: {
  title: string;
  actions: PaymentAction[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[16px] font-medium tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              className="group flex items-center justify-between gap-4 rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626]"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12.25px] border border-black/[0.04] bg-white text-amber-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-[#fdc307] dark:shadow-none">
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="truncate text-[16px] font-medium tracking-[-0.01em] text-foreground">
                  {action.title}
                </span>
              </div>
              <ChevronRight
                size={20}
                strokeWidth={1.8}
                aria-hidden="true"
                className="shrink-0 text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function SendAndPayPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <PageHeader
        title="Send & Pay"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/payments/standing"
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#ebebe9] px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-[#e0e0de] dark:bg-[#232323] dark:hover:bg-[#2c2c2c]"
            >
              <Repeat size={15} strokeWidth={1.8} aria-hidden="true" />
              Standing Orders
            </Link>
          </div>
        }
      />

      {/* Action Sections */}
      <div className="flex flex-col gap-10">
        <ActionSection title="Send" actions={SEND_ACTIONS} />
        <ActionSection title="Pay" actions={PAY_ACTIONS} />
      </div>
    </div>
  );
}
