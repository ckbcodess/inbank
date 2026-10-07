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
import { Button } from "@/components/ui/button";
import { glassOf, pathRegion, rectRegion, type IconRegion } from "@/components/ui/glass-icon";
import { duotoneOf, toneOutlineOf } from "@/components/ui/reicon-styles";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import type { IconTone } from "@/lib/icon-tones";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import { useIconStyle, type IconPalette, type IconStyle } from "@/lib/icon-style-store";
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
  /** The colour this action takes when the hub colours icons by function (Dev Mode exploration). */
  tone: IconTone;
  /** The part of the icon drawn in the second tone in the duotone glass look (24px grid). */
  accent: IconRegion;
}

const SEND_ACTIONS: PaymentAction[] = [
  {
    id: "bank",
    title: "To Bank",
    href: "/payments/send?rail=bank",
    icon: Bank,
    tone: "blue",
    accent: rectRegion(0, 17.6, 24, 7),
  },
  {
    id: "wallet",
    title: "To Wallet",
    href: "/payments/send?rail=wallet",
    icon: Wallet,
    tone: "violet",
    accent: pathRegion("M21.1009 8.00353C21.0442 7.99996 20.9825 7.99998 20.9186 8L20.9026 8.00001H18.3941C16.3264 8.00001 14.5572 9.62757 14.5572 11.75C14.5572 13.8724 16.3264 15.5 18.3941 15.5H20.9026L20.9186 15.5C20.9825 15.5 21.0442 15.5001 21.1009 15.4965C21.9408 15.4434 22.6835 14.7862 22.746 13.8682C22.7501 13.808 22.75 13.7431 22.75 13.683L22.75 13.6667V9.83334L22.75 9.81702C22.75 9.75688 22.7501 9.69199 22.746 9.6318C22.6835 8.71381 21.9408 8.05657 21.1009 8.00353Z"),
  },
  {
    id: "proxy",
    title: "To Proxy",
    href: "/payments/send?rail=proxy",
    icon: User,
    tone: "teal",
    accent: rectRegion(0, 13, 24, 11),
  },
  {
    id: "group",
    title: "To Group",
    href: "/payments/send?rail=group",
    icon: Users,
    tone: "teal",
    accent: pathRegion("M20.9996 17.0005C20.9996 18.6573 18.9641 20.0004 16.4788 20.0004C17.211 19.2001 17.7145 18.1955 17.7145 17.0018C17.7145 15.8068 17.2098 14.8013 16.4762 14.0005C18.9615 14.0005 20.9996 15.3436 20.9996 17.0005Z M17.9996 6.00073C17.9996 7.65759 16.6565 9.00073 14.9996 9.00073C14.6383 9.00073 14.292 8.93687 13.9712 8.81981C14.4443 7.98772 14.7145 7.02522 14.7145 5.99962C14.7145 4.97477 14.4447 4.01294 13.9722 3.18127C14.2927 3.06446 14.6387 3.00073 14.9996 3.00073C16.6565 3.00073 17.9996 4.34388 17.9996 6.00073Z"),
  },
  {
    id: "wallet-to-bank",
    title: "Wallet to Bank",
    href: "/payments/send?rail=wallet-to-bank",
    icon: ArrowSwapHorizontal,
    tone: "blue",
    accent: rectRegion(0, 12.5, 24, 12),
  },
  {
    id: "papss",
    title: "PAPSS Payments",
    href: "/payments/send?rail=papss",
    icon: Globe,
    tone: "green",
    accent: rectRegion(0, 12.5, 24, 12),
  },
];

const PAY_ACTIONS: PaymentAction[] = [
  {
    id: "gcb-pay",
    title: "GCB Pay",
    href: "/payments/send?rail=bill",
    icon: Receipt,
    tone: "amber",
    accent: rectRegion(0, 13, 24, 12),
  },
  {
    id: "data",
    title: "Internet",
    href: "/payments/send?rail=data",
    icon: Wifi,
    tone: "amber",
    accent: rectRegion(0, 13, 24, 12),
  },
  {
    id: "airtime",
    title: "Airtime",
    href: "/payments/send?rail=airtime",
    icon: Mobile,
    tone: "violet",
    accent: rectRegion(0, 14.5, 24, 10),
  },
  {
    id: "card-topup",
    title: "Card Top up",
    href: "/payments/send?rail=card-topup",
    icon: CardSend,
    tone: "blue",
    accent: rectRegion(0, 10, 24, 14),
  },
  {
    id: "cardless",
    title: "Cardless Withdrawal",
    href: "/payments/send?rail=cardless",
    icon: MoneyWithdraw,
    tone: "rose",
    accent: pathRegion("M4.96858 1.25H19.0314C19.7048 1.24999 20.2555 1.24998 20.7031 1.28655C21.1663 1.3244 21.5847 1.40514 21.9755 1.60423C22.587 1.91582 23.0842 2.413 23.3958 3.02453C23.5949 3.41527 23.6756 3.83367 23.7134 4.29693C23.75 4.74449 23.75 5.29519 23.75 5.96856V9.03144C23.75 9.70481 23.75 10.2555 23.7134 10.7031C23.6756 11.1663 23.5949 11.5847 23.3958 11.9755C23.0842 12.587 22.587 13.0842 21.9755 13.3958C21.7058 13.5332 21.4235 13.6141 21.1213 13.6636C20.9041 13.6992 20.6822 13.6376 20.5145 13.4951C20.3467 13.3526 20.25 13.1436 20.25 12.9235V4.75H3.75V12.9235C3.75 13.1436 3.65331 13.3526 3.48555 13.4951C3.31778 13.6376 3.09589 13.6992 2.87868 13.6636C2.57654 13.6141 2.29422 13.5332 2.02453 13.3958C1.413 13.0842 0.915818 12.587 0.60423 11.9755C0.405138 11.5847 0.324402 11.1663 0.286553 10.7031C0.249986 10.2555 0.249992 9.7048 0.25 9.03144V5.96857C0.249992 5.29521 0.249986 4.74449 0.286553 4.29693C0.324402 3.83367 0.405138 3.41527 0.60423 3.02453C0.915819 2.413 1.41301 1.91582 2.02453 1.60423C2.41527 1.40514 2.83367 1.3244 3.29693 1.28655C3.74449 1.24998 4.29521 1.24999 4.96858 1.25Z"),
  },
  {
    id: "qr",
    title: "Scan & Pay",
    href: "/payments/send?rail=qr",
    icon: Qr,
    tone: "rose",
    accent: rectRegion(12.5, 12.5, 11, 11),
  },
];

