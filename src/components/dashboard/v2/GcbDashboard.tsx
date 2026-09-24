"use client";

/**
 * GCB dashboard — replica of the Figma design (node 5727:3447).
 *
 * Layout (inside the existing app shell / icon sidebar / top header):
 *   1. Greeting + action buttons (Send Money / Pay Bill / Top-Up)
 *   2. Selected account's balance + eye toggle (switcher when there's more than one)
 *   3. Needs attention (only when something does)
 *   4. 2×2 grid: Recent Activity · Pay again · Cards · Analytics gauge
 *   5. FX Rates disclosure bar (headline rate peek while collapsed)
 *   6. Promo banner
 *
 * The dashboard is scoped to one account — the default unless another is
 * picked — so activity, cards and spend all follow the switcher. Honest data
 * throughout. Semantic tokens + zero-bold; the amber CTA/banner use the brand gold.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Eye,
  EyeOff,
  ChevronDown,
  Receipt,
  QrCode,
  Send,
  Download,
  RefreshCw,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { Account, Transaction, PaymentCard } from "@/lib/mock-data";
import type { SpendBreakdown, SpendRange, AttentionItem } from "@/lib/dashboard-insights";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RecentTransactions,
  CardsMini,
  AttentionBand,
  FxRatesMini,
  fxPeek,
} from "./MinimalKit";
import { SpendsRadialChart } from "@/components/dashboard/SpendsRadialChart";

export interface DashData {
  firstName: string;
  accounts: Account[];
  defaultAccountId: string | null;
  /** The account everything on the dashboard is scoped to. */
  selectedAccountId: string | null;
  spendByRange: Record<SpendRange, SpendBreakdown>;
  latestTxns: Transaction[];
  cards: PaymentCard[];
  attention: AttentionItem[];
}

interface DashProps {
  data: DashData;
  showAmounts: boolean;
  onToggle: () => void;
  onSelectAccount: (id: string) => void;
}

/* ── Small building blocks ───────────────────────────────────────────────── */

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-6 rounded-2xl border border-border bg-card p-6", className)}>
      {children}
    </div>
  );
}

function CardHeader({ title, href, cta = "View all" }: { title: string; href?: string; cta?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <span className="text-[16px] font-medium leading-none text-foreground">{title}</span>
      {href && (
        <Link href={href} className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground">
          {cta === "View all" ? t("dashboard.viewAll", "View all") : cta}
        </Link>
      )}
    </div>
  );
}

function ActionButtons() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/payments/send"
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-[14px] font-medium leading-none text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
      >
        <Send size={17} strokeWidth={1.8} />
        {t("dashboard.sendMoney", "Send Money")}
      </Link>
      <Link
        href="/payments/bills"
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-[14px] font-medium leading-none text-foreground transition-colors hover:bg-muted"
      >
        <Receipt size={17} strokeWidth={1.8} />
        {t("dashboard.payBill", "Pay Bill")}
      </Link>
      <Link
        href="/payments/send?rail=airtime"
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-[14px] font-medium leading-none text-foreground transition-colors hover:bg-muted"
      >
        <Download size={17} strokeWidth={1.8} />
        {t("dashboard.topUp", "Top-Up")}
      </Link>
      <button
        type="button"
        onClick={handleRefresh}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
        aria-label={t("dashboard.refresh", "Refresh dashboard")}
      >
        <RefreshCw size={18} strokeWidth={1.8} className={cn("transition-transform", isRefreshing && "animate-spin")} />
      </button>
    </div>
  );
}

function last4(number: string): string {
  return number.replace(/\s/g, "").slice(-4);
}

function AccountLabel({ account }: { account: Account }) {
  const { t } = useTranslation();
  return (
    <>
      <Landmark size={17} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
      <span>{t(`accounts.type.${account.type}`, account.type)}</span>
      <span className="tabular text-muted-foreground">••••{last4(account.number)}</span>
    </>
  );
}

/**
 * The selected account's balance — not a sum across accounts. Customers with
 * more than one account switch from the label, which rescopes the whole
 * dashboard; it's a view switch only and doesn't change the default.
 */
