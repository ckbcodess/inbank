"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Grid,
  Snowflake,
  SlidersHorizontal,
  Settings2,
  Key,
  Sparkles,
  CreditCard,
  ChevronRight,
  Copy,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleTooltip } from "@/components/ui/tooltip";
import type { PaymentCard } from "@/lib/mock-data";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";

export interface VirtualCardDetailsViewProps {
  card: PaymentCard;
  onUpdateCard?: (updated: Partial<PaymentCard>) => void;
}

export function VirtualCardDetailsView({ card, onUpdateCard }: VirtualCardDetailsViewProps) {
  const { showAmounts, toggleAmountVisibility, formatAmount } = useAmountVisibility();

  // Local reactive states
  const [currentCard, setCurrentCard] = useState<PaymentCard>(card);
  const [isFrozen, setIsFrozen] = useState(card.status === "Blocked");
  const [dailyLimit, setDailyLimit] = useState(1240);
  const [maxDailyLimit] = useState(5000);
  const [monthlyLimit, setMonthlyLimit] = useState(card.spendLimit ?? 8300);
  const [maxMonthlyLimit] = useState(25000);
  const [cardNickname, setCardNickname] = useState(card.name ?? "Virtual Card");

  // Modals state
  const [activeModal, setActiveModal] = useState<
    "details" | "pin" | "freeze" | "limits" | "controls" | "reset-pin" | "edit-nickname" | "replace" | null
  >(null);

  // Notice toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Security channel controls
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [intlEnabled, setIntlEnabled] = useState(false);
  const [atmEnabled, setAtmEnabled] = useState(true);

  // Temp form states
  const [tempDaily, setTempDaily] = useState(String(dailyLimit));
  const [tempMonthly, setTempMonthly] = useState(String(monthlyLimit));
  const [tempNickname, setTempNickname] = useState(cardNickname);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(`Copied ${label} to clipboard`);
  };

  const handleToggleFreeze = () => {
    const nextFrozen = !isFrozen;
    setIsFrozen(nextFrozen);
    const newStatus = nextFrozen ? "Blocked" : "Active";
    setCurrentCard((prev) => ({ ...prev, status: newStatus }));
    if (onUpdateCard) onUpdateCard({ status: newStatus });
    triggerToast(nextFrozen ? "Card frozen successfully" : "Card unfrozen and active");
    setActiveModal(null);
  };

  const handleSaveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    const d = parseFloat(tempDaily);
    const m = parseFloat(tempMonthly);
    if (!isNaN(d) && d >= 0) setDailyLimit(d);
    if (!isNaN(m) && m >= 0) {
      setMonthlyLimit(m);
      setCurrentCard((prev) => ({ ...prev, spendLimit: m }));
      if (onUpdateCard) onUpdateCard({ spendLimit: m });
    }
    triggerToast("Spending limits updated");
    setActiveModal(null);
  };

  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempNickname.trim()) {
      setCardNickname(tempNickname.trim());
      setCurrentCard((prev) => ({ ...prev, name: tempNickname.trim() }));
      if (onUpdateCard) onUpdateCard({ name: tempNickname.trim() });
      triggerToast("Card nickname updated");
    }
    setActiveModal(null);
  };

  // Extract last 4 digits for masked display
  const maskedLast4 = currentCard.maskedNumber
    ? currentCard.maskedNumber.slice(-4)
    : currentCard.id.slice(-4);
  const displayFullNumber = currentCard.fullNumber ?? `4532 8901 2345 ${maskedLast4}`;
  const displayExpiry = currentCard.expiry ?? "06/27";
  const displayCvv = currentCard.cvv ?? "842";

  // Daily & Monthly percentages
  const dailyPct = Math.min(100, Math.round((dailyLimit / maxDailyLimit) * 100));
  const monthlyPct = Math.min(100, Math.round((monthlyLimit / maxMonthlyLimit) * 100));

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-2xl text-[13px] border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-medium text-[10px]">
            ✓
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Layout matching Figma 5383:9189 */}
      <div className="flex flex-col lg:flex-row items-start gap-8 w-full">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Hero Virtual Card Container (Figma width: 446px)             */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-[446px] shrink-0 bg-card rounded-[19.25px] border border-border/80 p-6 flex flex-col gap-6 shadow-xs">
          {/* 1. Header: Virtual Card Title & Active Pill */}
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h2 className="text-[18px] font-normal tracking-[-0.22px] text-foreground">
              Virtual Card
            </h2>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] border text-[12px] font-medium shadow-2xs ${
              isFrozen
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800"
                : "bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-800"
            }`}>
              <span className={`flex size-3 items-center justify-center rounded-full text-white text-[8px] font-medium ${
                isFrozen ? "bg-amber-500" : "bg-[#22c55e]"
              }`}>
                {isFrozen ? "!" : "✓"}
              </span>
              <span>{isFrozen ? "Frozen" : "Active"}</span>
            </div>
          </div>

          {/* 2. Hero Virtual Card Graphic (182px height) */}
          <div
            className={`relative h-[182px] w-full rounded-[15.75px] border border-slate-200/90 dark:border-slate-800/80 p-4.5 shadow-xs overflow-hidden select-none transition-all duration-300 ${
              isFrozen ? "opacity-75 grayscale-[40%]" : ""
            }`}
            style={{
              backgroundImage:
                "linear-gradient(155.34deg, rgba(248, 250, 252, 0.95) 0%, rgb(255, 255, 255) 50%, rgba(241, 245, 249, 0.75) 100%)",
            }}
          >
            {/* Background SVG Wave Art matching Figma */}
            <svg
              className="absolute right-0 top-0 h-full w-[182px] text-slate-300/40 dark:text-slate-700/40 pointer-events-none"
              viewBox="0 0 182 158"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M40 0 C90 30, 130 90, 180 120" stroke="currentColor" strokeWidth="1.2" />
              <path d="M80 0 C120 40, 150 100, 180 158" stroke="currentColor" strokeWidth="1.2" />
              <path d="M120 0 C150 30, 170 60, 180 80" stroke="currentColor" strokeWidth="1.2" />
            </svg>

            {/* Top Row: Mastercard logo & Eye hide balance button */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center -space-x-2">
                <div className="size-[23px] rounded-full bg-[#eb001b]" />
                <div className="size-[23px] rounded-full bg-[#ff5f00] opacity-90" />
              </div>

              <SimpleTooltip content={showAmounts ? "Hide balance" : "Show balance"}>
                <button
                  type="button"
                  onClick={toggleAmountVisibility}
                  aria-label={showAmounts ? "Hide balance" : "Show balance"}
                  className="size-7 rounded-full bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {showAmounts ? <Eye size={14} strokeWidth={2} /> : <EyeOff size={14} strokeWidth={2} />}
                </button>
              </SimpleTooltip>
            </div>

            {/* Bottom Content: Subtitle & Balance */}
            <div className="absolute bottom-4.5 left-4.5 right-4.5 z-10 flex items-end justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-[13.5px] text-[#62748e]">
                  <span>Virtual Card</span>
                  <span className="text-[13px]">••• 5345</span>
                </div>
                <div className="mt-0.5 text-[28px] font-medium tracking-[-0.7px] text-[#0f172b] dark:text-slate-900 tabular">
                  <RevealingAmount amount={card.balance ?? 16058.94} currency={card.currency ?? "GHS"} />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Action Circle Buttons Row (Card Details, Show PIN, Freeze card) */}
          <div className="flex items-center justify-center gap-8 py-1">
            {/* Action 1: Card Details */}
            <div className="flex flex-col items-center gap-3">
              <SimpleTooltip content="View card credentials & numbers">
                <button
                  type="button"
                  onClick={() => setActiveModal("details")}
                  className="size-[49px] rounded-full bg-[#f1f1f1] hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-[#0a0a0a] dark:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  aria-label="View Card Details"
                >
                  <Eye size={22} strokeWidth={1.75} />
                </button>
              </SimpleTooltip>
              <span className="text-[12.5px] font-normal text-foreground whitespace-nowrap">
                Card Details
              </span>
            </div>

            {/* Action 2: Show PIN */}
            <div className="flex flex-col items-center gap-3">
              <SimpleTooltip content="View card PIN">
                <button
                  type="button"
                  onClick={() => setActiveModal("pin")}
                  className="size-[49px] rounded-full bg-[#f1f1f1] hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-[#0a0a0a] dark:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  aria-label="Show Card PIN"
                >
                  <Grid size={21} strokeWidth={1.75} />
                </button>
              </SimpleTooltip>
              <span className="text-[12.5px] font-normal text-foreground whitespace-nowrap">
                Show PIN
              </span>
            </div>

            {/* Action 3: Freeze Card */}
            <div className="flex flex-col items-center gap-3">
              <SimpleTooltip content={isFrozen ? "Unfreeze card transactions" : "Freeze card transactions"}>
                <button
                  type="button"
                  onClick={() => setActiveModal("freeze")}
                  className={`size-[49px] rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                    isFrozen
                      ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200"
                      : "bg-[#f1f1f1] hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-[#0a0a0a] dark:text-white"
                  }`}
                  aria-label={isFrozen ? "Unfreeze card" : "Freeze card"}
                >
                  <Snowflake size={21} strokeWidth={1.75} />
                </button>
              </SimpleTooltip>
              <span className="text-[12.5px] font-normal text-foreground whitespace-nowrap">
                {isFrozen ? "Unfreeze card" : "Freeze card"}
              </span>
            </div>
          </div>

          {/* 4. Action Settings List */}
          <div className="rounded-[15.75px] border border-[#e5e5e5] dark:border-slate-800 bg-card overflow-hidden divide-y divide-[#e5e5e5] dark:divide-slate-800/80">
            {/* Item 1: Set limits for this card */}
            <button
              type="button"
              onClick={() => {
                setTempDaily(String(dailyLimit));
                setTempMonthly(String(monthlyLimit));
                setActiveModal("limits");
              }}
              className="w-full flex items-center justify-between px-4.5 py-2.5 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-slate-800 text-foreground flex items-center justify-center shrink-0">
                  <SlidersHorizontal size={16} strokeWidth={1.75} />
                </div>
                <span className="text-[14px] font-normal text-foreground">Set limits for this card</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Item 2: Card controls */}
            <button
              type="button"
              onClick={() => setActiveModal("controls")}
              className="w-full flex items-center justify-between px-4.5 py-2.5 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-slate-800 text-foreground flex items-center justify-center shrink-0">
                  <Settings2 size={16} strokeWidth={1.75} />
                </div>
                <span className="text-[14px] font-normal text-foreground">Card controls</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Item 3: Unblock / Reset PIN */}
            <button
              type="button"
              onClick={() => setActiveModal("reset-pin")}
              className="w-full flex items-center justify-between px-4.5 py-2.5 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-slate-800 text-foreground flex items-center justify-center shrink-0">
                  <Key size={16} strokeWidth={1.75} />
                </div>
                <span className="text-[14px] font-normal text-foreground">Unblock / Reset PIN</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Item 4: Edit card nickname & account */}
            <button
              type="button"
              onClick={() => {
                setTempNickname(cardNickname);
                setActiveModal("edit-nickname");
              }}
              className="w-full flex items-center justify-between px-4.5 py-2.5 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-slate-800 text-foreground flex items-center justify-center shrink-0">
                  <Sparkles size={16} strokeWidth={1.75} />
                </div>
                <span className="text-[14px] font-normal text-foreground">Edit card nickname & account</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Item 5: Replace card */}
            <button
              type="button"
              onClick={() => setActiveModal("replace")}
              className="w-full flex items-center justify-between px-4.5 py-2.5 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-slate-800 text-foreground flex items-center justify-center shrink-0">
                  <CreditCard size={16} strokeWidth={1.75} />
                </div>
                <span className="text-[14px] font-normal text-foreground">Replace card</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Spending Limits & Recent Activity                            */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col gap-6 w-full">
          {/* TOP SECTION: Spending Limits Card */}
          <div className="rounded-[15.75px] border border-[#e5e5e5] dark:border-slate-800 bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#e5e5e5] dark:border-slate-800">
              <h3 className="text-[14px] font-medium text-[#111] dark:text-foreground">Spending Limits</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempDaily(String(dailyLimit));
                  setTempMonthly(String(monthlyLimit));
                  setActiveModal("limits");
                }}
                className="h-[35px] rounded-[12.25px] border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-[13.5px] font-medium text-[#1d293d] dark:text-slate-200 hover:bg-muted/80 transition-colors cursor-pointer shadow-2xs"
              >
                Adjust Limit
              </Button>
            </div>

            {/* Body with progress bars */}
            <div className="p-6 flex flex-col gap-5">
              {/* Daily Limit Item */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-normal text-[#737373]">Daily Limit</span>
                  <span className="text-[13px] font-medium text-foreground tabular">
                    GHS {dailyLimit.toLocaleString()} / GHS {maxDailyLimit.toLocaleString()}
                  </span>
                </div>
                <div className="h-[12px] w-full rounded-full bg-[#f5f5f5] dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#3ea273] transition-all duration-500"
                    style={{ width: `${dailyPct}%` }}
                  />
                </div>
              </div>

              {/* Monthly Limit Item */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-normal text-[#737373]">Monthly Limit</span>
                  <span className="text-[13px] font-medium text-foreground tabular">
                    GHS {monthlyLimit.toLocaleString()} / GHS {maxMonthlyLimit.toLocaleString()}
                  </span>
                </div>
                <div className="h-[12px] w-full rounded-full bg-[#f5f5f5] dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#3ea273] transition-all duration-500"
                    style={{ width: `${monthlyPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Recent Activity Card */}
          <div className="rounded-[15.75px] border border-[#e5e5e5] dark:border-slate-800 bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e5e5] dark:border-slate-800">
              <h3 className="text-[14px] font-medium text-[#111] dark:text-foreground">Recent Activity</h3>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/transactions" />}
                className="h-[35px] rounded-[12.25px] border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-[13.5px] font-medium text-[#1d293d] dark:text-slate-200 hover:bg-muted/80 transition-colors cursor-pointer shadow-2xs"
              >
                View All Transactions
              </Button>
            </div>

            {/* Transaction List matching exact Figma entries */}
            <ul className="divide-y divide-[#e5e5e5] dark:divide-slate-800">
              {/* Item 1 */}
              <li className="flex items-center justify-between px-4.5 py-2.5 transition-colors hover:bg-muted/40">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground">
                    Supermarket Purchase — Melcom
                  </span>
                  <span className="text-[11px] font-normal text-[#737373] tabular mt-0.5">
                    11 Aug 2026
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[13px] font-medium text-foreground tabular">
                    −<RevealingAmount value="GH₵450.00" />
                  </span>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[rgba(0,188,125,0.1)] text-[#007a55] dark:text-emerald-400 text-[10.5px] font-medium">
                    Completed
                  </span>
                </div>
              </li>

              {/* Item 2 */}
              <li className="flex items-center justify-between px-4.5 py-2.5 transition-colors hover:bg-muted/40">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground">
                    Supermarket Purchase — Melcom
                  </span>
                  <span className="text-[11px] font-normal text-[#737373] tabular mt-0.5">
                    11 Aug 2026
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[13px] font-medium text-foreground tabular">
                    −<RevealingAmount value="GH₵450.00" />
                  </span>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[rgba(0,188,125,0.1)] text-[#007a55] dark:text-emerald-400 text-[10.5px] font-medium">
                    Completed
                  </span>
                </div>
              </li>

              {/* Item 3 */}
              <li className="flex items-center justify-between px-4.5 py-2.5 transition-colors hover:bg-muted/40">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground">
                    Monthly Salary Credit
                  </span>
                  <span className="text-[11px] font-normal text-[#737373] tabular mt-0.5">
                    10 Aug 2026
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[13px] font-medium text-foreground tabular">
                    +<RevealingAmount value="GH₵8,500.00" />
                  </span>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[rgba(0,188,125,0.1)] text-[#007a55] dark:text-emerald-400 text-[10.5px] font-medium">
                    Completed
                  </span>
                </div>
              </li>

              {/* Item 4 */}
              <li className="flex items-center justify-between px-4.5 py-2.5 transition-colors hover:bg-muted/40">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground">
                    Transfer to Savings
                  </span>
                  <span className="text-[11px] font-normal text-[#737373] tabular mt-0.5">
                    08 Aug 2026
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[13px] font-medium text-foreground tabular">
                    +GH₵2,000.00
                  </span>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[rgba(0,188,125,0.1)] text-[#007a55] dark:text-emerald-400 text-[10.5px] font-medium">
                    Completed
                  </span>
                </div>
              </li>

              {/* Item 5 */}
              <li className="flex items-center justify-between px-4.5 py-2.5 transition-colors hover:bg-muted/40">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground">
                    Transfer to Savings
                  </span>
                  <span className="text-[11px] font-normal text-[#737373] tabular mt-0.5">
                    08 Aug 2026
                  </span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[13px] font-medium text-foreground tabular">
                    +GH₵2,000.00
                  </span>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[rgba(0,188,125,0.1)] text-[#007a55] dark:text-emerald-400 text-[10.5px] font-medium">
                    Completed
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DIALOGS                                                              */}
      {/* ========================================================================= */}

      {/* 1. Card Details Modal */}
      <Dialog open={activeModal === "details"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px]">
              <CreditCard size={18} className="text-primary" />
              <span>Card Details</span>
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Secure credential details for online transactions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-[13.5px]">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border border-border">
              <div className="flex flex-col">
                <span className="text-[11.5px] text-muted-foreground">Card Number</span>
                <span className="font-mono font-medium text-foreground text-[15px] tracking-wide">
                  {displayFullNumber}
                </span>
              </div>
              <SimpleTooltip content="Copy card number">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(displayFullNumber.replace(/\s/g, ""), "Card Number")}
                  className="size-8 p-0 cursor-pointer"
                  aria-label="Copy card number"
                >
                  <Copy size={15} />
                </Button>
              </SimpleTooltip>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border border-border">
                <div className="flex flex-col">
                  <span className="text-[11.5px] text-muted-foreground">Expiry Date</span>
                  <span className="font-mono font-medium text-foreground text-[14px]">
                    {displayExpiry}
                  </span>
                </div>
                <SimpleTooltip content="Copy expiry date">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(displayExpiry, "Expiry Date")}
                    className="size-8 p-0 cursor-pointer"
                    aria-label="Copy expiry date"
                  >
                    <Copy size={14} />
                  </Button>
                </SimpleTooltip>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border border-border">
                <div className="flex flex-col">
                  <span className="text-[11.5px] text-muted-foreground">CVC / CVV</span>
                  <span className="font-mono font-medium text-foreground text-[14px]">
                    {displayCvv}
                  </span>
                </div>
                <SimpleTooltip content="Copy CVV security code">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(displayCvv, "CVC")}
                    className="size-8 p-0 cursor-pointer"
                    aria-label="Copy CVV"
                  >
                    <Copy size={14} />
                  </Button>
                </SimpleTooltip>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/60 border border-border flex flex-col gap-1">
              <span className="text-[11.5px] text-muted-foreground">Cardholder Name</span>
              <span className="font-medium text-foreground text-[14px]">{currentCard.holder ?? "Efua Mensah"}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Show PIN Modal */}
      <Dialog open={activeModal === "pin"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-[17px] text-center">Security PIN</DialogTitle>
            <DialogDescription className="text-[13px] text-center">
              Your 4-digit card PIN for ATM & point-of-sale verification.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center justify-center gap-3">
            <div className="flex gap-3 justify-center">
              {["4", "8", "2", "1"].map((digit, idx) => (
                <div
                  key={idx}
                  className="size-12 rounded-xl bg-muted border border-border flex items-center justify-center text-[22px] font-medium font-mono text-foreground shadow-inner"
                >
                  {digit}
                </div>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground mt-2">
              This window automatically closes in 15 seconds. Do not share your PIN.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Freeze Card Confirmation Modal */}
      <Dialog open={activeModal === "freeze"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px]">
              <Snowflake size={18} className="text-amber-500" />
              <span>{isFrozen ? "Unfreeze Card?" : "Freeze Card?"}</span>
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              {isFrozen
                ? "Unfreezing will immediately re-enable payments and transactions on this card."
                : "Freezing will temporarily block all new transactions, online payments, and ATM withdrawals."}
            </DialogDescription>
          </DialogHeader>

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              variant={isFrozen ? "default" : "destructive"}
              size="sm"
              onClick={handleToggleFreeze}
            >
              {isFrozen ? "Unfreeze Card" : "Freeze Card"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Set Limits Modal */}
      <Dialog open={activeModal === "limits"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px]">
              <SlidersHorizontal size={18} className="text-primary" />
              <span>Adjust Spending Limits</span>
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Set maximum transaction limits for daily and monthly spend.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLimits} className="space-y-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="daily-limit-input" className="text-[12.5px] font-medium text-foreground">
                Daily Limit (GHS)
              </label>
              <Input
                id="daily-limit-input"
                value={tempDaily}
                onChange={(e) => setTempDaily(e.target.value)}
                placeholder="1240"
                className="h-10 text-[13.5px]"
              />
              <span className="text-[11px] text-muted-foreground">Maximum available cap: GHS {maxDailyLimit.toLocaleString()}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="monthly-limit-input" className="text-[12.5px] font-medium text-foreground">
                Monthly Limit (GHS)
              </label>
              <Input
                id="monthly-limit-input"
                value={tempMonthly}
                onChange={(e) => setTempMonthly(e.target.value)}
                placeholder="8300"
                className="h-10 text-[13.5px]"
              />
              <span className="text-[11px] text-muted-foreground">Maximum available cap: GHS {maxMonthlyLimit.toLocaleString()}</span>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Limits
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Card Controls Modal */}
      <Dialog open={activeModal === "controls"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px]">
              <Settings2 size={18} className="text-primary" />
              <span>Card Controls & Channels</span>
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Enable or disable specific transaction types and security channels.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 text-[13.5px]">
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/40 cursor-pointer">
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Online Checkout</span>
                  <span className="text-[11.5px] text-muted-foreground">E-commerce & web transactions</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={onlineEnabled}
                onChange={(e) => {
                  setOnlineEnabled(e.target.checked);
                  triggerToast(`Online payments ${e.target.checked ? "enabled" : "disabled"}`);
                }}
                className="size-4.5 rounded accent-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/40 cursor-pointer">
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">International Usage</span>
                  <span className="text-[11.5px] text-muted-foreground">Cross-border foreign exchange payments</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={intlEnabled}
                onChange={(e) => {
                  setIntlEnabled(e.target.checked);
                  triggerToast(`International transactions ${e.target.checked ? "enabled" : "disabled"}`);
                }}
                className="size-4.5 rounded accent-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/40 cursor-pointer">
              <div className="flex items-center gap-3">
                <CreditCard size={18} className="text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">ATM Cash Withdrawals</span>
                  <span className="text-[11.5px] text-muted-foreground">Physical terminal cash access</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={atmEnabled}
                onChange={(e) => {
                  setAtmEnabled(e.target.checked);
                  triggerToast(`ATM withdrawals ${e.target.checked ? "enabled" : "disabled"}`);
                }}
                className="size-4.5 rounded accent-primary"
              />
            </label>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. Unblock / Reset PIN Modal */}
      <Dialog open={activeModal === "reset-pin"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px]">
              <Key size={18} className="text-primary" />
              <span>Reset Card PIN</span>
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Set a new 4-digit security PIN for this virtual card.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-pin-input" className="text-[12.5px] font-medium text-foreground">New 4-Digit PIN</label>
              <Input id="new-pin-input" type="password" maxLength={4} placeholder="••••" className="h-10 tracking-widest text-[16px]" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-pin-input" className="text-[12.5px] font-medium text-foreground">Confirm New PIN</label>
              <Input id="confirm-pin-input" type="password" maxLength={4} placeholder="••••" className="h-10 tracking-widest text-[16px]" />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  triggerToast("PIN reset successfully");
                  setActiveModal(null);
                }}
              >
                Update PIN
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 7. Edit Nickname Modal */}
      <Dialog open={activeModal === "edit-nickname"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px]">
              <Sparkles size={18} className="text-primary" />
              <span>Edit Card Details</span>
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Update your card nickname and linked account label.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNickname} className="space-y-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="card-nickname-input" className="text-[12.5px] font-medium text-foreground">Card Nickname</label>
              <Input
                id="card-nickname-input"
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                placeholder="AWS & SaaS Virtual Card"
                className="h-10 text-[13.5px]"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 8. Replace Card Modal */}
      <Dialog open={activeModal === "replace"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px]">
              <CreditCard size={18} className="text-rose-500" />
              <span>Request Card Replacement</span>
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              If your card was compromised or lost, request a new card number instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-2 space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[12.5px] flex items-start gap-2.5">
              <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                Replacing this card will block current card numbers (`•••• {maskedLast4}`) immediately and issue new virtual card credentials.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  triggerToast("Card replacement requested. New card issued.");
                  setActiveModal(null);
                }}
              >
                Request Replacement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
