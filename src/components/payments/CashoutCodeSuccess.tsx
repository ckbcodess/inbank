"use client";

/**
 * The success page for a cardless withdrawal, built 1:1 from the Figma frame (Showcase, node
 * 6050:1179): the ticket, "Code generated!", one line about expiry, Share Code and Done. The
 * code is made once when the withdrawal is confirmed and passed in, so it never changes here.
 */

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CashoutTicketArrival } from "./CashoutTicketArrival";

export function CashoutCodeSuccess({
  code,
  amount,
  recipientPhone,
  onDone,
}: {
  code: string;
  /** Already formatted, without the currency (e.g. "200.00"). */
  amount: string;
  /** Kept for callers that pass it; the ticket doesn't show it. */
  expiresAt?: string;
  recipientName?: string;
  recipientPhone: string;
  onDone: () => void;
}) {
  // Bumping the key remounts the ticket, so the curl plays again (dev only, see the Replay button)
  const [run, setRun] = useState(0);

  async function share() {
    const message = `GCB ATM cash-out code ${code} for GHS ${amount}. Enter it at any GCB ATM. It expires 24 hours after it was created.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "GCB ATM code", text: message });
      } else {
        await navigator.clipboard?.writeText(message);
        toast.success("Copied. Paste it into a message.");
      }
    } catch {
      // Closing the share sheet isn't an error.
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-[440px] flex-col items-center gap-12 py-9">
      {/* Replay control: dev/testing only, stripped from production builds, same as the Send & Pay success screen */}
      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          aria-label="Replay animation"
          className="absolute right-1 top-1 z-30 flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-[12px] text-muted-foreground shadow-xs backdrop-blur transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer"
        >
          <RotateCcw size={13} strokeWidth={1.8} />
          <span>Replay</span>
        </button>
      )}

      {/* The ticket slides in and swings back a little as it lands */}
      <CashoutTicketArrival key={run} code={code} amount={amount} recipientPhone={recipientPhone} />

      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-[26px] leading-none text-foreground">Code generated!</p>
        <p className="max-w-[340px] text-balance text-[16px] leading-5 tracking-[-0.18px] text-muted-foreground sm:max-w-none sm:text-[18px]">
          This code expires after 24 hrs of creation
        </p>
      </div>

      {/* Secondary first, primary last */}
      <div className="flex items-start justify-center gap-[10.5px]">
        <Button type="button" variant="outline" onClick={share} className="px-[21px]">
          Share Code
        </Button>
        <Button type="button" onClick={onDone} className="px-7">
          Done
        </Button>
      </div>
    </div>
  );
}
