"use client";

import { useState } from "react";
import { ArrowRight, Wallet, X } from "lucide-react";
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
      aria-label="Wallet funding nudge"
      className={`relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6 ${
        className ?? ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-4 pr-8 sm:pr-0">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Wallet size={20} strokeWidth={1.9} aria-hidden="true" />
        </div>

        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-[15.5px] tracking-[-0.01em] text-foreground sm:text-[16.5px]">
            Fund your wallet to get started
          </h3>
          <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-[13.5px]">
            Deposit via Mobile Money or card to activate transfers and payments.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          onClick={onFundClick}
          className="h-11 flex-1 cursor-pointer px-5 text-[14px] active:scale-[0.97] transition-transform duration-150 sm:flex-none"
        >
          <span>Fund Wallet</span>
          <ArrowRight size={15} strokeWidth={1.8} className="ml-1.5" />
        </Button>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="absolute right-3.5 top-3.5 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:static"
        >
          <X size={15} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
