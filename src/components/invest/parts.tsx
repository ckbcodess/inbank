"use client";

/**
 * Small pieces shared by the Treasury Bills & Bonds screens, so a holding, a security and a request read the same
 * wherever they appear: the facts panel, the line that restates a request above the one-time code, the maturity
 * instruction picker, the security icon, the "you need an account first" state and the Dev Mode switches.
 */

import { useMemo } from "react";
import Link from "next/link";
import { FileText, Landmark, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { TrueEmptyState } from "@/components/states/ListStates";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import {
  MATURITY_INSTRUCTIONS,
  SUPPORT_PHONE,
  useMyTreasury,
  useTreasury,
  useTreasuryAccounts,
  type CsdAccount,
  type MaturityInstructionId,
  type SecurityKind,
} from "@/lib/treasury";
import { useMyDeposits, useTermDeposits } from "@/lib/term-deposits";
import { cn } from "@/lib/utils";

/** The Invest page: the one home for everything. */
export const INVEST_HOME = "/invest";
/** The Products view of the Invest page. */
export const PRODUCTS_HREF = "/invest?view=products";
/** The two product pages under Products. */
export const TERM_PRODUCTS_HREF = "/invest/products/term-deposits";
export const TREASURY_PRODUCTS_HREF = "/invest/products/treasury";
/** The base of the treasury routes (buy, holdings, statement). It has no page of its own. */
export const TREASURY_HOME = "/invest/treasury";

/** Bills are paper-like, bonds are institutions. The icon is the only cue; the word "Bill" or "Bond" is always beside it. */
export function SecurityIcon({ kind, muted = false }: { kind: SecurityKind; muted?: boolean }) {
  const Icon = kind === "bond" ? Landmark : FileText;
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted", muted ? "text-muted-foreground" : "text-foreground")}>
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

/** Label on the left, value on the right, one line each. The same panel the standing order and review screens use. */
export function FactsPanel({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-2 text-[14px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-6 rounded-xl px-3 py-3.5">
          <span className="shrink-0 text-muted-foreground">{label}</span>
          <span className="tabular min-w-0 text-right text-foreground">{value}</span>
        </div>
      ))}
    </div>
  );
}

