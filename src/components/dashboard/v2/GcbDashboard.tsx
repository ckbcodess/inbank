"use client";

/**
 * GCB dashboard — replica of the Figma design (node 5727:3447).
 *
 * Layout (inside the existing app shell / icon sidebar / top header):
 *   1. Greeting + action buttons (Send Money / Pay Bill / Top-Up)
 *   2. Net Worth + eye toggle
 *   3. Accounts disclosure bar
 *   4. 2×2 grid: Recent Activity · Suggested for you · Cards · Analytics gauge
 *   5. FX Rates disclosure bar
 *   6. Promo banner
 *
 * Honest data throughout (net worth, activity, cards, spend gauge from the
 * ledger). Semantic tokens + zero-bold; the amber CTA/banner use the brand gold.
 */

import { useId, useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Receipt,
  Smartphone,
  QrCode,
  Send,
  Download,
  EllipsisVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Account, Transaction, PaymentCard } from "@/lib/mock-data";
import type { SpendBreakdown, Slice } from "@/lib/dashboard-insights";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import {
  fmtGHS,
  RecentTransactions,
  CardsMini,
  AccountRows,
  FxRatesMini,
} from "./MinimalKit";

export interface DashData {
  firstName: string;
  accounts: Account[];
  netWorth: number;
  breakdown: SpendBreakdown;
  latestTxns: Transaction[];
  cards: PaymentCard[];
  allocation: { total: number; slices: Slice[] };
}

interface DashProps {
  data: DashData;
  showAmounts: boolean;
  onToggle: () => void;
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
  return (
    <div className="flex items-center justify-between">
      <span className="text-[16px] font-medium leading-none text-foreground">{title}</span>
      {href && (
        <Link href={href} className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground">
          {cta}
        </Link>
      )}
    </div>
  );
}

function ActionButtons() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/payments/send"
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-[14px] font-medium leading-none text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
      >
        <Send size={17} strokeWidth={1.8} />
        Send Money
      </Link>
      <Link
        href="/payments/bills"
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-[14px] font-medium leading-none text-foreground transition-colors hover:bg-muted"
      >
        <Receipt size={17} strokeWidth={1.8} />
        Pay Bill
      </Link>
      <Link
        href="/payments/bills"
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-[14px] font-medium leading-none text-foreground transition-colors hover:bg-muted"
      >
        <Download size={17} strokeWidth={1.8} />
        Top-Up
      </Link>
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
        aria-label="More actions"
      >
        <EllipsisVertical size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function NetWorth({ amount, showAmounts, onToggle }: { amount: number; showAmounts: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="text-[16px] font-medium leading-none text-foreground">Total balance</span>
      <div className="flex items-center gap-4">
        <span className="tabular text-[34px] leading-none tracking-[0.02em] text-foreground">
          <span className="text-muted-foreground">GHS</span>{" "}
          <RevealingAmount amount={amount} currency="" />
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label={showAmounts ? "Hide balances" : "Show balances"}
        >
          {showAmounts ? <Eye size={18} strokeWidth={1.8} /> : <EyeOff size={18} strokeWidth={1.8} />}
        </button>
      </div>
    </div>
  );
}

