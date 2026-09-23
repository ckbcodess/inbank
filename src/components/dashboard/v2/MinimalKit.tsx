"use client";

/**
 * Minimal dashboard kit.
 *
 * Small, quiet primitives shared by the six minimal dashboard variations. The
 * whole aesthetic is: enormous whitespace, hairline dividers, one calm
 * monochrome trend line, tiny tracked-out labels, and numbers as the only loud
 * thing on the page (Wealthsimple / Origin register). Everything honours the
 * hide-amounts toggle and uses semantic tokens only.
 */

import Link from "next/link";
import { useId, useState } from "react";
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronRight,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { maskDigits } from "@/components/providers/AmountVisibilityProvider";
import { FX_RATES, FX_PUBLISHED_AT, type Account, type Transaction, type PaymentCard } from "@/lib/mock-data";
import type {
  BalancePoint,
  Slice,
  SpendBreakdown,
  AttentionItem,
} from "@/lib/dashboard-insights";

/* ── Formatting ──────────────────────────────────────────────────────────── */

export function fmtGHS(
  amount: number,
  showAmounts: boolean,
  opts: { compact?: boolean; decimals?: boolean } = {},
): string {
  const sign = amount < 0 ? "−" : "";
  const abs = Math.abs(amount);
  let body = "";
  if (opts.compact && abs >= 1000) {
    const units: [number, string][] = [
      [1_000_000, "M"],
      [1_000, "K"],
    ];
    for (const [limit, suffix] of units) {
      if (abs >= limit) {
        const scaled = abs / limit;
        const text =
          scaled < 10 ? scaled.toFixed(1).replace(/\.0$/, "") : Math.round(scaled).toString();
        body = `${text}${suffix}`;
        break;
      }
    }
  }
  if (!body) {
    body = new Intl.NumberFormat("en-GH", {
      minimumFractionDigits: opts.decimals === false ? 0 : 2,
      maximumFractionDigits: opts.decimals === false ? 0 : 2,
    }).format(abs);
  }
  const full = `${sign}GHS ${body}`;
  // When hidden, `maskDigits` drops separators and shows one bullet per digit.
  return showAmounts ? full : maskDigits(full);
}

