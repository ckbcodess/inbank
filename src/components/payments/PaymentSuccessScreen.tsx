"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ReceiptText,
  Repeat,
  RotateCcw,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { GcbEagleEmblem } from "@/components/brand/GcbEagleEmblem";
import { RoundAction } from "@/components/ui/round-action";
import { Switch } from "@/components/ui/switch";
import { DURATION, EASE } from "@/lib/motion";
import { TransactionDetailSheet } from "@/components/transactions/TransactionDetailSheet";
import { findTransaction } from "@/lib/mock-data";

export interface SuccessActionCard {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  onClick?: () => void;
  active?: boolean;
}

/** The short name under each round action; a card the screen doesn't know keeps its own label. */
const ACTION_LABEL: Record<string, string> = {
  feedback: "Feedback",
  schedule: "Schedule",
  receipt: "Receipt",
  download: "Receipt",
};

type FeedbackRating = "great" | "okay" | "bad";

const FEEDBACK_OPTIONS: Array<{
  id: FeedbackRating;
  label: string;
  /** What to ask once they have answered, so the follow-up fits how it went. */
  prompt: string;
  emoji: string;
}> = [
  { id: "great", label: "Great", prompt: "What worked well?", emoji: "😊" },
  { id: "okay", label: "Okay", prompt: "What could be better?", emoji: "😐" },
  { id: "bad", label: "Not good", prompt: "What went wrong?", emoji: "☹️" },
];

const MESSAGE_AMOUNT = "(?:GHS|GH₵|USD|EUR|GBP|NGN|CNY|CAD|AUD|JPY|CHF|ZAR|XOF)\\s?\\d[\\d,]*(?:\\.\\d+)?";

