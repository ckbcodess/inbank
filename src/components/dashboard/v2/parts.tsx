"use client";

/**
 * Dashboard building blocks shared by every layout variant (see ./layouts).
 *
 * The data is always scoped to one account — the default unless another is
 * picked in the switcher — so each block here reads the selected account and
 * every outbound link carries it (`?from=` / `?account=`).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Receipt,
  QrCode,
  Send,
  Download,
  RefreshCw,
  Landmark,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { formatMoney, type Account, type Transaction, type PaymentCard } from "@/lib/mock-data";
import { roundMoney } from "@/lib/money";
import type {
  SpendBreakdown,
  SpendRange,
  AttentionItem,
  CashFlow,
  UpcomingPayment,
} from "@/lib/dashboard-insights";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import { ListSkeleton } from "@/components/states/ListStates";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecentTransactions, CardsMini, AttentionBand, FxRatesMini, fxPeek } from "./MinimalKit";
import { SpendsRadialChart } from "@/components/dashboard/SpendsRadialChart";
import { withFrom } from "@/lib/payment-options";
import { MoneyActionPicker, type MoneyActionKind } from "./MoneyActionPicker";

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface DashData {
  firstName: string;
  accounts: Account[];
  defaultAccountId: string | null;
  /** The account everything on the dashboard is scoped to. */
  selectedAccountId: string | null;
  spendByRange: Record<SpendRange, SpendBreakdown>;
  /** Settled in/out on the selected account over the trailing window. */
  cashFlow: CashFlow;
  latestTxns: Transaction[];
  cards: PaymentCard[];
  /** Active standing orders leaving the selected account, soonest first. */
  upcoming: UpcomingPayment[];
  /** Everything those standing orders take in the next 30 days. */
  scheduledNext30: number;
  attention: AttentionItem[];
}

export type DashStatus = "ready" | "loading" | "error";