export function signedPct(ratio: number): string {
  const pct = ratio * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`;
}

export function pct(share: number): string {
  return `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`;
}

function shortName(name: string): string {
  return name.replace("Personal ", "").replace(" Account", "");
}

/** "2026-08-11" → "11 Aug" — how people say dates, not how ledgers store them. */
export function friendlyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ── Text primitives ─────────────────────────────────────────────────────── */

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[11px] uppercase tracking-[0.16em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The giant, thin balance figure with an eyebrow and an eye toggle. */
export function BalanceHeadline({
  label = "Total balance",
  amount,
  showAmounts,
  onToggle,
  size = "xl",
  align = "left",
}: {
  label?: string;
  amount: number;
  showAmounts: boolean;
  onToggle: () => void;
  size?: "lg" | "xl" | "2xl";
  align?: "left" | "center";
}) {
  const intPart = new Intl.NumberFormat("en-GH", {
    maximumFractionDigits: 0,
  }).format(Math.floor(amount));
  const frac = (amount % 1).toFixed(2).substring(1);
  const sizes = {
    lg: "text-[34px] sm:text-[40px]",
    xl: "text-[46px] sm:text-[60px]",
    "2xl": "text-[56px] sm:text-[76px]",
  } as const;
  const fracSizes = {
    lg: "text-[18px]",
    xl: "text-[24px] sm:text-[28px]",
    "2xl": "text-[26px] sm:text-[34px]",
  } as const;

  return (
    <div className={cn("flex flex-col gap-2", align === "center" && "items-center text-center")}>
      <div className="flex items-center gap-2">
        <Eyebrow>{label}</Eyebrow>
        <button
          type="button"
          onClick={onToggle}
          className="cursor-pointer p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={showAmounts ? "Hide balances" : "Show balances"}
        >
          {showAmounts ? <Eye size={14} strokeWidth={1.8} /> : <EyeOff size={14} strokeWidth={1.8} />}
        </button>
      </div>
      <div className={cn("tabular leading-[0.95] tracking-[-0.03em] text-foreground", sizes[size])}>
        {showAmounts ? (
          <>
            GHS {intPart}
            <span className={cn("text-muted-foreground", fracSizes[size])}>{frac}</span>
          </>
        ) : (
          "GHS ••••••"
        )}
      </div>
    </div>
  );
}

export function DeltaLine({
  delta,
  deltaPct,
  spanDays,
  showAmounts,
}: {
  delta: number;
  deltaPct: number;
  spanDays: number;
  showAmounts: boolean;
}) {
  const up = delta >= 0;
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span
        className={cn(
          "inline-flex items-center gap-1 tabular",
          up ? "text-success" : "text-muted-foreground",
        )}
      >
        {up ? <ArrowUpRight size={15} strokeWidth={1.9} /> : <ArrowDownRight size={15} strokeWidth={1.9} />}
        {fmtGHS(Math.abs(delta), showAmounts, { compact: true })}
      </span>
      <span className="text-muted-foreground tabular">
        {showAmounts ? signedPct(deltaPct) : "••%"}
      </span>
      <span className="text-muted-foreground">· past {spanDays} days</span>
    </div>
  );
}

/* ── Trend chart ─────────────────────────────────────────────────────────── */

function smoothPath(values: number[], w: number, h: number, pad: number) {
  if (values.length < 2) return { line: "", area: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const p = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));
  let line = `M ${p[0].x.toFixed(2)} ${p[0].y.toFixed(2)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    line += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return { line, area: `${line} L ${w} ${h} L 0 ${h} Z` };
}

export function TrendChart({
  points,
  height = 160,
  area = true,
  className,
  accent = "foreground",
}: {
  points: BalancePoint[];
  height?: number;
  area?: boolean;
  className?: string;
  accent?: "foreground" | "success";
}) {
  const W = 800;
  const H = 240;
  const values = points.map((p) => p.value);
  const { line, area: areaPath } = smoothPath(values, W, H, 16);
  const color = accent === "success" ? "text-success" : "text-foreground/75";
  const gid = useId();

  if (points.length < 2) return null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("w-full", color, className)}
      style={{ height }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={areaPath} fill={`url(#${gid})`} />}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** A whisper-thin sparkline for stat tiles. */
export function Sparkline({ points, className }: { points: BalancePoint[]; className?: string }) {
  return <TrendChart points={points} height={40} area={false} className={className} />;
}

/* ── Allocation ──────────────────────────────────────────────────────────── */

export function AllocationBar({ slices, thickness = 8 }: { slices: Slice[]; thickness?: number }) {
  return (
    <div
      className="flex w-full overflow-hidden rounded-full bg-muted"
      style={{ height: thickness }}
      role="img"
      aria-label="Allocation"
    >
      {slices.map((s, i) => (
        <span
          key={`${s.label}-${i}`}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ width: `${Math.max(s.share * 100, 1.5)}%`, background: s.color }}
          title={`${s.label}: ${pct(s.share)}`}
        />
      ))}
    </div>
  );
}

