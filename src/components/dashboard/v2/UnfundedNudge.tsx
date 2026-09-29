"use client";

import { useState } from "react";
import { ArrowRight, Smartphone, Wallet, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  peekUnfundedNudgeDismissed,
  setUnfundedNudgeDismissed,
} from "@/lib/device-trust";

interface UnfundedNudgeProps {
  onFundClick: () => void;
  className?: string;
}

export function UnfundedNudge({ onFundClick, className }: UnfundedNudgeProps) {
  const [dismissed, setDismissed] = useState(peekUnfundedNudgeDismissed);

  if (dismissed) return null;

  function handleDismiss() {
    setUnfundedNudgeDismissed(true);
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Account activation nudge"
      className={`relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${
        className ?? ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-foreground sm:size-12">
          <Wallet size={22} strokeWidth={1.8} />
        </div>

        <div className="flex flex-col gap-1 pr-6 sm:pr-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] tracking-[-0.01em] text-foreground sm:text-[16px]">
              Activate your account with an initial deposit
            </h3>
            <span className="hidden items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground sm:inline-flex">
              <Zap size={11} strokeWidth={2} />
              <span>Instant</span>
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground max-w-[560px]">
            Your virtual account and Visa card are ready. Add funds via Mobile Money or a bank card to unlock instant transfers, payments, and online shopping.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
        <button
          type="button"
          onClick={handleDismiss}
          className="cursor-pointer text-[13px] text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4 px-2 py-1.5"
        >
          Remind me later
        </button>

        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onFundClick}
          className="h-10 px-4 text-[13.5px] cursor-pointer"
        >
          <span>Fund Account</span>
          <ArrowRight size={15} strokeWidth={1.8} className="ml-1.5" />
        </Button>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="absolute right-3.5 top-3.5 flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer sm:hidden"
      >
        <X size={15} strokeWidth={1.8} />
      </button>
    </div>
  );
}