/** What every layout receives. */
export interface DashViewProps {
  data: DashData;
  status: DashStatus;
  /** When the data on screen was last fetched (ms epoch). */
  updatedAt: number;
  showAmounts: boolean;
  onToggle: () => void;
  onSelectAccount: (id: string) => void;
  onRefresh: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

export const SPRING = { type: "spring", duration: 0.35, bounce: 0 } as const;

export { withFrom };

export function selectedAccount(data: DashData): Account | undefined {
  return data.accounts.find((a) => a.id === data.selectedAccountId) ?? data.accounts[0];
}

/**
 * What's left on the selected account once its standing orders for the next 30
 * days have run. Null when nothing is scheduled.
 */
export function forecastFor(data: DashData): { left: number; scheduled: number } | null {
  const account = selectedAccount(data);
  if (!account || data.scheduledNext30 <= 0) return null;
  const available = account.available ?? account.balance ?? 0;
  return { left: roundMoney(available - data.scheduledNext30), scheduled: data.scheduledNext30 };
}

function last4(number: string): string {
  return number.replace(/\s/g, "").slice(-4);
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** "Today" / "Tomorrow" / "Yesterday" / "Fri 26 Sep". */
export function dayLabel(iso: string): string {
  const now = Date.now();
  if (iso === isoDay(now)) return "Today";
  if (iso === isoDay(now + 86_400_000)) return "Tomorrow";
  if (iso === isoDay(now - 86_400_000)) return "Yesterday";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/* ── Chrome ──────────────────────────────────────────────────────────────── */

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    // Phone: 16px inside a 16px gutter, so rows keep their width; desktop keeps the roomier 24px.
    <div className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:gap-6 sm:p-6", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <span className="text-[15px] font-medium leading-none text-foreground sm:text-[16px]">{title}</span>
      {href && (
        // Taller hit area for a thumb without moving the text.
        <Link href={href} className="-my-2 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:text-[12.5px]">
          {cta ?? t("dashboard.viewAll", "View all")}
        </Link>
      )}
    </div>
  );
}

/** A panel with nothing to show yet: what's missing, and the way to fix it. */
export function PanelEmpty({ text, action }: { text: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center sm:py-8">
      <p className="text-[13px] text-muted-foreground">{text}</p>
      {action && (
        <Link
          href={action.href}
          className="text-[13px] text-foreground underline-offset-4 transition-colors hover:underline"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <div className="-mx-4">
      <ListSkeleton rows={rows} columns={3} />
    </div>
  );
}

/* ── Header ──────────────────────────────────────────────────────────────── */

function greetingFor(hour: number, t: (key: string, fallback?: string) => string): string {
  if (hour < 12) return t("dashboard.greeting.morning", "Good morning");
  if (hour < 17) return t("dashboard.greeting.afternoon", "Good afternoon");
  return t("dashboard.greeting.evening", "Good evening");
}

export function Greeting({ firstName, className }: { firstName: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <h1
      // Quieter on a phone so the balance, not the hello, is the loudest thing on screen.
      className={cn(
        "text-[20px] font-medium leading-[26px] tracking-[-0.02em] text-foreground sm:text-[26px] sm:leading-[32px]",
        className,
      )}
      suppressHydrationWarning
    >
      {greetingFor(new Date().getHours(), t)}, {firstName} 👋🏾
    </h1>
  );
}

/** A glass control on the hero panel: frosted, so the wave and map blur behind it. */
export const HERO_GLASS =
  "backdrop-blur-md border border-[color-mix(in_oklch,var(--hero-foreground)_16%,transparent)] bg-[color-mix(in_oklch,var(--hero-foreground)_8%,transparent)] text-[var(--hero-foreground)] hover:bg-[color-mix(in_oklch,var(--hero-foreground)_14%,transparent)] group-hover:bg-[color-mix(in_oklch,var(--hero-foreground)_14%,transparent)]";

/**
 * Send / Pay Bill / Top-Up. Each opens a picker (bottom sheet on a phone) that
 * drills into the specific option — recipient type, bill category, what to top
 * up — and deep-links into the flow on the selected account.
 *
 * `buttons` is the desktop pill row that sits beside the greeting. `row` is the
 * phone version that sits under the balance: three equal columns, icon over
 * label, so the actions never wrap into a ragged second line and longer
 * translations ("Envoyer de l'argent") wrap inside their own column.
 */
export function MoneyActions({
  accountId,
  hasOtherAccounts = false,
  variant = "buttons",
  tone = "plain",
  className,
}: {
  accountId: string | null;
  /** Offers "Between my accounts" under Send. */
  hasOtherAccounts?: boolean;
  variant?: "buttons" | "row";
  /** `hero`: glass controls with white type for the slate hero panel. */
  tone?: "plain" | "hero";
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MoneyActionKind>("send");
  const actions: { kind: MoneyActionKind; icon: typeof Send; label: string; primary: boolean }[] = [
    { kind: "send", icon: Send, label: t("dashboard.sendMoney", "Send Money"), primary: true },
    { kind: "bill", icon: Receipt, label: t("dashboard.payBill", "Pay Bill"), primary: false },
    { kind: "topup", icon: Download, label: t("dashboard.topUp", "Top-Up"), primary: false },
  ];
  const hero = tone === "hero";
  const pick = (next: MoneyActionKind) => {
    setKind(next);
    setOpen(true);
  };

  const picker = (
    <MoneyActionPicker
      kind={kind}
      open={open}
      onOpenChange={setOpen}
      accountId={accountId}
      hasOtherAccounts={hasOtherAccounts}
    />
  );

  if (variant === "row") {
    return (
      <div className={cn("grid grid-cols-3 gap-2", className)}>
        {actions.map(({ kind: k, icon: Icon, label, primary }) => (
          <button
            key={k}
            type="button"
            onClick={() => pick(k)}
            aria-haspopup="dialog"
            className="group flex flex-col items-center gap-2 text-center cursor-pointer"
          >
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-full transition-[background-color,transform] duration-150 group-active:scale-95",
                primary
                  ? "bg-primary text-primary-foreground group-hover:bg-primary-hover"
                  : hero
                    ? HERO_GLASS
                    : "border border-[var(--tile-border)] bg-[var(--tile)] text-foreground group-hover:bg-[var(--tile-hover)]",
              )}
            >
              <Icon size={18} strokeWidth={1.8} />
            </span>
            <span className={cn("text-[12.5px] font-medium leading-tight", hero ? "text-[var(--hero-foreground)]" : "text-foreground")}>
              {label}
            </span>
          </button>
        ))}
        {picker}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {actions.map(({ kind: k, icon: Icon, label, primary }) => (
        <button
          key={k}
          type="button"
          onClick={() => pick(k)}
          aria-haspopup="dialog"
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-[14px] font-medium leading-none transition-colors cursor-pointer",
            "rounded-lg",
            primary
              ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover"
              : hero
                ? HERO_GLASS
                : "border border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          <Icon size={17} strokeWidth={1.8} />
          {label}
        </button>
      ))}
      {picker}
    </div>
  );
}

/** "Updated just now" / "Updated N min ago", re-evaluated every 30s. */
export function useUpdatedLabel(updatedAt: number): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [updatedAt]);
  const mins = Math.floor((now - updatedAt) / 60_000);
  return mins < 1 ? "Updated just now" : `Updated ${mins} min ago`;
}

/** Refresh icon button. The relative time is available via title/aria-label or in BalanceMeta. */
export function RefreshControl({
  updatedAt,
  refreshing,
  onRefresh,
}: {
  updatedAt: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const timeLabel = useUpdatedLabel(updatedAt);

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      title={timeLabel}
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-default cursor-pointer shrink-0"
      aria-label={`${t("dashboard.refresh", "Refresh dashboard")} (${timeLabel})`}
    >
      <RefreshCw size={18} strokeWidth={1.8} className={cn(refreshing && "animate-spin")} />
    </button>
  );
}

/* ── Account + balance ───────────────────────────────────────────────────── */

function AccountLabel({ account, bare = false }: { account: Account; bare?: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      {!bare && <Landmark size={17} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />}
      <span>{t(`accounts.type.${account.type}`, account.type)}</span>
      <span className={cn("tabular", !bare && "text-muted-foreground")}>••••{last4(account.number)}</span>
    </>
  );
}

/**
 * The hero pill's drop shadow, blended with `multiply` so it darkens whatever is
 * behind it — the card, the drifting wave, either theme — instead of laying a
 * fixed dark colour on top. Two parts, like a real shadow: a tight contact
 * shadow right under the pill and a wider, softer one falling further. Both
 * are narrower than the pill and start low, so nothing haloes its sides and no
 * mask edge cuts them off. Strength comes from the wave tuner (`--pill-shadow`).
 */
function PillShadow() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 mix-blend-multiply"
      style={{ opacity: "var(--pill-shadow, 0.6)" }}
    >
      <span className="absolute inset-x-[6%] top-[45%] -bottom-5 rounded-full bg-[var(--hero-pill-shadow)] opacity-60 blur-[14px]" />
      <span className="absolute inset-x-[12%] top-[60%] -bottom-1.5 rounded-full bg-[var(--hero-pill-shadow)] blur-[5px]" />
    </span>
  );
}