export function DotLegend({
  slices,
  showAmounts,
  compact = false,
}: {
  slices: Slice[];
  showAmounts: boolean;
  compact?: boolean;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border/40">
      {slices.map((s, i) => (
        <li key={`${s.label}-${i}`} className="flex items-center gap-3 py-3">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden="true" />
          <span className="flex-1 truncate text-[13.5px] text-foreground">{s.label}</span>
          {!compact && <span className="tabular text-[12px] text-muted-foreground">{pct(s.share)}</span>}
          <span className="tabular text-[13.5px] text-foreground">
            {fmtGHS(s.amount, showAmounts, { compact })}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── Lists ───────────────────────────────────────────────────────────────── */

export function AccountRows({
  accounts,
  showAmounts,
  size = "md",
}: {
  accounts: Account[];
  showAmounts: boolean;
  size?: "md" | "lg";
}) {
  return (
    <ul className="flex flex-col divide-y divide-border/50">
      {accounts.map((a) => (
        <li key={a.id}>
          <Link
            href={`/accounts/${a.id}`}
            className="group flex items-baseline justify-between gap-4 py-4 transition-colors"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span
                className={cn(
                  "truncate text-foreground transition-colors group-hover:text-muted-foreground",
                  size === "lg" ? "text-[17px] tracking-[-0.01em]" : "text-[14px]",
                )}
              >
                {shortName(a.name)}
              </span>
              <span className="text-[12px] text-muted-foreground tabular">
                {a.type} · ••{a.number.slice(-4)}
              </span>
            </span>
            <span className={cn("tabular text-foreground", size === "lg" ? "text-[17px]" : "text-[14px]")}>
              {fmtGHS(a.balance ?? 0, showAmounts)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function LatestTransactions({
  txns,
  showAmounts,
  limit = 4,
}: {
  txns: Transaction[];
  showAmounts: boolean;
  limit?: number;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border/40">
      {txns.slice(0, limit).map((t) => {
        const credit = t.direction === "credit";
        return (
          <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
              {t.counterparty || t.description}
            </span>
            <span className={cn("tabular text-[13px]", credit ? "text-success" : "text-foreground")}>
              {credit ? "+" : "−"}
              {fmtGHS(Math.abs(t.amount), showAmounts, { compact: true }).replace("GHS ", "GHS ")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Actions ─────────────────────────────────────────────────────────────── */

const ACTIONS = [
  { href: "/payments/send", label: "Send" },
  { href: "/payments/bills", label: "Pay" },
  { href: "/cards", label: "Cards" },
  { href: "/accounts", label: "Accounts" },
] as const;

export function QuickActionsText({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-2", className)}>
      {ACTIONS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="text-[14px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {a.label}
        </Link>
      ))}
    </div>
  );
}

export function RangeTabs({
  value,
  onChange,
  ranges = ["1M", "3M", "6M", "1Y", "ALL"],
}: {
  value: string;
  onChange: (r: string) => void;
  ranges?: string[];
}) {
  return (
    <div className="flex items-center gap-1">
      {ranges.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            "cursor-pointer rounded-full px-2.5 py-1 text-[12px] tabular transition-colors",
            value === r ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

/** Trailing fraction of a series, for the range tabs (honest slice of real data). */
export function sliceByRange(points: BalancePoint[], range: string): BalancePoint[] {
  const frac: Record<string, number> = { "1M": 0.3, "3M": 0.55, "6M": 0.8, "1Y": 1, ALL: 1 };
  const f = frac[range] ?? 1;
  if (f >= 1) return points;
  const start = Math.max(0, Math.floor(points.length * (1 - f)) - 1);
  const out = points.slice(start);
  return out.length >= 2 ? out : points;
}

/* ── Accounts disclosure ─────────────────────────────────────────────────── */

/**
 * Total balance is the glance; the individual accounts are wrapped in a
 * disclosure that stays closed by default, so the breakdown is one tap away
 * without costing vertical space. A hairline allocation bar teases the split
 * while collapsed.
 */
export function AccountsDisclosure({
  accounts,
  slices,
  showAmounts,
  defaultOpen = false,
}: {
  accounts: Account[];
  slices: Slice[];
  showAmounts: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-6 py-4 cursor-pointer"
        aria-expanded={open}
      >
        <span className="flex shrink-0 items-center gap-2">
          <Eyebrow>Accounts</Eyebrow>
          <span className="text-[12px] text-muted-foreground tabular">{accounts.length}</span>
        </span>
        <span className="min-w-0 flex-1">
          <AllocationBar slices={slices} thickness={6} />
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.8}
          className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-t border-border px-6 pb-4 pt-1">
          <AccountRows accounts={accounts} showAmounts={showAmounts} />
        </div>
      )}
    </div>
  );
}

/* ── Needs attention ─────────────────────────────────────────────────────── */

const TONE_DOT: Record<AttentionItem["tone"], string> = {
  destructive: "bg-destructive",
  warning: "bg-warning",
  muted: "bg-muted-foreground",
};

/** A compact high-priority strip — only render when there are items. */
export function AttentionBand({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="px-6 pt-5">
        <span className="text-[16px] font-medium leading-none text-foreground">Needs attention</span>
      </div>
      <ul className="flex flex-col divide-y divide-border/50 px-6 pb-2 pt-1">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              href={it.href}
              className="group flex items-center gap-3 py-3 transition-colors"
            >
              <span className={cn("size-2 shrink-0 rounded-full", TONE_DOT[it.tone])} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="text-[13.5px] text-foreground">{it.title}</span>
                <span className="ml-2 text-[12.5px] text-muted-foreground">{it.detail}</span>
              </span>
              <ChevronRight
                size={15}
                strokeWidth={1.8}
                className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Functional modules ──────────────────────────────────────────────────── */

/** Eyebrow title + a quiet "View all" link — the header for a minimal section. */
export function SectionHeader({
  title,
  href,
  cta = "View all",
}: {
  title: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <Eyebrow>{title}</Eyebrow>
      {href && (
        <Link
          href={href}
          className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

/** A calm minimal panel wrapper used by the functional sections. */
export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5 rounded-2xl border border-border bg-card p-6", className)}>
      {children}
    </div>
  );
}

/** Recent activity — direction, counterparty, date, amount, state. */
export function RecentTransactions({
  txns,
  showAmounts,
  limit = 5,
}: {
  txns: Transaction[];
  showAmounts: boolean;
  limit?: number;
}) {
  if (txns.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-muted-foreground">No activity yet.</p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-border/40">
      {txns.slice(0, limit).map((t) => {
        const credit = t.direction === "credit";
        const failed = typeof t.state === "string" && t.state.startsWith("failed");
        const pending = t.state === "pending";
        return (
          <li key={t.id}>
            <Link
              href={`/transactions/${t.id}`}
              className="flex w-full items-center gap-3.5 py-3 text-left transition-colors"
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  credit ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {credit ? (
                  <ArrowDownLeft className="size-4 stroke-[1.8]" />
                ) : (
                  <ArrowUpRight className="size-4 stroke-[1.8]" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[14px] text-foreground">
                  {t.counterparty || t.description}
                </span>
                <span className="text-[12px] text-muted-foreground tabular">{friendlyDate(t.date)}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span
                  className={cn(
                    "tabular text-[14px]",
                    credit ? "text-success" : "text-foreground",
                  )}
                >
                  {credit ? "+ " : "− "}
                  {fmtGHS(Math.abs(t.amount), showAmounts)}
                </span>
                <span
                  className={cn(
                    "text-[11.5px]",
                    failed ? "text-destructive" : pending ? "text-warning" : "text-muted-foreground",
                  )}
                >
                  {failed ? "Failed" : pending ? "Pending" : t.category || "Completed"}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Full spend-by-category detail: total, proportion bar, legend. */
export function SpendDetail({
  breakdown,
  showAmounts,
}: {
  breakdown: SpendBreakdown;
  showAmounts: boolean;
}) {
  if (breakdown.slices.length === 0) {
    return <p className="py-8 text-center text-[13px] text-muted-foreground">No spending yet.</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="text-[12px] text-muted-foreground">Total spend</span>
        <span className="tabular text-[24px] leading-none tracking-[-0.02em] text-foreground">
          {fmtGHS(breakdown.total, showAmounts)}
        </span>
        <span className="text-[12px] text-muted-foreground tabular">
          {breakdown.count} transactions
        </span>
      </div>
      <AllocationBar slices={breakdown.slices} thickness={8} />
      <DotLegend slices={breakdown.slices} showAmounts={showAmounts} />
    </div>
  );
}

/** Minimal cards list with an inline block toggle. */
export function CardsMini({
  cards,
  limit = 3,
}: {
  cards: PaymentCard[];
  limit?: number;
}) {
  const { t } = useTranslation();
  const [blocked, setBlocked] = useState<Record<string, boolean>>({});
  const shown = cards.slice(0, limit);

  if (shown.length === 0) {
    return <p className="py-8 text-center text-[13px] text-muted-foreground">{t("dashboard.noCards", "No cards yet.")}</p>;
  }

  const setCardBlocked = (id: string, value: boolean) =>
    setBlocked((prev) => ({ ...prev, [id]: value }));

  // Blocking is a safety move, so it is one tap and instantly reversible.
  const toggle = (c: PaymentCard, isBlocked: boolean) => {
    const next = !isBlocked;
    setCardBlocked(c.id, next);
    toast(next ? `${c.name} is blocked` : `${c.name} is unblocked`, {
      description: next
        ? "New payments stop until you unblock it. Nothing else changes."
        : "You can use it for payments right away.",
      action: { label: t("common.undo", "Undo"), onClick: () => setCardBlocked(c.id, isBlocked) },
    });
  };

  return (
    <ul className="flex flex-col divide-y divide-border/40">
      {shown.map((c) => {
        const isBlocked = blocked[c.id] ?? c.status === "Blocked";
        return (
          <li key={c.id} className="flex items-center gap-3 py-3">
            <span className="flex h-6 w-9 shrink-0 items-center justify-center rounded-[5px] bg-muted text-[8px] uppercase tracking-wide text-muted-foreground">
              {c.scheme === "Visa" ? "VISA" : "MC"}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[13.5px] text-foreground">{c.name}</span>
              <span className="text-[12px] text-muted-foreground tabular">
                {c.type} · {c.maskedNumber}
              </span>
            </span>
            <button
              type="button"
              onClick={() => toggle(c, isBlocked)}
              aria-pressed={isBlocked}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors cursor-pointer",
                isBlocked
                  ? "border-transparent bg-muted text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Lock size={12} strokeWidth={1.8} />
              {isBlocked ? t("dashboard.blocked", "Blocked") : t("dashboard.block", "Block")}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const FX_SHOWN = ["USD", "GBP", "EUR", "NGN"];

function fmtRate(rate: number): string {
  const digits = rate < 1 ? 4 : 2;
  return rate.toLocaleString("en-GH", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** The headline pair, for a collapsed FX bar ("USD 11.55"). */
export function fxPeek(): string | null {
  const usd = FX_RATES.find((r) => r.base === "USD");
  return usd ? `USD ${fmtRate(usd.mid)}` : null;
}

/** Glanceable published rates (same source as /fx-rates) with a link through. */
export function FxRatesMini() {
  const { t } = useTranslation();
  const rows = FX_SHOWN.map((b) => FX_RATES.find((r) => r.base === b)).filter(
    (r): r is (typeof FX_RATES)[number] => Boolean(r),
  );
  const published = new Date(FX_PUBLISHED_AT).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border/40">
        {rows.map((f) => (
          <li key={f.pair} className="flex items-center justify-between gap-4 py-2.5">
            <span className="text-[13.5px] text-foreground tabular">{f.base} / {f.quote}</span>
            <span className="flex items-baseline gap-3">
              <span
                className={cn(
                  "text-[12px] tabular",
                  f.changePct > 0 ? "text-success" : "text-muted-foreground",
                )}
              >
                {f.changePct > 0 ? "+" : f.changePct < 0 ? "−" : ""}
                {Math.abs(f.changePct).toFixed(2)}%
              </span>
              <span className="w-[64px] text-right text-[13.5px] text-foreground tabular">{fmtRate(f.mid)}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[11.5px] text-muted-foreground tabular">Mid-rate · published {published}</span>
        <Link href="/fx-rates" className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground">
          {t("dashboard.allRates", "All rates")}
        </Link>
      </div>
    </div>
  );
}
