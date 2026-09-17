/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Grid,
  Key,
  Landmark,
  PlusCircle,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Truck,
  Check,
  MapPin,
  Wifi,
} from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  accountsForProfile,
  type PaymentCard,
  type CardTransaction,
  getCardTransactions,
  addCardTransaction,
  setCardStatus as setCardStatusInStore,
  updateCard as updateCardInStore,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { getCardTheme } from "@/components/cards/card-themes";
import { EmvChip } from "@/components/cards/EmvChip";
import { GcbCardLogo } from "@/components/cards/GcbCardLogo";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import TransactionPinModal from "@/components/payments/TransactionPinModal";
import { CardDeliveryTracker, CardDeliveryTrackerModal } from "@/components/cards/CardDeliveryTracker";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useContextualBack } from "@/lib/contextual-back";

function KeypadMatrixIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="5" r="1.75" />
      <circle cx="10" cy="5" r="1.75" />
      <circle cx="15" cy="5" r="1.75" />
      <circle cx="5" cy="10" r="1.75" />
      <circle cx="10" cy="10" r="1.75" />
      <circle cx="15" cy="10" r="1.75" />
      <circle cx="5" cy="15" r="1.75" />
      <circle cx="10" cy="15" r="1.75" />
      <circle cx="15" cy="15" r="1.75" />
    </svg>
  );
}

export type DeliverySimulationState =
  | "default"
  | "branch_processing"
  | "doorstep_processing"
  | "branch_ready_unactivated"
  | "doorstep_delivered_unactivated"
  | "branch_activated"
  | "doorstep_activated"
  | "virtual_active";

export const DELIVERY_SIMULATION_STATES: readonly DeliverySimulationState[] = [
  "default",
  "branch_processing",
  "doorstep_processing",
  "branch_ready_unactivated",
  "doorstep_delivered_unactivated",
  "branch_activated",
  "doorstep_activated",
  "virtual_active",
] as const;

export const DELIVERY_SIMULATION_LABELS: Record<DeliverySimulationState, string> = {
  default: "Default (Card State)",
  branch_processing: "1. Branch · Being Processed (Inactive)",
  doorstep_processing: "2. Doorstep · In Transit (Inactive)",
  branch_ready_unactivated: "3. Branch · Ready for Pickup (Needs Activation)",
  doorstep_delivered_unactivated: "4. Doorstep · Delivered (Needs Activation)",
  branch_activated: "5. Branch · Collected & Activated (Active)",
  doorstep_activated: "6. Doorstep · Delivered & Activated (Active)",
  virtual_active: "7. Virtual · Instant Active (Active)",
};

export interface VirtualCardDetailsViewProps {
  card: PaymentCard;
  onUpdateCard?: (updated: Partial<PaymentCard>) => void;
  initialTab?: string;
}