/**
 * The account label. With several accounts it opens a menu to switch (closes on
 * pick) with "Account details" at the foot; with one, it links to its details.
 * Switching rescopes the dashboard only — it never changes the default.
 */
export function AccountSwitcher({
  data,
  onSelect,
  align = "start",
  tone = "plain",
}: {
  data: DashData;
  onSelect: (id: string) => void;
  align?: "start" | "center";
  /** `hero`: the glass pill on the slate hero panel (white type, no icon). */
  tone?: "plain" | "hero";
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const account = selectedAccount(data);
  if (!account) return null;

  const hero = tone === "hero";
  const trigger = hero
    ? "flex w-fit items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--hero-foreground)_6%,transparent)] relative px-4 py-2.5 text-[15px] leading-none text-[var(--hero-foreground)] outline-none shadow-[inset_0_24px_24px_-12px_rgba(255,255,255,0.1)] transition-colors hover:bg-[color-mix(in_oklch,var(--hero-foreground)_12%,transparent)] sm:text-[16px]"
    : "-mx-3 flex w-fit items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] leading-none text-foreground outline-none transition-colors hover:bg-muted";
  const chevron = hero ? "text-[var(--hero-foreground)]" : "text-muted-foreground";

  if (data.accounts.length < 2) {
    return (
      <Link href={`/accounts/${account.id}`} className={trigger} aria-label={t("dashboard.accountDetails", "Account details")}>
        {hero && <PillShadow />}
        <AccountLabel account={account} bare={hero} />
        <ChevronRight size={16} strokeWidth={1.8} className={chevron} />
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(trigger, !hero && "aria-expanded:bg-muted", hero && "aria-expanded:bg-[color-mix(in_oklch,var(--hero-foreground)_12%,transparent)]", "cursor-pointer")}
        aria-label={t("dashboard.switchAccount", "Switch account")}
      >
        {hero && <PillShadow />}
        <AccountLabel account={account} bare={hero} />
        <ChevronDown size={16} strokeWidth={1.8} className={chevron} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={6} className="w-[280px] p-1.5">
        <DropdownMenuRadioGroup value={account.id} onValueChange={(id) => onSelect(id as string)}>
          {data.accounts.map((a) => (
            <DropdownMenuRadioItem
              key={a.id}
              value={a.id}
              closeOnClick
              className="gap-2.5 rounded-lg py-3 pl-3 pr-9 text-[14px]"
            >
              <AccountLabel account={a} />
              {a.id === data.defaultAccountId && (
                <span className="ml-auto text-[12px] text-muted-foreground">{t("common.default", "Default")}</span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push(`/accounts/${account.id}`)}
          className="justify-between rounded-lg px-3 py-3 text-[14px] text-muted-foreground cursor-pointer"
        >
          {t("dashboard.accountDetails", "Account details")}
          <ChevronRight size={15} strokeWidth={1.8} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// On a phone `xl` matches `lg` so a seven-figure balance (GHS 1,284,530.44) still fits one line.
const FIGURE_SIZE = {
  md: "text-[28px]",
  lg: "text-[34px]",
  xl: "text-[34px] sm:text-[52px]",
} as const;

/** The balance number + eye toggle. */
export function BalanceFigure({
  data,
  loading,
  showAmounts,
  onToggle,
  size = "lg",
  className,
}: {
  data: DashData;
  loading: boolean;
  showAmounts: boolean;
  onToggle: () => void;
  size?: keyof typeof FIGURE_SIZE;
  className?: string;
}) {
  const { t } = useTranslation();
  const account = selectedAccount(data);
  if (!account) return null;
  return (
    <div className={cn("flex items-center gap-2 sm:gap-4", className)}>
      {loading ? (
        <span className="h-[34px] w-56 animate-pulse rounded-lg bg-muted/60 sm:w-64" aria-label="Loading balance" />
      ) : (
        <span className={cn("tabular leading-none tracking-[0.01em] text-foreground", FIGURE_SIZE[size])}>
          {/* A smaller currency code on a phone lets the digits carry the line. */}
          <span className="text-[0.6em] text-muted-foreground sm:text-[1em]">{account.currency}</span>{" "}
          <RevealingAmount amount={account.balance ?? 0} currency="" />
        </span>
      )}
      <button
        type="button"
        onClick={onToggle}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
        aria-label={showAmounts ? t("header.hideAmounts", "Hide balances") : t("header.showAmounts", "Show balances")}
      >
        {showAmounts ? <Eye size={18} strokeWidth={1.8} /> : <EyeOff size={18} strokeWidth={1.8} />}
      </button>
    </div>
  );
}

/** Available / on hold (only when something is held) and, optionally, the 30-day in/out line. */
export function BalanceMeta({
  data,
  showAmounts,
  showFlow = true,
  updatedAt,
  className,
}: {
  data: DashData;
  showAmounts: boolean;
  showFlow?: boolean;
  updatedAt?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!updatedAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [updatedAt]);

  const account = selectedAccount(data);
  if (!account) return null;
  const balance = account.balance ?? 0;
  const available = account.available ?? balance;
  const onHold = roundMoney(balance - available);
  const { cashFlow } = data;
  const hasFlow = showFlow && (cashFlow.moneyIn > 0 || cashFlow.moneyOut > 0);
  const mins = updatedAt ? Math.floor((now - updatedAt) / 60_000) : 0;
  const timeLabel = updatedAt ? (mins < 1 ? "Updated just now" : `Updated ${mins} min ago`) : null;

  if (onHold <= 0 && !hasFlow && !timeLabel) return null;

  return (
    <div className={cn("flex flex-col gap-1.5 text-[13px] text-muted-foreground", className)}>
      {onHold > 0 && (
        <span className="tabular">
          {formatMoney(available, account.currency, showAmounts)} available ·{" "}
          {formatMoney(onHold, account.currency, showAmounts)} on hold
        </span>
      )}
      {hasFlow && (
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>{t("dashboard.lastDays", "Last {days} days", { days: cashFlow.days })}</span>
          <span className="inline-flex items-center gap-1.5">
            {t("dashboard.moneyIn", "In")}
            <span className="tabular text-success">+ {formatMoney(cashFlow.moneyIn, account.currency, showAmounts)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            {t("dashboard.moneyOut", "Out")}
            <span className="tabular text-foreground">− {formatMoney(cashFlow.moneyOut, account.currency, showAmounts)}</span>
          </span>
        </span>
      )}
      {timeLabel && (
        <span className="text-[12px] tabular text-muted-foreground/75" suppressHydrationWarning>
          {timeLabel}
        </span>
      )}
    </div>
  );
}

/* ── Status + attention ──────────────────────────────────────────────────── */

/** A refresh that failed: say so, keep the last good numbers, offer a retry. */
export function RefreshFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 sm:px-6">
      <AlertCircle size={17} strokeWidth={1.8} className="shrink-0 text-warning" />
      <span className="min-w-0 flex-1 text-[13.5px] text-foreground">
        Couldn&apos;t refresh your dashboard.{" "}
        <span className="text-muted-foreground">You&apos;re seeing your last update — your money hasn&apos;t moved.</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-border px-3 py-1.5 text-[13px] text-foreground transition-colors hover:bg-muted cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}

/** The error notice and the Needs attention band, in that order, when they apply. */
export function Notices({ data, status, onRefresh }: Pick<DashViewProps, "data" | "status" | "onRefresh">) {
  return (
    <>
      {status === "error" && <RefreshFailed onRetry={onRefresh} />}
      <AnimatePresence initial={false}>
        {data.attention.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING}
            className="overflow-hidden"
          >
            <AttentionBand items={data.attention} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Content blocks ──────────────────────────────────────────────────────── */

export function UpcomingList({ items, showAmounts }: { items: UpcomingPayment[]; showAmounts: boolean }) {
  return (
    <ul className="flex flex-col divide-y divide-border/40">
      {items.map((p) => (
        <li key={p.id} className="flex items-center gap-3.5 py-3">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[14px] text-foreground">{p.payee}</span>
            <span className="text-[12px] text-muted-foreground tabular">
              {dayLabel(p.date)} · {p.frequency}
            </span>
          </span>
          <span className="shrink-0 tabular text-[14px] text-foreground">
            − {formatMoney(p.amount, p.currency, showAmounts)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ComingUpEmpty({ accountId }: { accountId: string | null }) {
  return (
    <PanelEmpty
      text="Nothing scheduled from this account."
      action={{ label: "Schedule a payment", href: withFrom("/payments/standing/new", accountId) }}
    />
  );
}

export function ComingUpCard({
  data,
  loading,
  showAmounts,
  className,
}: {
  data: DashData;
  loading: boolean;
  showAmounts: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Card className={className}>
      <CardHeader title={t("dashboard.comingUp", "Coming up")} href="/payments/standing" cta={t("common.manage", "Manage")} />
      {loading ? (
        <PanelSkeleton rows={3} />
      ) : data.upcoming.length === 0 ? (
        <ComingUpEmpty accountId={data.selectedAccountId} />
      ) : (
        <UpcomingList items={data.upcoming} showAmounts={showAmounts} />
      )}
    </Card>
  );
}

/* ── Pay again (saved payees) ────────────────────────────────────────────── */

/**
 * Saved payees, each deep-linked into its own rail with the recipient prefilled
 * and the selected account as the source — a tap lands on the amount, not on a
 * generic Send screen.
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

export function PayAgainCard({ data, className }: { data: DashData; className?: string }) {
  const { t } = useTranslation();
  return (
    <Card className={className}>
      <CardHeader title={t("dashboard.payAgain", "Pay again")} href="/beneficiaries" cta={t("common.manage", "Manage")} />
      <div className="grid grid-cols-4 gap-x-2 gap-y-6 sm:mt-1 sm:gap-y-7">
        {PAY_AGAIN.map((p, i) => (
          <Link
            key={`${p.rail}-${p.recipient}`}
            href={withFrom(`/payments/send?rail=${p.rail}&recipient=${encodeURIComponent(p.recipient)}`, data.selectedAccountId)}
            className="group flex min-w-0 flex-col items-center gap-2.5 text-center sm:gap-3"
            aria-label={`Pay ${p.name}, ${p.detail}`}
          >
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-full text-[13.5px] tracking-[0.02em] transition-transform group-hover:scale-105 sm:size-12 sm:text-[14px]",
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

export function activityHref(accountId: string | null): string {
  return accountId ? `/transactions?account=${encodeURIComponent(accountId)}` : "/transactions";
}

export function ActivityBody({
  data,
  loading,
  showAmounts,
  limit = 4,
}: {
  data: DashData;
  loading: boolean;
  showAmounts: boolean;
  limit?: number;
}) {
  if (loading) return <PanelSkeleton rows={limit} />;
  if (data.latestTxns.length === 0) return <PanelEmpty text="No activity on this account yet." />;
  return <RecentTransactions txns={data.latestTxns} showAmounts={showAmounts} limit={limit} />;
}

export function ActivityCard({
  data,
  loading,
  showAmounts,
  limit = 4,
  className,
}: {
  data: DashData;
  loading: boolean;
  showAmounts: boolean;
  limit?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Card className={className}>
      <CardHeader title={t("dashboard.recentActivity", "Recent activity")} href={activityHref(data.selectedAccountId)} />
      <ActivityBody data={data} loading={loading} showAmounts={showAmounts} limit={limit} />
    </Card>
  );
}

export function CardsCard({ data, loading, className }: { data: DashData; loading: boolean; className?: string }) {
  const { t } = useTranslation();
  return (
    <Card className={className}>
      <CardHeader title={t("dashboard.cards", "Cards")} href="/cards" />
      {loading ? (
        <PanelSkeleton rows={2} />
      ) : data.cards.length === 0 ? (
        <PanelEmpty text="No card on this account." action={{ label: "Request a card", href: "/cards/request" }} />
      ) : (
        <CardsMini cards={data.cards} />
      )}
    </Card>
  );
}

export function AnalyticsCard({
  data,
  loading,
  showAmounts,
  className,
}: {
  data: DashData;
  loading: boolean;
  showAmounts: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <Card className={className}>
        <div className="h-[260px] animate-pulse rounded-xl bg-muted/60" aria-label="Loading analytics" />
      </Card>
    );
  }
  return <SpendsRadialChart byRange={data.spendByRange} showAmounts={showAmounts} className={className} />;
}

/** Exchange rates as a collapsible bar (headline pair peeks while closed). */
export function FxBar({ defaultOpen = false, className }: { defaultOpen?: boolean; className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-6 px-4 py-4 cursor-pointer sm:px-6"
        aria-expanded={open}
      >
        <span className="shrink-0 text-[15px] font-medium leading-none text-foreground sm:text-[16px]">
          {t("dashboard.exchangeRates", "Exchange rates")}
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-end gap-4">
          {!open && <span className="text-[13px] text-muted-foreground tabular">{fxPeek()}</span>}
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
            transition={SPRING}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-1 sm:px-6">
              <FxRatesMini />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Promo banner ────────────────────────────────────────────────────────── */

const PROMO_DISMISSED_KEY = "nibs-dash-promo-dismissed";

/**
 * The app-download banner. Dismissed once, gone for this browser. Hidden on a
 * phone: a QR code can't be scanned by the screen it's shown on.
 */
/** Shared by every promo variant: `dismissed` is null until storage is checked, so a dismissed banner never flashes. */
export function usePromoDismissal(): [dismissed: boolean | null, dismiss: () => void] {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(PROMO_DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(PROMO_DISMISSED_KEY, "1");
    } catch {
      // Storage blocked — it stays hidden for this visit only.
    }
  };

  return [dismissed, dismiss];
}

export function PromoBanner() {
  const { t } = useTranslation();
  const [dismissed, dismiss] = usePromoDismissal();
  if (dismissed !== false) return null;

  return (
    <div
      className="relative hidden overflow-hidden rounded-2xl p-8 text-primary-foreground sm:block"
      style={{
        background:
          "radial-gradient(130% 130% at 15% 15%, var(--primary-hover), color-mix(in oklch, var(--primary) 88%, black))",
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
        aria-label={t("common.dismiss", "Dismiss")}
      >
        <X size={17} strokeWidth={1.8} />
      </button>
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
