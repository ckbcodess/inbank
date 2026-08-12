"use client";

/**
 * Card Details — Perfectly Balanced 2-Column Layout.
 * Left Column: Hero Digital Card, Balance & Quick Actions.
 * Right Column: Spending Limits, Controls & Management, and Recent Activity.
 */

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownToLine,
  Check,
  ArrowUpRight,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Grid,
  KeyRound,
  Landmark,
  Lock,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sliders,
  Snowflake,
  Sparkles,
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
import { ACCOUNTS, findAccount, findCard, formatMoney, formatDate, transactionsForProfile, type CardStatus } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { TransactionStatusBadge } from "@/components/StatusBadge";

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

  // Status & Balance State
  const [status, setStatus] = useState<CardStatus | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [cardNickname, setCardNickname] = useState<string | null>(null);

  // Single-Source Detail Reveal State
  const [showDetailsInline, setShowDetailsInline] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Dialog States
  const [pinOpen, setPinOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);

  // Form states
  const [sourceId, setSourceId] = useState(card?.linkedAccountId ?? ACCOUNTS[0]?.id ?? "");
  const [amount, setAmount] = useState("");

  // Limits
  const [dailyLimit, setDailyLimit] = useState("5,000");
  const [monthlyLimit, setMonthlyLimit] = useState("25,000");
  const [atmLimit, setAtmLimit] = useState("1,500");

  // Security Channels
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [atmEnabled, setAtmEnabled] = useState(true);
  const [intlEnabled, setIntlEnabled] = useState(false);
  const [contactlessEnabled, setContactlessEnabled] = useState(true);

  // Replacement reason
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
    return transactionsForProfile(activeProfile.kind).slice(0, 5);
  }, [activeProfile]);

  if (!card) {
    return (
      <PageHeader
        title="Card not found"
        backTo={{ href: "/cards", label: "Cards" }}
      />
    );
  }

  const isBlocked = effectiveStatus === "Blocked";
  const isExpired = effectiveStatus === "Expired";
  const isPrepaid = card.type === "Prepaid";

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
    setLastAction(`${next === "Blocked" ? "Frozen" : "Unfrozen"} card. Reason: “${reason}”`);
    setComplianceOpen(false);
  }

  function handleSaveLimits() {
    setLastAction(`Updated spending limits: Daily GHS ${dailyLimit}, Monthly GHS ${monthlyLimit}.`);
    setLimitsOpen(false);
  }

  function handleSaveControls() {
    setLastAction("Card security channels updated.");
    setControlsOpen(false);
  }

  function handleSaveNickname() {
    setLastAction("Card profile updated.");
    setEditOpen(false);
  }

  function handleRequestReplace() {
    setLastAction(`Replacement request submitted (${replaceReason}).`);
    setReplaceOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={cardNickname ?? card.name}
        badge={<Badge variant={STATUS_VARIANT[effectiveStatus]}>{effectiveStatus}</Badge>}
        actions={
          linked ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/accounts/${linked.id}`} />}
              className="group h-8.5 rounded-xl border-border bg-card px-3 text-[12.5px] font-medium text-foreground hover:bg-muted/80 hover:text-foreground transition-all shadow-xs"
            >
              <span>View Linked Account</span>
              <ArrowUpRight size={14} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 shrink-0" />
            </Button>
          ) : null
        }
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
        <div className="rounded-2xl border border-border bg-card p-6">
          <ListSkeleton rows={5} columns={3} />
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <AlertCircle size={20} className="text-destructive mb-2" />
          <p className="text-[14px] font-medium text-foreground">Couldn&apos;t load card details</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setState("populated")}>
            <RefreshCw size={14} /> Retry
          </Button>
        </div>
      )}

      {state === "empty" && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <CreditCard size={24} className="text-muted-foreground mb-2" />
          <p className="text-[14px] font-medium text-foreground">No card activity found</p>
        </div>
      )}

      {state === "populated" && (
        <>
          {/* Audit Banner */}
          {lastAction && (
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-2 text-[13px] text-foreground">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
              <span>{lastAction}</span>
            </div>
          )}

          {/* BALANCED 2-COLUMN GRID */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            
            {/* LEFT COLUMN: Digital Card & Quick Actions (col-span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <section className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-xs">
                {/* Digital Card Preview */}
                <div className="relative aspect-[1.586/1] w-full max-w-[320px] rounded-2xl bg-gradient-to-br from-slate-900 via-zinc-900 to-black p-5 text-white shadow-xl overflow-hidden flex flex-col justify-between select-none border border-white/10">
                  <div className="flex items-center justify-between z-10">
                    <span className="font-mono text-[14px] font-bold tracking-widest uppercase opacity-90">InBank</span>
                    <button
                      type="button"
                      onClick={() => setShowDetailsInline(!showDetailsInline)}
                      className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      {showDetailsInline ? <EyeOff size={11} /> : <Eye size={11} />}
                      <span>{showDetailsInline ? "Hide" : "Reveal"}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between my-1 z-10">
                    <div className="size-8 rounded bg-amber-400/80 border border-amber-300/50 flex items-center justify-center">
                      <div className="size-5 border border-amber-700/60 rounded-xs bg-amber-700/30" />
                    </div>
                    <Zap size={16} className="text-white/80 rotate-90" />
                  </div>

                  <div className="mt-auto z-10">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[15px] tracking-[0.14em] tabular">
                        {showDetailsInline
                          ? `4532 8901 2345 ${card.maskedNumber.slice(-4)}`
                          : `•••• •••• •••• ${card.maskedNumber.slice(-4)}`}
                      </p>
                      {showDetailsInline && (
                        <button
                          type="button"
                          onClick={() => handleCopy(`453289012345${card.maskedNumber.slice(-4)}`, "inline-cn")}
                          className="text-white/80 hover:text-white"
                          title="Copy Card Number"
                        >
                          {copiedField === "inline-cn" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex items-end justify-between text-[10px] uppercase text-white/80">
                      <div>
                        <p className="opacity-60 text-[8px]">Cardholder</p>
                        <p className="font-medium tracking-wider">{card.holder}</p>
                      </div>
                      <div>
                        <p className="opacity-60 text-[8px]">Expires</p>
                        <p className="font-medium tabular tracking-wider">{card.expiry}</p>
                      </div>
                      {showDetailsInline && (
                        <div>
                          <p className="opacity-60 text-[8px]">CVV</p>
                          <p className="font-medium tabular tracking-wider text-emerald-300">842</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Balance Display under Card */}
                <div className="mt-4 flex flex-col items-center gap-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {isPrepaid ? "Prepaid Balance" : "Linked Account Balance"}
                  </span>
                  <div className="text-2xl font-semibold tracking-tight text-foreground tabular">
                    {isPrepaid
                      ? formatMoney(effectiveBalance ?? card.balance ?? 0, card.currency)
                      : linked
                      ? formatMoney(linked.available, linked.currency)
                      : "Debit Card"}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPinOpen(true)}
                    className="gap-1.5 rounded-full flex-1 min-w-[100px]"
                  >
                    <Grid size={14} />
                    <span>Show PIN</span>
                  </Button>

                  <Button
                    variant={isBlocked ? "default" : "outline"}
                    size="sm"
                    onClick={() => setComplianceOpen(true)}
                    className={`gap-1.5 rounded-full flex-1 min-w-[100px] ${
                      isBlocked ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                    }`}
                  >
                    <Snowflake size={14} />
                    <span>{isBlocked ? "Unfreeze" : "Freeze"}</span>
                  </Button>

                  {isPrepaid && card.fundable && (
                    <Button
                      size="sm"
                      onClick={() => setFundOpen(true)}
                      disabled={isBlocked || isExpired}
                      className="gap-1.5 rounded-full bg-primary text-primary-foreground flex-1 min-w-[100px]"
                    >
                      <ArrowDownToLine size={14} />
                      <span>Fund Card</span>
                    </Button>
                  )}
                </div>
              </section>

              {/* Controls & Management */}
              <section className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border px-5 py-3">
                  <h2 className="text-[13.5px] font-medium text-foreground">Card Controls</h2>
                </div>

                <ul className="divide-y divide-border text-[13px]">
                  <li>
                    <button
                      type="button"
                      onClick={() => setControlsOpen(true)}
                      className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-muted/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Settings2 size={15} className="text-muted-foreground shrink-0" />
                        <span className="text-foreground font-medium">Security channels</span>
                      </div>
                      <ChevronRight size={15} className="text-muted-foreground" />
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-muted/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles size={15} className="text-muted-foreground shrink-0" />
                        <span className="text-foreground font-medium">Edit card profile</span>
                      </div>
                      <ChevronRight size={15} className="text-muted-foreground" />
                    </button>
                  </li>

                  <li>
                    <button
                      type="button"
                      onClick={() => setReplaceOpen(true)}
                      className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-muted/40 cursor-pointer text-destructive hover:text-destructive"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard size={15} className="text-destructive shrink-0" />
                        <span className="font-medium">Request replacement</span>
                      </div>
                      <ChevronRight size={15} className="text-muted-foreground" />
                    </button>
                  </li>
                </ul>
              </section>
            </div>

            {/* RIGHT COLUMN: Spending Limits & Recent Activity (col-span-7) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              
              {/* Spending Limits Block */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-primary" />
                    <h2 className="text-[14px] font-medium text-foreground">Spending Limits</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLimitsOpen(true)}
                    className="h-7 text-[12px] text-primary hover:text-primary hover:bg-primary/10"
                  >
                    Edit
                  </Button>
                </div>

                <div className="flex flex-col gap-4 text-[13px]">
                  {/* Daily Limit */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-muted-foreground text-[12px]">Daily Limit</span>
                      <span className="font-medium text-foreground tabular">
                        GHS 1,240 / GHS {dailyLimit}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-300 w-[25%]" />
                    </div>
                  </div>

                  {/* Monthly Limit */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-muted-foreground text-[12px]">Monthly Limit</span>
                      <span className="font-medium text-foreground tabular">
                        GHS 8,300 / GHS {monthlyLimit}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300 w-[33%]" />
                    </div>
                  </div>

                  {/* ATM Limit */}
                  <div className="flex justify-between items-center pt-1 text-[12px]">
                    <span className="text-muted-foreground">ATM Cash Withdrawal</span>
                    <span className="font-medium text-foreground tabular">GHS {atmLimit} / day</span>
                  </div>
                </div>
              </section>

              {/* Recent Activity Section */}
              <section className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <h2 className="text-[14px] font-medium text-foreground">Recent Activity</h2>
                  <Link href="/transactions" className="text-[12px] text-primary hover:underline">
                    View all
                  </Link>
                </div>

                <ul className="divide-y divide-border">
                  {cardTxList.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/transactions/${t.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-[13px] text-foreground font-medium">{t.description}</span>
                          <span className="text-[11px] text-muted-foreground tabular">{formatDate(t.date)}</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[13px] text-foreground tabular font-medium">
                            {t.direction === "debit" ? "−" : "+"}
                            {formatMoney(t.amount, t.currency)}
                          </span>
                          <TransactionStatusBadge state={t.state} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </>
      )}

      {/* ── MODALS ── */}

      {/* 1. Show PIN Dialog */}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Card PIN Code</DialogTitle>
            <DialogDescription>
              Keep this PIN secret and hidden from onlookers.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <div className="flex gap-3">
              {["4", "8", "1", "9"].map((digit, idx) => (
                <div
                  key={idx}
                  className="flex size-14 items-center justify-center rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 text-[26px] tabular text-foreground font-mono font-bold shadow-inner"
                >
                  {digit}
                </div>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground mt-2">Auto-hiding in 15 seconds</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setPinOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Spending Limits Dialog */}
      <Dialog open={limitsOpen} onOpenChange={setLimitsOpen}>
        <DialogContent className="sm:max-w-[440px]">
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

      {/* 3. Security Channels Dialog */}
      <Dialog open={controlsOpen} onOpenChange={setControlsOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Card Security Channels</DialogTitle>
            <DialogDescription>
              Enable or disable payment channels.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-[13.5px]">
            <label className="flex items-center justify-between rounded-xl border border-border p-3.5 cursor-pointer hover:bg-muted/40">
              <div>
                <p className="text-foreground font-medium">Online Shopping & E-Commerce</p>
                <p className="text-[12px] text-muted-foreground">Allow card use for website checkout</p>
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
                <p className="text-foreground font-medium">ATM Cash Withdrawals</p>
                <p className="text-[12px] text-muted-foreground">Allow cash withdrawals at ATMs</p>
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
                <p className="text-foreground font-medium">International Usage</p>
                <p className="text-[12px] text-muted-foreground">Allow foreign transactions</p>
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
                <p className="text-foreground font-medium">Contactless Payments (NFC)</p>
                <p className="text-[12px] text-muted-foreground">Tap-to-pay at terminals</p>
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
            <Button onClick={handleSaveControls}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Edit Card Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Card Profile</DialogTitle>
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
              <select className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none">
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
            <Button onClick={handleSaveNickname}>Save Profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Replace Card Dialog */}
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
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none"
              >
                <option value="damaged">Damaged / Chip Not Working</option>
                <option value="stolen">Lost or Stolen Card</option>
                <option value="expired">Near Expiration Date</option>
                <option value="compromised">Suspicious Activity / Compromised</option>
              </select>
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

      {/* 6. Fund Prepaid Card Dialog */}
      <Dialog open={fundOpen} onOpenChange={setFundOpen}>
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
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground"
              >
                {ACCOUNTS.filter((a) => a.currency === card.currency).map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatMoney(acc.available, acc.currency)})
                  </option>
                ))}
              </select>
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
              />
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

      {/* 7. Compliance Action Freeze/Unfreeze Dialog */}
      <ComplianceActionDialog
        open={complianceOpen}
        onOpenChange={setComplianceOpen}
        onConfirm={handleStatusChange}
        title={`${isBlocked ? "Unfreeze" : "Freeze"} ${card.name}?`}
        description={
          isBlocked
            ? "The card becomes usable again immediately. Written to the immutable audit log."
            : "All transactions on this card will be declined from the moment you confirm. Written to the immutable audit log."
        }
        confirmLabel={isBlocked ? "Unfreeze card" : "Freeze card"}
        reasonPlaceholder={isBlocked ? "Why is this card being unfrozen?" : "Why is this card being frozen?"}
        destructive={!isBlocked}
      />
    </div>
  );
}