function AccountBalance({
  accounts,
  selectedId,
  defaultId,
  onSelect,
  showAmounts,
  onToggle,
}: {
  accounts: Account[];
  selectedId: string | null;
  defaultId: string | null;
  onSelect: (id: string) => void;
  showAmounts: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const account = accounts.find((a) => a.id === selectedId) ?? accounts[0];
  if (!account) return null;

  const canSwitch = accounts.length > 1;

  return (
    <div className="flex flex-col gap-4">
      {canSwitch ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="-mx-3 flex w-fit items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] leading-none text-foreground outline-none transition-colors hover:bg-muted aria-expanded:bg-muted cursor-pointer"
            aria-label={t("dashboard.switchAccount", "Switch account")}
          >
            <AccountLabel account={account} />
            <ChevronDown size={16} strokeWidth={1.8} className="text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={6} className="w-[280px] p-1.5">
            <DropdownMenuRadioGroup value={account.id} onValueChange={(id) => onSelect(id as string)}>
              {accounts.map((a) => (
                <DropdownMenuRadioItem key={a.id} value={a.id} className="gap-2.5 rounded-lg py-3 pl-3 pr-9 text-[14px]">
                  <AccountLabel account={a} />
                  {a.id === defaultId && (
                    <span className="ml-auto text-[12px] text-muted-foreground">{t("common.default", "Default")}</span>
                  )}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="flex items-center gap-2.5 py-2 text-[15px] leading-none text-foreground">
          <AccountLabel account={account} />
        </span>
      )}
      <div className="flex items-center gap-4">
        <span className="tabular text-[34px] leading-none tracking-[0.02em] text-foreground">
          <span className="text-muted-foreground">{account.currency}</span>{" "}
          <RevealingAmount amount={account.balance ?? 0} currency="" />
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label={showAmounts ? t("header.hideAmounts", "Hide balances") : t("header.showAmounts", "Show balances")}
        >
          {showAmounts ? <Eye size={18} strokeWidth={1.8} /> : <EyeOff size={18} strokeWidth={1.8} />}
        </button>
      </div>
    </div>
  );
}

/** Full-width collapsible bar (used for FX rates). */
function DisclosureBar({
  label,
  count,
  peek,
  defaultOpen = false,
  children,
}: {
  label: string;
  count?: number;
  /** A one-glance summary shown only while collapsed. */
  peek?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      layout
      transition={{ type: "spring", duration: 0.35, bounce: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-6 px-6 py-4 cursor-pointer"
        aria-expanded={open}
      >
        <span className="flex shrink-0 items-baseline gap-2">
          <span className="text-[16px] font-medium leading-none text-foreground">{label}</span>
          {count != null && (
            <span className="text-[16px] font-medium leading-none text-foreground opacity-40 tabular">{count}</span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-end gap-4">
          {!open && peek}
          <ChevronDown
            size={16}
            strokeWidth={1.8}
            className={cn("shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-6 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Pay again (saved payees) ────────────────────────────────────────────── */

/**
 * Real saved payees, each deep-linked into its own rail so a tap lands on a
 * prefilled recipient — not a generic Send screen.
 */
const PAY_AGAIN = [
  { name: "Ama Serwaa", detail: "MTN MoMo", rail: "wallet", recipient: "Ama Serwaa Mensah" },
  { name: "Lester Adjei", detail: "ECG prepaid", rail: "ecg", recipient: "Lester Adjei" },
  { name: "Kwame Boateng", detail: "GCB Bank", rail: "bank", recipient: "Kwame Boateng" },
  { name: "Yaa Asantewaa", detail: "MTN Airtime", rail: "airtime", recipient: "Yaa Asantewaa" },
  { name: "Abena Osei", detail: "Stanbic Bank", rail: "bank", recipient: "Abena Osei" },
  { name: "Yaw Mensah", detail: "Telecel Cash", rail: "wallet", recipient: "Yaw Mensah" },
  { name: "Kofi Boateng", detail: "AT Airtime", rail: "airtime", recipient: "Kofi Boateng" },
  { name: "Home MiFi", detail: "Telecel Data", rail: "data", recipient: "Home Router (MiFi)" },
] as const;

const AVATAR_TINTS = [
  "bg-[color-mix(in_oklch,var(--cat-1)_18%,transparent)] text-[var(--cat-1)]",
  "bg-[color-mix(in_oklch,var(--cat-3)_18%,transparent)] text-[var(--cat-3)]",
  "bg-[color-mix(in_oklch,var(--cat-5)_18%,transparent)] text-[var(--cat-5)]",
  "bg-[color-mix(in_oklch,var(--cat-4)_18%,transparent)] text-[var(--cat-4)]",
];

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function PayAgain() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t("dashboard.payAgain", "Pay again")} href="/beneficiaries" cta={t("common.manage", "Manage")} />
      <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-7">
        {PAY_AGAIN.map((p, i) => (
          <Link
            key={`${p.rail}-${p.recipient}`}
            href={`/payments/send?rail=${p.rail}&recipient=${encodeURIComponent(p.recipient)}`}
            className="group flex min-w-0 flex-col items-center gap-3 text-center"
            aria-label={`Pay ${p.name}, ${p.detail}`}
          >
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-full text-[14px] tracking-[0.02em] transition-transform group-hover:scale-105",
                AVATAR_TINTS[i % AVATAR_TINTS.length],
              )}
            >
              {initials(p.name)}
            </span>
            <span className="flex w-full min-w-0 flex-col gap-1">
              <span className="truncate text-[12px] leading-tight text-foreground">{p.name}</span>
              <span className="truncate text-[11.5px] leading-tight text-muted-foreground">{p.detail}</span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* ── Promo banner ────────────────────────────────────────────────────────── */

function PromoBanner() {
  const { t } = useTranslation();
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-8 text-primary-foreground"
      style={{
        background:
          "radial-gradient(130% 130% at 15% 15%, var(--primary-hover), color-mix(in oklch, var(--primary) 88%, black))",
      }}
    >
      <div className="relative flex flex-col gap-6">
        <h3 className="max-w-[280px] text-[26px] leading-[1.15] tracking-[-0.01em]">
          {t("dashboard.promoTitle", "Banking made easier, wherever you are.")}
        </h3>
        <div className="flex items-center gap-4">
          <span className="flex size-[92px] items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--primary-foreground)_10%,transparent)]">
            <QrCode size={64} strokeWidth={1.4} />
          </span>
          <span className="text-[13px] opacity-80 leading-snug max-w-[150px]">
            {t("dashboard.promoScan", "Scan to get the GCB mobile app")}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── The dashboard ───────────────────────────────────────────────────────── */

function greeting(hour: number, t: (key: string, fallback?: string) => string): string {
  if (hour < 12) return t("dashboard.greeting.morning", "Good morning");
  if (hour < 17) return t("dashboard.greeting.afternoon", "Good afternoon");
  return t("dashboard.greeting.evening", "Good evening");
}

export function GcbDashboard({ data, showAmounts, onToggle, onSelectAccount }: DashProps) {
  const { t } = useTranslation();

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-10">
        {/* Greeting + actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1
            className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground"
            suppressHydrationWarning
          >
            {greeting(new Date().getHours(), t)}, {data.firstName} 👋🏾
          </h1>
          <ActionButtons />
        </div>

        <motion.div
          layout
          transition={{ type: "spring", duration: 0.35, bounce: 0 }}
          className="flex flex-col gap-8"
        >
          <motion.div layout transition={{ type: "spring", duration: 0.35, bounce: 0 }}>
            <AccountBalance
              accounts={data.accounts}
              selectedId={data.selectedAccountId}
              defaultId={data.defaultAccountId}
              onSelect={onSelectAccount}
              showAmounts={showAmounts}
              onToggle={onToggle}
            />
          </motion.div>

          <AnimatePresence initial={false}>
            {data.attention.length > 0 && (
              <motion.div
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                className="overflow-hidden"
              >
                <AttentionBand items={data.attention} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Re-keyed per account so a switch visibly reloads the account's widgets. */}
          <motion.div
            key={data.selectedAccountId ?? "none"}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2"
          >
            <Card>
              <CardHeader title={t("dashboard.recentActivity", "Recent activity")} href="/transactions" />
              <RecentTransactions txns={data.latestTxns} showAmounts={showAmounts} limit={4} />
            </Card>

            <PayAgain />

            <Card>
              <CardHeader title={t("dashboard.cards", "Cards")} href="/cards" />
              <CardsMini cards={data.cards} />
            </Card>

            <SpendsRadialChart byRange={data.spendByRange} showAmounts={showAmounts} />

            <div className="lg:col-span-2">
              <DisclosureBar
                label={t("dashboard.exchangeRates", "Exchange rates")}
                peek={<span className="text-[13px] text-muted-foreground tabular">{fxPeek()}</span>}
              >
                <FxRatesMini />
              </DisclosureBar>
            </div>
          </motion.div>

          <motion.div layout transition={{ type: "spring", duration: 0.35, bounce: 0 }}>
            <PromoBanner />
          </motion.div>
        </motion.div>
      </div>
    </LayoutGroup>
  );
}
