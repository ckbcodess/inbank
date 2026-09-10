"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Receipt,
  Repeat,
  Trash2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export interface SuccessActionCard {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  active?: boolean;
}

export interface CardlessTokenDetails {
  code: string;
  amount: string;
  expiresAt: string;
  recipientPhone: string;
  recipientName?: string;
  onDelete?: () => void;
}

export interface PaymentSuccessScreenProps {
  /** Title of the success confirmation (e.g. "Payment submitted", "Group Created Successfully") */
  title: string;
  /** Explanatory message below the title */
  message: string;
  /** Transaction ID or Reference to navigate to when viewing receipt */
  transactionId?: string;
  /** Callback when user clicks View Receipt card */
  onViewReceipt?: () => void;
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
  /** Whether to display the "Save as beneficiary?" toggle row */
  showSaveBeneficiary?: boolean;
  /** Custom label for the toggle (defaults to "Save as beneficiary?") */
  saveBeneficiaryLabel?: string;
  /** Initial state of the toggle */
  initialSaveBeneficiary?: boolean;
  /** Callback on toggle change */
  onSaveBeneficiaryChange?: (saved: boolean) => void;
  /** Custom action cards */
  customActionCards?: SuccessActionCard[];
  /** Custom schedule handler if standard schedule card is used */
  onSchedulePayment?: () => void;
  /** Cardless withdrawal token payload if generated via cardless rail */
  cardlessToken?: CardlessTokenDetails;
  /** Name of the beneficiary to display in the toast notification */
  beneficiaryName?: string;
  /** Rail or category name for the beneficiary toast (e.g. "Send to Wallet", "Bank Transfer") */
  beneficiaryRail?: string;
}