/** Full-width collapsible bar (used for Accounts and FX rates). */
function DisclosureBar({
  label,
  count,
  defaultOpen = false,
  children,
}: {
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 cursor-pointer"
        aria-expanded={open}
      >
        <span className="flex items-baseline gap-2">
          <span className="text-[16px] font-medium leading-none text-foreground">{label}</span>
          {count != null && (
            <span className="text-[16px] font-medium leading-none text-foreground opacity-40 tabular">{count}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.8}
          className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t border-border px-6 pb-4 pt-1">{children}</div>}
    </div>
  );
}

/* ── Suggested for you (quick-pick contacts) ─────────────────────────────── */

const SUGGESTED = [
  { name: "Ama", detail: "St Marys School", icon: User },
  { name: "Lester", detail: "ECG", icon: Receipt },
  { name: "Kofi", detail: "MTN Momo", icon: Smartphone },
  { name: "Kofi", detail: "MTN Airtime", icon: Smartphone },
  { name: "Ama", detail: "St Marys School", icon: User },
  { name: "Lester", detail: "ECG", icon: Receipt },
  { name: "Kofi", detail: "MTN Momo", icon: Smartphone },
  { name: "Kofi", detail: "MTN Airtime", icon: Smartphone },
] as const;

const AVATAR_TINTS = [
  "bg-[color-mix(in_oklch,var(--cat-1)_18%,transparent)] text-[var(--cat-1)]",
  "bg-[color-mix(in_oklch,var(--cat-3)_18%,transparent)] text-[var(--cat-3)]",
  "bg-[color-mix(in_oklch,var(--cat-5)_18%,transparent)] text-[var(--cat-5)]",
  "bg-[color-mix(in_oklch,var(--cat-4)_18%,transparent)] text-[var(--cat-4)]",
];

function SuggestedForYou() {
  const rows = [SUGGESTED.slice(0, 4), SUGGESTED.slice(4, 8)];
  return (
    <Card>
      <CardHeader title="Pay again" href="/beneficiaries" cta="Edit" />
      <div className="mt-3 flex flex-col gap-7">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-start justify-between">
            {row.map((s, i) => {
              const Icon = s.icon;
              const tint = AVATAR_TINTS[(rowIdx * 4 + i) % AVATAR_TINTS.length];
              return (
                <Link
                  key={`${s.name}-${s.detail}-${i}`}
                  href="/payments/send"
                  className="group flex w-[72px] flex-col items-center gap-3 text-center"
                >
                  <span className={cn("flex size-12 items-center justify-center rounded-full transition-transform group-hover:scale-105", tint)}>
                    <Icon size={17} strokeWidth={1.8} />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="truncate text-[12px] leading-tight text-foreground">{s.name}</span>
                    <span className="truncate text-[11.5px] leading-tight text-muted-foreground">{s.detail}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Analytics — semicircle spend gauge ──────────────────────────────────── */

const RANGES = ["1w", "1m", "3m", "6m", "1y"] as const;

function SpendGauge({ breakdown, showAmounts }: { breakdown: SpendBreakdown; showAmounts: boolean }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1y");
  const gid = useId();

  // Semicircle geometry (top half), rounded segments with small gaps.
  const cx = 130;
  const cy = 130;
  const r = 100;
  const stroke = 18;
  const circ = Math.PI * r; // half circumference
  const gap = 6;
  const slices = breakdown.slices;
  const totalGap = gap * Math.max(slices.length, 1);
  const drawable = circ - totalGap;

  let offset = 0;
  const segs = slices.map((s) => {
    const len = Math.max(s.share * drawable, 1);
    const seg = { len, dash: offset, color: s.color };
    offset += len + gap;
    return seg;
  });

  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <Card>
      <CardHeader title="Spending" href="/reports" cta="View" />
      <div className="flex flex-col items-center gap-8">
        <div className="relative w-full max-w-[260px]">
          <svg viewBox="0 0 260 150" className="w-full overflow-visible">
            <path d={arc} fill="none" stroke="var(--muted)" strokeWidth={stroke} strokeLinecap="round" />
            <g key={gid}>
              {segs.map((seg, i) => (
                <path
                  key={i}
                  d={arc}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${seg.len} ${circ * 2}`}
                  strokeDashoffset={-seg.dash}
                />
              ))}
            </g>
            <text x={cx} y={112} textAnchor="middle" className="fill-foreground tabular text-[17px]">
              {showAmounts ? fmtGHS(breakdown.total, true) : "GHS ••••"}
            </text>
            <text x={cx} y={132} textAnchor="middle" className="fill-muted-foreground text-[12.5px]">
              Total spend
            </text>
          </svg>
        </div>
        <div className="flex w-full items-center gap-2">
          {RANGES.map((rg) => (
            <button
              key={rg}
              type="button"
              onClick={() => setRange(rg)}
              className={cn(
                "flex-1 rounded-full px-4 py-1 text-[14px] leading-none transition-colors cursor-pointer",
                range === rg
                  ? "bg-foreground text-background"
                  : "border border-border text-foreground hover:bg-muted",
              )}
            >
              {rg}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ── Promo banner ────────────────────────────────────────────────────────── */

function PromoBanner() {
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
          Banking made easier, wherever you are.
        </h3>
        <div className="flex items-center gap-4">
          <span className="flex size-[92px] items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--primary-foreground)_10%,transparent)]">
            <QrCode size={64} strokeWidth={1.4} />
          </span>
          <span className="text-[13px] opacity-80">
            Scan to get the
            <br />
            GCB mobile app
          </span>
        </div>
      </div>
    </div>
  );
}

/** Promo carousel — a single banner today, framed by prev/next controls. */
function PromoCarousel() {
  const arrow =
    "flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer";
  return (
    <div className="flex items-center gap-4">
      <button type="button" className={arrow} aria-label="Previous">
        <ChevronLeft size={18} strokeWidth={1.8} />
      </button>
      <div className="min-w-0 flex-1">
        <PromoBanner />
      </div>
      <button type="button" className={arrow} aria-label="Next">
        <ChevronRight size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}

/* ── The dashboard ───────────────────────────────────────────────────────── */

export function GcbDashboard({ data, showAmounts, onToggle }: DashProps) {
  return (
    <div className="flex flex-col gap-10">
      {/* Greeting + actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
          Good morning, {data.firstName} 👋🏾
        </h1>
        <ActionButtons />
      </div>

      <div className="flex flex-col gap-8">
        <NetWorth amount={data.netWorth} showAmounts={showAmounts} onToggle={onToggle} />

        <DisclosureBar label="Accounts" count={data.accounts.length}>
          <AccountRows accounts={data.accounts} showAmounts={showAmounts} />
        </DisclosureBar>

        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Recent activity" href="/transactions" />
            <RecentTransactions txns={data.latestTxns} showAmounts={showAmounts} limit={4} />
          </Card>

          <SuggestedForYou />

          <Card>
            <CardHeader title="Cards" href="/cards" />
            <CardsMini cards={data.cards} />
          </Card>

          <SpendGauge breakdown={data.breakdown} showAmounts={showAmounts} />

          <div className="lg:col-span-2">
            <DisclosureBar label="Exchange rates">
              <FxRatesMini />
            </DisclosureBar>
          </div>
        </div>

        <PromoCarousel />
      </div>
    </div>
  );
}
