"use client";

import { useState } from "react";
import {
  Calendar,
  Check,
  FileText,
  MessageSquare,
  Receipt,
  RotateCcw,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SuccessActionCard {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  active?: boolean;
}

export interface PaymentSuccessScreenProps {
  /** Title of the success confirmation (e.g. "Payment submitted", "Group Created Successfully") */
  title: string;
  /** Explanatory message below the title */
  message: string;
  /** Structured rows for the receipt breakdown */
  receiptRows?: Array<[string, React.ReactNode]>;
  /** Callback when user clicks secondary button (e.g. "Send another") */
  onSecondaryAction?: () => void;
  /** Label for secondary button */
  secondaryActionLabel?: string;
  /** Callback when user clicks primary button (e.g. "Back to Overview") */
  onPrimaryAction: () => void;
  /** Label for primary button */
  primaryActionLabel?: string;
  /** Whether to display the "Save as beneficiary?" toggle row */
  showSaveBeneficiary?: boolean;
  /** Custom label for the toggle (defaults to "Save as beneficiary?") */
  saveBeneficiaryLabel?: string;
  /** Initial state of the toggle */
  initialSaveBeneficiary?: boolean;
  /** Callback on toggle change */
  onSaveBeneficiaryChange?: (saved: boolean) => void;
  /** Custom action cards (defaults to Share Feedback, Schedule Payment, View Receipt) */
  customActionCards?: SuccessActionCard[];
  /** Custom schedule handler if standard schedule card is used */
  onSchedulePayment?: () => void;
}

export function PaymentSuccessScreen({
  title,
  message,
  receiptRows = [],
  onSecondaryAction,
  secondaryActionLabel = "Send another",
  onPrimaryAction,
  primaryActionLabel = "Back to Overview",
  showSaveBeneficiary = true,
  saveBeneficiaryLabel = "Save as beneficiary?",
  initialSaveBeneficiary = false,
  onSaveBeneficiaryChange,
  customActionCards,
  onSchedulePayment,
}: PaymentSuccessScreenProps) {
  const [showReceipt, setShowReceipt] = useState(false);
  const [saveBeneficiary, setSaveBeneficiary] = useState(initialSaveBeneficiary);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleToggleBeneficiary = () => {
    const next = !saveBeneficiary;
    setSaveBeneficiary(next);
    onSaveBeneficiaryChange?.(next);
  };

  const handleFeedbackClick = () => {
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 3500);
  };

  // Default Action Cards if none provided: Share Feedback, Schedule Payment, View Receipt
  const defaultActionCards: SuccessActionCard[] = [
    {
      id: "feedback",
      label: "Share Feedback",
      icon: MessageSquare,
      onClick: handleFeedbackClick,
    },
    {
      id: "schedule",
      label: "Schedule Payment",
      icon: Calendar,
      onClick: onSchedulePayment,
    },
    {
      id: "receipt",
      label: showReceipt ? "Hide Receipt" : "View Receipt",
      icon: Receipt,
      active: showReceipt,
      onClick: () => setShowReceipt((prev) => !prev),
    },
  ];

  const actionCards = (customActionCards || defaultActionCards).map((card) => {
    if (card.id === "receipt") {
      return {
        ...card,
        label: card.label || (showReceipt ? "Hide Receipt" : "View Receipt"),
        active: card.active ?? showReceipt,
        onClick: card.onClick || (() => setShowReceipt((prev) => !prev)),
      };
    }
    if (card.id === "feedback" && !card.onClick) {
      return {
        ...card,
        onClick: handleFeedbackClick,
      };
    }
    return card;
  });

  return (
    <div className="mx-auto flex w-full max-w-[500px] flex-col items-center justify-center gap-7 py-8 px-4 animate-in fade-in duration-200">
      {/* ── 1. Circular Success Checkmark Badge (1:1 Figma Node 1367:33678) ── */}
      <div className="flex flex-col items-center gap-5 text-center w-full">
        <div className="flex size-[68px] items-center justify-center rounded-full bg-[#4cd964] text-white shadow-sm ring-4 ring-[#4cd964]/10">
          <Check size={32} strokeWidth={3} />
        </div>

        {/* ── 2. Title & Subtitle ── */}
        <div className="flex flex-col gap-1.5 items-center w-full max-w-[400px]">
          <h1 className="text-[24px] font-normal leading-[34px] tracking-[-0.2px] text-foreground text-center">
            {title}
          </h1>
          <p className="text-[14px] leading-[20px] text-[#737373] dark:text-muted-foreground text-center">
            {message}
          </p>
        </div>
      </div>

      {/* ── Feedback Notification ── */}
      {feedbackSent && (
        <div className="w-full rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-center py-2.5 px-3 text-[13.5px] animate-in fade-in slide-in-from-top-1">
          Thank you! Your feedback helps us improve GCB Internet Banking.
        </div>
      )}

      {/* ── 3. Action Cards Row (1:1 Figma Node 1367:33684) ── */}
      {actionCards.length > 0 && (
        <div className={cn("grid gap-3 w-full", actionCards.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={card.onClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-[12px] border border-border bg-card p-4 hover:bg-muted/50 active:scale-[0.98] transition-all cursor-pointer group text-center shadow-xs",
                  card.active && "border-primary ring-1 ring-primary/40 bg-muted/25"
                )}
              >
                <Icon size={20} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                <span className="text-[13.5px] font-normal text-foreground group-hover:text-foreground">
                  {card.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── 4. Save As Beneficiary Toggle Row (1:1 Figma Node 1367:33700) ── */}
      {showSaveBeneficiary && (
        <div className="flex items-center justify-between px-4 py-3.5 rounded-[12px] border border-border bg-card w-full shadow-xs">
          <span className="text-[14px] font-normal text-foreground">{saveBeneficiaryLabel}</span>
          <button
            type="button"
            role="switch"
            aria-checked={saveBeneficiary}
            onClick={handleToggleBeneficiary}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
              saveBeneficiary ? "bg-[#12B76A]" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                saveBeneficiary ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
      )}

      {/* ── 5. Expandable Full Receipt Section (Toggled by "View Receipt" Action Card) ── */}
      {showReceipt && receiptRows.length > 0 && (
        <div className="flex flex-col w-full divide-y divide-border rounded-2xl border border-border bg-card p-5 text-[13.5px] animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
          <div className="pb-3 flex items-center justify-between">
            <span className="font-semibold text-foreground text-[14px]">Transaction Receipt</span>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
              className="text-[12.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText size={14} />
              Print / Save PDF
            </button>
          </div>
          {receiptRows.map(([label, val]) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground tabular-nums numorainput text-right">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── 6. Two Bottom Action Buttons (1:1 Figma Node 1367:33726) ── */}
      <div className="flex items-center gap-4 w-full pt-3">
        {onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="flex-1 rounded-[8px] border border-border bg-card px-5 py-3 text-[14px] font-medium text-foreground hover:bg-muted/60 active:scale-[0.99] transition-all cursor-pointer text-center shadow-xs"
          >
            {secondaryActionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onPrimaryAction}
          className="flex-1 rounded-[8px] bg-[#f9c632] hover:bg-[#eab308] text-[#451a03] px-5 py-3 text-[14px] font-medium active:scale-[0.99] transition-all cursor-pointer text-center shadow-xs"
        >
          {primaryActionLabel}
        </button>
      </div>
    </div>
  );
}