// GCB Iconic Soaring Golden Eagle Emblem (Standalone with Specular White Sheen Mask)
function GcbEagleEmblem({ className, idPrefix = "gcb-eagle" }: { className?: string; idPrefix?: string }) {
  const maskId = `${idPrefix}-mask`;
  const sheenGradId = `${idPrefix}-sheen-grad`;

  const pathG =
    "M16.1982 23.3605L15.8649 24.9513C15.8649 24.9513 15.845 25.1151 15.6172 25.0229C15.6172 25.0229 14.4792 24.6241 14.1458 24.5733C14.1458 24.5733 13.4876 24.4112 12.8343 24.4112C12.8343 24.4112 11.639 24.3402 10.8084 24.7998C10.8084 24.7998 9.98927 25.1654 9.59387 26.1433C9.59387 26.1433 8.98147 27.7128 9.87475 29.129C9.87475 29.129 10.6131 30.4246 12.6468 30.3642C12.6468 30.3642 13.3737 30.3938 14.2242 30.1276C14.2242 30.1276 14.4406 30.0702 14.4123 29.7413V28.5084C14.4123 28.5084 14.4303 28.2742 14.132 28.2742H12.428C12.428 28.2742 12.2412 28.2949 12.2219 28.0807L11.9398 26.7751H16.8618V31.0659C16.8618 31.0659 15.2435 31.9952 12.4696 31.9952C12.4696 31.9952 8.6602 32.2183 7.12258 29.6094C7.12258 29.6094 5.84535 27.6217 7.07014 25.2471C7.07014 25.2471 7.8266 23.6498 10.1454 23.0251C10.1454 23.0251 11.2731 22.7115 12.5534 22.7104C12.5534 22.7104 14.4635 22.6577 16.1982 23.3605Z";
  const pathC =
    "M17.5487 27.4664C17.4748 24.8272 19.646 23.6454 19.646 23.6454C20.3366 23.2173 21.6506 22.7095 23.4673 22.7095C25.2829 22.7095 26.6296 23.2599 26.6296 23.2599L26.3061 24.868C26.3061 24.868 26.2431 25.0726 26.0753 24.9703C26.0753 24.9703 24.9697 24.3998 23.7375 24.4205C23.7375 24.4205 22.1316 24.3182 21.1296 25.3581C21.1296 25.3581 20.3826 26.0919 20.3984 27.4558C20.3984 27.4558 20.419 29.1154 21.7548 29.8189C21.7548 29.8189 22.5265 30.2872 23.7175 30.2872C23.7175 30.2872 25.0018 30.3079 26.2843 29.6149C26.2843 29.6149 26.4521 29.5138 26.4933 29.6758L26.8374 31.346C26.8374 31.346 25.4707 31.9993 23.4037 31.9993C23.4037 31.9993 21.2756 32.0602 19.5436 31.0002C19.5436 31.0002 18.541 30.3682 18.06 29.4009C18.06 29.4009 17.5808 28.5768 17.5487 27.4664Z";
  const pathB =
    "M36.5749 27.7337C35.9083 27.1215 34.6991 26.9378 34.6991 26.9378C35.2521 26.7943 35.8249 26.4672 35.8249 26.4672C36.7417 25.9007 36.6994 25.0194 36.6994 25.0194C36.7193 24.0588 36.0951 23.5888 36.0951 23.5888C35.0563 22.6549 32.7641 22.7106 32.7641 22.7106H28.05C27.8928 22.6952 27.8711 22.8486 27.8711 22.8486V31.511C27.8711 31.6758 28.0167 31.6551 28.0167 31.6551H32.7853C34.5752 31.6551 35.5446 31.2052 35.5446 31.2052C37.3031 30.5 37.1586 29.1642 37.1586 29.1642C37.21 28.2451 36.5749 27.7337 36.5749 27.7337ZM33.67 26.1211C33.67 26.1211 33.2651 26.4127 32.4312 26.3955H30.5572V24.1601V24.1512H32.5563C32.5563 24.1512 33.2845 24.1459 33.6603 24.3853C33.6603 24.3853 34.1903 24.6307 34.1903 25.2221C34.1903 25.2221 34.2423 25.743 33.67 26.1211ZM33.9305 29.9193C33.9305 29.9193 33.4929 30.2102 32.5774 30.2114H30.5572V27.6987V27.6868H32.7122C32.7122 27.6868 33.4718 27.6779 33.9045 27.9517C33.9045 27.9517 34.4767 28.2261 34.4767 28.8916C34.4767 28.8916 34.5752 29.5506 33.9305 29.9193Z";
  const pathEagle =
    "M33.377 4.70443C33.377 4.70443 30.0345 6.93938 24.271 8.92316C20.6754 10.1624 16.3994 10.7276 16.4024 10.7312C15.7226 11.7982 14.6956 12.2619 13.9085 12.4626C14.7122 12.4798 15.2657 12.538 15.2657 12.538C16.5387 12.7061 16.2637 13.2351 16.2637 13.2351C16.7983 13.3919 17.1752 13.5843 17.1752 13.5843C17.9948 13.947 17.0075 14.887 17.0075 14.887C17.017 14.4826 16.6744 14.3918 16.6744 14.3918C16.3917 14.298 16.0012 14.3579 16.0012 14.3579C15.2906 14.4399 14.4876 14.8793 14.4876 14.8793C13.5115 15.3774 12.8412 15.8495 12.8412 15.8495C12.1164 16.2912 11.4064 16.8031 11.4064 16.8031C10.358 14.7949 11.4336 12.7506 11.5717 12.5042C7.63773 11.7733 7.63121 7.65131 7.63121 7.65131C7.62707 3.78528 10.2217 0 10.2312 0C9.2367 0.0552205 7.86116 0.297478 7.28689 0.513017L5.96706 4.49127L6.01981 0.898373C5.35841 1.12044 4.87599 1.38408 4.58619 1.56221L3.59588 5.16282L3.51231 2.15716C2.93033 2.55914 2.77506 2.72599 2.522 3.05138L1.84342 6.06179L1.24899 5.02032C-1.71543 10.23 1.52754 17.8439 1.52754 17.8439L4.76576 17.8392L1.18143 20.0266C0.907626 20.7267 0.707311 21.4143 0.655751 22.0532L2.28553 21.7385L0.700792 23.2389C0.768947 23.6955 0.889847 24.1248 1.04631 24.5203L2.63164 23.1386L1.38471 25.237C2.02536 26.4417 2.8687 27.1833 2.8687 27.1833C4.18793 20.9488 9.31848 18.4716 9.31848 18.4716L9.31907 20.9595C22.1114 19.6009 26.8763 16.2912 29.3168 13.9221L27.5495 13.3669L30.4683 12.6497C30.7984 12.3171 31.1309 11.8308 31.3508 11.4324L28.4812 11.2139L31.8462 10.4379C32.0767 10.1166 32.3843 9.36433 32.507 9.05557L28.8119 9.27942L32.8371 7.56224C33.2099 6.27495 33.377 4.70443 33.377 4.70443Z";

  return (
    <svg
      viewBox="0 0 38 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Precise SVG Mask matching silhouette of the GCB emblem */}
        <mask id={maskId}>
          <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d={pathG} />
          <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d={pathC} />
          <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d={pathB} />
          <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d={pathEagle} />
        </mask>
        {/* Specular White Sheen Beam Gradient */}
        <linearGradient id={sheenGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Letters G, C, B — crisp charcoal in light mode, clean white in dark mode */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d={pathG}
        className="fill-[#1e293b] dark:fill-[#F6F6F5] transition-colors"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d={pathC}
        className="fill-[#1e293b] dark:fill-[#F6F6F5] transition-colors"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d={pathB}
        className="fill-[#1e293b] dark:fill-[#F6F6F5] transition-colors"
      />

      {/* Soaring Golden Eagle */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d={pathEagle}
        fill="#F6BF36"
      />

      {/* Specular White Sheen Passing Across the Eagle */}
      <g mask={`url(#${maskId})`}>
        <g transform="rotate(22 19 16)">
          <motion.rect
            y="-18"
            width="20"
            height="65"
            fill={`url(#${sheenGradId})`}
            initial={{ x: -45 }}
            animate={{ x: 55 }}
            transition={{
              delay: 0.15,
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </g>
      </g>
    </svg>
  );
}

// Subtle pleasant Web Audio confirmation chime
function playDelightChime() {
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
  onViewReceipt,
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
  cardlessToken,
  beneficiaryName,
  beneficiaryRail,
}: PaymentSuccessScreenProps) {
  const router = useRouter();
  const [saveBeneficiary, setSaveBeneficiary] = useState(initialSaveBeneficiary);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

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
      const cleaned = raw.replace(/^Yes\s*—\s*/i, "").replace(/\s*\(••.*?\)$/, "").trim();
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
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 3500);
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

  const handleViewReceipt = () => {
    if (onViewReceipt) {
      onViewReceipt();
    } else {
      router.push(`/transactions/${encodeURIComponent(effectiveTxnId)}`);
    }
  };

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
      icon: Receipt,
      onClick: handleViewReceipt,
    },
  ];

  const actionCards = (customActionCards || defaultActionCards).map((card) => {
    if ((card.id === "receipt" || card.id === "download") && !card.onClick) {
      return {
        ...card,
        label: card.label === "Download Receipt" ? "View Receipt" : card.label,
        icon: card.icon || Receipt,
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
    <div className="success-entrance relative mx-auto flex w-full max-w-[500px] min-h-[75vh] flex-col items-center justify-center gap-7 py-10 px-4 text-center overflow-visible">
      {/* ── Replay control — DEV/testing only, stripped from production builds ── */}
      {process.env.NODE_ENV !== "production" && (
        <button
          type="button"
          onClick={handleReplay}
          aria-label="Replay animation"
          className="absolute right-1 top-1 z-30 flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-[12px] text-muted-foreground shadow-xs backdrop-blur transition-colors hover:bg-muted/60 hover:text-foreground cursor-pointer"
        >
          <RotateCcw size={13} strokeWidth={1.8} />
          <span>Replay</span>
        </button>
      )}

      {/* ── 1. Hero (eagle + message) — starts centered on screen, then the layout
             animation slides it up as the rest of the content mounts below ── */}
      <motion.div
        layout="position"
        transition={{ layout: { duration: 0.62, ease: [0.22, 1, 0.36, 1] } }}
        className="relative flex flex-col items-center gap-4 text-center w-full"
      >
        {/* Badge Anchor & Interactive Burst Area */}
        <div className="relative flex size-[130px] sm:size-[140px] items-center justify-center my-1 select-none">
          {/* Subtle Dual Concentric Precision Pulse Rings during Checked Phase */}
          {badgePhase === "checked" && (
            <>
              <motion.div
                key={`pulse-ring-1-${burstKey}`}
                initial={{ scale: 0.85, opacity: 0.45 }}
                animate={{ scale: 1.55, opacity: 0 }}
                transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-0 rounded-full border border-[#04C500]/40"
              />
              <motion.div
                key={`pulse-ring-2-${burstKey}`}
                initial={{ scale: 0.85, opacity: 0.25 }}
                animate={{ scale: 2.0, opacity: 0 }}
                transition={{ duration: 1.1, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-0 rounded-full border border-[#04C500]/20"
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
                className="group relative z-10 flex size-[100px] sm:size-[108px] items-center justify-center rounded-full bg-gradient-to-br from-[#039600] to-[#04C500] text-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] ring-1 ring-white/20 select-none overflow-hidden"
              >
                {/* Static top highlight for depth — no loop, the badge settles still. */}
                <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent" />

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

                {/* ── Single sheen pass, once the check has drawn — then it rests ── */}
                <motion.div
                  initial={{ x: "-160%", opacity: 0 }}
                  animate={{ x: "160%", opacity: [0, 0.7, 0] }}
                  transition={{
                    delay: 0.45, // begins right after the checkmark draws
                    duration: 1.2,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  className="pointer-events-none absolute inset-0 -skew-x-20 bg-gradient-to-r from-transparent via-white/45 to-transparent w-[160%] z-20"
                />
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
            className="text-[26px] sm:text-[30px] font-medium leading-[34px] sm:leading-[38px] tracking-[-0.02em] text-foreground text-center"
          >
            {title}
          </motion.h1>
          {revealRest && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-[15px] sm:text-[16px] leading-[23px] sm:leading-[25px] text-muted-foreground text-center max-w-[440px]"
            >
              {message}
            </motion.p>
          )}
        </div>
      </motion.div>

      {/* ── Cardless Withdrawal Token Voucher (if generated) ── */}
      {cardlessToken && revealRest && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[460px] rounded-[14px] border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col gap-3 shadow-xs text-left"
        >
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <span className="text-[12.5px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>ATM Withdrawal Voucher</span>
            </span>
            <span className="text-[12px] text-muted-foreground">Expires: {cardlessToken.expiresAt}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="flex flex-col">
              <span className="text-[12px] text-muted-foreground">Voucher Code</span>
              <span className="text-[22px] font-bold tracking-widest tabular text-foreground">{cardlessToken.code}</span>
            </div>
            <div className="text-right">
              <span className="text-[12px] text-muted-foreground">Amount</span>
              <div className="text-[18px] font-semibold tabular text-foreground">GH₵ {cardlessToken.amount}</div>
            </div>
          </div>
          {cardlessToken.onDelete && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={cardlessToken.onDelete}
                className="flex items-center gap-1 text-[12px] text-destructive hover:underline cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Cancel Voucher</span>
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Feedback Notification ── */}
      {feedbackSent && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          className="w-full max-w-[460px] rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-center py-2.5 px-3 text-[13.5px]"
        >
          🎉 Thank you! Your feedback helps us improve GCB Internet Banking.
        </motion.div>
      )}

      {/* ── 3. Save As Beneficiary Toggle Row (Tactile Spring Flip) ── */}
      {showSaveBeneficiary && revealRest && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-between px-[18px] py-[16px] rounded-[14px] border border-[#ebebe9] dark:border-border bg-[#f6f6f5] dark:bg-card w-full max-w-[460px] shadow-xs"
        >
          <span className="text-[14px] font-normal text-foreground">{saveBeneficiaryLabel}</span>
          <motion.button
            type="button"
            role="switch"
            aria-checked={saveBeneficiary}
            onClick={handleToggleBeneficiary}
            whileTap={{ scale: 0.92 }}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-hidden",
              saveBeneficiary ? "bg-primary" : "bg-muted dark:bg-muted/60"
            )}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0",
                saveBeneficiary ? "translate-x-5" : "translate-x-0"
              )}
            />
          </motion.button>
        </motion.div>
      )}

      {/* ── 4. Action Cards Row ── */}
      {actionCards.length > 0 && revealRest && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className={cn("grid gap-3 w-full max-w-[460px]", actionCards.length === 3 ? "grid-cols-3" : "grid-cols-2")}
        >
          {actionCards.map((card) => {
            const Icon = card.icon;

            return (
              <button
                key={card.id}
                type="button"
                onClick={card.onClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-3.5 rounded-[12px] border border-[#ebebe9] dark:border-border bg-[#f6f6f5] dark:bg-card py-4 px-2.5 hover:bg-muted/50 active:scale-[0.98] transition-all cursor-pointer group text-center shadow-xs",
                  card.active && "border-primary ring-1 ring-primary/40 bg-muted/25"
                )}
              >
                <Icon
                  size={20}
                  className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
                />
                <span className="text-[13.5px] font-normal text-foreground group-hover:text-foreground leading-[18px]">
                  {card.label}
                </span>
              </button>
            );
          })}
        </motion.div>
      )}

      {/* ── 5. Bottom Action Buttons ── */}
      {revealRest && (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-4 w-full max-w-[460px] pt-1"
      >
        {onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="flex-1 rounded-[8px] border border-[#ebebe9] dark:border-border bg-card px-5 py-3 text-[14px] font-medium text-foreground hover:bg-muted/60 active:scale-[0.99] transition-all cursor-pointer text-center shadow-xs"
          >
            {secondaryActionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onPrimaryAction}
          className="relative overflow-hidden flex-1 rounded-[8px] bg-[#f9c632] hover:bg-[#eab308] text-[#451a03] px-5 py-3 text-[14px] font-medium active:scale-[0.99] transition-all cursor-pointer text-center shadow-xs"
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
    </div>
  );
}
