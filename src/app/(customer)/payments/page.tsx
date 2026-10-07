"use client";

/**
 * Send & Pay Hub — 1:1 Match to Figma Design (Node 916:36785)
 *
 * Structure:
 *   - Header: "Send & Pay" with "Manage Beneficiaries" and "View Standing Orders" pill buttons
 *   - Send: 6 cards (To Bank, To Wallet, To Proxy, To Group, Wallet to Bank, PAPSS Payments)
 *   - Pay: 4 cards (GCB Pay, Internet, Airtime, Card Top up)
 */

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { useMemo } from "react";
import { ActionTile } from "@/components/ui/action-tile";
import { glassOf } from "@/components/ui/glass-icon";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import { useIconStyle, type IconStyle } from "@/lib/icon-style-store";
import {
  ArrowSwapHorizontal,
  Bank,
  CardSend,
  Globe,
  Mobile,
  MoneyWithdraw,
  Qr,
  Receipt,
  Repeat,
  User,
  Users,
  Wallet,
  Wifi,
} from "reicon-react";

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
    icon: Bank,
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
    icon: ArrowSwapHorizontal,
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
    title: "Internet",
    href: "/payments/send?rail=data",
    icon: Wifi,
  },
  {
    id: "airtime",
    title: "Airtime",
    href: "/payments/send?rail=airtime",
    icon: Mobile,
  },
  {
    id: "card-topup",
    title: "Card Top up",
    href: "/payments/send?rail=card-topup",
    icon: CardSend,
  },
  {
    id: "cardless",
    title: "Cardless Withdrawal",
    href: "/payments/send?rail=cardless",
    icon: MoneyWithdraw,
  },
  {
    id: "qr",
    title: "Scan & Pay",
    href: "/payments/send?rail=qr",
    icon: Qr,
  },
];

// Dev Mode exploration (icon style): each outline icon's glass twin, built once so the components stay stable.
const GLASS_ICONS = new Map<PaymentAction["icon"], PaymentAction["icon"]>(
  [...SEND_ACTIONS, ...PAY_ACTIONS].map((a) => [a.icon, glassOf(a.icon as never)]),
);

const ICON_STYLES = ["outline", "glass"] as const;
const ICON_STYLE_LABELS: Record<IconStyle, string> = { outline: "Outline", glass: "Glass" };

function ActionSection({
  title,
  actions,
  glass,
}: {
  title: string;
  actions: PaymentAction[];
  glass: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-8 items-center px-1">
        <h2 className="text-[16px] font-medium tracking-[-0.01em] text-foreground">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {actions.map((action) => (
          <ActionTile key={action.id} href={action.href} icon={glass ? GLASS_ICONS.get(action.icon) : action.icon} title={action.title} compactOnMobile bareIcon />
        ))}
      </div>
    </div>
  );
}

export default function SendAndPayPage() {
  const stored = useIconStyle((s) => s.style);
  const setStyle = useIconStyle((s) => s.setStyle);
  // Scaffolding: production builds always show the outline icons.
  const glass = SHOW_DEMO_TOOLS && stored === "glass";
  const iconStates = useMemo(() => ICON_STYLES, []);

  return (
    <div className="flex flex-col gap-10">
      {SHOW_DEMO_TOOLS && (
        <StateSwitcher states={iconStates} value={stored} onChange={setStyle} labels={ICON_STYLE_LABELS} section="Icons" label="Icon style" />
      )}
      {/* ── Page Header: Title & Action (no description underneath) ── */}
      <PageHeader
        title="Send & Pay"
        actions={
          <Link
            href="/payments/standing"
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-muted px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            <Repeat size={15} strokeWidth={1.8} aria-hidden="true" />
            View Standing Orders
          </Link>
        }
      />

      {/* Action Sections */}
      <div className="flex flex-col gap-10">
        <ActionSection title="Send" actions={SEND_ACTIONS} glass={glass} />
        <ActionSection title="Pay" actions={PAY_ACTIONS} glass={glass} />
      </div>
    </div>
  );
}