// Dev Mode exploration (icon style x palette): every look of each action's icon, built once so the components stay
// stable. Functions: blue = to a bank account, violet = to a wallet or phone, teal = to people, green = across
// borders, amber = bills and utilities, rose = cash and in person.
const LOOKS = new Map<string, Record<string, PaymentAction["icon"]>>(
  [...SEND_ACTIONS, ...PAY_ACTIONS].map((a) => {
    const icon = a.icon as never;
    return [
      a.id,
      {
        "outline-brand": a.icon,
        "outline-function": toneOutlineOf(icon, a.tone),
        "glass-brand": glassOf(icon, "amber"),
        "glass-function": glassOf(icon, a.tone),
        "duotone-brand": duotoneOf(icon, "amber", "slate"),
        "duotone-function": duotoneOf(icon, a.tone, "tone"),
        // Duotone glass: the main tone plus a second one on part of the icon. By function the second tone is a spark
        // of GCB amber (graphite on the amber icons); in GCB amber it is amber with graphite.
        "duotone-glass-brand": glassOf(icon, "amber", { tone: "slate", region: a.accent }),
        "duotone-glass-function": glassOf(icon, a.tone, { tone: a.tone === "amber" ? "slate" : "amber", region: a.accent }),
      },
    ];
  }),
);

const ICON_STYLES = ["outline", "glass", "duotone", "duotone-glass"] as const;
const ICON_STYLE_LABELS: Record<IconStyle, string> = { outline: "Outline", glass: "Glass", duotone: "Duotone", "duotone-glass": "Duotone glass" };
const ICON_PALETTE_STATES = [
  { id: "brand", label: "GCB amber" },
  { id: "function", label: "By function" },
];

function ActionSection({
  title,
  actions,
  look,
}: {
  title: string;
  actions: PaymentAction[];
  look: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-8 items-center px-1">
        <h2 className="text-[16px] font-medium tracking-[-0.01em] text-foreground">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {actions.map((action) => (
          <ActionTile key={action.id} href={action.href} icon={LOOKS.get(action.id)?.[look] ?? action.icon} title={action.title} compactOnMobile bareIcon />
        ))}
      </div>
    </div>
  );
}

export default function SendAndPayPage() {
  const stored = useIconStyle((s) => s.style);
  const palette = useIconStyle((s) => s.palette);
  const setStyle = useIconStyle((s) => s.setStyle);
  const setPalette = useIconStyle((s) => s.setPalette);
  // Scaffolding: production builds always show the default look, duotone glass in GCB amber.
  const look = SHOW_DEMO_TOOLS ? `${stored}-${palette}` : "duotone-glass-brand";
  const iconStates = useMemo(() => ICON_STYLES, []);
  const paletteGroups = useMemo<DevStateGroup[]>(
    () => [{ label: "Icon colour", states: ICON_PALETTE_STATES, value: palette, onChange: (v) => setPalette(v as IconPalette) }],
    [palette, setPalette],
  );

  return (
    <div className="flex flex-col gap-10">
      {SHOW_DEMO_TOOLS && (
        <StateSwitcher states={iconStates} value={stored} onChange={setStyle} labels={ICON_STYLE_LABELS} section="Icons" label="Icon style" groups={paletteGroups} />
      )}
      {/* ── Page Header: Title & Action (no description underneath) ── */}
      <PageHeader
        title="Send & Pay"
        actions={
          <Button nativeButton={false} render={<Link href="/payments/standing" />} variant="tile">
            <Repeat size={15} strokeWidth={1.8} aria-hidden="true" className="size-[15px]" />
            View Standing Orders
          </Button>
        }
      />

      {/* Action Sections */}
      <div className="flex flex-col gap-10">
        <ActionSection title="Send" actions={SEND_ACTIONS} look={look} />
        <ActionSection title="Pay" actions={PAY_ACTIONS} look={look} />
      </div>
    </div>
  );
}
