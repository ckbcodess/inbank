"use client";

/**
 * The other half of `PaymentSuccessScreen`: the same layout, badge size, spring entrance, drawn mark, pulse rings and
 * rising text, with an X in a red circle. The badge then shakes hard before it rests. It says what did not happen and
 * what is safe ("nothing was taken"), offers Try Again, a way out, and Report Issue, which only appears here: a payment
 * that went through has nothing to report.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquareWarning } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { RoundAction } from "@/components/ui/round-action";
import { ReportIssueDialog } from "@/components/transactions/ReportIssueDialog";
import { haptic } from "@/lib/haptics";

const EASE = [0.22, 1, 0.36, 1] as const;
/** Out and back, each swing smaller than the last, then still. */
const SHAKE = [0, -16, 16, -14, 14, -9, 9, -4, 4, 0];
const SHAKE_DELAY = 0.34;

export function PaymentFailedScreen({
  title,
  message,
  onRetry,
  onLeave,
  leaveLabel,
  retryLabel = "Try again",
  reference,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  onLeave: () => void;
  leaveLabel: string;
  retryLabel?: string;
  /** The transaction it belongs to, when there is one. */
  reference?: string;
}) {
  const [reporting, setReporting] = useState(false);

  // The buzz lands with the shake, not before the badge has appeared.
  useEffect(() => {
    const t = window.setTimeout(() => haptic("error"), SHAKE_DELAY * 1000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="relative mx-auto flex min-h-[75vh] w-full max-w-[500px] flex-col items-center justify-center gap-6 px-3 py-10 text-center">
      <div className="relative flex w-full flex-col items-center gap-3 text-center">
        <div className="relative my-1 flex size-[112px] select-none items-center justify-center sm:size-[116px]">
          <motion.div
            initial={{ scale: 0.85, opacity: 0.45 }}
            animate={{ scale: 1.55, opacity: 0 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 rounded-full border border-destructive/40"
          />
          <motion.div
            initial={{ scale: 0.85, opacity: 0.25 }}
            animate={{ scale: 2.0, opacity: 0 }}
            transition={{ duration: 1.1, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 rounded-full border border-destructive/20"
          />
          {/* The shake moves the whole badge; the spring entrance is on the inside so the two never fight. */}
          <motion.div animate={{ x: SHAKE }} transition={{ duration: 0.7, delay: SHAKE_DELAY, ease: "easeInOut" }} className="relative z-10">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 22, mass: 0.85 }}
              className="flex size-[88px] items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="overflow-visible">
                <motion.path
                  d="M15 15L33 33"
                  stroke="currentColor"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ pathLength: { duration: 0.2, delay: 0.08, ease: "easeOut" }, opacity: { duration: 0.08, delay: 0.08 } }}
                />
                <motion.path
                  d="M33 15L15 33"
                  stroke="currentColor"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ pathLength: { duration: 0.2, delay: 0.2, ease: "easeOut" }, opacity: { duration: 0.08, delay: 0.2 } }}
                />
              </svg>
            </motion.div>
          </motion.div>
        </div>

        <div className="flex w-full max-w-[460px] flex-col items-center gap-2 text-center">
          <motion.h1
            role="alert"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.44, delay: 0.15, ease: EASE }}
            className="text-[26px] font-medium leading-[34px] tracking-[var(--ls-heading)] text-foreground sm:text-[30px] sm:leading-[38px]"
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: EASE }}
            className="max-w-[440px] text-[15px] leading-[23px] text-muted-foreground sm:text-[16px] sm:leading-[25px]"
          >
            {message}
          </motion.p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35, ease: EASE }}
        className="mt-2 flex w-full max-w-[460px] justify-center"
      >
        <RoundAction
          icon={MessageSquareWarning}
          label="Report Issue"
          onClick={() => setReporting(true)}
          popup
          chipClassName="bg-action-chip text-foreground group-hover:bg-action-chip-hover"
          labelClassName="text-[12px] leading-[17px]"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4, ease: EASE }}
        className="flex w-full max-w-[460px] items-stretch gap-3 pt-2"
      >
        <Button size="xl" type="button" variant="outline" className="flex-1" onClick={onLeave}>
          {leaveLabel}
        </Button>
        <Button size="xl" type="button" className="flex-1" onClick={onRetry}>
          {retryLabel}
        </Button>
      </motion.div>

      <ReportIssueDialog open={reporting} onOpenChange={setReporting} reference={reference} />
    </div>
  );
}