export function VirtualCardDetailsView({
  card,
  onUpdateCard,
  initialTab = "history",
}: VirtualCardDetailsViewProps) {
  const { handleBack: handleBackNavigation } = useContextualBack("/cards");
  const activeProfile = useSession((s) => s.activeProfile);
  const availableAccounts = accountsForProfile(activeProfile?.kind ?? "RETAIL");

  // Delivery Tracking State Simulation (Controlled via Dev Mode Switcher)
  const [deliverySimState, setDeliverySimState] = useState<DeliverySimulationState>("default");

  // Local reactive states
  const [currentCard, setCurrentCard] = useState<PaymentCard>(card);
  const [isFrozen, setIsFrozen] = useState(card.status === "Blocked");
  const [showCardDetails, setShowCardDetails] = useState(false);

  // Dynamic card activity list linked to card ID
  const [activities, setActivities] = useState<CardTransaction[]>(() => getCardTransactions(card.id));

  // Compute daily spend dynamically from actual card transactions
  const dailySpent = useMemo(() => {
    return activities
      .filter((a) => a.direction === "debit")
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [activities]);

  const [dailyLimit, setDailyLimit] = useState(card.spendLimit ?? 5000);
  const [maxDailyCap] = useState(20000);
  const [monthlyLimit, setMonthlyLimit] = useState(15000);
  const [maxMonthlyCap] = useState(50000);
  const [cardNickname, setCardNickname] = useState(card.name ?? "Virtual Card");

  // Derive effective card with simulation overrides
  const effectiveCard = useMemo<PaymentCard>(() => {
    if (deliverySimState === "default") {
      return currentCard;
    }

    const baseTracking = currentCard.trackingNumber || `GCB-CRD-${currentCard.id.slice(-6).toUpperCase()}`;

    switch (deliverySimState) {
      case "branch_processing":
        return {
          ...currentCard,
          type: "Debit",
          deliveryMethod: "BRANCH_PICKUP",
          deliveryBranch: "GCB Head Office Branch (High Street, Accra)",
          deliveryAddress: undefined,
          deliveryStatus: "processing",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "Sep 23, 2026 (5-7 business days)",
          pickupCode: "4920",
          status: "Inactive",
        };
      case "doorstep_processing":
        return {
          ...currentCard,
          type: "Debit",
          deliveryMethod: "DELIVERY",
          deliveryAddress: "No. 14 Ridge Road, Cantonments, Accra",
          deliveryBranch: undefined,
          deliveryStatus: "in_transit",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "Sep 21, 2026 (3-5 business days)",
          status: "Inactive",
        };
      case "branch_ready_unactivated":
        return {
          ...currentCard,
          type: "Debit",
          deliveryMethod: "BRANCH_PICKUP",
          deliveryBranch: "GCB Head Office Branch (High Street, Accra)",
          deliveryAddress: undefined,
          deliveryStatus: "ready_for_pickup",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "Ready for Pickup Today",
          pickupCode: "4920",
          status: "Inactive",
        };
      case "doorstep_delivered_unactivated":
        return {
          ...currentCard,
          type: "Debit",
          deliveryMethod: "DELIVERY",
          deliveryAddress: "No. 14 Ridge Road, Cantonments, Accra",
          deliveryBranch: undefined,
          deliveryStatus: "delivered",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "Delivered on Sep 18, 2026",
          status: "Inactive",
        };
      case "branch_activated":
        return {
          ...currentCard,
          type: "Debit",
          deliveryMethod: "BRANCH_PICKUP",
          deliveryBranch: "GCB Head Office Branch (High Street, Accra)",
          deliveryAddress: undefined,
          deliveryStatus: "delivered",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "Delivered",
          pickupCode: "4920",
          status: "Active",
        };
      case "doorstep_activated":
        return {
          ...currentCard,
          type: "Debit",
          deliveryMethod: "DELIVERY",
          deliveryAddress: "No. 14 Ridge Road, Cantonments, Accra",
          deliveryBranch: undefined,
          deliveryStatus: "delivered",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "Delivered",
          status: "Active",
        };
      case "virtual_active":
        return {
          ...currentCard,
          type: "Virtual",
          isVirtual: true,
          deliveryStatus: undefined,
          deliveryMethod: undefined,
          deliveryBranch: undefined,
          deliveryAddress: undefined,
          trackingNumber: undefined,
          estimatedDeliveryDate: undefined,
          pickupCode: undefined,
          status: "Active",
        };
      default:
        return currentCard;
    }
  }, [currentCard, deliverySimState]);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    "details" | "pin" | "freeze" | "limits" | "controls" | "reset-pin" | "edit-nickname" | "replace" | "top-up" | "tracking" | "activate" | null
  >(null);

  // Card Activation Form State
  const [activationCvv, setActivationCvv] = useState("");
  const [activationPin, setActivationPin] = useState("");
  const [activationPinConfirm, setActivationPinConfirm] = useState("");

  const handleActivateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (activationCvv.trim().length !== 3) {
      toast.error("Please enter the 3-digit CVV from the back of your card.");
      return;
    }
    if (activationPin.length !== 4) {
      toast.error("PIN must be 4 digits.");
      return;
    }
    if (activationPin !== activationPinConfirm) {
      toast.error("PINs do not match. Please check and re-enter.");
      return;
    }

    setCurrentCard((prev) => ({ ...prev, status: "Active" }));
    setCardStatusInStore(currentCard.id, "Active");
    updateCardInStore(currentCard.id, { status: "Active" });
    if (onUpdateCard) onUpdateCard({ status: "Active" });

    toast.success(`Card "${effectiveCard.name}" activated successfully! All functions are unlocked.`);
    setActiveModal(null);
    setActivationCvv("");
    setActivationPin("");
    setActivationPinConfirm("");
  };

  // Top Up Form State
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpSourceAccountId, setTopUpSourceAccountId] = useState(availableAccounts[0]?.id ?? "");

  const isFundable =
    currentCard.fundable !== false &&
    (currentCard.type === "Virtual" || currentCard.type === "Prepaid" || Boolean(currentCard.isVirtual));

  // Security channel controls
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [intlEnabled, setIntlEnabled] = useState(false);
  const [atmEnabled, setAtmEnabled] = useState(true);

  // Temp form states
  const [tempDaily, setTempDaily] = useState(String(dailyLimit));
  const [tempMonthly, setTempMonthly] = useState(String(monthlyLimit));
  const [tempNickname, setTempNickname] = useState(cardNickname);

  // PIN Verification & Security PIN Countdown State
  const [pinAuthOpen, setPinAuthOpen] = useState(false);
  const [pinCountdown, setPinCountdown] = useState(15);

  useEffect(() => {
    if (activeModal !== "pin") return;

    const interval = setInterval(() => {
      setPinCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveModal(null);
          toast.info("PIN window closed automatically for security.");
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeModal]);

  const handleOpenPinModal = () => {
    setPinAuthOpen(true);
  };

  const handlePinAuthSuccess = () => {
    setPinAuthOpen(false);
    setPinCountdown(15);
    setActiveModal("pin");
    triggerToast("Identity verified. Card PIN revealed.");
  };

  const handleExecuteTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) return;

    const updatedBalance = (currentCard.balance ?? 0) + amt;
    setCurrentCard((prev) => ({ ...prev, balance: updatedBalance }));
    if (onUpdateCard) onUpdateCard({ balance: updatedBalance });

    const newTxn: CardTransaction = {
      id: `c-act-topup-${Date.now()}`,
      cardId: currentCard.id,
      title: "Card Balance Top Up",
      category: "Between Accounts",
      date: "Today",
      amount: amt,
      direction: "credit",
      status: "completed",
    };
    addCardTransaction(newTxn);
    setActivities((prev) => [newTxn, ...prev]);

    triggerToast(
      `Top up successful! Added GHS ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} to ${currentCard.name}`
    );
    setTopUpAmount("");
    setActiveModal(null);
  };

  const triggerToast = (msg: string) => {
    toast.success(msg);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(`Copied ${label} to clipboard`);
  };

  const handleToggleFreeze = () => {
    const nextFrozen = !isFrozen;
    setIsFrozen(nextFrozen);
    const newStatus = nextFrozen ? "Blocked" : "Active";
    setCurrentCard((prev) => ({ ...prev, status: newStatus }));
    if (onUpdateCard) onUpdateCard({ status: newStatus });
    triggerToast(nextFrozen ? "Card frozen successfully" : "Card unfrozen and active");
    setActiveModal(null);
  };

  const handleSaveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    const d = parseFloat(tempDaily);
    const m = parseFloat(tempMonthly);
    if (!isNaN(d) && d > 0) {
      setDailyLimit(d);
      setCurrentCard((prev) => ({ ...prev, spendLimit: d }));
      if (onUpdateCard) onUpdateCard({ spendLimit: d });
    }
    if (!isNaN(m) && m > 0) {
      setMonthlyLimit(m);
    }
    triggerToast("Spending limits updated");
    setActiveModal(null);
  };

  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempNickname.trim()) {
      setCardNickname(tempNickname.trim());
      setCurrentCard((prev) => ({ ...prev, name: tempNickname.trim() }));
      if (onUpdateCard) onUpdateCard({ name: tempNickname.trim() });
      triggerToast("Card nickname updated");
    }
    setActiveModal(null);
  };

  // Extract last 4 digits for masked display
  const maskedLast4 = currentCard.maskedNumber
    ? currentCard.maskedNumber.slice(-4)
    : currentCard.id.slice(-4);
  const displayFullNumber = currentCard.fullNumber ?? `4532 8901 2345 ${maskedLast4}`;
  const displayExpiry = currentCard.expiry ?? "06/27";
  const displayCvv = currentCard.cvv ?? "842";

  // Daily percentage of limit used
  const dailyPct = Math.min(100, Math.max(0, Math.round((dailySpent / (dailyLimit || 1)) * 100)));
  const isInactive = effectiveCard.status === "Inactive";
  const isPreparing = Boolean(
    effectiveCard.deliveryStatus &&
      (effectiveCard.deliveryStatus === "processing" ||
        effectiveCard.deliveryStatus === "in_production" ||
        effectiveCard.deliveryStatus === "in_transit")
  );

  const cardThemeId =
    effectiveCard.colorTheme ||
    (effectiveCard.type === "Virtual"
      ? "blue"
      : effectiveCard.type === "Prepaid"
      ? "maroon"
      : "gold");
  const activeTheme = getCardTheme(cardThemeId);

  return (
    <div className="flex flex-col gap-10 w-full">
      {/* Dev Mode Toolbar State Switcher for Delivery Tracking Simulation */}
      <StateSwitcher
        section="13.9 - Delivery Tracking"
        states={DELIVERY_SIMULATION_STATES}
        value={deliverySimState}
        onChange={setDeliverySimState}
        labels={DELIVERY_SIMULATION_LABELS}
      />

      {/* Back Button & Title Header */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={handleBackNavigation}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          title="Back"
          aria-label="Back"
        >
          <ChevronLeft size={22} strokeWidth={1.8} />
        </button>
        <h1 className="text-[20px] sm:text-[24px] lg:text-[26px] font-medium leading-tight sm:leading-[32px] tracking-[-0.02em] text-foreground truncate">
          {cardNickname || "Virtual Card"}
        </h1>
      </div>

      {/* Main Container matching Figma 1243:25983 w-[905.9px] */}
      <div className="w-full max-w-[920px] flex flex-col gap-8">
        {isPreparing ? (
          /* ========================================================================= */
          /* IN-PRODUCTION / PREPARING STATE HERO (Matching Figma Node 1643:3459)       */
          /* ========================================================================= */
          <div className="flex flex-col items-center justify-center py-6 sm:py-12 gap-8 sm:gap-10 w-full max-w-lg mx-auto animate-in fade-in duration-300">
            {/* Physical Card Artwork matching Selected Card Theme & Reference Design */}
            <div
              style={{ backgroundColor: activeTheme.colorHex }}
              className={`relative w-full max-w-[460px] aspect-[1.586/1] rounded-[20px] overflow-hidden p-6 sm:p-7 flex flex-col justify-between select-none shadow-xl ${activeTheme.textColor}`}
            >
              {/* High-res Card Artwork Background with Expanded Full-Bleed Fill */}
              <img
                src={activeTheme.bgImage}
                alt=""
                className="absolute -inset-[3px] w-[calc(100%+6px)] h-[calc(100%+6px)] max-w-none object-cover scale-[1.03] pointer-events-none select-none"
              />

              {/* Top Row: GCB Logo & Card Type */}
              <div className="relative z-10 flex items-center justify-between">
                <GcbCardLogo themeId={activeTheme.id} className="h-8 sm:h-9 w-auto drop-shadow-xs shrink-0" />
                <span className="text-[14px] sm:text-[15.5px] font-normal tracking-wide opacity-90 capitalize">
                  {effectiveCard.type}
                </span>
              </div>

              {/* Middle Row: Gold EMV Chip with Metallic Sheen + Contactless Waves */}
              <div className="relative z-10 my-auto py-2 flex items-center gap-3.5">
                <EmvChip />
                <Wifi size={22} strokeWidth={2.4} className="rotate-90 opacity-85 shrink-0" />
              </div>

              {/* Bottom Row: Card Holder, Exp, and Visa / Mastercard */}
              <div className="relative z-10 flex items-end justify-between whitespace-nowrap gap-4">
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-[10.5px] sm:text-[11px] font-medium opacity-60 leading-[16px] uppercase tracking-wider">
                    CARD HOLDER
                  </span>
                  <span className="text-[15px] sm:text-[17px] font-medium leading-[22px] tracking-tight uppercase">
                    {effectiveCard.holder || "TSOTSOO MILLS"}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-[10.5px] sm:text-[11px] font-medium opacity-60 leading-[16px] uppercase tracking-wider">
                    EXP
                  </span>
                  <span className="text-[15px] sm:text-[17px] font-medium leading-[22px] tracking-tight font-mono">
                    {displayExpiry || "09/28"}
                  </span>
                </div>

                <div className="shrink-0 flex items-end justify-end pl-2">
                  {effectiveCard.scheme === "Mastercard" ? (
                    <div className="flex -space-x-2 items-center drop-shadow-xs pb-0.5">
                      <div className="size-6 sm:size-7 rounded-full bg-[#eb001b]/95" />
                      <div className="size-6 sm:size-7 rounded-full bg-[#f79e1b]/95" />
                    </div>
                  ) : (
                    <span className="font-sans text-[26px] sm:text-[32px] font-black italic tracking-tighter leading-none opacity-95 drop-shadow-xs">
                      VISA
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Text Details */}
            <div className="flex flex-col gap-3 items-center text-center">
              <h2 className="text-[24px] sm:text-[26px] font-medium text-foreground tracking-[-0.52px]">
                Your card is being prepared
              </h2>
              <p className="text-[15px] sm:text-[16px] text-muted-foreground tracking-[-0.08px]">
                {effectiveCard.estimatedDeliveryDate
                  ? `Estimated readiness: ${effectiveCard.estimatedDeliveryDate}`
                  : "It will be ready within 5-7 days."}
              </p>

              <div className="flex items-center gap-1.5 text-[15px] sm:text-[16px] text-foreground mt-1">
                <MapPin size={16} className="text-foreground shrink-0" />
                <span>
                  {effectiveCard.deliveryMethod === "BRANCH_PICKUP"
                    ? `Pickup Location:  ${effectiveCard.deliveryBranch || "GCB Head Office"}`
                    : `Delivery to:  ${effectiveCard.deliveryAddress || "No. 14 Ridge Road, Cantonments, Accra"}`}
                </span>
              </div>
            </div>

            {/* CTA Button to Track Delivery Progress */}
            <button
              type="button"
              onClick={() => setActiveModal("tracking")}
              className="bg-[#f9c632] hover:bg-[#eab308] text-[#451a03] font-medium h-11 px-5 rounded-[8px] flex items-center gap-2 shadow-xs cursor-pointer text-[14px] transition-colors"
            >
              {effectiveCard.deliveryMethod === "BRANCH_PICKUP" ? (
                <Building2 size={18} />
              ) : (
                <Truck size={18} />
              )}
              <span>Track Delivery Progress</span>
            </button>
          </div>
        ) : (
          /* ========================================================================= */
          /* ACTIVE / INACTIVE HERO STATE WITH TABS (Matching Figma Node 1243:25983)   */
          /* ========================================================================= */
          <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
            {/* Delivery Progress Banner */}
            {effectiveCard.deliveryStatus && (
              <button
                type="button"
                onClick={() => setActiveModal("tracking")}
                className="w-full rounded-2xl bg-muted/40 hover:bg-muted/60 border border-border/80 px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group shadow-xs"
              >
                {/* Left side: Icon + Message */}
                <div className="flex items-center gap-3 min-w-0">
                  {effectiveCard.deliveryMethod === "BRANCH_PICKUP" ? (
                    <div className="size-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <Building2 size={18} />
                    </div>
                  ) : (
                    <div className="size-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <Truck size={18} />
                    </div>
                  )}
                  <span className="text-[15px] sm:text-[16px] font-normal text-foreground truncate">
                    {effectiveCard.deliveryStatus === "in_transit"
                      ? "Your card is on the way!"
                      : "Your card is being prepared"}
                  </span>
                </div>

                {/* Right side: Action link + Chevron */}
                <div className="flex items-center gap-1.5 text-foreground shrink-0 text-[14px] sm:text-[15px] font-normal">
                  <span>Track Delivery</span>
                  <ChevronRight
                    size={16}
                    strokeWidth={1.8}
                    className="text-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </div>
              </button>
            )}

            {/* Top 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch w-full">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Hero Yellow Branded GCB Virtual Card & 3 Action Buttons      */}
          {/* ========================================================================= */}
          <div className="flex flex-col justify-between h-full gap-4 w-full">
            {/* The Branded GCB Card */}
            {(() => {
              const isDarkText =
                activeTheme.textColor.includes("121212") ||
                activeTheme.textColor.includes("zinc-950") ||
                activeTheme.textColor.includes("082f49");
              const btnClass = isDarkText
                ? "bg-black/10 hover:bg-black/20 text-[#082f49]"
                : "bg-white/15 hover:bg-white/25 text-white";
              const badgeClass = isDarkText
                ? "bg-black/15 text-[#082f49] border-black/10"
                : "bg-white/20 text-white border-white/20";

              return (
                <div
                  style={{ backgroundColor: activeTheme.colorHex }}
                  className={`relative flex-1 min-h-[237px] w-full rounded-[15.75px] overflow-hidden p-[18px] flex flex-col justify-between select-none shadow-xs transition-all duration-200 ${
                    activeTheme.textColor
                  }`}
                >
                  {/* High-res Card Artwork Background with Expanded Full-Bleed Fill */}
                  <img
                    src={activeTheme.bgImage}
                    alt=""
                    className="absolute -inset-[3px] w-[calc(100%+6px)] h-[calc(100%+6px)] max-w-none object-cover scale-[1.03] pointer-events-none select-none"
                  />

                  {/* Top Row: GCB Logo & Eye Toggle / Status Badge */}
                  <div className="relative z-10 flex items-center justify-between">
                    <GcbCardLogo themeId={activeTheme.id} className="h-8 sm:h-9 w-auto drop-shadow-xs shrink-0" />
                    <div className="flex items-center gap-2">
                      {isPreparing ? (
                        <span className={`backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badgeClass}`}>
                          {effectiveCard.deliveryStatus === "in_transit" ? "In Transit" : "In Production"}
                        </span>
                      ) : isInactive ? (
                        <span className={`backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badgeClass}`}>
                          Needs Activation
                        </span>
                      ) : isFrozen ? (
                        <span className={`backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badgeClass}`}>
                          Frozen
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setShowCardDetails((prev) => !prev)}
                        className={`size-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${btnClass}`}
                        title={showCardDetails ? "Hide card details" : "Show card details"}
                        aria-label={showCardDetails ? "Hide card details" : "Show card details"}
                      >
                        {showCardDetails ? (
                          <EyeOff size={16} strokeWidth={2} />
                        ) : (
                          <Eye size={16} strokeWidth={2} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Center Row: Card Number & Inline Quick Copy */}
                  <div className="relative z-10 my-auto py-1 flex items-center gap-2.5 text-inherit">
                    <p
                      onClick={() => {
                        if (showCardDetails) {
                          handleCopy(displayFullNumber.replace(/\s/g, ""), "Card Number");
                        }
                      }}
                      className={`font-mono text-[18px] sm:text-[22px] tracking-wider leading-[24px] whitespace-nowrap select-none ${
                        showCardDetails
                          ? "cursor-pointer hover:opacity-85 transition-opacity"
                          : "cursor-default"
                      }`}
                      title={showCardDetails ? "Click to copy card number" : undefined}
                    >
                      {showCardDetails ? displayFullNumber : `•••• •••• •••• ${maskedLast4}`}
                    </p>
                    {showCardDetails && (
                      <button
                        type="button"
                        onClick={() => handleCopy(displayFullNumber.replace(/\s/g, ""), "Card Number")}
                        className={`size-7 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${btnClass}`}
                        title="Copy card number"
                        aria-label="Copy card number"
                      >
                        <Copy size={13} strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  {/* Bottom Row: CARD HOLDER, EXP, CVV & Scheme Logo */}
                  <div className="relative z-10 flex items-end justify-between text-inherit whitespace-nowrap gap-3">
                    {showCardDetails ? (
                      <button
                        type="button"
                        onClick={() => handleCopy(card.holder || "TSOTSOO MILLS", "Cardholder Name")}
                        className="flex flex-col gap-0.5 text-left group cursor-pointer hover:opacity-80 transition-opacity min-w-0"
                        title="Click to copy cardholder name"
                      >
                        <span className="text-[11px] font-medium opacity-60 leading-[16px] uppercase tracking-wider">
                          CARD HOLDER
                        </span>
                        <span className="text-[15px] sm:text-[16px] font-medium leading-[22px] tracking-[-0.05px] uppercase truncate max-w-[140px] sm:max-w-[170px]">
                          {card.holder || "TSOTSOO MILLS"}
                        </span>
                      </button>
                    ) : (
                      <div className="flex flex-col gap-0.5 text-left select-none min-w-0">
                        <span className="text-[11px] font-medium opacity-60 leading-[16px] uppercase tracking-wider">
                          CARD HOLDER
                        </span>
                        <span className="text-[15px] sm:text-[16px] font-medium leading-[22px] tracking-[-0.05px] uppercase truncate max-w-[140px] sm:max-w-[170px]">
                          {card.holder || "TSOTSOO MILLS"}
                        </span>
                      </div>
                    )}

                    <div className="flex items-end gap-3.5 sm:gap-4 shrink-0">
                      {showCardDetails ? (
                        <button
                          type="button"
                          onClick={() => handleCopy(displayExpiry, "Expiry Date")}
                          className="flex flex-col gap-0.5 items-start group cursor-pointer hover:opacity-80 transition-opacity text-left"
                          title="Click to copy expiry date"
                        >
                          <span className="text-[11px] font-medium opacity-60 leading-[16px] uppercase tracking-wider">
                            EXP
                          </span>
                          <span className="text-[14px] sm:text-[15px] font-medium leading-[22px] tracking-[-0.05px] font-mono">
                            {displayExpiry}
                          </span>
                        </button>
                      ) : (
                        <div className="flex flex-col gap-0.5 items-start text-left select-none">
                          <span className="text-[11px] font-medium opacity-60 leading-[16px] uppercase tracking-wider">
                            EXP
                          </span>
                          <span className="text-[14px] sm:text-[15px] font-medium leading-[22px] tracking-[-0.05px] font-mono">
                            {displayExpiry}
                          </span>
                        </div>
                      )}

                      {showCardDetails ? (
                        <button
                          type="button"
                          onClick={() => handleCopy(displayCvv, "CVV")}
                          className="flex flex-col gap-0.5 items-start group cursor-pointer hover:opacity-80 transition-opacity text-left"
                          title="Click to copy CVV"
                        >
                          <span className="text-[11px] font-medium opacity-60 leading-[16px] uppercase tracking-wider">
                            CVV
                          </span>
                          <span className="text-[14px] sm:text-[15px] font-medium leading-[22px] tracking-[-0.05px] font-mono">
                            {displayCvv}
                          </span>
                        </button>
                      ) : (
                        <div className="flex flex-col gap-0.5 items-start text-left select-none">
                          <span className="text-[11px] font-medium opacity-60 leading-[16px] uppercase tracking-wider">
                            CVV
                          </span>
                          <span className="text-[14px] sm:text-[15px] font-medium leading-[22px] tracking-[-0.05px] font-mono">
                            •••
                          </span>
                        </div>
                      )}

                      {/* Scheme Logo */}
                      <div className="h-5 shrink-0 flex items-center justify-end pl-1 pb-0.5">
                        {effectiveCard.scheme === "Mastercard" ? (
                          <div className="flex -space-x-1.5 items-center drop-shadow-xs">
                            <div className="size-4.5 rounded-full bg-[#eb001b]/95" />
                            <div className="size-4.5 rounded-full bg-[#f79e1b]/95" />
                          </div>
                        ) : (
                          <span className="font-bold italic text-[16px] sm:text-[17px] tracking-tighter font-sans drop-shadow-xs leading-none">
                            VISA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Left Column Controls: Preparing vs Inactive (Ready) vs Active */}
            {isPreparing ? (
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => setActiveModal("tracking")}
                  className="w-full rounded-[10px] border border-border bg-card hover:bg-muted/50 py-3 px-4 flex items-center justify-center gap-2 text-[14px] font-medium text-foreground transition-colors cursor-pointer shadow-2xs"
                >
                  <Truck size={17} strokeWidth={1.8} className="text-muted-foreground" />
                  Track Fulfillment & Delivery
                </button>
              </div>
            ) : isInactive ? (
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => setActiveModal("activate")}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary-hover rounded-[10px] py-3 px-4 flex items-center justify-center gap-2 font-medium text-[14px] shadow-2xs cursor-pointer transition-colors"
                >
                  <Sparkles size={17} strokeWidth={1.8} />
                  Activate Card
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 w-full">
                {/* Button 1: Top Up (if fundable) or View Linked Account (if debit) */}
                {isFundable ? (
                  <Link
                    href={`/payments/send?rail=card-topup&cardId=${currentCard.id}`}
                    className="bg-card border border-[#ebebe9] dark:border-border rounded-[8px] py-2.5 sm:py-3 px-2 sm:px-3 flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-muted/60 transition-colors shadow-2xs cursor-pointer group"
                    title="Top up card balance"
                  >
                    <div className="size-[18px] sm:size-[20px] shrink-0 flex items-center justify-center text-[#121212] dark:text-foreground">
                      <PlusCircle size={17} strokeWidth={1.8} />
                    </div>
                    <span className="text-[13px] sm:text-[14px] font-medium text-[#121212] dark:text-foreground whitespace-nowrap">
                      Top Up
                    </span>
                  </Link>
                ) : (
                  <Link
                    href={`/accounts/${currentCard.linkedAccountId || "acc-001"}`}
                    className="bg-card border border-[#ebebe9] dark:border-border rounded-[8px] py-2.5 sm:py-3 px-2 sm:px-3 flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-muted/60 transition-colors shadow-2xs cursor-pointer group"
                    title="View linked bank account"
                  >
                    <div className="size-[18px] sm:size-[20px] shrink-0 flex items-center justify-center text-[#121212] dark:text-foreground">
                      <Landmark size={17} strokeWidth={1.8} />
                    </div>
                    <span className="text-[13px] sm:text-[14px] font-medium text-[#121212] dark:text-foreground whitespace-nowrap">
                      Account
                    </span>
                  </Link>
                )}

                {/* Button 2: Show PIN */}
                <button
                  type="button"
                  onClick={handleOpenPinModal}
                  className="bg-card border border-[#ebebe9] dark:border-border rounded-[8px] py-2.5 sm:py-3 px-2 sm:px-3 flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-muted/60 transition-colors shadow-2xs cursor-pointer group"
                >
                  <div className="size-[18px] sm:size-[20px] shrink-0 flex items-center justify-center text-[#121212] dark:text-foreground">
                    <Grid size={17} strokeWidth={1.8} />
                  </div>
                  <span className="text-[13px] sm:text-[14px] font-medium text-[#121212] dark:text-foreground whitespace-nowrap">
                    Show PIN
                  </span>
                </button>

                {/* Button 3: Block / Unblock */}
                <button
                  type="button"
                  onClick={() => setActiveModal("freeze")}
                  className="bg-card border border-[#ebebe9] dark:border-border rounded-[8px] py-2.5 sm:py-3 px-2 sm:px-3 flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-muted/60 transition-colors shadow-2xs cursor-pointer group"
                >
                  <div className="size-[18px] sm:size-[20px] shrink-0 flex items-center justify-center text-[#121212] dark:text-foreground">
                    <Snowflake size={17} strokeWidth={1.8} />
                  </div>
                  <span className="text-[13px] sm:text-[14px] font-medium text-[#121212] dark:text-foreground whitespace-nowrap">
                    {isFrozen ? "Unblock" : "Block"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Preparation Status vs Activation vs Active Management      */}
          {/* ========================================================================= */}
          {isPreparing ? (
            <div className="flex flex-col justify-between h-full gap-4 w-full">
              {/* Card is being prepared Status Card */}
              <div className="rounded-[15.75px] border border-border/80 bg-card p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0">
                    <Building2 size={18} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-medium text-foreground">Card is being prepared</h3>
                    <p className="text-[12.5px] text-muted-foreground">
                      {effectiveCard.deliveryMethod === "BRANCH_PICKUP"
                        ? `Your card is in production and will be delivered to ${effectiveCard.deliveryBranch || "your selected branch"}.`
                        : `Your card is in production and will be delivered to your address.`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1 text-[13px] text-muted-foreground">
                  <div className="flex items-start gap-2.5">
                    <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>Estimated arrival: {effectiveCard.estimatedDeliveryDate || "3-5 business days"}</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                    <span>You will be able to activate your card once it is ready for pickup or delivered.</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveModal("tracking")}
                    className="w-full text-[13.5px]"
                  >
                    Track Delivery Progress
                  </Button>
                </div>
              </div>

              {/* Delivery Tracking Quick Access */}
              <div className="rounded-[12px] border border-border/70 bg-muted/30 px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Truck size={17} className="text-muted-foreground shrink-0" />
                  <span className="text-[13px] text-muted-foreground truncate">
                    Tracking: {effectiveCard.trackingNumber || "GCB-CRD-882104"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal("tracking")}
                  className="text-[13px] font-medium text-foreground hover:underline shrink-0 cursor-pointer"
                >
                  View status
                </button>
              </div>
            </div>
          ) : isInactive ? (
            <div className="flex flex-col justify-between h-full gap-4 w-full">
              {/* Card Activation Required Card */}
              <div className="rounded-[15.75px] border border-border/80 bg-card p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/15 text-primary-foreground flex items-center justify-center shrink-0">
                    <CreditCard size={18} strokeWidth={1.8} className="text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-medium text-foreground">Card Activation Required</h3>
                    <p className="text-[12.5px] text-muted-foreground">
                      Activate your physical {effectiveCard.type.toLowerCase()} card to unlock features and card controls.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1 text-[13px] text-muted-foreground">
                  <div className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Set your 4-digit PIN for ATM cash withdrawals and POS retail purchases</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Unlock daily spend limits, card security freeze, and balance management</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>Enable contactless tap-to-pay and online merchant payments</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => setActiveModal("activate")}
                    className="w-full h-10 text-[13.5px] bg-primary text-primary-foreground hover:bg-primary-hover"
                  >
                    Activate Card
                  </Button>
                </div>
              </div>

              {/* Delivery Tracking Quick Access if card was dispatched */}
              {effectiveCard.deliveryStatus && (
                <div className="rounded-[12px] border border-border/70 bg-muted/30 px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Truck size={17} className="text-muted-foreground shrink-0" />
                    <span className="text-[13px] text-muted-foreground truncate">
                      Delivery tracking: {effectiveCard.trackingNumber || "GCB-CRD-882104"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal("tracking")}
                    className="text-[13px] font-medium text-foreground hover:underline shrink-0 cursor-pointer"
                  >
                    View status
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full gap-5 w-full">
              {/* Daily Limit Tracker matching Figma Node 1243:26138 */}
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-normal text-[#737373] dark:text-muted-foreground">
                    Daily Limit
                  </span>
                  <span className="text-[14px] font-normal text-[#0a0a0a] dark:text-foreground tabular">
                    GHS {dailySpent.toLocaleString()} / GHS {dailyLimit.toLocaleString()}
                  </span>
                </div>
                <div className="h-[12px] w-full rounded-full bg-[#f6f6f5] dark:bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#ffb200] to-[#f9c632] transition-all duration-500"
                    style={{ width: `${dailyPct}%` }}
                  />
                </div>
              </div>

              {/* 4-Item Grouped Action Menu List Card matching Figma Node 1243:26146 */}
              <div className="rounded-[12px] border border-[#ebebe9] dark:border-border bg-card overflow-hidden divide-y divide-[#ebebe9] dark:divide-border w-full">
                {/* Item 1: Set limits for this card */}
                <button
                  type="button"
                  onClick={() => {
                    setTempDaily(String(dailyLimit));
                    setTempMonthly(String(monthlyLimit));
                    setActiveModal("limits");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-muted text-[#121212] dark:text-foreground flex items-center justify-center shrink-0">
                      <SlidersHorizontal size={16} strokeWidth={1.8} />
                    </div>
                    <span className="text-[14px] font-normal text-[#0a0a0a] dark:text-foreground">
                      Set limits for this card
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-[#737373] group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Item 2: Edit card nickname & account */}
                <button
                  type="button"
                  onClick={() => {
                    setTempNickname(cardNickname);
                    setActiveModal("edit-nickname");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-muted text-[#121212] dark:text-foreground flex items-center justify-center shrink-0">
                      <Sparkles size={16} strokeWidth={1.8} />
                    </div>
                    <span className="text-[14px] font-normal text-[#0a0a0a] dark:text-foreground">
                      Edit card nickname & account
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-[#737373] group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Item 3: Reset PIN */}
                <button
                  type="button"
                  onClick={() => setActiveModal("reset-pin")}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-muted text-[#121212] dark:text-foreground flex items-center justify-center shrink-0">
                      <Key size={16} strokeWidth={1.8} />
                    </div>
                    <span className="text-[14px] font-normal text-[#0a0a0a] dark:text-foreground">
                      Reset PIN
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-[#737373] group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Item 4: Replace card */}
                <button
                  type="button"
                  onClick={() => setActiveModal("replace")}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-muted text-[#121212] dark:text-foreground flex items-center justify-center shrink-0">
                      <CreditCard size={16} strokeWidth={1.8} />
                    </div>
                    <span className="text-[14px] font-normal text-[#0a0a0a] dark:text-foreground">
                      Replace card
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-[#737373] group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Item 5: Track card delivery (if physical card in fulfillment or delivery simulated) */}
                {effectiveCard.deliveryStatus && (
                  <button
                    type="button"
                    onClick={() => setActiveModal("tracking")}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-[32px] rounded-full bg-[#f5f5f5] dark:bg-muted text-[#121212] dark:text-foreground flex items-center justify-center shrink-0">
                        <Truck size={16} strokeWidth={1.8} />
                      </div>
                      <span className="text-[14px] font-normal text-[#0a0a0a] dark:text-foreground">
                        Track delivery & fulfillment
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-[#737373] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SECTION: Activity                                                  */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-3 w-full">
          {/* Heading 3 */}
          <div className="flex items-center justify-between w-full">
            <h3 className="text-[18px] font-medium leading-[26px] tracking-[0.18px] text-[#121212] dark:text-foreground">
              Activity
            </h3>
            <Link
              href="/transactions"
              className="text-[14px] font-normal leading-[20px] tracking-[-0.07px] text-[#121212] dark:text-foreground hover:underline"
            >
              View all
            </Link>
          </div>

          {/* Activity List Container or Empty State */}
          {isInactive ? (
            <div className="rounded-[15.75px] border border-border/80 bg-card p-8 flex flex-col items-center justify-center text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <CreditCard className="size-5 stroke-[1.8]" />
              </div>
              <p className="text-[14px] font-normal text-foreground">Card not activated</p>
              <p className="text-[12px] text-muted-foreground max-w-xs mt-1">
                Activate this card to begin making transactions, online purchases, and ATM withdrawals.
              </p>
            </div>
          ) : activities.length === 0 ? (
            <div className="rounded-[15.75px] border border-border/80 bg-card p-8 flex flex-col items-center justify-center text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <CreditCard className="size-5 stroke-[1.8]" />
              </div>
              <p className="text-[14px] font-normal text-foreground">No card activity yet</p>
              <p className="text-[12px] text-muted-foreground max-w-xs mt-1">
                Transactions, top-ups, and payments made with this card will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-[15.75px] border border-border/80 bg-card overflow-hidden divide-y divide-border/40 w-full">
              {activities.map((item) => {
                const isCredit = item.direction === "credit";
                const isFailed = item.status === "failed";
                const isPending = item.status === "pending";

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3.5 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* Direction Anchor Icon */}
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                        isCredit
                          ? "bg-emerald-500/10 text-[#12B76A] dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="size-4 stroke-[1.8]" />
                      ) : (
                        <ArrowUpRight className="size-4 stroke-[1.8]" />
                      )}
                    </div>

                    {/* Counterparty & Metadata */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="font-normal text-foreground text-[14px] leading-tight truncate">
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground truncate">
                        <span>{item.date}</span>
                        <span>·</span>
                        <span className="truncate">{item.category}</span>
                      </div>
                    </div>

                    {/* Amount & State / Card Ending */}
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      <span
                        className={cn(
                          "tabular text-[14px] font-normal",
                          isCredit ? "text-[#12B76A] dark:text-emerald-400" : "text-foreground"
                        )}
                      >
                        {isCredit ? "+ " : "− "}
                        <RevealingAmount amount={item.amount} currency={currentCard.currency || "GHS"} />
                      </span>
                      {isFailed ? (
                        <span className="text-[11.5px] text-[#F04438] dark:text-rose-400 font-normal">
                          Failed
                        </span>
                      ) : isPending ? (
                        <span className="text-[11.5px] text-[#F79009] dark:text-amber-400 font-normal">
                          Pending
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-muted-foreground">
                          {currentCard.maskedNumber || "•••• 9102"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}
  </div>

      {/* ========================================================================= */}
      {/* MODAL DIALOGS                                                              */}
      {/* ========================================================================= */}

      {/* 1. Top Up Modal */}
      <Dialog open={activeModal === "top-up"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Top up {currentCard.name}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleExecuteTopUp}>
            <DialogBody>
              {/* Current Balance */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                <span className="text-[12px] text-muted-foreground">Current Card Balance</span>
                <span className="text-[14px] font-medium text-foreground tabular">
                  GHS {(currentCard.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Source Account */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Fund from Account</label>
                <select
                  value={topUpSourceAccountId}
                  onChange={(e) => setTopUpSourceAccountId(e.target.value)}
                  className="w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3 py-2.5 text-[13.5px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  {availableAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — GHS {acc.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Top Up Amount */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Top Up Amount (GHS)</label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  required
                  className="rounded-xl h-11 text-[14px] tabular"
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}
              >
                Top Up Now
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Show PIN (Revealed) Modal */}
      <Dialog
        open={activeModal === "pin"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setPinCountdown(15);
          }
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Security PIN</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="py-2 flex flex-col items-center justify-center gap-3 text-center">
              <div className="flex gap-3 justify-center">
                {["4", "8", "2", "1"].map((digit, idx) => (
                  <div
                    key={idx}
                    className="size-12 rounded-xl bg-muted border border-border flex items-center justify-center text-[22px] font-medium font-mono text-foreground shadow-inner"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full font-medium mt-1">
                <Clock size={13} className="animate-pulse" />
                <span>Closing in {pinCountdown}s</span>
              </div>

              <p className="text-[12px] text-muted-foreground mt-1">
                This window will close automatically for your security. Do not share your PIN.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveModal(null);
                setPinCountdown(15);
              }}
              className="w-full cursor-pointer text-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal Transaction PIN Modal matching Payment Flow */}
      <TransactionPinModal
        open={pinAuthOpen}
        onOpenChange={setPinAuthOpen}
        onSuccess={handlePinAuthSuccess}
      />

      {/* 3. Freeze Card Confirmation Modal */}
      <Dialog open={activeModal === "freeze"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{isFrozen ? "Unfreeze Card?" : "Freeze Card?"}</DialogTitle>
          </DialogHeader>

          <div className="px-5 sm:px-6 py-5 text-[13.5px] text-muted-foreground leading-relaxed">
            {isFrozen
              ? "Unfreezing will immediately re-enable payments and transactions on this card."
              : "Freezing will temporarily block all new transactions, online payments, and ATM withdrawals."}
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              variant={isFrozen ? "default" : "destructive"}
              size="sm"
              onClick={handleToggleFreeze}
            >
              {isFrozen ? "Unfreeze Card" : "Freeze Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Set Limits Modal */}
      <Dialog open={activeModal === "limits"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Adjust Spending Limits</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLimits}>
            <DialogBody>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="daily-limit-input" className="text-[12.5px] font-medium text-foreground">
                  Daily Limit (GHS)
                </label>
                <Input
                  id="daily-limit-input"
                  type="number"
                  min="100"
                  max={maxDailyCap}
                  value={tempDaily}
                  onChange={(e) => setTempDaily(e.target.value)}
                  placeholder="5000"
                  className="h-10 text-[13.5px] tabular"
                />
                <span className="text-[11px] text-muted-foreground">
                  Current spend today: GHS {dailySpent.toLocaleString()} · Maximum cap: GHS {maxDailyCap.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="monthly-limit-input" className="text-[12.5px] font-medium text-foreground">
                  Monthly Limit (GHS)
                </label>
                <Input
                  id="monthly-limit-input"
                  type="number"
                  min="500"
                  max={maxMonthlyCap}
                  value={tempMonthly}
                  onChange={(e) => setTempMonthly(e.target.value)}
                  placeholder="15000"
                  className="h-10 text-[13.5px] tabular"
                />
                <span className="text-[11px] text-muted-foreground">Maximum available cap: GHS {maxMonthlyCap.toLocaleString()}</span>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Limits
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Card Controls Modal */}
      <Dialog open={activeModal === "controls"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Card Controls & Channels</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/40 cursor-pointer">
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Online Checkout</span>
                  <span className="text-[11.5px] text-muted-foreground">E-commerce & web transactions</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={onlineEnabled}
                onChange={(e) => {
                  setOnlineEnabled(e.target.checked);
                  triggerToast(`Online payments ${e.target.checked ? "enabled" : "disabled"}`);
                }}
                className="size-4.5 rounded accent-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/40 cursor-pointer">
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">International Usage</span>
                  <span className="text-[11.5px] text-muted-foreground">Cross-border foreign exchange payments</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={intlEnabled}
                onChange={(e) => {
                  setIntlEnabled(e.target.checked);
                  triggerToast(`International transactions ${e.target.checked ? "enabled" : "disabled"}`);
                }}
                className="size-4.5 rounded accent-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/40 cursor-pointer">
              <div className="flex items-center gap-3">
                <CreditCard size={18} className="text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">ATM Cash Withdrawals</span>
                  <span className="text-[11.5px] text-muted-foreground">Physical terminal cash access</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={atmEnabled}
                onChange={(e) => {
                  setAtmEnabled(e.target.checked);
                  triggerToast(`ATM withdrawals ${e.target.checked ? "enabled" : "disabled"}`);
                }}
                className="size-4.5 rounded accent-primary"
              />
            </label>
          </DialogBody>

          <DialogFooter>
            <Button size="sm" onClick={() => setActiveModal(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Unblock / Reset PIN Modal */}
      <Dialog open={activeModal === "reset-pin"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Reset Card PIN</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-pin-input" className="text-[12.5px] font-medium text-foreground">New 4-Digit PIN</label>
              <Input id="new-pin-input" type="password" maxLength={4} placeholder="••••" className="h-10 tracking-widest text-[16px]" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-pin-input" className="text-[12.5px] font-medium text-foreground">Confirm New PIN</label>
              <Input id="confirm-pin-input" type="password" maxLength={4} placeholder="••••" className="h-10 tracking-widest text-[16px]" />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                triggerToast("PIN reset successfully");
                setActiveModal(null);
              }}
            >
              Update PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Edit Nickname Modal */}
      <Dialog open={activeModal === "edit-nickname"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Edit Card Nickname</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveNickname}>
            <DialogBody>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="card-nickname-input" className="text-[12.5px] font-medium text-foreground">Card Nickname</label>
                <Input
                  id="card-nickname-input"
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  placeholder="AWS & SaaS Virtual Card"
                  className="h-10 text-[13.5px]"
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 8. Replace Card Modal */}
      <Dialog open={activeModal === "replace"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Request Card Replacement</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[12.5px] flex items-start gap-2.5">
              <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                Replacing this card will block current card numbers (`•••• {maskedLast4}`) immediately and issue new virtual card credentials.
              </span>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                triggerToast("Card replacement requested. New card issued.");
                setActiveModal(null);
              }}
            >
              Request Replacement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Activate Card Modal */}
      <Dialog open={activeModal === "activate"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Activate {effectiveCard.name}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleActivateCard}>
            <DialogBody className="space-y-4">
              {/* Card Summary Badge */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-primary/15 text-primary-foreground flex items-center justify-center shrink-0">
                    <CreditCard size={18} strokeWidth={1.8} className="text-foreground" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-medium text-foreground">{effectiveCard.name}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {effectiveCard.scheme} {effectiveCard.type} · {effectiveCard.maskedNumber || "•••• 9102"}
                    </p>
                  </div>
                </div>
                <span className="text-[11.5px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Inactive
                </span>
              </div>

              {/* CVV Input */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-normal text-foreground">
                  3-Digit CVV Security Code
                </label>
                <Input
                  type="text"
                  maxLength={3}
                  placeholder="e.g. 842"
                  value={activationCvv}
                  onChange={(e) => setActivationCvv(e.target.value.replace(/\D/g, ""))}
                  className="font-mono text-center tracking-widest text-[16px]"
                  required
                />
                <p className="text-[11.5px] text-muted-foreground">
                  Found on the signature strip on the back of your physical card.
                </p>
              </div>

              {/* Set 4-digit PIN */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-foreground">
                    Set 4-Digit Card PIN
                  </label>
                  <Input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={activationPin}
                    onChange={(e) => setActivationPin(e.target.value.replace(/\D/g, ""))}
                    className="font-mono text-center tracking-widest text-[16px]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-foreground">
                    Confirm 4-Digit PIN
                  </label>
                  <Input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={activationPinConfirm}
                    onChange={(e) => setActivationPinConfirm(e.target.value.replace(/\D/g, ""))}
                    className="font-mono text-center tracking-widest text-[16px]"
                    required
                  />
                </div>
              </div>
              <p className="text-[11.5px] text-muted-foreground">
                This PIN will be required for ATM cash withdrawals and point-of-sale transactions.
              </p>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover">
                Activate Card
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 10. Card Delivery Tracker Modal */}
      <CardDeliveryTrackerModal
        card={effectiveCard}
        open={activeModal === "tracking"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      />
    </div>
  );
}
