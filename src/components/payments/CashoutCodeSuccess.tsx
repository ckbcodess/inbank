"use client";

/**
 * The success page for a cardless withdrawal. It opens like the Send & Pay success: the GCB eagle and
 * "Code generated!" on their own, then the eagle leaves, the ticket drops in above the title, and once it
 * has settled the expiry line and the buttons appear. The code is made once when the withdrawal is
 * confirmed and passed in, so it never changes here.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CashoutTicketArrival } from "./CashoutTicketArrival";
import { playDelightChime } from "./PaymentSuccessScreen";
import { GcbEagleEmblem } from "@/components/brand/GcbEagleEmblem";

/** How far above its final place the title waits during the eagle moment: just under the eagle, in the ticket's space (px). */
const TITLE_LIFT = -150;

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
  // Bumping `run` plays the whole entrance again (dev only, see the Replay button)
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"eagle" | "ticket">("eagle");
  const [revealRest, setRevealRest] = useState(false);

  useEffect(() => {
    setPhase("eagle");
    setRevealRest(false);
    // The eagle holds the moment, then the ticket takes over; the rest waits for the ticket to settle
    const toTicket = window.setTimeout(() => {
      setPhase("ticket");
      playDelightChime();
    }, 1250);
    const showRest = window.setTimeout(() => setRevealRest(true), 1250 + 1500);
    return () => {
      window.clearTimeout(toTicket);
      window.clearTimeout(showRest);
    };
  }, [run]);

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
    <div className="relative mx-auto flex w-full max-w-[440px] flex-col items-center gap-6 py-8">
      {/* Replay control: dev/testing only, stripped from production builds, same as the Send & Pay success screen */}
      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          aria-label="Replay animation"
          className="absolute right-1 top-1 z-30 flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-2 py-2 text-[12px] text-muted-foreground shadow-xs backdrop-blur transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer"
        >
          <RotateCcw size={13} strokeWidth={1.8} />
          <span>Replay</span>
        </button>
      )}

      {/* Everything has its final place from the start, so nothing reflows: the eagle sits in the ticket's space and
          the ticket replaces it there. */}
      <div className="relative flex h-[396px] w-full items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === "eagle" ? (
            <motion.div
              key={`eagle-${run}`}
              initial={{ scale: 0.5, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.18, opacity: 0, y: -4, filter: "blur(3px)", transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              title="GCB Bank"
              className="flex size-[130px] select-none items-center justify-center sm:size-[140px]"
            >
              <GcbEagleEmblem className="h-auto w-[104px] sm:w-[114px]" />
            </motion.div>
          ) : (
            <CashoutTicketArrival key={`ticket-${run}`} code={code} amount={amount} recipientPhone={recipientPhone} />
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        {/* Fades in beside the eagle (no movement), then slides down into its place under the ticket (a transform, so it stays smooth) */}
        <motion.p
          key={`title-${run}`}
          initial={{ opacity: 0, y: TITLE_LIFT }}
          animate={phase === "eagle" ? { opacity: 1, y: TITLE_LIFT } : { opacity: 1, y: 0 }}
          transition={
            phase === "eagle"
              ? { duration: 0.44, delay: 0.15, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
          }
          className="text-[26px] leading-none text-foreground"
        >
          Code generated!
        </motion.p>
        {/* Held in place (invisible) until the ticket has landed, so it never pushes anything */}
        <motion.p
          initial={false}
          animate={{ opacity: revealRest ? 1 : 0, y: revealRest ? 0 : 8 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "max-w-[340px] text-balance text-[16px] leading-5 tracking-[-0.18px] text-muted-foreground sm:max-w-none sm:text-[18px]",
            !revealRest && "invisible",
          )}
        >
          This code expires after 24 hrs of creation
        </motion.p>
      </div>

      {/* Secondary first, primary last */}
      <motion.div
        initial={false}
        animate={{ opacity: revealRest ? 1 : 0, y: revealRest ? 0 : 8 }}
        transition={{ duration: 0.4, delay: revealRest ? 0.08 : 0, ease: [0.22, 1, 0.36, 1] }}
        className={cn("flex items-start justify-center gap-[10.5px]", !revealRest && "invisible")}
      >
        <Button type="button" variant="outline" onClick={share} className="px-[21px]">
          Share Code
        </Button>
        <Button type="button" onClick={onDone} className="px-6">
          Done
        </Button>
      </motion.div>
    </div>
  );
}
