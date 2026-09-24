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
import { ActionTile } from "@/components/ui/action-tile";
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Globe,
  Landmark,
  Receipt,
  Repeat,
  QrCode,
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
  {
    id: "cardless",
    title: "Cardless Withdrawal",
    href: "/payments/send?rail=cardless",
    icon: Banknote,
  },
  {
    id: "qr",
    title: "Scan & Pay",
    href: "/payments/send?rail=qr",
    icon: QrCode,
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
        {actions.map((action) => (
          <ActionTile key={action.id} href={action.href} icon={action.icon} title={action.title} />
        ))}
      </div>
    </div>
  );
}

export default function SendAndPayPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* ── Page Header: Title & Action (no description underneath) ── */}
      <PageHeader
        title="Send & Pay"
        actions={
          <Link
            href="/payments/standing"
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-muted px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            <Repeat size={15} strokeWidth={1.8} aria-hidden="true" />
            Standing Orders
          </Link>
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
