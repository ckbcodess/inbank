"use client";

/**
 * Card Details — BRD FR-33 (fund eligible prepaid cards) and FR-34 (block /
 * unblock eligible cards), updated to match Wise digital card usability.
 *
 * Provides instant 1-click access to PIN reveal, sensitive Card Details,
 * card freezing, spending limits, security controls, and card replacement.
 */

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownToLine,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Grid,
  KeyRound,
  Lock,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sliders,
  Snowflake,
  Sparkles,
  Unlock,
  Zap,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ComplianceActionDialog from "@/components/ComplianceActionDialog";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListSkeleton } from "@/components/states/ListStates";
import type { BaselineState } from "@/lib/states";
import { ACCOUNTS, findAccount, findCard, formatMoney, transactionsForProfile, type CardStatus } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";

const BASELINE_STATES: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

const BASELINE_LABEL: Record<BaselineState, string> = {
  loading: "Loading",
  empty: "Empty",
  populated: "Populated",
  error: "Error",
};

const STATUS_VARIANT: Record<CardStatus, "success" | "destructive" | "secondary"> = {
  Active: "success",
  Blocked: "destructive",
  Expired: "secondary",
};

export default function CardDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const card = findCard(id);
  const activeProfile = useSession((s) => s.activeProfile);

  const [state, setState] = useState<BaselineState>("populated");

  // Status & Balance Overlays
  const [status, setStatus] = useState<CardStatus | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [cardNickname, setCardNickname] = useState<string | null>(null);

  // Dialog States
  const [fundOpen, setFundOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);

  // Form states
  const [sourceId, setSourceId] = useState(card?.linkedAccountId ?? ACCOUNTS[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Limit States
  const [dailyLimit, setDailyLimit] = useState("5,000");
  const [monthlyLimit, setMonthlyLimit] = useState("25,000");
  const [atmLimit, setAtmLimit] = useState("1,500");

  // Controls States
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [atmEnabled, setAtmEnabled] = useState(true);
  const [intlEnabled, setIntlEnabled] = useState(false);
  const [contactlessEnabled, setContactlessEnabled] = useState(true);

  // Replacement state
  const [replaceReason, setReplaceReason] = useState("damaged");

  const effectiveStatus = status ?? card?.status ?? "Active";
  const effectiveBalance = balance ?? card?.balance ?? null;
  const source = findAccount(sourceId);

  const amountValue = Number(amount.replace(/,/g, ""));
  const amountValid = amount.trim() !== "" && !Number.isNaN(amountValue) && amountValue > 0;
  const exceedsSource = Boolean(source && amountValid && amountValue > source.available);
  const canFund = amountValid && !exceedsSource;

  const linked = useMemo(() => (card ? findAccount(card.linkedAccountId) : undefined), [card]);
  const cardTxList = useMemo(() => {
    if (!activeProfile) return [];
    return transactionsForProfile(activeProfile.kind).slice(0, 6);
  }, [activeProfile]);

  if (!card) {
    return (
      <PageHeader
        title="Card not found"
        description="This card is not available on the current relationship."
        backTo={{ href: "/cards", label: "Cards" }}
      />
    );
  }

  const isBlocked = effectiveStatus === "Blocked";
  const isExpired = effectiveStatus === "Expired";

  function handleCopy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function handleFund() {
    if (!canFund) return;
    setBalance((effectiveBalance ?? 0) + amountValue);
    setLastAction(`Funded ${formatMoney(amountValue, card!.currency)} from ${source?.name ?? "source account"}.`);
    setAmount("");
    setFundOpen(false);
  }

  function handleStatusChange({ reason }: { reason: string }) {
    const next: CardStatus = isBlocked ? "Active" : "Blocked";
    setStatus(next);
    setLastAction(
      `${next === "Blocked" ? "Frozen/Blocked" : "Unfrozen/Unblocked"} this card. Reason recorded in audit log: “${reason}”`,
    );
    setComplianceOpen(false);
  }

  function handleSaveLimits() {
    setLastAction(`Updated spending limits: Daily GHS ${dailyLimit}, Monthly GHS ${monthlyLimit}.`);
    setLimitsOpen(false);
  }

  function handleSaveControls() {
    setLastAction("Card security controls updated successfully.");
    setControlsOpen(false);
  }

  function handleSaveNickname() {
    setLastAction("Card profile updated successfully.");
    setEditOpen(false);
  }

  function handleRequestReplace() {
    setLastAction(`Replacement card request submitted (Reason: ${replaceReason}). Standard shipping 3-5 days.`);
    setReplaceOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={cardNickname ?? card.name}
        description={`•••• ${card.maskedNumber.slice(-4)} · ${card.scheme} ${card.type}`}
        backTo={{ href: "/cards", label: "Cards" }}
      />

      <StateSwitcher
        section="13.9"
        states={BASELINE_STATES}
        value={state}
        onChange={setState}
        labels={BASELINE_LABEL}
      />

      {state === "loading" && (
        <div className="rounded-2xl border border-border bg-card">
          <ListSkeleton rows={5} columns={3} />
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle size={20} strokeWidth={1.7} aria-hidden="true" />
          </div>
          <p className="text-[15px] text-foreground">Couldn&apos;t load this card</p>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            The card status shown may be out of date. Try again.
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => setState("populated")}>
            <RefreshCw size={14} strokeWidth={1.8} aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {state === "empty" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CreditCard size={20} strokeWidth={1.7} aria-hidden="true" />
          </div>
          <p className="text-[15px] text-foreground">No card data available</p>
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            This card exists but has no activity or balance information to display yet.
          </p>
        </div>
      )}

      {state === "populated" && (
        <>
          {/* Audit / Last Action Banner */}
          {lastAction && (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
              <ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-500" />
              <p className="text-[13px] leading-relaxed text-foreground">{lastAction}</p>
            </div>
          )}

          {/* ── WISE-STYLE TOP SECTION: Visual Card + 3 Circle Quick Actions ── */}
          <section className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-8 w-full max-w-2xl justify-center">
              {/* Photorealistic Digital Card */}
              <div className="relative aspect-[1.586/1] w-full max-w-[340px] rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-300 p-5 text-zinc-900 shadow-xl overflow-hidden flex flex-col justify-between select-none">
                {/* Subtle pattern background overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/30 via-transparent to-black/10 pointer-events-none" />

                {/* Card Top Row */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[16px] tracking-wider uppercase opacity-90">InBank</span>
                  </div>
                  {isBlocked && (
                    <Badge variant="destructive" className="gap-1 bg-red-600 text-white shadow-sm">
                      <Lock size={12} /> Frozen
                    </Badge>
                  )}
                </div>

                {/* Chip & Contactless */}
                <div className="relative z-10 flex items-center justify-between my-2">
                  <div className="size-9 rounded-md bg-amber-200/80 border border-amber-500/40 flex items-center justify-center">
                    <div className="size-6 border border-amber-600/60 rounded-xs grid grid-cols-2 gap-0.5 p-0.5">
                      <div className="bg-amber-600/40 rounded-xs" />
                      <div className="bg-amber-600/40 rounded-xs" />
                    </div>
                  </div>
                  <div className="opacity-80 rotate-90">
                    <Zap size={20} strokeWidth={2.2} />
                  </div>
                </div>

                {/* Card Number & Details */}
                <div className="relative z-10 mt-auto">
                  <p className="font-mono text-[17px] tracking-[0.14em] tabular">
                    •••• •••• •••• {card.maskedNumber.slice(-4)}
                  </p>
                  <div className="mt-3 flex items-end justify-between text-[12px] uppercase">
                    <div>
                      <p className="text-[9px] opacity-70">Cardholder</p>
                      <p className="tracking-wider">{card.holder}</p>
                    </div>
                    <div>
                      <p className="text-[9px] opacity-70">Expires</p>
                      <p className="tabular tracking-wider">{card.expiry}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Prominent Circle Quick Action Buttons (Wise Style) */}
              <div className="flex items-center justify-center gap-6 md:gap-8">
                {/* 1. Show PIN */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPinOpen(true)}
                    className="flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md transition-all hover:bg-emerald-600 hover:scale-105 active:scale-95 cursor-pointer"
                    title="Show PIN"
                  >
                    <Grid size={22} strokeWidth={2.2} />
                  </button>
                  <span className="text-[12.5px] text-foreground">Show PIN</span>
                </div>

                {/* 2. Card Details */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(true)}
                    className="flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md transition-all hover:bg-emerald-600 hover:scale-105 active:scale-95 cursor-pointer"
                    title="Card details"
                  >
                    <CreditCard size={22} strokeWidth={2.2} />
                  </button>
                  <span className="text-[12.5px] text-foreground">Card details</span>
                </div>

                {/* 3. Freeze Card */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setComplianceOpen(true)}
                    className={`flex size-14 items-center justify-center rounded-full text-white shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                      isBlocked ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"
                    }`}
                    title={isBlocked ? "Unfreeze card" : "Freeze card"}
                  >
                    <Snowflake size={22} strokeWidth={2.2} />
                  </button>
                  <span className="text-[12.5px] text-foreground">
                    {isBlocked ? "Unfreeze card" : "Freeze card"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Balance & Fund Pill Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 w-full border-t border-border pt-4 px-2">
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-muted-foreground">Available balance:</span>
                <span className="text-[16px] text-foreground tabular">
                  {effectiveBalance === null
                    ? linked
                      ? formatMoney(linked.available, linked.currency)
                      : "—"
                    : formatMoney(effectiveBalance, card.currency)}
                </span>
                <Badge variant={STATUS_VARIANT[effectiveStatus]}>{effectiveStatus}</Badge>
              </div>

              {card.fundable && (
                <Button
                  size="sm"
                  onClick={() => setFundOpen(true)}
                  disabled={isBlocked || isExpired}
                  className="gap-1.5"
                >
                  <ArrowDownToLine size={14} strokeWidth={1.9} />
                  Fund prepaid card
                </Button>
              )}
            </div>
          </section>

          {/* ── WISE-STYLE MANAGE CARD LIST MENU SECTION ── */}
          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-[15px] text-foreground">Manage card</h2>
            </div>

            <ul className="divide-y divide-border text-[14px]">
              {/* 1. View recent card transactions */}
              <li>
                <button
                  type="button"
                  onClick={() => setTxOpen(true)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <Grid size={17} strokeWidth={1.8} />
                    </span>
                    <span className="text-foreground">View recent card transactions</span>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.8} className="text-muted-foreground" />
                </button>
              </li>

              {/* 2. Set limits for this card */}
              <li>
                <button
                  type="button"
                  onClick={() => setLimitsOpen(true)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <Sliders size={17} strokeWidth={1.8} />
                    </span>
                    <span className="text-foreground">Set limits for this card</span>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.8} className="text-muted-foreground" />
                </button>
              </li>

              {/* 3. Card controls */}
              <li>
                <button
                  type="button"
                  onClick={() => setControlsOpen(true)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <Settings2 size={17} strokeWidth={1.8} />
                    </span>
                    <span className="text-foreground">Card controls</span>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.8} className="text-muted-foreground" />
                </button>
              </li>

              {/* 4. Unblock PIN */}
              <li>
                <button
                  type="button"
                  onClick={() => setPinOpen(true)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <KeyRound size={17} strokeWidth={1.8} />
                    </span>
                    <span className="text-foreground">Unblock / Reset PIN</span>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.8} className="text-muted-foreground" />
                </button>
              </li>

              {/* 5. Edit card */}
              <li>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <Sparkles size={17} strokeWidth={1.8} />
                    </span>
                    <span className="text-foreground">Edit card nickname & account</span>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.8} className="text-muted-foreground" />
                </button>
              </li>

              {/* 6. Replace card */}
              <li>
                <button
                  type="button"
                  onClick={() => setReplaceOpen(true)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <CreditCard size={17} strokeWidth={1.8} />
                    </span>
                    <span className="text-foreground">Replace card</span>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.8} className="text-muted-foreground" />
                </button>
              </li>
            </ul>
          </section>
        </>
      )}

      {/* ── INTERACTIVE MODALS & DIALOGS ── */}

      {/* 1. Show PIN Dialog */}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Card PIN Code</DialogTitle>
            <DialogDescription>
              This PIN code is private. Keep it secure and hidden from onlookers.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <div className="flex gap-3">
              {["4", "8", "1", "9"].map((digit, idx) => (
                <div
                  key={idx}
                  className="flex size-14 items-center justify-center rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 text-[26px] tabular text-foreground font-mono shadow-inner"
                >
                  {digit}
                </div>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground mt-2">Auto-hiding in 15 seconds for your protection</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setPinOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Card Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Digital Card Details</DialogTitle>
            <DialogDescription>
              Use these card details for online purchases and digital payments.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2 text-[13.5px]">
            <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] text-muted-foreground uppercase tracking-wider">Card Number</p>
                  <p className="text-[16px] text-foreground tabular font-mono mt-0.5">4532 8901 2345 {card.maskedNumber.slice(-4)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(`453289012345${card.maskedNumber.slice(-4)}`, "cn")}
                >
                  {copiedField === "cn" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] text-muted-foreground uppercase tracking-wider">Expiry</p>
                    <p className="text-[14px] text-foreground tabular font-mono mt-0.5">{card.expiry}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(card.expiry, "exp")}
                  >
                    {copiedField === "exp" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] text-muted-foreground uppercase tracking-wider">CVV / CVC</p>
                    <p className="text-[14px] text-foreground tabular font-mono mt-0.5">842</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy("842", "cvv")}
                  >
                    {copiedField === "cvv" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3 flex flex-col gap-1 bg-card">
              <span className="text-[12px] text-muted-foreground">Billing Address:</span>
              <span className="text-foreground">Adinkra House, Independence Ave, Accra, Ghana</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDetailsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Spending Limits Dialog */}
      <Dialog open={limitsOpen} onOpenChange={setLimitsOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Card Spending Limits</DialogTitle>
            <DialogDescription>
              Adjust payment boundaries for transactions on this card.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="d-limit">Daily Purchase Limit (GHS)</Label>
              <Input
                id="d-limit"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="tabular"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="m-limit">Monthly Total Limit (GHS)</Label>
              <Input
                id="m-limit"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="tabular"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="atm-limit">ATM Withdrawal Limit (GHS)</Label>
              <Input
                id="atm-limit"
                value={atmLimit}
                onChange={(e) => setAtmLimit(e.target.value)}
                className="tabular"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLimits}>Save Limits</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Card Controls Dialog */}
      <Dialog open={controlsOpen} onOpenChange={setControlsOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Card Security Controls</DialogTitle>
            <DialogDescription>
              Enable or disable payment channels instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-[13.5px]">
            <label className="flex items-center justify-between rounded-xl border border-border p-3.5 cursor-pointer hover:bg-muted/40">
              <div>
                <p className="text-foreground">Online Shopping & E-Commerce</p>
                <p className="text-[12px] text-muted-foreground">Allow card use for website and app checkout</p>
              </div>
              <input
                type="checkbox"
                checked={onlineEnabled}
                onChange={(e) => setOnlineEnabled(e.target.checked)}
                className="size-4 rounded border-border"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border p-3.5 cursor-pointer hover:bg-muted/40">
              <div>
                <p className="text-foreground">ATM Cash Withdrawals</p>
                <p className="text-[12px] text-muted-foreground">Allow cash withdrawals at physical ATMs</p>
              </div>
              <input
                type="checkbox"
                checked={atmEnabled}
                onChange={(e) => setAtmEnabled(e.target.checked)}
                className="size-4 rounded border-border"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border p-3.5 cursor-pointer hover:bg-muted/40">
              <div>
                <p className="text-foreground">International Usage</p>
                <p className="text-[12px] text-muted-foreground">Allow transactions outside home country</p>
              </div>
              <input
                type="checkbox"
                checked={intlEnabled}
                onChange={(e) => setIntlEnabled(e.target.checked)}
                className="size-4 rounded border-border"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border p-3.5 cursor-pointer hover:bg-muted/40">
              <div>
                <p className="text-foreground">Contactless Payments (NFC)</p>
                <p className="text-[12px] text-muted-foreground">Tap-to-pay at point of sale terminals</p>
              </div>
              <input
                type="checkbox"
                checked={contactlessEnabled}
                onChange={(e) => setContactlessEnabled(e.target.checked)}
                className="size-4 rounded border-border"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setControlsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveControls}>Save Controls</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Edit Card Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Card Profile</DialogTitle>
            <DialogDescription>
              Customize nickname and default linked account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-nick">Card Nickname</Label>
              <Input
                id="c-nick"
                value={cardNickname ?? card.name}
                onChange={(e) => setCardNickname(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Primary Linked Account</Label>
              <select className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {ACCOUNTS.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.number})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNickname}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Replace Card Dialog */}
      <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Request Replacement Card</DialogTitle>
            <DialogDescription>
              Order a replacement card. Your current card will be deactivated immediately upon dispatch.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Reason for replacement</Label>
              <select
                value={replaceReason}
                onChange={(e) => setReplaceReason(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="damaged">Damaged / Chip Not Working</option>
                <option value="stolen">Lost or Stolen Card</option>
                <option value="expired">Near Expiration Date</option>
                <option value="compromised">Suspicious Activity / Compromised</option>
              </select>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-[12.5px] text-muted-foreground">
              Delivery to registered business address. Express delivery options available.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRequestReplace}>
              Request Replacement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Card Transactions Modal */}
      <Dialog open={txOpen} onOpenChange={setTxOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Card Transactions</DialogTitle>
            <DialogDescription>
              Recent activity settled on card •••• {card.maskedNumber.slice(-4)}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2 max-h-[360px] overflow-y-auto">
            <ul className="divide-y divide-border">
              {cardTxList.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3 px-1 text-[13px]">
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-foreground">{t.description}</span>
                    <span className="text-[12px] text-muted-foreground tabular">{t.date}</span>
                  </div>
                  <span className="shrink-0 text-foreground tabular">
                    {t.direction === "debit" ? "−" : "+"}
                    {formatMoney(t.amount, t.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => setTxOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FR-33 Funding Dialog */}
      <Dialog
        open={fundOpen}
        onOpenChange={(next) => {
          if (!next) setAmount("");
          setFundOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Fund {card.name}</DialogTitle>
            <DialogDescription>
              Move funds from a linked account onto this prepaid card.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-2">
              <Label>Source account</Label>
              <div className="flex flex-col gap-1.5">
                {ACCOUNTS.filter((a) => a.currency === card.currency).map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSourceId(acc.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      sourceId === acc.id
                        ? "border-[var(--active-border)] bg-[var(--active-bg)]"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] text-foreground">{acc.name}</span>
                      <span className="text-[12px] text-muted-foreground tabular">{acc.number}</span>
                    </span>
                    <span className="shrink-0 text-[13px] text-muted-foreground tabular">
                      {formatMoney(acc.available, acc.currency)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fund-amount">Amount ({card.currency})</Label>
              <Input
                id="fund-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="tabular"
                aria-invalid={exceedsSource || undefined}
              />
              {exceedsSource && (
                <p className="text-[12px] text-destructive">
                  {formatMoney(amountValue, card.currency)} is more than the{" "}
                  {formatMoney(source?.available ?? 0, source?.currency ?? card.currency)} available on{" "}
                  {source?.name}.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFundOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!canFund} onClick={handleFund}>
              Fund card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FR-34 Compliance Block/Unblock Dialog */}
      <ComplianceActionDialog
        open={complianceOpen}
        onOpenChange={setComplianceOpen}
        onConfirm={handleStatusChange}
        title={`${isBlocked ? "Unfreeze" : "Freeze"} ${card.name}?`}
        description={
          isBlocked
            ? "The card becomes usable again immediately. Written to the immutable audit log."
            : "All transactions on this card are declined from the moment you confirm. Written to the immutable audit log."
        }
        confirmLabel={isBlocked ? "Unfreeze card" : "Freeze card"}
        reasonPlaceholder={
          isBlocked ? "Why is this card being unfrozen?" : "Why is this card being frozen?"
        }
        destructive={!isBlocked}
      />
    </div>
  );
}

