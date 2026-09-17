"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Wallet,
  Sparkles,
  Wifi,
  Check,
  Building2,
  Truck,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FromAccountSelector,
  AmountInput,
} from "@/components/payments/flows/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  accountsForProfile,
  addCard,
  GCB_BRANCHES,
  type CardType,
  type DeliveryMethod,
  type PaymentCard,
  type GcbBranch,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { CARD_THEMES, type CardTheme } from "@/components/cards/card-themes";
import TransactionPinModal from "@/components/payments/TransactionPinModal";
import { toast } from "sonner";

// Visa Official Vector Logo
function VisaLogo({ className = "h-4.5 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Visa"
    >
      <path
        d="M14.545 0.282L9.537 11.718H6.264L3.818 2.518C3.67 1.942 3.525 1.724 3.072 1.48C2.33 1.08 1.09 0.702 0 0.463L0.068 0.282H5.518C6.216 0.282 6.837 0.742 6.993 1.543L8.32 8.575L11.602 0.282H14.545ZM27.355 7.957C27.368 4.931 23.109 4.766 23.138 3.42C23.148 3.01 23.548 2.569 24.444 2.454C24.887 2.397 26.115 2.348 27.38 2.932L27.902 0.54C27.186 0.282 26.265 0.05 25.109 0.05C22.062 0.05 19.92 1.637 19.902 3.905C19.873 5.589 21.41 6.529 22.584 7.094C23.789 7.676 24.195 8.048 24.189 8.571C24.179 9.369 23.218 9.728 22.334 9.742C20.764 9.766 19.845 9.336 19.124 9.006L18.583 11.492C19.349 11.839 20.771 12.14 22.241 12.158C25.438 12.158 27.34 10.612 27.355 7.957ZM35.438 11.718H38.297L35.807 0.282H33.16C32.568 0.282 32.066 0.623 31.848 1.139L27.202 11.718H30.434L31.082 9.967H35.032L35.438 11.718ZM31.977 7.551L33.606 3.167L34.54 7.551H31.977ZM19.263 0.282L16.714 11.718H13.629L16.178 0.282H19.263Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Mastercard Official Vector Logo
function MastercardLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mastercard"
    >
      <circle cx="12" cy="12" r="11" fill="#EB001B" />
      <circle cx="24" cy="12" r="11" fill="#F79E1B" fillOpacity="0.95" />
      <path
        d="M18 4.223A10.96 10.96 0 0 0 13.633 12 10.96 10.96 0 0 0 18 19.777 10.96 10.96 0 0 0 22.367 12 10.96 10.96 0 0 0 18 4.223Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

const VISA_NETWORK_TYPES = [
  { id: "Classic", label: "Classic", description: "Standard electronic transactions" },
  { id: "Gold", label: "Gold", description: "Enhanced limits & global purchase protection" },
  { id: "Platinum", label: "Platinum", description: "Premium lifestyle privileges & travel perks" },
  { id: "Signature", label: "Signature", description: "High-tier concierge & luxury benefits" },
  { id: "Infinite", label: "Infinite", description: "Ultra-exclusive bespoke banking" },
] as const;

const MASTERCARD_NETWORK_TYPES = [
  { id: "MChip Classic", label: "MChip Classic", description: "Standard EMV Chip & contactless" },
  { id: "MChip Gold", label: "MChip Gold", description: "Travel assistance & higher withdrawal" },
  { id: "MChip Platinum", label: "MChip Platinum", description: "Global lounge access & priority support" },
  { id: "World Elite", label: "World Elite", description: "Bespoke executive & international privileges" },
] as const;

// GCB Iconic Soaring Golden Eagle Emblem (Standalone with Specular White Sheen Mask)
function GcbEagleEmblem({ className, idPrefix = "gcb-card-eagle" }: { className?: string; idPrefix?: string }) {
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
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    playTone(880.0, now + 0.12, 0.48);
  } catch {
    // Audio contexts may be blocked by browser policy without user gesture; fail silently
  }
}

type FlowStep = "select-type" | "details" | "customize" | "review" | "success";

interface CardTypeOption {
  type: CardType;
  title: string;
  category: "physical" | "digital";
  description: string;
  icon: typeof CreditCard;
}

const CARD_TYPE_OPTIONS: readonly CardTypeOption[] = [
  {
    type: "Debit",
    title: "Debit Card",
    category: "physical",
    description: "Everyday spending & ATM withdrawals",
    icon: CreditCard,
  },
  {
    type: "Prepaid",
    title: "Prepaid Card",
    category: "physical",
    description: "Budget control & travel spending",
    icon: Wallet,
  },
  {
    type: "Virtual",
    title: "Virtual Card",
    category: "digital",
    description: "Instant card for online payments",
    icon: Sparkles,
  },
] as const;

export function RequestCardFlow() {
  const router = useRouter();
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);

  const availableAccounts = useMemo(
    () => (activeProfile ? accountsForProfile(activeProfile.kind) : []),
    [activeProfile]
  );

  // Flow State
  const [step, setStep] = useState<FlowStep>("select-type");
  const [cardType, setCardType] = useState<CardType>("Debit");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    () => availableAccounts[0]?.id ?? "acc-001"
  );
  const [cardName, setCardName] = useState("");
  const [fundAmount, setFundAmount] = useState("500");
  const [cardScheme, setCardScheme] = useState<"Visa" | "Mastercard">("Visa");
  const [networkType, setNetworkType] = useState<string>("Classic");
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>(CARD_THEMES[1]); // Default to Gold

  function handleSchemeChange(scheme: "Visa" | "Mastercard") {
    setCardScheme(scheme);
    if (scheme === "Visa") {
      setNetworkType("Classic");
    } else {
      setNetworkType("MChip Classic");
    }
  }

  // Physical fulfillment state
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("BRANCH_PICKUP");
  const [selectedBranch, setSelectedBranch] = useState<GcbBranch>(GCB_BRANCHES[0]);
  const [recipientName, setRecipientName] = useState(actor?.name ?? "Ama Serwaa");
  const [deliveryAddress, setDeliveryAddress] = useState("No. 14 Ridge Road, Cantonments, Accra");
  const [deliveryCity, setDeliveryCity] = useState("Accra");
  const [deliveryPhone, setDeliveryPhone] = useState("+233 24 412 3456");

  // Authorization Modal
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Created card result state
  const [createdCard, setCreatedCard] = useState<PaymentCard | null>(null);

  // Animation Phase for Success Screen: "eagle" -> "checked"
  const [badgePhase, setBadgePhase] = useState<"eagle" | "checked">("eagle");
  const [revealRest, setRevealRest] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (step === "success") {
      setBadgePhase("eagle");
      setRevealRest(false);
      setBurstKey((k) => k + 1);
      const morphTimer = setTimeout(() => {
        setBadgePhase("checked");
        playDelightChime();
      }, 1050);
      const revealTimer = setTimeout(() => setRevealRest(true), 1400);
      return () => {
        clearTimeout(morphTimer);
        clearTimeout(revealTimer);
      };
    }
  }, [step]);

  const selectedAccount = useMemo(
    () => availableAccounts.find((a) => a.id === selectedAccountId) ?? availableAccounts[0],
    [availableAccounts, selectedAccountId]
  );

  const isPhysical = cardType === "Debit" || cardType === "Prepaid";
  const isFundable = cardType === "Virtual" || cardType === "Prepaid";

  const isDetailsValid = useMemo(() => {
    if (!cardName.trim()) return false;
    if (isFundable) {
      const parsedAmt = Number(fundAmount.replace(/,/g, ""));
      if (isNaN(parsedAmt) || parsedAmt <= 0) return false;
    }
    if (isPhysical && deliveryMethod === "DELIVERY") {
      if (!recipientName.trim() || !deliveryAddress.trim() || !deliveryPhone.trim()) {
        return false;
      }
    }
    return true;
  }, [cardName, isFundable, fundAmount, isPhysical, deliveryMethod, recipientName, deliveryAddress, deliveryPhone]);

  function handleAuthorizeSuccess() {
    setAuthModalOpen(false);

    const lastFour = String(Math.floor(1000 + Math.random() * 9000));
    const prefix = cardScheme === "Visa" ? "4532" : "5412";
    const fullNum = `${prefix} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${lastFour}`;
    const generatedCvv = String(Math.floor(100 + Math.random() * 900));
    const numericFund = isFundable ? Number(fundAmount.replace(/,/g, "")) || 0 : null;
    const trackingCode = `GCB-CRD-${Math.floor(100000 + Math.random() * 900000)}`;
    const pickupPin = String(Math.floor(1000 + Math.random() * 9000));

    const newCard: PaymentCard = {
      id: `card-req-${Date.now()}`,
      name: cardName.trim(),
      maskedNumber: `•••• ${lastFour}`,
      fullNumber: fullNum,
      cvv: generatedCvv,
      type: cardType,
      scheme: cardScheme,
      networkType: networkType,
      currency: selectedAccount?.currency ?? "GHS",
      balance: numericFund,
      spendLimit: cardType === "Virtual" ? 5000 : null,
      linkedAccountId: selectedAccount?.id ?? "acc-001",
      holder: actor?.name ?? "Ama Serwaa",
      expiry: "09/30",
      status: "Active",
      fundable: isFundable,
      isVirtual: cardType === "Virtual",
      profileKind: activeProfile?.kind ?? "RETAIL",
      colorTheme: selectedTheme.id,
      deliveryMethod: isPhysical ? deliveryMethod : undefined,
      deliveryBranch: isPhysical && deliveryMethod === "BRANCH_PICKUP" ? selectedBranch.name : undefined,
      deliveryAddress:
        isPhysical && deliveryMethod === "DELIVERY"
          ? `${deliveryAddress.trim()}, ${deliveryCity.trim()}`
          : undefined,
      deliveryStatus: isPhysical ? "in_production" : undefined,
      trackingNumber: isPhysical ? trackingCode : undefined,
      estimatedDeliveryDate: isPhysical ? "3-5 business days (Sep 21, 2026)" : undefined,
      pickupCode: isPhysical && deliveryMethod === "BRANCH_PICKUP" ? pickupPin : undefined,
    };

    addCard(newCard);
    setCreatedCard(newCard);
    setStep("success");
    toast.success(
      isPhysical
        ? `Card "${newCard.name}" ordered successfully! Delivery is now tracking.`
        : `Virtual Card "${newCard.name}" issued and active.`
    );
  }

  function handleReset() {
    setStep("select-type");
    setCardName("");
    setFundAmount("500");
    setCardScheme("Visa");
    setNetworkType("Classic");
    setCreatedCard(null);
  }

  return (
    <div className="flex flex-col w-full py-4 sm:py-8">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 1: SELECT CARD TYPE                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "select-type" && (
        <div className="w-full max-w-[540px] mx-auto flex flex-col gap-6">
          {/* Header Row: Back Link & Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-lg"
              nativeButton={false}
              render={<Link href="/cards" />}
              className="size-10 rounded-xl hover:bg-muted text-foreground transition-colors shrink-0"
              aria-label="Back to Cards"
            >
              <ChevronLeft size={22} strokeWidth={1.8} />
            </Button>
            <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em] text-foreground">
              Request a Card
            </h1>
          </div>

          {/* List of Card Types */}
          <div className="flex flex-col gap-3 w-full">
            {CARD_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    setCardType(opt.type);
                    setCardName(
                      opt.type === "Debit"
                        ? "Everyday Debit"
                        : opt.type === "Prepaid"
                        ? "Travel Prepaid"
                        : "Online Subscriptions"
                    );
                    setStep("details");
                  }}
                  className="group w-full p-4 sm:p-4.5 flex items-center justify-between rounded-2xl bg-card hover:bg-muted/30 active:scale-[0.99] border border-border/80 transition-all cursor-pointer text-left gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 text-foreground group-hover:scale-105 transition-transform">
                      <Icon size={19} strokeWidth={1.8} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15px] font-medium text-foreground tracking-[-0.01em]">
                        {opt.title}
                      </span>
                      <span className="text-[13px] text-muted-foreground mt-0.5 truncate">
                        {opt.description}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    strokeWidth={1.8}
                    className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 2: CONFIGURE CARD & FULFILLMENT                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "details" && (
        <div className="w-full max-w-[540px] mx-auto flex flex-col gap-6">
          {/* Header Row: Back to Step 1 & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep("select-type")}
              className="size-10 rounded-xl flex items-center justify-center hover:bg-muted text-foreground transition-colors shrink-0 cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.8} />
            </button>
            <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em] text-foreground capitalize">
              Configure {cardType.toLowerCase()} card
            </h1>
          </div>

          {/* Form Container */}
          <div className="flex flex-col gap-5 w-full">
            {/* Linked Account Selector */}
            <FromAccountSelector
              accounts={availableAccounts}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              label="Linked account"
            />

            {/* Card Nickname */}
            <div className="flex flex-col gap-2">
              <label htmlFor="card-name-input" className="text-[14px] font-medium text-foreground">
                Card nickname
              </label>
              <input
                id="card-name-input"
                type="text"
                placeholder="e.g. Daily Spending"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Scheme Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium text-foreground">
                Card network
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["Visa", "Mastercard"] as const).map((scheme) => {
                  const isSelected = cardScheme === scheme;
                  return (
                    <button
                      key={scheme}
                      type="button"
                      onClick={() => handleSchemeChange(scheme)}
                      className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-foreground bg-muted/40 dark:bg-muted/20 ring-1 ring-foreground/20 text-foreground shadow-xs"
                          : "border-border/80 bg-card hover:bg-muted/20 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "border-foreground bg-foreground"
                              : "border-muted-foreground/40 bg-transparent"
                          }`}
                        >
                          {isSelected && (
                            <div className="size-1.5 rounded-full bg-background" />
                          )}
                        </div>
                        <span className="text-[14px] font-medium truncate">{scheme}</span>
                      </div>
                      <div className="shrink-0 flex items-center">
                        {scheme === "Visa" ? (
                          <VisaLogo className="h-4 w-auto text-foreground" />
                        ) : (
                          <MastercardLogo className="h-4.5 w-auto" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Network Type Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium text-foreground">
                Network type
              </label>
              <Select
                value={networkType}
                onValueChange={setNetworkType}
              >
                <SelectTrigger className="min-h-[58px] h-auto py-2.5 px-4 w-full rounded-2xl border border-border/80 bg-card hover:bg-muted/20 text-left cursor-pointer transition-colors shadow-none flex items-center">
                  <div className="flex flex-col min-w-0 text-left flex-1">
                    <span className="text-[14.5px] text-foreground font-medium truncate leading-tight">
                      {networkType}
                    </span>
                    <span className="text-[12px] text-muted-foreground truncate leading-tight mt-0.5">
                      {(cardScheme === "Visa" ? VISA_NETWORK_TYPES : MASTERCARD_NETWORK_TYPES).find((t) => t.id === networkType)?.description ?? "Card tier"}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {(cardScheme === "Visa" ? VISA_NETWORK_TYPES : MASTERCARD_NETWORK_TYPES).map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      <div className="flex flex-col min-w-0 py-0.5 text-left">
                        <span className="text-[14px] font-medium text-foreground">{opt.label}</span>
                        <span className="text-[12px] text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Initial Funding */}
            {isFundable && (
              <AmountInput
                value={fundAmount}
                onChange={setFundAmount}
                currency={selectedAccount?.currency ?? "GHS"}
                label="Initial funding amount"
              />
            )}

            {/* Physical Fulfillment */}
            {isPhysical && (
              <div className="flex flex-col gap-4 pt-2 border-t border-border/80">
                <label className="text-[14px] font-medium text-foreground">
                  Fulfillment method
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("BRANCH_PICKUP")}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      deliveryMethod === "BRANCH_PICKUP"
                        ? "border-foreground bg-muted/40 dark:bg-muted/20 ring-1 ring-foreground/20 text-foreground shadow-xs"
                        : "border-border/80 bg-card hover:bg-muted/20 text-foreground"
                    }`}
                  >
                    <div
                      className={`size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        deliveryMethod === "BRANCH_PICKUP"
                          ? "border-foreground bg-foreground"
                          : "border-muted-foreground/40 bg-transparent"
                      }`}
                    >
                      {deliveryMethod === "BRANCH_PICKUP" && (
                        <div className="size-1.5 rounded-full bg-background" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] font-medium leading-tight">Branch pickup</span>
                      <span className="text-[11.5px] text-muted-foreground mt-0.5">
                        Collect at branch
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("DELIVERY")}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      deliveryMethod === "DELIVERY"
                        ? "border-foreground bg-muted/40 dark:bg-muted/20 ring-1 ring-foreground/20 text-foreground shadow-xs"
                        : "border-border/80 bg-card hover:bg-muted/20 text-foreground"
                    }`}
                  >
                    <div
                      className={`size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        deliveryMethod === "DELIVERY"
                          ? "border-foreground bg-foreground"
                          : "border-muted-foreground/40 bg-transparent"
                      }`}
                    >
                      {deliveryMethod === "DELIVERY" && (
                        <div className="size-1.5 rounded-full bg-background" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] font-medium leading-tight">Doorstep delivery</span>
                      <span className="text-[11.5px] text-muted-foreground mt-0.5">
                        Courier delivery
                      </span>
                    </div>
                  </button>
                </div>

                {deliveryMethod === "BRANCH_PICKUP" ? (
                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] font-medium text-foreground">
                      Pickup branch
                    </label>
                    <Select
                      value={selectedBranch.id}
                      onValueChange={(val) => {
                        const found = GCB_BRANCHES.find((b) => b.id === val);
                        if (found) setSelectedBranch(found);
                      }}
                    >
                      <SelectTrigger className="min-h-[58px] h-auto py-2.5 px-4 w-full rounded-2xl border border-border/80 bg-card hover:bg-muted/20 text-left cursor-pointer transition-colors shadow-none flex items-center">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <MapPin size={18} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
                          <div className="flex flex-col min-w-0 text-left">
                            <span className="text-[14.5px] text-foreground font-medium truncate leading-tight">
                              {selectedBranch.name}
                            </span>
                            <span className="text-[12.5px] text-muted-foreground truncate leading-tight mt-0.5">
                              {selectedBranch.address}
                            </span>
                          </div>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {GCB_BRANCHES.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            <div className="flex flex-col min-w-0 py-0.5 text-left">
                              <span className="text-[14px] font-medium text-foreground">{b.name}</span>
                              <span className="text-[12px] text-muted-foreground">{b.address}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-2">
                      <label className="text-[14px] font-medium text-foreground">
                        Recipient name
                      </label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Full name"
                        className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all placeholder:text-muted-foreground/60"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[14px] font-medium text-foreground">
                        Delivery address
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Street or digital address"
                        className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all placeholder:text-muted-foreground/60"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <label className="text-[14px] font-medium text-foreground">City</label>
                        <input
                          type="text"
                          value={deliveryCity}
                          onChange={(e) => setDeliveryCity(e.target.value)}
                          placeholder="City"
                          className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all placeholder:text-muted-foreground/60"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[14px] font-medium text-foreground">Phone</label>
                        <input
                          type="text"
                          value={deliveryPhone}
                          onChange={(e) => setDeliveryPhone(e.target.value)}
                          placeholder="Phone number"
                          className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all placeholder:text-muted-foreground/60"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Proceed Button */}
            <div className="pt-2">
              <Button
                type="button"
                disabled={!isDetailsValid}
                onClick={() => setStep("customize")}
                className="w-full h-12 rounded-xl text-[14px] font-medium"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 3: CUSTOMIZE YOUR CARD                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "customize" && (
        <div className="w-full max-w-[540px] mx-auto flex flex-col items-center gap-6">
          {/* Header Row: Back to Step 2 & Title */}
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setStep("details")}
              className="size-10 rounded-xl flex items-center justify-center hover:bg-muted text-foreground transition-colors shrink-0 cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.8} />
            </button>
            <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em] text-foreground">
              Customize card
            </h1>
          </div>

          {/* Interactive Full Card Preview */}
          <div className="w-full flex flex-col items-center gap-6">
            <div
              className={`relative w-full aspect-[1.586/1] max-w-[500px] rounded-[20px] p-6 sm:p-7 flex flex-col justify-between overflow-hidden select-none shadow-md transition-all duration-300 bg-gradient-to-tr ${selectedTheme.cardGradient} ${selectedTheme.textColor} ${
                selectedTheme.borderColor ? `border ${selectedTheme.borderColor}` : ""
              }`}
            >
              <div className="absolute -right-12 -top-12 size-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -left-12 -bottom-12 size-48 rounded-full bg-black/10 blur-2xl pointer-events-none" />

              {/* Top Row */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[13px] tracking-widest font-medium uppercase opacity-90">
                  GCB Bank
                </span>
                <div className="flex items-center gap-2">
                  <Wifi size={16} strokeWidth={2} className="rotate-90 opacity-70" />
                  <span className="rounded-full bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider">
                    {cardType}
                  </span>
                </div>
              </div>

              {/* Middle Row: EMV Chip */}
              <div className="relative z-10 flex items-center gap-3">
                <div
                  className={`size-10 rounded-[6px] border ${
                    selectedTheme.chipColor ?? "bg-amber-300/90 border-amber-500/40"
                  } relative overflow-hidden shadow-xs`}
                >
                  <div className="absolute inset-0 grid grid-cols-2 divide-x divide-black/20">
                    <div className="border-b border-black/20" />
                    <div className="border-b border-black/20" />
                  </div>
                  <div className="absolute inset-x-1.5 inset-y-2 rounded-[2px] border border-black/25" />
                </div>
              </div>

              {/* Bottom Row */}
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] sm:text-[15px] font-medium tracking-tight truncate max-w-[280px]">
                    {cardName || "Everyday Card"}
                  </span>
                  <span className="text-[13px] font-medium tracking-wider tabular-nums opacity-90">
                    •••• 9102
                  </span>
                </div>

                <div className="flex items-end justify-between pt-1 border-t border-white/15">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider opacity-75">
                      Cardholder
                    </span>
                    <span className="text-[12px] font-medium tracking-tight">
                      {actor?.name ?? "Ama Serwaa"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col text-right">
                      <span className="text-[8px] uppercase tracking-wider opacity-75">
                        Expires
                      </span>
                      <span className="text-[11px] font-medium tabular-nums">09/30</span>
                    </div>

                    {cardScheme === "Visa" ? (
                      <span className="font-sans text-[16px] font-black italic tracking-tighter opacity-95">
                        VISA
                      </span>
                    ) : (
                      <div className="flex -space-x-2 items-center">
                        <div className="size-5 rounded-full bg-red-500/90" />
                        <div className="size-5 rounded-full bg-amber-400/90" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 7 Color Palette Swatches */}
            <div className="w-full flex items-center justify-between px-2 sm:px-4 py-2">
              {CARD_THEMES.map((theme) => {
                const isSelected = selectedTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    aria-label={`Select ${theme.name} card color`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTheme(theme)}
                    className={`relative size-11 sm:size-12 rounded-full ${theme.swatchGradient} shadow-xs transition-all duration-150 cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110 shadow-md"
                        : "hover:scale-105 opacity-90 hover:opacity-100"
                    }`}
                  >
                    {isSelected && (
                      <Check
                        size={18}
                        strokeWidth={2.4}
                        className={theme.textColor === "text-zinc-950" ? "text-zinc-950" : "text-white"}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Proceed to Review Button */}
            <div className="w-full pt-2">
              <Button
                type="button"
                onClick={() => setStep("review")}
                className="w-full h-12 rounded-xl text-[14px] font-medium"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 4: REVIEW SCREEN                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "review" && (
        <div className="w-full max-w-[540px] mx-auto flex flex-col gap-6">
          {/* Header Row: Back to Customize & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep("customize")}
              className="size-10 rounded-xl flex items-center justify-center hover:bg-muted text-foreground transition-colors shrink-0 cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.8} />
            </button>
            <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em] text-foreground">
              Review request
            </h1>
          </div>

          {/* Mini Card Spec Banner */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 flex items-center gap-4">
            <div
              className={`w-16 aspect-[1.586/1] rounded-lg bg-gradient-to-tr ${selectedTheme.cardGradient} ${selectedTheme.textColor} p-1.5 flex flex-col justify-between shrink-0 shadow-xs`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[6.5px] font-medium uppercase opacity-90">GCB</span>
                <span className="text-[6px] font-medium uppercase opacity-80">{cardType}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-[7.5px] font-medium truncate max-w-[40px]">{cardName}</span>
                <span className="text-[6.5px] font-mono opacity-80">••••</span>
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-medium text-foreground tracking-[-0.01em] truncate">
                {cardName || "New Card"}
              </span>
              <span className="text-[13px] text-muted-foreground mt-0.5">
                {cardType} Card • {cardScheme} ({networkType}) • {selectedTheme.name}
              </span>
            </div>
          </div>

          {/* Detailed Summary Rows */}
          <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/80 overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-4">
              <span className="text-[13.5px] text-muted-foreground">Linked account</span>
              <div className="flex flex-col items-end text-right">
                <span className="text-[14px] font-medium text-foreground">
                  {selectedAccount?.name ?? "Current Account"}
                </span>
                <span className="text-[12px] text-muted-foreground tabular-nums">
                  {selectedAccount?.number ?? "1414 4124 4214"}
                </span>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between gap-4">
              <span className="text-[13.5px] text-muted-foreground">Cardholder</span>
              <span className="text-[14px] font-medium text-foreground">
                {actor?.name ?? "Ama Serwaa"}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between gap-4">
              <span className="text-[13.5px] text-muted-foreground">Card network</span>
              <span className="text-[14px] font-medium text-foreground">
                {cardScheme} • {networkType}
              </span>
            </div>

            {isFundable && (
              <div className="p-4 flex items-center justify-between gap-4">
                <span className="text-[13.5px] text-muted-foreground">Initial funding</span>
                <span className="text-[14px] font-medium text-foreground tabular-nums">
                  {selectedAccount?.currency ?? "GHS"} {Number(fundAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="p-4 flex items-start justify-between gap-4">
              <span className="text-[13.5px] text-muted-foreground pt-0.5">Fulfillment</span>
              <div className="flex flex-col items-end text-right max-w-[280px]">
                {isPhysical ? (
                  deliveryMethod === "BRANCH_PICKUP" ? (
                    <>
                      <span className="text-[14px] font-medium text-foreground">
                        Branch pickup
                      </span>
                      <span className="text-[12px] text-muted-foreground mt-0.5">
                        {selectedBranch.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[14px] font-medium text-foreground">
                        Doorstep delivery
                      </span>
                      <span className="text-[12px] text-muted-foreground mt-0.5">
                        {deliveryAddress}, {deliveryCity}
                      </span>
                    </>
                  )
                ) : (
                  <span className="text-[14px] font-medium text-foreground">
                    Instant digital issuance
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 flex items-center justify-between gap-4">
              <span className="text-[13.5px] text-muted-foreground">Issuance fee</span>
              <span className="text-[14px] font-medium text-foreground">Free</span>
            </div>
          </div>

          {/* Authorize CTA Button */}
          <div className="w-full flex flex-col gap-2.5 pt-2">
            <Button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="w-full h-12 rounded-xl text-[14.5px] font-medium cursor-pointer"
            >
              Authorize
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setStep("customize")}
              className="w-full h-10 rounded-xl text-[13.5px] text-muted-foreground hover:text-foreground"
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 5: SUCCESS SCREEN                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "success" && createdCard && (
        <div className="relative mx-auto flex w-full max-w-[460px] min-h-[65vh] flex-col items-center justify-center gap-8 py-10 px-4 text-center overflow-visible">
          {/* 1. Dynamic Hero Stage: Standalone Eagle -> Morph -> Emerald Check */}
          <motion.div
            layout="position"
            transition={{ layout: { duration: 0.62, ease: [0.22, 1, 0.36, 1] } }}
            className="relative flex flex-col items-center gap-4 text-center w-full"
          >
            {/* Badge Anchor */}
            <div className="relative flex size-[130px] sm:size-[140px] items-center justify-center my-1 select-none">
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

              {/* Dynamic Hero Stage */}
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

                    {/* Single sheen pass */}
                    <motion.div
                      initial={{ x: "-160%", opacity: 0 }}
                      animate={{ x: "160%", opacity: [0, 0.7, 0] }}
                      transition={{
                        delay: 0.45,
                        duration: 1.2,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      className="pointer-events-none absolute inset-0 -skew-x-20 bg-gradient-to-r from-transparent via-white/45 to-transparent w-[160%] z-20"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. Header rises in; subtitle waits for revealRest */}
            <div className="flex flex-col gap-1.5 items-center w-full max-w-[420px] text-center">
              <motion.h1
                key={`title-${burstKey}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.44, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="text-[26px] sm:text-[28px] font-medium leading-[34px] tracking-[-0.02em] text-foreground text-center"
              >
                Card Request Confirmed
              </motion.h1>
              {revealRest && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="text-[14.5px] text-muted-foreground text-center"
                >
                  {isPhysical
                    ? `Your ${createdCard.type.toLowerCase()} card is in production.`
                    : `Your virtual card is active and ready for use.`}
                </motion.p>
              )}
            </div>
          </motion.div>

          {/* 3. Single Primary CTA Button: View Card */}
          {revealRest && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[420px]"
            >
              <button
                type="button"
                onClick={() => router.push(`/cards/${createdCard.id}`)}
                className="relative overflow-hidden w-full rounded-xl bg-[#f9c632] hover:bg-[#eab308] text-[#451a03] px-5 py-3.5 text-[14.5px] font-medium active:scale-[0.99] transition-all cursor-pointer text-center shadow-xs"
              >
                {/* Single light sweep as the button arrives */}
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 0.9, delay: 0.25, ease: "easeInOut" }}
                  className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
                <span className="relative z-10">View Card</span>
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* PIN & SMS OTP Authorization Modal */}
      <TransactionPinModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthorizeSuccess}
        title="Authorize Card Request"
      />
    </div>
  );
}
