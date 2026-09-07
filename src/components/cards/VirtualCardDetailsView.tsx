/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
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
  ChevronLeft,
  Copy,
  PlusCircle,
  Globe,
  AlertTriangle,
  Clock,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { accountsForProfile, type PaymentCard } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import TransactionPinModal from "@/components/payments/TransactionPinModal";
import { toast } from "sonner";

export interface VirtualCardDetailsViewProps {
  card: PaymentCard;
  onUpdateCard?: (updated: Partial<PaymentCard>) => void;
}

export function VirtualCardDetailsView({ card, onUpdateCard }: VirtualCardDetailsViewProps) {
  const activeProfile = useSession((s) => s.activeProfile);
  const availableAccounts = accountsForProfile(activeProfile?.kind ?? "RETAIL");

  // Local reactive states
  const [currentCard, setCurrentCard] = useState<PaymentCard>(card);
  const [isFrozen, setIsFrozen] = useState(card.status === "Blocked");
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [dailySpent] = useState(1240);
  const [dailyLimit, setDailyLimit] = useState(card.spendLimit ?? 5000);
  const [maxDailyCap] = useState(20000);
  const [monthlyLimit, setMonthlyLimit] = useState(15000);
  const [maxMonthlyCap] = useState(50000);
  const [cardNickname, setCardNickname] = useState(card.name ?? "Virtual Card");

  // Modals state
  const [activeModal, setActiveModal] = useState<
    "details" | "pin" | "freeze" | "limits" | "controls" | "reset-pin" | "edit-nickname" | "replace" | "top-up" | null
  >(null);

  // Top Up Form State
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpSourceAccountId, setTopUpSourceAccountId] = useState(availableAccounts[0]?.id ?? "");

  const isFundable =
    currentCard.fundable !== false &&
    (currentCard.type === "Virtual" || currentCard.type === "Prepaid" || Boolean(currentCard.isVirtual));

  // Security channel controls
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [intlEnabled, setIntlEnabled] = useState(false);
  const [atmEnabled, setAtmEnabled] = useState(true);

  // Temp form states
  const [tempDaily, setTempDaily] = useState(String(dailyLimit));
  const [tempMonthly, setTempMonthly] = useState(String(monthlyLimit));
  const [tempNickname, setTempNickname] = useState(cardNickname);

  // PIN Verification & Security PIN Countdown State
  const [pinAuthOpen, setPinAuthOpen] = useState(false);
  const [pinCountdown, setPinCountdown] = useState(15);

  useEffect(() => {
    if (activeModal !== "pin") return;

    const interval = setInterval(() => {
      setPinCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveModal(null);
          toast.info("PIN window closed automatically for security.");
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeModal]);

  const handleOpenPinModal = () => {
    setPinAuthOpen(true);
  };

  const handlePinAuthSuccess = () => {
    setPinAuthOpen(false);
    setPinCountdown(15);
    setActiveModal("pin");
    triggerToast("Identity verified. Card PIN revealed.");
  };

  const handleExecuteTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) return;

    const updatedBalance = (currentCard.balance ?? 0) + amt;
    setCurrentCard((prev) => ({ ...prev, balance: updatedBalance }));
    if (onUpdateCard) onUpdateCard({ balance: updatedBalance });

    triggerToast(
      `Top up successful! Added GHS ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} to ${currentCard.name}`
    );
    setTopUpAmount("");
    setActiveModal(null);
  };

  const triggerToast = (msg: string) => {
    toast.success(msg);
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
    if (!isNaN(d) && d > 0) {
      setDailyLimit(d);
      setCurrentCard((prev) => ({ ...prev, spendLimit: d }));
      if (onUpdateCard) onUpdateCard({ spendLimit: d });
    }
    if (!isNaN(m) && m > 0) {
      setMonthlyLimit(m);
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

  // Daily percentage of limit used
  const dailyPct = Math.min(100, Math.max(0, Math.round((dailySpent / (dailyLimit || 1)) * 100)));

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Figma 1243:25983 Back Button & Title Header */}
      <div className="flex items-center gap-6">
        <Link
          href="/cards"
          className="size-[48px] rounded-full bg-[#f6f6f5] dark:bg-muted/80 flex items-center justify-center p-2 text-[#121212] dark:text-foreground hover:bg-[#ececeb] dark:hover:bg-muted transition-colors cursor-pointer shrink-0 shadow-2xs"
          aria-label="Back to Cards"
        >
          <ChevronLeft size={24} strokeWidth={2} />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.52px] text-[#121212] dark:text-foreground">
            {cardNickname || "Virtual Card"}
          </h1>
          <p className="text-[18px] font-normal leading-[20px] tracking-[-0.18px] text-[#747472] dark:text-muted-foreground mt-1">
            •••• {maskedLast4}
          </p>
        </div>
      </div>

      {/* Main Container matching Figma 1243:25983 w-[905.9px] */}
      <div className="w-full max-w-[920px] flex flex-col gap-8">
        {/* Top 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch w-full">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Hero Yellow Branded GCB Virtual Card & 3 Action Buttons      */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-4 w-full">
            {/* The Yellow Branded GCB Virtual Card */}
            <div className="relative h-[237px] w-full rounded-[15.75px] overflow-hidden p-[18px] flex flex-col justify-between select-none shadow-xs transition-all duration-200 bg-gradient-to-b from-[#fddc07] from-[39%] to-[#ffbc04] text-[#121212]">
              {/* Background Watermark Elements from Figma */}
              <div className="-translate-x-1/2 -translate-y-1/2 absolute flex h-[535px] items-center justify-center left-[calc(50%+73px)] top-[calc(50%+19px)] w-[564px] pointer-events-none select-none opacity-20">
                <div className="flex-none rotate-30">
                  <div className="h-[364px] relative w-[441px]">
                    <div className="absolute inset-[-27.5%_-22.7%]">
                      <img alt="" className="block size-full object-contain" src="/card-bg-wings.svg" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute h-[334px] left-[189px] top-[18px] w-[410px] pointer-events-none select-none opacity-90">
                <img alt="" className="block size-full object-contain" src="/card-watermark.svg" />
              </div>

              {/* Top Row: GCB Logo & Eye Toggle */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="h-[32px] w-[37.2px] relative shrink-0">
                  <img alt="GCB" className="size-full object-contain" src="/gcb-card-logo.svg" />
                </div>
                <div className="flex items-center gap-2">
                  {isFrozen && (
                    <span className="bg-black/15 backdrop-blur-xs text-[#121212] px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-black/10">
                      Frozen
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCardDetails((prev) => !prev)}
                    className="size-8 rounded-full bg-black/10 hover:bg-black/20 text-[#121212] flex items-center justify-center transition-colors cursor-pointer"
                    title={showCardDetails ? "Hide card details" : "Show card details"}
                    aria-label={showCardDetails ? "Hide card details" : "Show card details"}
                  >
                    {showCardDetails ? (
                      <EyeOff size={16} strokeWidth={2} />
                    ) : (
                      <Eye size={16} strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              {/* Center Row: Card Number & Inline Quick Copy */}
              <div className="relative z-10 my-auto py-1 flex items-center gap-2.5">
                <p
                  onClick={() => {
                    if (showCardDetails) {
                      handleCopy(displayFullNumber.replace(/\s/g, ""), "Card Number");
                    }
                  }}
                  className={`font-mono text-[18px] sm:text-[22px] tracking-wider leading-[24px] text-[#121212] whitespace-nowrap select-none ${
                    showCardDetails
                      ? "cursor-pointer hover:opacity-85 transition-opacity"
                      : "cursor-default"
                  }`}
                  title={showCardDetails ? "Click to copy card number" : undefined}
                >
                  {showCardDetails ? displayFullNumber : `•••• •••• •••• ${maskedLast4}`}
                </p>
                {showCardDetails && (
                  <button
                    type="button"
                    onClick={() => handleCopy(displayFullNumber.replace(/\s/g, ""), "Card Number")}
                    className="size-7 rounded-full bg-black/10 hover:bg-black/20 text-[#121212] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Copy card number"
                    aria-label="Copy card number"
                  >
                    <Copy size={13} strokeWidth={2} />
                  </button>
                )}
              </div>

              {/* Bottom Row: CARD HOLDER, EXP, and CVV */}
              <div className="relative z-10 flex items-end justify-between text-[#121212] whitespace-nowrap">
                {showCardDetails ? (
                  <button
                    type="button"
                    onClick={() => handleCopy(card.holder || "TSOTSOO MILLS", "Cardholder Name")}
                    className="flex flex-col gap-0.5 text-left group cursor-pointer hover:opacity-80 transition-opacity"
                    title="Click to copy cardholder name"
                  >
                    <span className="text-[12px] font-semibold opacity-40 leading-[20px] uppercase tracking-wider">
                      CARD HOLDER
                    </span>
                    <span className="text-[16px] font-medium leading-[24px] tracking-[-0.08px] uppercase">
                      {card.holder || "TSOTSOO MILLS"}
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-0.5 text-left select-none">
                    <span className="text-[12px] font-semibold opacity-40 leading-[20px] uppercase tracking-wider">
                      CARD HOLDER
                    </span>
                    <span className="text-[16px] font-medium leading-[24px] tracking-[-0.08px] uppercase">
                      {card.holder || "TSOTSOO MILLS"}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-5">
                  {showCardDetails ? (
                    <button
                      type="button"
                      onClick={() => handleCopy(displayExpiry, "Expiry Date")}
                      className="flex flex-col gap-0.5 items-end group cursor-pointer hover:opacity-80 transition-opacity text-right"
                      title="Click to copy expiry date"
                    >
                      <span className="text-[12px] font-semibold opacity-40 leading-[20px] uppercase tracking-wider">
                        EXP
                      </span>
                      <span className="text-[16px] font-medium leading-[24px] tracking-[-0.08px] font-mono">
                        {displayExpiry}
                      </span>
                    </button>
                  ) : (
                    <div className="flex flex-col gap-0.5 items-end text-right select-none">
                      <span className="text-[12px] font-semibold opacity-40 leading-[20px] uppercase tracking-wider">
                        EXP
                      </span>
                      <span className="text-[16px] font-medium leading-[24px] tracking-[-0.08px] font-mono">
                        {displayExpiry}
                      </span>
                    </div>
                  )}

                  {showCardDetails ? (
                    <button
                      type="button"
                      onClick={() => handleCopy(displayCvv, "CVV")}
                      className="flex flex-col gap-0.5 items-end group cursor-pointer hover:opacity-80 transition-opacity text-right"
                      title="Click to copy CVV"
                    >
                      <span className="text-[12px] font-semibold opacity-40 leading-[20px] uppercase tracking-wider">
                        CVV
                      </span>
                      <span className="text-[16px] font-medium leading-[24px] tracking-[-0.08px] font-mono">
                        {displayCvv}
                      </span>
                    </button>
                  ) : (
                    <div className="flex flex-col gap-0.5 items-end text-right select-none">
                      <span className="text-[12px] font-semibold opacity-40 leading-[20px] uppercase tracking-wider">
                        CVV
                      </span>
                      <span className="text-[16px] font-medium leading-[24px] tracking-[-0.08px] font-mono">
                        •••
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3 Horizontal Action Buttons matching Figma Node 1243:26133 */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {/* Button 1: Top Up (if fundable) or View Linked Account (if debit) */}
              {isFundable ? (
                <button
                  type="button"
                  onClick={() => setActiveModal("top-up")}
                  className="bg-card border border-[#ebebe9] dark:border-border rounded-[8px] py-[12px] px-[12px] flex items-center justify-center gap-2 hover:bg-muted/60 transition-colors shadow-2xs cursor-pointer group"
                  title="Top up card balance"
                >
                  <div className="size-[20px] shrink-0 flex items-center justify-center text-[#121212] dark:text-foreground">
                    <PlusCircle size={18} strokeWidth={1.8} />
                  </div>
                  <span className="text-[14px] font-medium text-[#121212] dark:text-foreground whitespace-nowrap">
                    Top Up
                  </span>
                </button>
              ) : (
                <Link
                  href={`/accounts/${currentCard.linkedAccountId || "acc-001"}`}
                  className="bg-card border border-[#ebebe9] dark:border-border rounded-[8px] py-[12px] px-[12px] flex items-center justify-center gap-2 hover:bg-muted/60 transition-colors shadow-2xs cursor-pointer group"
                  title="View linked bank account"
                >
                  <div className="size-[20px] shrink-0 flex items-center justify-center text-[#121212] dark:text-foreground">
                    <Landmark size={18} strokeWidth={1.8} />
                  </div>
                  <span className="text-[14px] font-medium text-[#121212] dark:text-foreground whitespace-nowrap">
                    Linked Account
                  </span>
                </Link>
              )}

              {/* Button 2: Show PIN */}
              <button
                type="button"
                onClick={handleOpenPinModal}
                className="bg-card border border-[#ebebe9] dark:border-border rounded-[8px] py-[12px] px-[12px] flex items-center justify-center gap-2 hover:bg-muted/60 transition-colors shadow-2xs cursor-pointer group"
              >
                <div className="size-[20px] shrink-0 flex items-center justify-center text-[#121212] dark:text-foreground">
                  <Grid size={18} strokeWidth={1.8} />
                </div>
                <span className="text-[14px] font-medium text-[#121212] dark:text-foreground whitespace-nowrap">
                  Show PIN
                </span>
              </button>

              {/* Button 3: Block / Unblock */}
              <button
                type="button"
                onClick={() => setActiveModal("freeze")}
                className="bg-card border border-[#ebebe9] dark:border-border rounded-[8px] py-[12px] px-[12px] flex items-center justify-center gap-2 hover:bg-muted/60 transition-colors shadow-2xs cursor-pointer group"
              >
                <div className="size-[20px] shrink-0 flex items-center justify-center text-[#121212] dark:text-foreground">
                  <Snowflake size={18} strokeWidth={1.8} />
                </div>
                <span className="text-[14px] font-medium text-[#121212] dark:text-foreground whitespace-nowrap">
                  {isFrozen ? "Unblock" : "Block"}
                </span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Daily Limit Progress & 4-Item Action Menu Card             */}
          {/* ========================================================================= */}
          <div className="flex flex-col justify-between h-full gap-5 w-full">
            {/* Daily Limit Tracker matching Figma Node 1243:26138 */}
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-normal text-[#737373] dark:text-muted-foreground">
                  Daily Limit
                </span>
                <span className="text-[14px] font-normal text-[#0a0a0a] dark:text-foreground tabular">
                  GHS {dailySpent.toLocaleString()} / GHS {dailyLimit.toLocaleString()}
                </span>
              </div>
              <div className="h-[12px] w-full rounded-full bg-[#f6f6f5] dark:bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ffb200] to-[#f9c632] transition-all duration-500"
                  style={{ width: `${dailyPct}%` }}
                />
              </div>
            </div>

            {/* 4-Item Grouped Action Menu List Card matching Figma Node 1243:26146 */}
            <div className="rounded-[12px] border border-[#ebebe9] dark:border-border bg-card overflow-hidden divide-y divide-[#ebebe9] dark:divide-border w-full">
              {/* Item 1: Set limits for this card */}
              <button
                type="button"
                onClick={() => {
                  setTempDaily(String(dailyLimit));
                  setTempMonthly(String(monthlyLimit));
                  setActiveModal("limits");
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-muted text-[#121212] dark:text-foreground flex items-center justify-center shrink-0">
                    <SlidersHorizontal size={16} strokeWidth={1.8} />
                  </div>
                  <span className="text-[14px] font-normal text-[#0a0a0a] dark:text-foreground">
                    Set limits for this card
                  </span>
                </div>
                <ChevronRight size={18} className="text-[#737373] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Item 2: Edit card nickname & account */}
              <button
                type="button"
                onClick={() => {
                  setTempNickname(cardNickname);
                  setActiveModal("edit-nickname");
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-muted text-[#121212] dark:text-foreground flex items-center justify-center shrink-0">
                    <Sparkles size={16} strokeWidth={1.8} />
                  </div>
                  <span className="text-[14px] font-normal text-[#0a0a0a] dark:text-foreground">
                    Edit card nickname & account
                  </span>
                </div>
                <ChevronRight size={18} className="text-[#737373] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Item 3: Reset PIN */}
              <button
                type="button"
                onClick={() => setActiveModal("reset-pin")}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-muted text-[#121212] dark:text-foreground flex items-center justify-center shrink-0">
                    <Key size={16} strokeWidth={1.8} />
                  </div>
                  <span className="text-[14px] font-normal text-[#0a0a0a] dark:text-foreground">
                    Reset PIN
                  </span>
                </div>
                <ChevronRight size={18} className="text-[#737373] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Item 4: Replace card */}
              <button
                type="button"
                onClick={() => setActiveModal("replace")}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-muted text-[#121212] dark:text-foreground flex items-center justify-center shrink-0">
                    <CreditCard size={16} strokeWidth={1.8} />
                  </div>
                  <span className="text-[14px] font-normal text-[#0a0a0a] dark:text-foreground">
                    Replace card
                  </span>
                </div>
                <ChevronRight size={18} className="text-[#737373] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SECTION: Activity matching Figma Node 1243:26197                  */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-3 w-full">
          {/* Heading 3 */}
          <div className="flex items-center justify-between w-full">
            <h3 className="text-[18px] font-medium leading-[26px] tracking-[0.18px] text-[#121212] dark:text-foreground">
              Activity
            </h3>
            <Link
              href="/transactions"
              className="text-[14px] font-normal leading-[20px] tracking-[-0.07px] text-[#121212] dark:text-foreground hover:underline"
            >
              View all
            </Link>
          </div>

          {/* Activity List Container */}
          <div className="rounded-[15.75px] border border-[#ebebe9] dark:border-border bg-card overflow-hidden divide-y divide-[#ebebe9] dark:divide-border w-full">
            {[
              {
                title: "Transfer to Savings",
                ref: "NIB-2026-901126 · 08 Aug 2026",
                amount: 2000,
                sign: "+",
              },
              {
                title: "Transfer to Savings",
                ref: "NIB-2026-901126 · 08 Aug 2026",
                amount: 2000,
                sign: "+",
              },
              {
                title: "Transfer to Savings",
                ref: "NIB-2026-901126 · 08 Aug 2026",
                amount: 2000,
                sign: "+",
              },
              {
                title: "Transfer to Savings",
                ref: "NIB-2026-901126 · 08 Aug 2026",
                amount: 2000,
                sign: "+",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-col">
                  <p className="text-[14px] font-normal leading-[20px] tracking-[-0.07px] text-[#121212] dark:text-foreground">
                    {item.title}
                  </p>
                  <p className="text-[12px] font-normal leading-[20px] text-[#747472] dark:text-muted-foreground mt-0.5">
                    {item.ref}
                  </p>
                </div>
                <div className="flex items-center gap-7 shrink-0">
                  <span className="text-[14px] font-normal text-[#121212] dark:text-foreground tabular tracking-[-0.07px]">
                    {item.sign}GH₵{" "}
                    <RevealingAmount amount={item.amount} currency="" />
                  </span>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[12px] font-medium">
                    Completed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DIALOGS                                                              */}
      {/* ========================================================================= */}

      {/* 1. Top Up Modal */}
      <Dialog open={activeModal === "top-up"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px]">
              <PlusCircle size={18} className="text-primary" />
              <span>Top up {currentCard.name}</span>
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Transfer funds instantly from your bank account to this card.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecuteTopUp} className="space-y-4 pt-2">
            {/* Current Balance */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
              <span className="text-[12px] text-muted-foreground">Current Card Balance</span>
              <span className="text-[14px] font-medium text-foreground tabular">
                GHS {(currentCard.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Source Account */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Fund from Account</label>
              <select
                value={topUpSourceAccountId}
                onChange={(e) => setTopUpSourceAccountId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {availableAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — GHS {acc.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            </div>

            {/* Top Up Amount */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Top Up Amount (GHS)</label>
              <Input
                type="number"
                min="1"
                step="any"
                placeholder="0.00"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                required
                className="rounded-xl h-11 text-[14px] tabular"
              />
              {/* Preset chips */}
              <div className="flex gap-2 pt-1">
                {[100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(String(amt))}
                    className="px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[12px] font-medium text-foreground transition-colors cursor-pointer"
                  >
                    +GHS {amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveModal(null)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}
                className="cursor-pointer"
              >
                Top Up Now
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Show PIN (Revealed) Modal */}
      <Dialog
        open={activeModal === "pin"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setPinCountdown(15);
          }
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <div className="text-center">
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="text-[17px] text-center">Security PIN</DialogTitle>
              <DialogDescription className="text-[13px] text-center">
                Your 4-digit card PIN for ATM &amp; point-of-sale verification.
              </DialogDescription>
            </DialogHeader>

            <div className="py-5 flex flex-col items-center justify-center gap-3">
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

              <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full font-medium mt-2">
                <Clock size={13} className="animate-pulse" />
                <span>Closing in {pinCountdown}s</span>
              </div>

              <p className="text-[11.5px] text-muted-foreground mt-1">
                This window will close automatically for your security. Do not share your PIN.
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveModal(null);
                  setPinCountdown(15);
                }}
                className="mt-3 w-full cursor-pointer text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Universal Transaction PIN Modal matching Payment Flow */}
      <TransactionPinModal
        open={pinAuthOpen}
        onOpenChange={setPinAuthOpen}
        onSuccess={handlePinAuthSuccess}
      />

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
                type="number"
                min="100"
                max={maxDailyCap}
                value={tempDaily}
                onChange={(e) => setTempDaily(e.target.value)}
                placeholder="5000"
                className="h-10 text-[13.5px] tabular"
              />
              <span className="text-[11px] text-muted-foreground">
                Current spend today: GHS {dailySpent.toLocaleString()} · Maximum cap: GHS {maxDailyCap.toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="monthly-limit-input" className="text-[12.5px] font-medium text-foreground">
                Monthly Limit (GHS)
              </label>
              <Input
                id="monthly-limit-input"
                type="number"
                min="500"
                max={maxMonthlyCap}
                value={tempMonthly}
                onChange={(e) => setTempMonthly(e.target.value)}
                placeholder="15000"
                className="h-10 text-[13.5px] tabular"
              />
              <span className="text-[11px] text-muted-foreground">Maximum available cap: GHS {maxMonthlyCap.toLocaleString()}</span>
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