/** What is being approved, restated above the code boxes: the one number, then who and from where. */
export function AuthSummary({ headline, amount, rows }: { headline: string; amount?: string; rows?: Array<[string, string]> }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-muted-foreground">{headline}</span>
        {amount && <span className="tabular text-[22px] leading-none tracking-[-0.01em] text-foreground">{amount}</span>}
      </div>
      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-1.5 text-[13px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">{label}</span>
              <span className="tabular min-w-0 truncate text-right text-foreground">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * What happens when the investment matures. The choice is described right where it is made, because "same face
 * value" and "same cost" mean nothing without a line of explanation.
 */
export function MaturityInstructionField({
  value,
  onChange,
  label = "When It Matures",
}: {
  value: MaturityInstructionId;
  onChange: (next: MaturityInstructionId) => void;
  label?: string;
}) {
  const current = MATURITY_INSTRUCTIONS.find((m) => m.id === value);
  return (
    <Field label={label} hint={current?.detail}>
      <Select value={value} onValueChange={(v) => v && onChange(v as MaturityInstructionId)}>
        <SelectTrigger>
          <span className="truncate text-[14px] text-foreground">{current?.label}</span>
        </SelectTrigger>
        <SelectContent>
          {MATURITY_INSTRUCTIONS.map((m) => (
            <SelectItem key={m.id} value={m.id} label={m.label}>
              <div className="flex flex-col py-0.5 text-left">
                <span className="text-foreground">{m.label}</span>
                <span className="max-w-[22rem] whitespace-normal text-[12px] font-normal text-muted-foreground">{m.detail}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** A holding that isn't there: it may have been cashed in or matured. Says so and goes back to the list. */
export function HoldingNotFound({ title = "Investment" }: { title?: string }) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} backTo={{ href: INVEST_HOME, label: "Invest" }} />
      <TrueEmptyState
        icon={<FileText size={22} strokeWidth={1.8} />}
        title="We couldn’t find this investment"
        description="It may have matured or been cashed in. Your other investments are still on your Invest page."
        action={
          <Button nativeButton={false} render={<Link href={INVEST_HOME} />}>
            Back to Invest
          </Button>
        }
      />
    </div>
  );
}

/**
 * A page that needs an active securities account, shown to someone whose account isn't ready. It says why and gives
 * the next step: wait for the one being set up, or start investing, which sets one up.
 */
export function AccountRequired({
  status,
  title,
  backTo,
}: {
  status: CsdAccount["status"] | undefined;
  title: string;
  backTo: { href: string; label: string };
}) {
  const pending = status === "pending";
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} backTo={backTo} />
      <TrueEmptyState
        icon={<ShieldCheck size={22} strokeWidth={1.8} />}
        title={pending ? "Your securities account is being set up" : "You need a securities account first"}
        description={
          pending
            ? `It will be ready within 7 working days. For support, call Customer Experience on ${SUPPORT_PHONE}.`
            : "It’s set up the first time you invest in treasury securities, and it’s ready within 7 working days."
        }
        action={
          pending ? undefined : (
            <Button nativeButton={false} render={<Link href="/invest/profile" />}>
              Open Securities Account
            </Button>
          )
        }
      />
    </div>
  );
}

/**
 * Dev Mode switches for the whole Invest area: the securities account (none, being set up, active), whether the
 * market is open, whether the customer has term deposits, whether new requests go through or fail (to walk the failure
 * screens), the welcome, and the CSD settling what is waiting on it. A page with a list also passes its own list states.
 */
const ACCOUNT_STATES = [
  { id: "none", label: "Not set up" },
  { id: "pending", label: "Being set up" },
  { id: "active", label: "Active" },
];
const MARKET_STATES = [
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
];
const DEPOSIT_STATES = [
  { id: "0", label: "None" },
  { id: "1", label: "One" },
  { id: "2", label: "Two" },
];
const TREASURY_STATES = [
  { id: "0", label: "None" },
  { id: "1", label: "One (91-day bill)" },
  { id: "2", label: "Two (adds a 364-day bill)" },
  { id: "3", label: "All (adds a bond)" },
];
const REQUEST_STATES = [
  { id: "succeed", label: "Go through" },
  { id: "fail", label: "Fail" },
];
const PRESET_STATES = [
  { id: "new", label: "New customer (start fresh)" },
  { id: "setting-up", label: "Account being set up" },
  { id: "investing", label: "Has ongoing investments" },
];
const WELCOME_STATES = [{ id: "again", label: "Show it again" }];
const SETTLE_STATES = [{ id: "settle", label: "Settle waiting purchases and cash-ins" }];
const MARKET_KEYS = ["open", "closed"] as const;
const MARKET_LABELS = { open: "Open", closed: "Closed" };

export function InvestDevTools({
  section,
  states,
  value,
  onChange,
  labels,
}: {
  section: string;
  /** A page with a list passes its own list states (stable references). Without them the primary switch is the market. */
  states?: readonly string[];
  value?: string;
  onChange?: (next: string) => void;
  labels?: Record<string, string>;
}) {
  const { ownerId, csd, marketOpen, holdings } = useMyTreasury();
  const { active: deposits } = useMyDeposits();
  const setAccountStatus = useTreasury((s) => s.setAccountStatus);
  const setMarketOpen = useTreasury((s) => s.setMarketOpen);
  const settleAll = useTreasury((s) => s.settleAll);
  const markWelcomed = useTreasury((s) => s.markWelcomed);
  const setSeed = useTermDeposits((s) => s.setSeed);
  const setHoldingsSeed = useTreasury((s) => s.setHoldingsSeed);
  const failRequests = useTermDeposits((s) => s.failRequests);
  const setFailRequests = useTermDeposits((s) => s.setFailRequests);
  const accounts = useTreasuryAccounts();
  const linkedId = accounts[0]?.id ?? "";
  const accountValue = csd?.status ?? "none";
  const depositCount = Math.min(deposits.length, 2);
  const treasuryCount = Math.min(holdings.length, 3);
  const hasList = Boolean(states && onChange);

  const groups = useMemo<DevStateGroup[]>(() => {
    const account: DevStateGroup = {
      label: "Securities account",
      states: ACCOUNT_STATES,
      value: accountValue,
      onChange: (v) => setAccountStatus(ownerId, v as "none" | "pending" | "active", linkedId),
    };
    const market: DevStateGroup = {
      label: "Market",
      states: MARKET_STATES,
      value: marketOpen ? "open" : "closed",
      onChange: (v) => setMarketOpen(v === "open"),
    };
    // Investments need an active account, so switching any on activates it. The two kinds are independent of each other.
    const activate = (count: number) => {
      if (count > 0 && accountValue !== "active") setAccountStatus(ownerId, "active", linkedId);
    };
    const termDeposits: DevStateGroup = {
      label: "Term deposits",
      states: DEPOSIT_STATES,
      value: String(depositCount),
      onChange: (v) => {
        activate(Number(v));
        setSeed(ownerId, linkedId, Number(v));
      },
    };
    const treasury: DevStateGroup = {
      label: "Treasury bills & bonds",
      states: TREASURY_STATES,
      value: String(treasuryCount),
      onChange: (v) => {
        activate(Number(v));
        setHoldingsSeed(ownerId, linkedId, Number(v));
      },
    };
    const requests: DevStateGroup = {
      label: "New requests",
      states: REQUEST_STATES,
      value: failRequests ? "fail" : "succeed",
      onChange: (v) => setFailRequests(v === "fail"),
    };
    // One click to a whole customer: everything is reset first, so presets never leave bits of the last one behind.
    const reset = () => {
      setAccountStatus(ownerId, "none", linkedId);
      setHoldingsSeed(ownerId, linkedId, 0);
      setSeed(ownerId, linkedId, 0);
      setFailRequests(false);
      setMarketOpen(true);
    };
    const presets: DevStateGroup = {
      label: "Presets",
      states: PRESET_STATES,
      value: "",
      onChange: (v) => {
        reset();
        if (v === "setting-up") {
          setAccountStatus(ownerId, "pending", linkedId);
          markWelcomed(ownerId);
        }
        if (v === "investing") {
          setAccountStatus(ownerId, "active", linkedId);
          setHoldingsSeed(ownerId, linkedId, 3);
          setSeed(ownerId, linkedId, 2);
          markWelcomed(ownerId);
        }
        toast.success("Customer reset.", { id: "invest-preset" });
      },
    };
    const welcome: DevStateGroup = {
      label: "Welcome",
      states: WELCOME_STATES,
      value: "",
      onChange: () => markWelcomed(ownerId, false),
    };
    const settle: DevStateGroup = {
      label: "Settlement",
      states: SETTLE_STATES,
      value: "",
      onChange: () => {
        settleAll(ownerId);
        toast.success("Waiting purchases and cash-ins settled.", { id: "treasury-settle" });
      },
    };
    return hasList ? [presets, account, termDeposits, treasury, market, requests, welcome, settle] : [presets, account, termDeposits, treasury, requests, welcome, settle];
  }, [accountValue, ownerId, linkedId, marketOpen, depositCount, treasuryCount, failRequests, hasList, setAccountStatus, setMarketOpen, setSeed, setHoldingsSeed, setFailRequests, markWelcomed, settleAll]);

  if (states && onChange && value !== undefined) {
    return <StateSwitcher section={section} states={states} value={value} onChange={onChange} labels={labels} groups={groups} />;
  }
  return (
    <StateSwitcher
      section={section}
      label="Market"
      states={MARKET_KEYS}
      value={marketOpen ? "open" : "closed"}
      onChange={(v) => setMarketOpen(v === "open")}
      labels={MARKET_LABELS}
      groups={groups}
    />
  );
}
