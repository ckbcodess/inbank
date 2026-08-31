"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Check, Lock, ShieldAlert, RefreshCw } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, type PaymentCard } from "@/lib/mock-data";

export interface VirtualCardProps {
  card?: Partial<PaymentCard>;
  cards?: PaymentCard[];
  initialIndex?: number;
  onAdjustLimit?: (cardId: string, newLimit: number) => void;
  className?: string;
  showTitleHeader?: boolean;
  onClose?: () => void;
}

const DEFAULT_CARD: Partial<PaymentCard> = {
  id: "card-v-1",
  name: "Savings Card",
  balance: 16058.94,
  currency: "USD",
  maskedNumber: "•••• 1234",
  fullNumber: "4532 8901 2345 1234",
  expiry: "06/27",
  cvv: "842",
  spendLimit: 12000.0,
  status: "Active",
  scheme: "Mastercard",
  type: "Virtual",
};

export function VirtualCardView({
  card,
  cards,
  initialIndex = 0,
  onAdjustLimit,
  className = "",
  showTitleHeader = true,
  onClose,
}: VirtualCardProps) {
  const cardList = cards && cards.length > 0 ? cards : [card ?? DEFAULT_CARD];
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [unhidden, setUnhidden] = useState(false);
  const [adjustingLimit, setAdjustingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Security channel states
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [atmEnabled, setAtmEnabled] = useState(true);
  const [intlEnabled, setIntlEnabled] = useState(false);

  const activeCard = cardList[currentIndex % cardList.length] ?? card ?? DEFAULT_CARD;
  const [isFrozen, setIsFrozen] = useState(activeCard.status === "Blocked");

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + cardList.length) % cardList.length);
    setUnhidden(false);
    setAdjustingLimit(false);
    setShowMoreMenu(false);
    setShowSecurityModal(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % cardList.length);
    setUnhidden(false);
    setAdjustingLimit(false);
    setShowMoreMenu(false);
    setShowSecurityModal(false);
  };

  const handleToggleUnhide = () => {
    setUnhidden((prev) => !prev);
  };

  const handleStartAdjustLimit = () => {
    setLimitInput(String(activeCard.spendLimit ?? 12000));
    setAdjustingLimit((prev) => !prev);
    setShowMoreMenu(false);
  };

  const handleSaveLimit = () => {
    const val = Number(limitInput.replace(/,/g, ""));
    if (!Number.isNaN(val) && val >= 0) {
      if (onAdjustLimit && activeCard.id) {
        onAdjustLimit(activeCard.id, val);
      }
      activeCard.spendLimit = val;
      setNotice(`Spending limit updated to ${formatMoney(val, activeCard.currency ?? "USD")}`);
      setTimeout(() => setNotice(null), 3000);
    }
    setAdjustingLimit(false);
  };

  const handleToggleFreeze = () => {
    const next = !isFrozen;
    setIsFrozen(next);
    activeCard.status = next ? "Blocked" : "Active";
    setNotice(next ? "Card frozen successfully." : "Card unfrozen and active.");
    setTimeout(() => setNotice(null), 3000);
    setShowMoreMenu(false);
  };

  return (
    <div className={`w-full max-w-[440px] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      {showTitleHeader && (
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <h2 className="text-[17px] font-medium text-slate-900 dark:text-white tracking-tight">
            Virtual Card
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      {/* Card Graphic Container */}
      <div className={`relative mt-4 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-slate-50/90 via-white to-slate-100/70 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-5 shadow-xs select-none ${isFrozen ? "opacity-75 saturate-50" : ""}`}>
        {/* Abstract Line Artwork in Top Right */}
        <svg
          className="absolute right-0 top-0 h-full w-52 text-slate-200/70 dark:text-slate-800/50 pointer-events-none"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M60 0 C120 40, 160 100, 200 130" stroke="currentColor" strokeWidth="1.2" />
          <path d="M100 0 C150 50, 175 120, 200 190" stroke="currentColor" strokeWidth="1.2" />
          <path d="M140 0 C175 40, 190 75, 200 95" stroke="currentColor" strokeWidth="1.2" />
        </svg>

        {/* Top Row: Blue Icon, Contactless & Active Badge on Left; Mastercard on Right */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {/* Blue Circular Icon */}
            <div className="flex size-9 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-xs shrink-0">
              <svg className="size-5" viewBox="0 0 24 24" fill="none">
                <path d="M7 15L13 7H9L3 15H7Z" fill="currentColor" />
                <path d="M15 17L21 9H17L11 17H15Z" fill="currentColor" opacity="0.85" />
              </svg>
            </div>

            {/* Contactless Signal */}
            <div className="flex items-center text-slate-400 dark:text-slate-500">
              <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 18a6 6 0 0 0 0-12" />
                <path d="M15 20a9 9 0 0 0 0-16" />
                <path d="M9 16a3 3 0 0 0 0-6" />
              </svg>
            </div>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1 text-[12px] font-medium shadow-2xs ${
              isFrozen
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                : "border-slate-200/90 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200"
            }`}>
              <span className={`flex size-3.5 items-center justify-center rounded-full text-white text-[8px] font-medium ${isFrozen ? "bg-amber-500" : "bg-[#22c55e]"}`}>
                {isFrozen ? "!" : "✓"}
              </span>
              <span>{isFrozen ? "Frozen" : "Active"}</span>
            </div>
          </div>

          {/* Network Logo: Mastercard */}
          <div className="flex items-center -space-x-2">
            <div className="size-6.5 rounded-full bg-[#EB001B]" />
            <div className="size-6.5 rounded-full bg-[#FF5F00] opacity-90" />
          </div>
        </div>

        {/* Middle & Bottom Content of Card Graphic */}
        <div className="relative z-10 mt-8 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[13.5px] font-normal text-slate-500 dark:text-slate-400">
              {activeCard.name ?? "Savings Card"}
            </span>
            <span className="mt-0.5 text-[28px] font-medium tracking-tight text-slate-900 dark:text-white tabular">
              {formatMoney(activeCard.balance ?? 16058.94, activeCard.currency ?? "USD")}
            </span>
          </div>

          {/* Pagination / Carousel controls */}
          {cardList.length > 1 && (
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={handlePrev}
                className="px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-r border-slate-200 dark:border-slate-700 cursor-pointer"
                aria-label="Previous card"
              >
                <ChevronLeft size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Next card"
              >
                <ChevronRight size={14} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notice Toast */}
      {notice && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-[12px] text-emerald-700 dark:text-emerald-300">
          <Check size={14} />
          <span>{notice}</span>
        </div>
      )}

      {/* Card Details Key-Value List */}
      <div className="mt-5 space-y-3.5 text-[13.5px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 font-normal">Card Number</span>
          <span className="font-medium text-slate-900 dark:text-slate-100 tabular tracking-wide">
            {unhidden
              ? activeCard.fullNumber ?? `4532 8901 2345 ${activeCard.maskedNumber?.slice(-4) ?? "1234"}`
              : `• • • • ${activeCard.maskedNumber?.slice(-4) ?? "1234"}`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 font-normal">Expiry Date</span>
          <span className="font-medium text-slate-900 dark:text-slate-100 tabular">
            {activeCard.expiry ?? "06/27"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 font-normal">CVC</span>
          <span className="font-medium text-slate-900 dark:text-slate-100 tabular tracking-widest">
            {unhidden ? activeCard.cvv ?? "842" : "• • •"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 font-normal">Spending Limit (Monthly)</span>
          <span className="font-medium text-slate-900 dark:text-slate-100 tabular">
            {formatMoney(activeCard.spendLimit ?? 12000, activeCard.currency ?? "USD")}
          </span>
        </div>
      </div>

      {/* Adjust Limit Form overlay when active */}
      {adjustingLimit && (
        <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3.5">
          <label htmlFor="card-view-limit-input" className="text-[12.5px] font-medium text-slate-700 dark:text-slate-300">
            New Monthly Limit ({activeCard.currency ?? "USD"})
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="card-view-limit-input"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              placeholder="12000.00"
              className="tabular h-9 text-[13px] bg-white dark:bg-slate-900"
            />
            <Button size="sm" onClick={handleSaveLimit} className="h-9 px-3 text-[12.5px]">
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdjustingLimit(false)} className="h-9 px-2 text-[12.5px]">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Security Channels Panel */}
      {showSecurityModal && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3.5 text-[12.5px]">
          <div className="flex items-center justify-between font-medium text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-200 dark:border-slate-800">
            <span>Card Security Channels</span>
            <button type="button" onClick={() => setShowSecurityModal(false)} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
          <label className="flex items-center justify-between cursor-pointer">
            <span>Online Checkout</span>
            <input type="checkbox" checked={onlineEnabled} onChange={(e) => setOnlineEnabled(e.target.checked)} className="size-4 rounded" />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span>ATM Cash Withdrawal</span>
            <input type="checkbox" checked={atmEnabled} onChange={(e) => setAtmEnabled(e.target.checked)} className="size-4 rounded" />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span>International Usage</span>
            <input type="checkbox" checked={intlEnabled} onChange={(e) => setIntlEnabled(e.target.checked)} className="size-4 rounded" />
          </label>
        </div>
      )}

      {/* More Options Dropdown Panel */}
      {showMoreMenu && (
        <div className="mt-4 flex flex-col divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 text-[13px] overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={handleToggleFreeze}
            className="flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <Lock size={15} className="text-slate-400" />
            <span>{isFrozen ? "Unfreeze Card" : "Freeze / Lock Card"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSecurityModal((prev) => !prev);
              setShowMoreMenu(false);
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <ShieldAlert size={15} className="text-slate-400" />
            <span>Security Channels</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNotice("Replacement request submitted.");
              setTimeout(() => setNotice(null), 3000);
              setShowMoreMenu(false);
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-rose-600 dark:text-rose-400 cursor-pointer"
          >
            <RefreshCw size={15} className="text-rose-500" />
            <span>Request Replacement</span>
          </button>
        </div>
      )}

      {/* Bottom Actions Row */}
      <div className="mt-6 grid grid-cols-3 gap-2.5">
        <Button
          variant="outline"
          onClick={handleToggleUnhide}
          className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13.5px] font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-2xs cursor-pointer"
        >
          {unhidden ? "Hide" : "Unhide"}
        </Button>

        <Button
          variant="outline"
          onClick={handleStartAdjustLimit}
          className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13.5px] font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-2xs cursor-pointer"
        >
          Adjust Limit
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            setShowMoreMenu((prev) => !prev);
            setAdjustingLimit(false);
          }}
          className="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13.5px] font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-2xs cursor-pointer"
        >
          More
        </Button>
      </div>
    </div>
  );
}

export function VirtualCardModal({
  open,
  onOpenChange,
  card,
  cards,
  initialIndex = 0,
  onAdjustLimit,
}: VirtualCardProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="p-0 border-none bg-transparent shadow-none max-w-fit">
        <VirtualCardView
          card={card}
          cards={cards}
          initialIndex={initialIndex}
          onAdjustLimit={onAdjustLimit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