/** Amounts, and the payee when we know them, read at full strength; the rest of the sentence stays quiet. */
function emphasise(message: string, name?: string): React.ReactNode {
  const parts = [MESSAGE_AMOUNT];
  const payee = name?.trim();
  if (payee && message.includes(payee)) parts.push(payee.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return message.split(new RegExp(`(${parts.join("|")})`, "g")).map((chunk, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-medium text-foreground">
        {chunk}
      </span>
    ) : (
      chunk
    ),
  );
}

/**
 * Normalizes confirmation titles to strict Sentence Case with an exclamation mark.
 * Preserves banking acronyms (GCB, PAPSS, QR, ATM, ECG, PIN, USSD).
 */
export function formatSuccessTitle(rawTitle: string): string {
  if (!rawTitle) return "Transfer successful!";
  const trimmed = rawTitle.trim().replace(/[!.]+$/, "");
  const words = trimmed.split(/\s+/);
  const acronyms = new Set(["GCB", "PAPSS", "QR", "ATM", "ECG", "PIN", "USSD", "ID", "GIP", "ACH", "RTGS"]);

  const normalized = words.map((word, idx) => {
    const upper = word.toUpperCase();
    if (acronyms.has(upper)) return upper;
    if (idx === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return word.toLowerCase();
  });

  return `${normalized.join(" ")}!`;
}

export interface PaymentSuccessScreenProps {
  /** Title of the success confirmation (e.g. "Payment submitted", "Group Created Successfully") */
  title: string;
  /** Explanatory message below the title */
  message: string;
  /** Transaction ID or Reference shown in the receipt sheet when the customer taps View Receipt */
  transactionId?: string;
  /** Structured rows for the transaction details breakdown (retained for backward compatibility) */
  receiptRows?: Array<[string, React.ReactNode]>;
  /** Callback when user clicks secondary button (e.g. "Send another") */
  onSecondaryAction?: () => void;
  /** Label for secondary button */
  secondaryActionLabel?: string;
  /** Callback when user clicks primary button (e.g. "Back to Overview") */
  onPrimaryAction: () => void;
  /** Label for primary button */
  primaryActionLabel?: string;
  /** Whether to display the "Save as Beneficiary?" toggle row */
  showSaveBeneficiary?: boolean;
  /** Custom label for the toggle (defaults to "Save as Beneficiary?") */
  saveBeneficiaryLabel?: string;
  /** Initial state of the toggle */
  initialSaveBeneficiary?: boolean;
  /** Callback on toggle change */
  onSaveBeneficiaryChange?: (saved: boolean) => void;
  /** Custom action cards */
  customActionCards?: SuccessActionCard[];
  /** Custom schedule handler if standard schedule card is used */
  onSchedulePayment?: () => void;
  /** Leave out the Schedule Payment card (e.g. the payment already is a scheduled payment). */
  hideSchedule?: boolean;
  /** Name of the beneficiary to display in the toast notification */
  beneficiaryName?: string;
  /** Rail or category name for the beneficiary toast (e.g. "Send to Wallet", "Bank Transfer") */
  beneficiaryRail?: string;
}


// Subtle pleasant Web Audio confirmation chime
export function playDelightChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.05, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Upward cheerful major chord (D5 -> F#5 -> A5)
    playTone(587.33, now, 0.28);
    playTone(739.99, now + 0.06, 0.35);
    playTone(880.00, now + 0.12, 0.48);
  } catch {
    // Audio contexts may be blocked by browser policy without user gesture; fail silently
  }
}

export function PaymentSuccessScreen({
  title,
  message,
  transactionId,
  receiptRows = [],
  onSecondaryAction,
  secondaryActionLabel = "Send another",
  onPrimaryAction,
  primaryActionLabel = "Back to Overview",
  showSaveBeneficiary = true,
  hideSchedule = false,
  saveBeneficiaryLabel = "Save as Beneficiary?",
  initialSaveBeneficiary = false,
  onSaveBeneficiaryChange,
  customActionCards,
  onSchedulePayment,
  beneficiaryName,
  beneficiaryRail,
}: PaymentSuccessScreenProps) {
  const router = useRouter();
  const [saveBeneficiary, setSaveBeneficiary] = useState(initialSaveBeneficiary);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [burstKey, setBurstKey] = useState(0);

  const normalizedTitle = useMemo(() => formatSuccessTitle(title), [title]);

  // Animation Phase: "eagle" (initial brand moment) -> "checked" (final settled green check)
  const [badgePhase, setBadgePhase] = useState<"eagle" | "checked">("eagle");
  // Gate: the rest of the content (subtitle, toggle, cards, buttons) stays hidden
  // until the badge sequence has settled, so the entrance reads as one deliberate
  // beat rather than everything arriving at once. The header is intentionally not
  // gated — it rises in while the badge is still animating.
  const [revealRest, setRevealRest] = useState(false);

  // Determine effective beneficiary name and rail for notification
  const effectiveBenName = useMemo(() => {
    if (beneficiaryName && beneficiaryName.trim()) {
      return beneficiaryName.trim();
    }
    // Try finding in receiptRows
    const nameRow = receiptRows?.find(([k]) => {
      const lk = k.toLowerCase();
      return (
        lk.includes("beneficiary") ||
        lk.includes("recipient") ||
        lk.includes("account name") ||
        lk.includes("wallet name") ||
        lk.includes("group name") ||
        lk.includes("to account")
      );
    });
    if (nameRow && typeof nameRow[1] === "string" && nameRow[1].trim()) {
      const raw = nameRow[1].trim();
      const cleaned = raw.replace(/^Yes\s*—\s*/i, "").replace(/\s*\(∗∗.*?\)$/, "").trim();
      if (cleaned) return cleaned;
    }
    // Try matching "to <Name>" in message
    const match = message.match(/\bto\s+([A-Z][a-zA-Z0-9\s&.'-]+?)(?:\s+(?:is|has|was|will)\b|[.,\n]|$)/i);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
    return "Beneficiary";
  }, [beneficiaryName, receiptRows, message]);

  const effectiveRail = useMemo(() => {
    if (beneficiaryRail && beneficiaryRail.trim()) {
      return beneficiaryRail.trim();
    }
    const combined = `${title} ${message} ${receiptRows.map(([k, v]) => `${k} ${typeof v === "string" ? v : ""}`).join(" ")}`.toLowerCase();
    if (combined.includes("wallet") || combined.includes("mobile money") || combined.includes("momo")) {
      return "Send to Wallet";
    }
    if (combined.includes("group")) {
      return "Group Payment";
    }
    if (combined.includes("bank") || combined.includes("gcb")) {
      return "Bank Transfer";
    }
    if (combined.includes("airtime") || combined.includes("data") || combined.includes("bundle")) {
      return "Airtime & Data";
    }
    if (combined.includes("bill") || combined.includes("ecg") || combined.includes("utility")) {
      return "Bill Payment";
    }
    return "Send to Wallet";
  }, [beneficiaryRail, title, message, receiptRows]);

  // Orchestrate the entrance: eagle brand moment -> settles into the emerald check,
  // then the rest of the content reveals. Runs once on mount; the only other caller
  // is the dev-only Replay control. `initial` runs the content reveal too.
  const triggerCelebration = useCallback((opts?: { initial?: boolean }) => {
    setBadgePhase("eagle");
    setBurstKey((k) => k + 1);

    const morphTimer = setTimeout(() => {
      setBadgePhase("checked");
      playDelightChime();
    }, 1050);

    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    if (opts?.initial) {
      // After the check has drawn and settled (~1050ms morph + ~350ms draw/settle).
      revealTimer = setTimeout(() => setRevealRest(true), 1400);
    }

    return () => {
      clearTimeout(morphTimer);
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, []);

  // Holds the pending timers from the latest run so a replay can cancel them
  // before starting over — otherwise a stale reveal timer would fire mid-replay.
  const celebrationCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    celebrationCleanup.current = triggerCelebration({ initial: true });
    return () => {
      celebrationCleanup.current?.();
    };
  }, [triggerCelebration]);

  // Replay the full choreography (badge + content cascade) from the top.
  const handleReplay = useCallback(() => {
    celebrationCleanup.current?.();
    setRevealRest(false);
    celebrationCleanup.current = triggerCelebration({ initial: true });
  }, [triggerCelebration]);

  const handleToggleBeneficiary = () => {
    const next = !saveBeneficiary;
    setSaveBeneficiary(next);
    onSaveBeneficiaryChange?.(next);
    if (next) {
      toast.success(`${effectiveBenName} has been added to ${effectiveRail} beneficiaries`);
    } else {
      toast.info(`${effectiveBenName} has been removed from ${effectiveRail} beneficiaries`);
    }
  };

  const handleFeedbackClick = () => {
    // Fresh each time it opens; clearing on submit would collapse the dialog while it fades out.
    setFeedbackRating(null);
    setFeedbackComment("");
    setShowFeedbackModal(true);
  };

  // Determine effective transaction ID for receipt routing
  const effectiveTxnId = useMemo(() => {
    if (transactionId) return transactionId;
    const refRow = receiptRows?.find(([k]) => {
      const lk = k.toLowerCase();
      return lk.includes("reference") || lk.includes("transaction id") || lk.includes("trn");
    });
    if (refRow && typeof refRow[1] === "string") {
      return refRow[1].trim();
    }
    return "txn-ret-020";
  }, [transactionId, receiptRows]);

  // The receipt opens as a sheet over this page; there is no separate transaction page to leave for.
  const [receiptOpen, setReceiptOpen] = useState(false);
  const handleViewReceipt = () => setReceiptOpen(true);

  const handleSchedule = () => {
    if (onSchedulePayment) {
      onSchedulePayment();
    } else {
      router.push("/payments/standing/new");
    }
  };

  // Default Action Cards
  const defaultActionCards: SuccessActionCard[] = [
    {
      id: "feedback",
      label: "Share Feedback",
      icon: Bell,
      onClick: handleFeedbackClick,
    },
    {
      id: "schedule",
      label: "Schedule Payment",
      icon: Repeat,
      onClick: handleSchedule,
    },
    {
      id: "receipt",
      label: "View Receipt",
      icon: ReceiptText,
      onClick: handleViewReceipt,
    },
  ];

  const actionCards = (customActionCards || defaultActionCards.filter((c) => !(hideSchedule && c.id === "schedule"))).map((card) => {
    if ((card.id === "receipt" || card.id === "download") && !card.onClick) {
      return {
        ...card,
        label: card.label === "Download Receipt" ? "View Receipt" : card.label,
        icon: card.icon || ReceiptText,
        onClick: handleViewReceipt,
      };
    }
    if (card.id === "feedback" && !card.onClick) {
      return {
        ...card,
        onClick: handleFeedbackClick,
      };
    }
    if (card.id === "schedule" && !card.onClick) {
      return {
        ...card,
        onClick: handleSchedule,
      };
    }
    return card;
  });

  return (
    <div className="success-entrance relative mx-auto flex w-full max-w-[500px] min-h-[75vh] flex-col items-center justify-center gap-6 py-10 px-3 text-center overflow-visible">
      {/* ── Replay control — DEV/testing only, stripped from production builds ── */}
      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          onClick={handleReplay}
          aria-label="Replay animation"
          className="absolute right-1 top-1 z-30 flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-2 py-2 text-[12px] text-muted-foreground shadow-xs backdrop-blur transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer"
        >
          <RotateCcw size={13} />
          <span>Replay</span>
        </button>
      )}

      {/* ── 1. Hero (eagle + message) — starts centered on screen, then the layout
             animation slides it up as the rest of the content mounts below ── */}
      <motion.div
        layout="position"
        transition={{ layout: { duration: 0.62, ease: [0.22, 1, 0.36, 1] } }}
        className="relative flex flex-col items-center gap-3 text-center w-full"
      >
        {/* Badge Anchor & Interactive Burst Area */}
        <div className="relative flex size-[112px] sm:size-[116px] items-center justify-center my-1 select-none">
          {/* Subtle Dual Concentric Precision Pulse Rings during Checked Phase */}
          {badgePhase === "checked" && (
            <>
              <motion.div
                key={`pulse-ring-1-${burstKey}`}
                initial={{ scale: 0.85, opacity: 0.45 }}
                animate={{ scale: 1.55, opacity: 0 }}
                transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-0 rounded-full border border-success/40"
              />
              <motion.div
                key={`pulse-ring-2-${burstKey}`}
                initial={{ scale: 0.85, opacity: 0.25 }}
                animate={{ scale: 2.0, opacity: 0 }}
                transition={{ duration: 1.1, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-0 rounded-full border border-success/20"
              />
            </>
          )}

          {/* ── Dynamic Hero Stage: Standalone Eagle -> Morph -> Emerald Check ── */}
          <AnimatePresence mode="wait">
            {badgePhase === "eagle" ? (
              <motion.div
                key="standalone-eagle-stage"
                initial={{ scale: 0.5, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{
                  scale: 1.18,
                  opacity: 0,
                  y: -4,
                  filter: "blur(3px)",
                  transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
                }}
                transition={{
                  duration: 0.34,
                  ease: [0.22, 1, 0.36, 1],
                }}
                title="GCB Bank"
                className="relative flex items-center justify-center size-full select-none"
              >
                {/* Standalone Eagle Emblem (No circle background, no light beam) */}
                <GcbEagleEmblem className="w-[104px] sm:w-[114px] h-auto relative z-10" />
              </motion.div>
            ) : (
              <motion.div
                key="emerald-check-badge"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 22,
                  mass: 0.85,
                }}
                className="group relative z-10 flex size-[88px] items-center justify-center rounded-full bg-success text-white select-none"
              >
                {/* Animated SVG Path Drawing Checkmark */}
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="overflow-visible relative z-10"
                >
                  <motion.path
                    d="M12 24.5L20.5 33L36 15"
                    stroke="currentColor"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      pathLength: { duration: 0.34, delay: 0.08, ease: "easeOut" },
                      opacity: { duration: 0.08, delay: 0.08 },
                    }}
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── 2. Header rises in while the badge animates; subtitle waits for the reveal ── */}
        <div className="flex flex-col gap-2 items-center w-full max-w-[460px] text-center">
          <motion.h1
            key={`title-${burstKey}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.44, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-[26px] sm:text-[30px] font-medium leading-[34px] sm:leading-[38px] tracking-[var(--ls-heading)] text-foreground text-center"
          >
            {normalizedTitle}
          </motion.h1>
          {revealRest && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-[15px] sm:text-[16px] leading-[23px] sm:leading-[25px] text-muted-foreground text-center max-w-[440px]"
            >
              {emphasise(message, beneficiaryName)}
            </motion.p>
          )}
        </div>
      </motion.div>

      {/* ── 3. Action Cards Row ── */}
      {actionCards.length > 0 && revealRest && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2 flex w-full max-w-[460px] justify-center gap-6"
        >
          {actionCards.map((card) => (
            <RoundAction
              key={card.id}
              icon={card.icon}
              label={ACTION_LABEL[card.id] ?? card.label}
              onClick={card.onClick}
              chipClassName={cn("bg-muted text-foreground group-hover:bg-muted/70", card.active && "bg-primary/15 ring-1 ring-primary/40")}
              labelClassName="text-[12px] leading-[17px]"
            />
          ))}
        </motion.div>
      )}

      {/* ── 4. Save As Beneficiary Toggle Row (Tactile Spring Flip), beneath the actions ── */}
      {showSaveBeneficiary && revealRest && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-between px-[18px] py-[16px] rounded-xl border border-border dark:border-border bg-tile dark:bg-card w-full max-w-[460px] mt-2 shadow-xs"
        >
          <span id="save-beneficiary-label" className="text-[14px] font-normal text-foreground">
            {saveBeneficiaryLabel}
          </span>
          <Switch checked={saveBeneficiary} onCheckedChange={handleToggleBeneficiary} aria-labelledby="save-beneficiary-label" />
        </motion.div>
      )}

      {/* ── 5. Bottom Action Buttons ── */}
      {revealRest && (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-3 w-full max-w-[460px] pt-2"
      >
        {onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="flex-1 rounded-lg border border-border dark:border-border bg-card px-4 py-2 text-[14px] font-medium text-foreground hover:bg-muted/60 active:scale-[0.99] transition cursor-pointer text-center shadow-xs"
          >
            {secondaryActionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onPrimaryAction}
          className="relative overflow-hidden flex-1 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 text-[14px] font-medium active:scale-[0.99] transition cursor-pointer text-center shadow-xs"
        >
          {/* Single light sweep as the button arrives — then it stays still */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 0.9, delay: 0.4, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
          <span className="relative z-10">{primaryActionLabel}</span>
        </button>
      </motion.div>
      )}

      {/* ── Share Feedback: one question first, the follow-up opens once they have answered ── */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>How was your payment experience today?</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-8 pb-4 pt-2">
            <div role="radiogroup" aria-label="Payment experience" className="flex justify-center gap-6">
                {FEEDBACK_OPTIONS.map((opt) => {
                  const selected = feedbackRating === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setFeedbackRating(opt.id)}
                      className="group flex w-[88px] cursor-pointer flex-col items-center gap-2 outline-none"
                    >
                      <span
                        className={cn(
                          "flex size-14 items-center justify-center rounded-full border transition-colors duration-hover group-focus-visible:ring-1 group-focus-visible:ring-ring",
                          selected
                            ? "border-[var(--active-border)] bg-[var(--active-bg)] text-foreground"
                            : "border-transparent bg-muted group-hover:bg-muted/70"
                        )}
                      >
                        <span className="text-[26px] leading-none" aria-hidden="true">
                          {opt.emoji}
                        </span>
                      </span>
                      <span className={cn("text-[13px]", selected ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

            {feedbackRating && (
              <motion.div
                key={feedbackRating}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION.reveal, ease: EASE.settle }}
              >
                <Field
                  label={FEEDBACK_OPTIONS.find((o) => o.id === feedbackRating)?.prompt}
                  htmlFor="feedback-comment"
                  optional
                >
                  <Textarea
                    id="feedback-comment"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Add a note"
                    rows={3}
                  />
                </Field>
              </motion.div>
            )}
          </DialogBody>
          {feedbackRating && (
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setShowFeedbackModal(false);
                  toast.success("Thank you! Your feedback helps us improve GCB Internet Banking.");
                }}
                className="h-10 w-full rounded-lg text-[14px]"
              >
                Submit Feedback
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <TransactionDetailSheet
        transaction={receiptOpen ? findTransaction(effectiveTxnId) ?? null : null}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </div>
  );
}
