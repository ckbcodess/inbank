/* eslint-disable @next/next/no-img-element */
"use client";

import { NetworkLogo } from "@/components/cards/NetworkLogo";
import { securityCodeLabel } from "@/lib/card-schemes";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  RefreshCw,
  Globe,
  Key,
  PlusCircle,
  Sparkles,
  Truck,
  Check,
  MapPin,
  Wifi,
  Bike,
  Phone,
  Copy,
  Gauge,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
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
import { InlineError } from "@/components/ui/inline-error";

import { Input } from "@/components/ui/input";
import {
  accountsForProfile,
  formatMoney,
  type PaymentCard,
  type CardTransaction,
  getCardTransactions,
  addCardTransaction,
  setCardStatus as setCardStatusInStore,
  updateCard as updateCardInStore,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { CardFace, themeForCard } from "@/components/cards/CardFace";
import { EmvChip } from "@/components/cards/EmvChip";
import { GcbCardLogo } from "@/components/cards/GcbCardLogo";
import { TiltCard3D } from "@/components/cards/TiltCard3D";
import { RevealingAmount, useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { CardDeliveryTrackerModal } from "@/components/cards/CardDeliveryTracker";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { toast } from "sonner";
import { ActionTile } from "@/components/ui/action-tile";
import { RoundAction } from "@/components/ui/round-action";
import { KeypadIcon } from "@/components/ui/keypad-icon";
import { cn } from "@/lib/utils";
import { useContextualBack } from "@/lib/contextual-back";
import { SmoothCollapse } from "@/components/ui/smooth-height";


import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
export type DeliverySimulationState =
  | "default"
  | "branch_processing"
  | "doorstep_processing"
  | "doorstep_out_for_delivery"
  | "branch_ready_unactivated"
  | "doorstep_delivered_unactivated"
  | "branch_activated"
  | "doorstep_activated"
  | "virtual_active";

export const DELIVERY_SIMULATION_STATES: readonly DeliverySimulationState[] = [
  "default",
  "branch_processing",
  "doorstep_processing",
  "doorstep_out_for_delivery",
  "branch_ready_unactivated",
  "doorstep_delivered_unactivated",
  "branch_activated",
  "doorstep_activated",
  "virtual_active",
] as const;

export const DELIVERY_SIMULATION_LABELS: Record<DeliverySimulationState, string> = {
  default: "Default (Card State)",
  branch_processing: "1. Branch · Being Processed (Inactive)",
  doorstep_processing: "2a. Doorstep · In Transit (Inactive)",
  doorstep_out_for_delivery: "2b. Doorstep · Out for Delivery / Rider Assigned (Inactive)",
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
  /** Dev Mode: extra state groups from the route (the page-level loading / empty / error states). */
  extraDevGroups?: DevStateGroup[];
}

/** A row in the card's list: the app's default tile (as on Account Details), with the current value before the chevron. */
function ManageRow({
  icon,
  title,
  description,
  value,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean | "true" | "false" }>;
  title: string;
  /** Only when the title alone doesn't say what's behind it. */
  description?: string;
  /** What it is set to now. */
  value?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <ActionTile
      icon={icon}
      title={title}
      description={description}
      trailing={value ? <span className="-mr-2 max-w-[10rem] truncate text-[13px] text-muted-foreground">{value}</span> : undefined}
      disabled={disabled}
      onClick={onClick}
    />
  );
}

/** One line of the card-details sheet: label over value, with a copy button when the value is worth copying. */
function DetailLine({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <span className="tabular truncate text-[16px] tracking-[-0.01em] text-foreground">{value}</span>
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-hover hover:bg-muted hover:text-foreground"
        >
          <Copy size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** How long the card details stay on screen after the PIN. */
const DETAILS_SECONDS = 15;

type BlockReason = "misplaced" | "lost_stolen" | "fraud" | "budgeting" | "other";

const BLOCK_REASONS: { id: BlockReason; title: string }[] = [
  { id: "misplaced", title: "Misplaced temporarily" },
  { id: "lost_stolen", title: "Lost or stolen" },
  { id: "fraud", title: "Suspected fraud" },
  { id: "budgeting", title: "Spending control" },
  { id: "other", title: "Other reason" },
];

function BlockReasonDialog({
  open,
  onOpenChange,
  cardName,
  last4,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardName: string;
  last4: string;
}) {
  const [reason, setReason] = useState<BlockReason>("misplaced");
  const [otherDetails, setOtherDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onOpenChange(false);
      toast.success("Card blocked · Reason recorded", {
        description: "Your security preferences have been saved. Unblocking will require your PIN.",
      });
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
              <Lock size={17} strokeWidth={1.9} />
            </div>
            <div>
              <DialogTitle>Why are you blocking this card?</DialogTitle>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {cardName} (•••• {last4}) is now blocked.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-3">
            <div role="radiogroup" aria-label="Reason for blocking card" className="flex flex-col gap-1.5">
              {BLOCK_REASONS.map((item) => {
                const isSelected = reason === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setReason(item.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-hover outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      isSelected
                        ? "border-[var(--active-border)] bg-[var(--active-bg)]"
                        : "border-border bg-card hover:bg-muted/40",
                    )}
                  >
                    <span className="text-[13px] font-medium text-foreground">{item.title}</span>
                    <div
                      className={cn(
                        "size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40 bg-transparent",
                      )}
                    >
                      {isSelected && <div className="size-1.5 rounded-full bg-background" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {reason === "other" && (
              <div className="pt-1 animate-in fade-in duration-200">
                <Field label="Additional details" optional>
                  <Input
                    value={otherDetails}
                    onChange={(e) => setOtherDetails(e.target.value)}
                    placeholder="E.g. Damaged chip, replacing soon..."
                    className="text-[13px]"
                  />
                </Field>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
                toast.success("Card blocked", { description: "Unblocking it will ask for your PIN." });
              }}
            >
              Skip
            </Button>
            <Button type="submit" loading={submitting}>
              Done
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VirtualCardDetailsView({
  card,
  onUpdateCard,
  extraDevGroups,
}: VirtualCardDetailsViewProps) {
  const { handleBack: handleBackNavigation } = useContextualBack("/cards");
  const activeProfile = useSession((s) => s.activeProfile);
  const actor = useSession((s) => s.actor);
  const availableAccounts = accountsForProfile(activeProfile?.kind ?? "RETAIL");

  // Delivery Tracking State Simulation (Controlled via Dev Mode Switcher)
  const [deliverySimState, setDeliverySimState] = useState<DeliverySimulationState>("default");

  // Local reactive states
  // Dev Mode: show this page as any kind of card, blocked or not, with or without activity. "real" is the card as it is.
  const [typeSim, setTypeSim] = useState<"real" | PaymentCard["type"]>("real");
  const [statusSim, setStatusSim] = useState<"real" | "active" | "blocked">("real");
  const [activitySim, setActivitySim] = useState<"live" | "none">("live");
  const asType = (c: PaymentCard, t: "real" | PaymentCard["type"]): PaymentCard =>
    t === "real"
      ? c
      : {
          ...c,
          type: t,
          isVirtual: t === "Virtual",
          fundable: t !== "Debit",
          balance: t === "Debit" ? null : c.balance ?? 1250,
        };

  const [currentCard, setCurrentCard] = useState<PaymentCard>(card);
  const [isFrozen, setIsFrozen] = useState(card.status === "Blocked");

  useEffect(() => {
    setCurrentCard(asType(card, typeSim));
    setIsFrozen(statusSim === "real" ? card.status === "Blocked" : statusSim === "blocked");
  }, [card, typeSim, statusSim]);

  // Dynamic card activity list linked to card ID
  const [allActivities, setActivities] = useState<CardTransaction[]>(() => getCardTransactions(card.id));
  const activities = useMemo(() => (activitySim === "none" ? [] : allActivities), [allActivities, activitySim]);

  // Compute daily spend dynamically from actual card transactions
  const liveSpent = useMemo(() => {
    return activities
      .filter((a) => a.direction === "debit")
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [activities]);

  // `null` is a limit nobody has set (a physical card is issued without one). Only an absent value falls back to 5,000.
  const [cardLimit, setDailyLimit] = useState<number | null>(card.spendLimit === null ? null : card.spendLimit ?? 5000);
  // Dev Mode: pretend any amount spent today and any daily limit, to see every state of the limit tile.
  // "live" / "card" are the real numbers; "custom" asks for an amount.
  const [spentSim, setSpentSim] = useState("live");
  const [limitSim, setLimitSim] = useState("card");
  const [spentCustom, setSpentCustom] = useState(0);
  const [limitCustom, setLimitCustom] = useState(0);
  const dailySpent = spentSim === "live" ? liveSpent : spentSim === "custom" ? spentCustom : Number(spentSim);
  const dailyLimit: number | null =
    limitSim === "card" ? cardLimit : limitSim === "none" ? null : limitSim === "custom" ? limitCustom : Number(limitSim);
  const [maxDailyCap] = useState(20000);
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
          deliveryMethod: "BRANCH_PICKUP",
          deliveryBranch: currentCard.deliveryBranch || "GCB Head Office Branch (High Street, Accra)",
          deliveryAddress: undefined,
          deliveryStatus: "in_production",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "3-5 business days",
          pickupCode: currentCard.pickupCode || "4920",
          status: "Inactive",
        };
      case "doorstep_processing":
        return {
          ...currentCard,
          deliveryMethod: "DELIVERY",
          deliveryAddress: currentCard.deliveryAddress || "No. 14 Ridge Road, Cantonments, Accra",
          deliveryBranch: undefined,
          deliveryStatus: "in_transit",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "3-5 business days",
          status: "Inactive",
        };
      case "doorstep_out_for_delivery":
        return {
          ...currentCard,
          deliveryMethod: "DELIVERY",
          deliveryAddress: currentCard.deliveryAddress || "No. 14 Ridge Road, Cantonments, Accra",
          deliveryBranch: undefined,
          deliveryStatus: "out_for_delivery",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "Today • 2:00 PM - 3:30 PM",
          deliveryCode: currentCard.deliveryCode || "8419",
          courierRider: currentCard.courierRider || {
            name: "Kofi Mensah",
            phone: "+233 24 456 7890",
            company: "GCB Express Courier",
            vehicleType: "Dispatch Motorbike",
            vehiclePlate: "GT-5842-24",
            estimatedArrival: "Today between 2:00 PM – 3:30 PM",
          },
          status: "Inactive",
        };
      case "branch_ready_unactivated":
        return {
          ...currentCard,
          deliveryMethod: "BRANCH_PICKUP",
          deliveryBranch: currentCard.deliveryBranch || "GCB Head Office Branch (High Street, Accra)",
          deliveryAddress: undefined,
          deliveryStatus: "ready_for_pickup",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "Ready for Pickup",
          pickupCode: currentCard.pickupCode || "4920",
          status: "Inactive",
        };
      case "doorstep_delivered_unactivated":
        return {
          ...currentCard,
          deliveryMethod: "DELIVERY",
          deliveryAddress: currentCard.deliveryAddress || "No. 14 Ridge Road, Cantonments, Accra",
          deliveryBranch: undefined,
          deliveryStatus: "delivered",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "Delivered",
          status: "Inactive",
        };
      case "branch_activated":
        return {
          ...currentCard,
          deliveryMethod: "BRANCH_PICKUP",
          deliveryBranch: currentCard.deliveryBranch || "GCB Head Office Branch (High Street, Accra)",
          deliveryAddress: undefined,
          deliveryStatus: "delivered",
          trackingNumber: baseTracking,
          estimatedDeliveryDate: "Delivered",
          pickupCode: currentCard.pickupCode || "4920",
          status: "Active",
        };
      case "doorstep_activated":
        return {
          ...currentCard,
          deliveryMethod: "DELIVERY",
          deliveryAddress: currentCard.deliveryAddress || "No. 14 Ridge Road, Cantonments, Accra",
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
    "details" | "pin" | "limits" | "controls" | "reset-pin" | "edit-nickname" | "replace" | "top-up" | "tracking" | "activate" | "activity" | null
  >(null);
  const [initialTrackerView, setInitialTrackerView] = useState<"timeline" | "pickup-code">("timeline");

  // Card Activation Form State
  const [activationCvv, setActivationCvv] = useState("");
  const [activationPin, setActivationPin] = useState("");
  const [activationPinConfirm, setActivationPinConfirm] = useState("");

  const [activationError, setActivationError] = useState("");

  const handleActivateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (activationCvv.trim().length !== 3) {
      setActivationError("Enter the 3-digit CVV from the back of your card.");
      return;
    }
    if (activationPin.length !== 4) {
      setActivationError("Your PIN must be 4 digits.");
      return;
    }
    if (activationPin !== activationPinConfirm) {
      setActivationError("PINs don’t match. Check and re-enter them.");
      setActivationPinConfirm("");
      return;
    }
    setActivationError("");

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
  const [topUpSourceAccountId, setTopUpSourceAccountId] = useState(
    availableAccounts.find((a) => a.id === card.linkedAccountId)?.id ?? availableAccounts[0]?.id ?? "",
  );

  const isFundable =
    currentCard.fundable !== false &&
    (currentCard.type === "Virtual" || currentCard.type === "Prepaid" || Boolean(currentCard.isVirtual));
  // A virtual card has no PIN: it is only ever used online, so nothing about a PIN is shown for it.
  const hasPin = !(currentCard.type === "Virtual" || currentCard.isVirtual);

  // Security channel controls
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [intlEnabled, setIntlEnabled] = useState(false);
  const [atmEnabled, setAtmEnabled] = useState(true);

  // Temp form states
  const [tempDaily, setTempDaily] = useState(dailyLimit === null ? "" : String(dailyLimit));
  const [tempNickname, setTempNickname] = useState(cardNickname);

  // PIN Verification & Security PIN Countdown State
  const [pinAuthOpen, setPinAuthOpen] = useState(false);
  const [pinCountdown, setPinCountdown] = useState(15);

  // Card Activation Authorization State (Requires 4-digit PIN before showing Activation Modal)
  const [activateAuthOpen, setActivateAuthOpen] = useState(false);

  // Card details (number, expiry, security code) are shown only after the PIN (or a one-time code) is entered.
  const [detailsAuthOpen, setDetailsAuthOpen] = useState(false);
  // Reset PIN OTP Authorization state
  const [resetPinAuthOpen, setResetPinAuthOpen] = useState(false);
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetConfirmPin, setResetConfirmPin] = useState("");
  // Blocking is instant (it only ever makes the card safer); unblocking asks for the PIN first.
  const [unblockAuthOpen, setUnblockAuthOpen] = useState(false);
  const handleDetailsAuthSuccess = () => {
    setDetailsAuthOpen(false);
    setDetailsCountdown(DETAILS_SECONDS);
    setActiveModal("details");
  };
  // ...and they close themselves after a short while, like the PIN view, with the seconds left shown.
  const [detailsCountdown, setDetailsCountdown] = useState(DETAILS_SECONDS);
  useEffect(() => {
    if (activeModal !== "details") return;
    const interval = setInterval(() => {
      setDetailsCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveModal(null);
          toast.info("Card details closed automatically for security.");
          return DETAILS_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeModal]);

  const handleOpenActivate = () => {
    setActivateAuthOpen(true);
  };

  const handleActivateAuthSuccess = () => {
    setActivateAuthOpen(false);
    setActiveModal("activate");
    triggerToast("Identity confirmed. Please set up your card PIN.");
  };

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

  const handleOpenResetPin = () => {
    setResetPinAuthOpen(true);
  };

  const handleResetPinAuthSuccess = () => {
    setResetPinAuthOpen(false);
    setResetNewPin("");
    setResetConfirmPin("");
    setActiveModal("reset-pin");
    triggerToast("Identity verified. Please enter your new card PIN.");
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

  const [blockReasonOpen, setBlockReasonOpen] = useState(false);

  const handleToggleFreeze = () => {
    const nextFrozen = !isFrozen;
    setIsFrozen(nextFrozen);
    const newStatus = nextFrozen ? "Blocked" : "Active";
    setCurrentCard((prev) => ({ ...prev, status: newStatus }));
    // Write through to the shared card store so the Cards page and dashboard agree.
    setCardStatusInStore(currentCard.id, newStatus);
    if (onUpdateCard) onUpdateCard({ status: newStatus });
    if (nextFrozen) {
      setBlockReasonOpen(true);
    } else {
      triggerToast("Card unblocked and active");
    }
    setActiveModal(null);
  };

  const handleSaveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    const d = parseFloat(tempDaily);
    if (isNaN(d) || d <= 0) return;
    setDailyLimit(d);
    setLimitSim("card");
    setCurrentCard((prev) => ({ ...prev, spendLimit: d }));
    updateCardInStore(currentCard.id, { spendLimit: d });
    if (onUpdateCard) onUpdateCard({ spendLimit: d });
    triggerToast("Daily limit updated");
    setActiveModal(null);
  };

  const handleSaveNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempNickname.trim()) {
      setCardNickname(tempNickname.trim());
      setCurrentCard((prev) => ({ ...prev, name: tempNickname.trim() }));
      updateCardInStore(currentCard.id, { name: tempNickname.trim() });
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
  const askAmount = (title: string, current: number) => {
    if (typeof window === "undefined") return null;
    const raw = window.prompt(title, String(current));
    if (raw === null) return null;
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const limitDevGroups = useMemo<DevStateGroup[]>(
    () => [
      ...(extraDevGroups ?? []),
      {
        label: "Card type",
        states: [
          { id: "real", label: "This card's own" },
          { id: "Debit", label: "Debit" },
          { id: "Prepaid", label: "Prepaid" },
          { id: "Virtual", label: "Virtual" },
        ],
        value: typeSim,
        onChange: (v) => setTypeSim(v as typeof typeSim),
      },
      {
        label: "Card status",
        states: [
          { id: "real", label: "This card's own" },
          { id: "active", label: "Active" },
          { id: "blocked", label: "Blocked" },
        ],
        value: statusSim,
        onChange: (v) => setStatusSim(v as typeof statusSim),
      },
      {
        label: "Card activity",
        states: [
          { id: "live", label: "Live" },
          { id: "none", label: "None yet" },
        ],
        value: activitySim,
        onChange: (v) => setActivitySim(v as typeof activitySim),
      },
      {
        label: "Spent today",
        states: [
          { id: "live", label: "Live" },
          ...[0, 140, 1240, 2500, 4000, 4750, 5000].map((n) => ({ id: String(n), label: `GHS ${n.toLocaleString()}` })),
          { id: "custom", label: spentSim === "custom" ? `Custom: GHS ${spentCustom.toLocaleString()}` : "Custom amount…" },
        ],
        value: spentSim,
        onChange: (v) => {
          if (v === "custom") {
            const n = askAmount("Spent today (GHS)", spentCustom || dailySpent);
            if (n === null) return;
            setSpentCustom(n);
          }
          setSpentSim(v);
        },
      },
      {
        label: "Daily limit",
        states: [
          { id: "card", label: "Card's own" },
          { id: "none", label: "Not set" },
          ...[1000, 5000, 10000, 20000].map((n) => ({ id: String(n), label: `GHS ${n.toLocaleString()}` })),
          { id: "custom", label: limitSim === "custom" ? `Custom: GHS ${limitCustom.toLocaleString()}` : "Custom amount…" },
        ],
        value: limitSim,
        onChange: (v) => {
          if (v === "custom") {
            const n = askAmount("Daily limit (GHS)", limitCustom || dailyLimit || 0);
            if (n === null) return;
            setLimitCustom(n);
          }
          setLimitSim(v);
        },
      },
    ],
    [extraDevGroups, typeSim, statusSim, activitySim, spentSim, limitSim, spentCustom, limitCustom, dailySpent, dailyLimit],
  );
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();
  const isInactive = effectiveCard.status === "Inactive";
  const isInactiveDelivery = Boolean(
    effectiveCard.deliveryStatus &&
      effectiveCard.status === "Inactive"
  );

  // The same theme the Cards page picks, so the card looks the same on both.
  const activeTheme = themeForCard(effectiveCard);

  // The shared card face, the same one the Cards page draws, with the block state applied.
  const cardNode = (
    <div className="relative mx-auto w-full max-w-[360px] lg:w-[78%] lg:max-w-none">
      <CardFace card={{ ...effectiveCard, status: isFrozen ? "Blocked" : effectiveCard.status }} />
    </div>
  );

  // Under the round actions: where the card is in its delivery, one tap to the tracker.
  const deliveryBannerNode = (
    <SmoothCollapse open={Boolean(effectiveCard.deliveryStatus)} className="w-full">
      <div className="pt-5">
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
                      {effectiveCard.deliveryStatus === "out_for_delivery"
                        ? "Your card is being delivered to you!"
                        : effectiveCard.deliveryStatus === "in_transit"
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
                      className="text-foreground transition-transform"
                    />
                  </div>
                </button>
      </div>
    </SmoothCollapse>
  );

  const controlsNode = isInactive ? (
                <div className="w-full">
                  <button
                    type="button"
                    onClick={handleOpenActivate}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary-hover rounded-[10px] py-3 px-4 flex items-center justify-center gap-2 font-medium text-[14px] shadow-2xs cursor-pointer transition-colors"
                  >
                    <Sparkles size={17} strokeWidth={1.8} />
                    Activate Card
                  </button>
                </div>
              ) : (
                <div className="flex w-full flex-col">
                  <div className="flex flex-col gap-3">
                  <div className="mx-auto flex w-full max-w-[360px] items-start justify-between lg:w-[78%] lg:max-w-none">
                    {/* The first action follows the money: a card that holds some leads with Top Up, a debit card (which
                        holds none) with its PIN. Details and activity then follow on every card, in the same order. */}
                    {isFundable ? (
                      <RoundAction
                        icon={PlusCircle}
                        label="Top Up"
                        href={`/payments/send?rail=card-topup&cardId=${currentCard.id}`}
                        title="Top Up Card Balance"
                      />
                    ) : (
                      hasPin && <RoundAction icon={KeypadIcon} label="Show Card PIN" onClick={handleOpenPinModal} disabled={isFrozen} />
                    )}
                    <RoundAction icon={CreditCard} label="View Details" onClick={() => setDetailsAuthOpen(true)} />
                    <RoundAction
                      icon={isFrozen ? Unlock : Lock}
                      label={isFrozen ? "Unblock Card" : "Block Card"}
                      onClick={() => (isFrozen ? setUnblockAuthOpen(true) : handleToggleFreeze())}
                    />
                  </div>
                  {isFrozen && !isFundable && hasPin && (
                    <p className="text-center text-[12px] text-muted-foreground">Unblock the card to view its PIN</p>
                  )}
                  </div>
                  {deliveryBannerNode}
                </div>
              );

  const inactiveNode = (
              <div className="flex flex-col gap-4 w-full">
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
                      <Check size={16} className="text-success-text shrink-0 mt-0.5" />
                      <span>Set your 4-digit PIN for ATM cash withdrawals and POS retail purchases</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Check size={16} className="text-success-text shrink-0 mt-0.5" />
                      <span>Unlock daily spend limits, card blocking, and balance management</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Check size={16} className="text-success-text shrink-0 mt-0.5" />
                      <span>Enable contactless tap-to-pay and online merchant payments</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={handleOpenActivate}
                      className="w-full h-10 text-[13.5px] bg-primary text-primary-foreground hover:bg-primary-hover"
                    >
                      Activate Card
                    </Button>
                  </div>
                </div>

                {/* Delivery Tracking Quick Access if card was dispatched */}
                <SmoothCollapse open={Boolean(effectiveCard.deliveryStatus)} className="w-full">
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
                </SmoothCollapse>
              </div>
  );

  const limitNode = (
    <ManageRow
      icon={Gauge}
      title="Daily Limits"
      value={dailyLimit === null ? "Not set" : `GHS ${dailyLimit.toLocaleString()} a day`}
      onClick={() => {
        setTempDaily(dailyLimit === null ? "" : String(dailyLimit));
        setActiveModal("limits");
      }}
    />
  );

  // The number that leads the page. A prepaid or virtual card holds its own money: what can be spent is that
  // balance, held down by what the daily limit still allows. A debit card holds none, so it says which account
  // it spends from, and that is the way to the account.
  const fundsAccount = availableAccounts.find((a) => a.id === currentCard.linkedAccountId);
  const funds = currentCard.balance ?? 0;
  const fundsCurrency = currentCard.currency || "GHS";
  // One quiet line under the card, the way Wise captions its card: what it is, then the figure. A card that holds
  // money says what is available; a debit card says which account it is linked to, and is the way to it.
  const availableNode = isInactive ? null : isFundable ? (
    <div className="flex h-8 items-center justify-center gap-2 text-[14px]">
      <span className="text-muted-foreground">Balance</span>
      <span className="tabular font-medium text-foreground">
        <RevealingAmount amount={funds} currency={fundsCurrency} />
      </span>
      <button
        type="button"
        onClick={toggleAmountVisibility}
        aria-label={showAmounts ? "Hide balances" : "Show balances"}
        className="-mx-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-hover hover:text-foreground"
      >
        {showAmounts ? <EyeOff size={15} strokeWidth={1.8} aria-hidden="true" /> : <Eye size={15} strokeWidth={1.8} aria-hidden="true" />}
      </button>
    </div>
  ) : fundsAccount ? (
    <Link
      href={`/accounts/${fundsAccount.id}`}
      className="group mx-auto flex h-8 max-w-full items-center justify-center gap-2 rounded-md text-[14px] outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="text-muted-foreground">Linked to</span>
      <span className="truncate text-foreground group-hover:underline group-hover:underline-offset-4">{fundsAccount.name}</span>
      <ChevronRight size={15} strokeWidth={1.8} className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
    </Link>
  ) : (
    <div className="h-8" aria-hidden="true" />
  );
  const cardBlock = (
    <div className="flex flex-col gap-3">
      {cardNode}
      {availableNode}
    </div>
  );

  const tNickname = (
    <ManageRow
      icon={Sparkles}
      title="Card Nickname"
      value={cardNickname}
      onClick={() => {
        setTempNickname(cardNickname);
        setActiveModal("edit-nickname");
      }}
    />
  );
  // A debit card has Show PIN as its first round action, so it isn't repeated here. A card that holds a balance
  // leads with Top Up instead, which makes this row its only way in.
  const tShowPin =
    hasPin && isFundable ? (
      <ManageRow
        icon={KeypadIcon}
        title="Show Card PIN"
        description={isFrozen ? "Unblock the card to view its PIN" : undefined}
        disabled={isFrozen}
        onClick={handleOpenPinModal}
      />
    ) : null;
  const tReset = hasPin ? <ManageRow icon={Key} title="Reset PIN" onClick={handleOpenResetPin} /> : null;
  const tReplace = (
    <ManageRow icon={RefreshCw} title="Replace Card" description="Lost, damaged or expired" onClick={() => setActiveModal("replace")} />
  );
  // Card activity is a row here; blocking is one of the round actions (the quickest thing to do if a card goes missing).
  const tActivity = <ManageRow icon={ArrowLeftRight} title="Card Activity" onClick={() => setActiveModal("activity")} />;

  const activityListNode = (
    <>
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
                          ? "bg-success/10 text-success"
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
                          isCredit ? "text-success" : "text-foreground"
                        )}
                      >
                        {isCredit ? "+ " : "− "}
                        {formatMoney(item.amount, currentCard.currency || "GHS", true)}
                      </span>
                      {isFailed ? (
                        <span className="text-[11.5px] text-destructive font-normal">
                          Failed
                        </span>
                      ) : isPending ? (
                        <span className="text-[11.5px] text-warning font-normal">
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
    </>
  );

  // Two columns from lg: the card, its caption and the round actions on the left, the list of options on the right.
  // The card is 78% of its column on every card page, the account card too, so it keeps one size and one proportion
  // to the list beside it.
  // Below lg it is one column.
  const layoutNode = (
    <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="flex flex-col gap-9">
        {cardBlock}
        {controlsNode}
      </div>
      <div className="flex flex-col gap-4">
        {tActivity}
        {limitNode}
        {tNickname}
        {tShowPin}
        {tReset}
        {tReplace}
      </div>
    </div>
  );

  const detailBody = isInactive ? (
    <div className="flex w-full flex-col gap-6">
      {cardNode}
      {controlsNode}
      {inactiveNode}
    </div>
  ) : (
    layoutNode
  );

  return (
    <div className={`mx-auto flex w-full max-w-[440px] flex-col gap-10 sm:gap-12 lg:max-w-[1000px]`}>
      {/* Dev Mode Toolbar State Switcher for Delivery Tracking Simulation */}
      <StateSwitcher
        section="13.9 - Delivery Tracking"
        label="Delivery tracking"
        groups={limitDevGroups}
        states={DELIVERY_SIMULATION_STATES}
        value={deliverySimState}
        onChange={setDeliverySimState}
        labels={DELIVERY_SIMULATION_LABELS}
      />

      {/* Back button, title and one context chip — the card's own balance
          (prepaid/virtual) or the account a debit card spends from. */}
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
        <h1 className="text-[18px] sm:text-[20px] lg:text-[22px] font-medium leading-tight sm:leading-[28px] tracking-[-0.02em] text-foreground truncate min-w-0">
          {cardNickname || "Virtual Card"}
        </h1>
      </div>

      {/* Main Container */}
      <div className="w-full flex flex-col gap-8">
        {isInactiveDelivery ? (
          /* ========================================================================= */
          /* INACTIVE PHYSICAL CARD DELIVERY / PICKUP HERO STATE                      */
          /* ========================================================================= */
          <div className="flex flex-col items-center justify-center py-4 sm:py-8 gap-6 sm:gap-8 w-full max-w-[480px] mx-auto animate-in fade-in duration-300">
            {/* The Ordered Card Visual: Faded card for In Production; Real 3D Tilt Card for Delivery/Pickup */}
            <div className="w-full max-w-[440px] flex justify-center">
              {effectiveCard.deliveryStatus === "in_production" || effectiveCard.deliveryStatus === "processing" || !effectiveCard.deliveryStatus ? (
                <div className="w-full max-w-[440px] flex justify-center select-none pointer-events-none">
                  <img
                    src={
                      effectiveCard.type === "Prepaid"
                        ? "/images/cards/faded-card-prepaid.webp"
                        : "/images/cards/faded-card-debit.webp"
                    }
                    alt={`${effectiveCard.type} Card in Production`}
                    className="w-full h-auto object-contain drop-shadow-md rounded-[20px]"
                  />
                </div>
              ) : (
                <TiltCard3D className="w-full">
                  <div
                    style={{ backgroundColor: activeTheme.colorHex }}
                    className={`relative w-full aspect-[1.586/1] rounded-[20px] p-5 sm:p-6 flex flex-col justify-between overflow-hidden select-none shadow-xl [transform-style:preserve-3d] ${activeTheme.textColor}`}
                  >
                    {/* Card Background Artwork */}
                    <img
                      src={activeTheme.bgImage}
                      alt=""
                      className="absolute -inset-[3px] w-[calc(100%+6px)] h-[calc(100%+6px)] max-w-none object-cover pointer-events-none select-none"
                    />

                    {/* Top Row: GCB Logo (Left) & Card Type (Right) */}
                    <div className="relative z-10 flex items-center justify-between">
                      <GcbCardLogo themeId={activeTheme.id} className="h-7 sm:h-8 w-auto drop-shadow-xs shrink-0" />
                      <span className="text-[13px] sm:text-[14px] font-normal tracking-wide opacity-90 capitalize">
                        {effectiveCard.type}
                      </span>
                    </div>

                    {/* Middle Row: Chip & Contactless Waves */}
                    <div className="relative z-10 my-auto py-1 flex items-center gap-3">
                      <EmvChip />
                      <Wifi size={20} strokeWidth={2.4} className="rotate-90 opacity-85 shrink-0" />
                    </div>

                    {/* Bottom Row: CARD HOLDER, EXP, Visa/Mastercard Logo */}
                    <div className="relative z-10 flex items-end justify-between whitespace-nowrap gap-4">
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-[10px] sm:text-[10.5px] font-medium opacity-60 leading-[14px] uppercase tracking-wider">
                          CARD HOLDER
                        </span>
                        <span className="text-[14px] sm:text-[15.5px] font-medium leading-[20px] tracking-tight uppercase">
                          {effectiveCard.holder || actor?.name || "RANSFORD GYASI"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-[10px] sm:text-[10.5px] font-medium opacity-60 leading-[14px] uppercase tracking-wider">
                          EXP
                        </span>
                        <span className="text-[14px] sm:text-[15.5px] font-medium leading-[20px] tracking-tight">
                          {effectiveCard.expiry || "09/30"}
                        </span>
                      </div>

                      <div className="shrink-0 flex items-end justify-end pl-2">
                        <NetworkLogo
                          scheme={effectiveCard.scheme}
                          className={effectiveCard.scheme === "Visa" ? "h-4 sm:h-5 drop-shadow-xs" : "h-6 sm:h-7 drop-shadow-xs"}
                        />
                      </div>
                    </div>
                  </div>
                </TiltCard3D>
              )}
            </div>

            {/* Headline & Subtitle */}
            <div className="flex flex-col gap-2 items-center text-center">
              <h2 className="text-[22px] sm:text-[26px] font-medium text-foreground tracking-[-0.02em]">
                {effectiveCard.deliveryStatus === "ready_for_pickup"
                  ? "Your card is ready for pickup"
                  : effectiveCard.deliveryStatus === "delivered"
                  ? "Your card has arrived!"
                  : effectiveCard.deliveryStatus === "out_for_delivery"
                  ? "Your card is being delivered to you"
                  : effectiveCard.deliveryStatus === "in_transit"
                  ? "Your card is on the way"
                  : "Your card is being prepared"}
              </h2>
              <p className="text-[14.5px] sm:text-[15px] text-muted-foreground">
                {effectiveCard.deliveryStatus === "ready_for_pickup"
                  ? "Available for collection at your selected branch."
                  : effectiveCard.deliveryStatus === "delivered"
                  ? "Activate now to start using it."
                  : effectiveCard.deliveryStatus === "out_for_delivery"
                  ? "Dispatch rider has picked up your card and is en route."
                  : `Estimated arrival: ${effectiveCard.estimatedDeliveryDate || "3-5 business days"}`}
              </p>
            </div>

            {/* Location Detail Row */}
            <div className="flex items-center justify-center gap-2 text-[14px] text-foreground -mt-1.5 px-4 text-center">
              {effectiveCard.deliveryMethod === "BRANCH_PICKUP" ? (
                <Building2 size={16} className="text-muted-foreground shrink-0" />
              ) : (
                <MapPin size={16} className="text-muted-foreground shrink-0" />
              )}
              <span className="text-muted-foreground">
                {effectiveCard.deliveryMethod === "BRANCH_PICKUP" ? (
                  <>
                    Pickup Location:{" "}
                    <span className="text-foreground font-medium">
                      {effectiveCard.deliveryBranch || "GCB Head Office Branch"}
                    </span>
                  </>
                ) : (
                  <>
                    Delivery to:{" "}
                    <span className="text-foreground font-medium">
                      {effectiveCard.deliveryAddress || "Your designated address"}
                    </span>
                  </>
                )}
              </span>
            </div>

            {/* Rider Details Card (when card has an assigned courier rider) */}
            {effectiveCard.courierRider && (effectiveCard.deliveryStatus === "out_for_delivery" || effectiveCard.deliveryStatus === "in_transit") && (
              <div className="w-full rounded-2xl border border-border/80 bg-muted/30 p-4 flex items-center justify-between gap-3 text-left shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-11 rounded-full bg-primary/15 text-foreground flex items-center justify-center shrink-0">
                    <Bike size={22} strokeWidth={1.8} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-medium text-foreground truncate">
                        {effectiveCard.courierRider.name}
                      </span>
                      <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-pill-success text-pill-success-text font-medium border border-success/20">
                        Rider Assigned
                      </span>
                    </div>
                    <span className="text-[12.5px] text-muted-foreground truncate">
                      {effectiveCard.courierRider.company || "GCB Express Courier"} • {effectiveCard.courierRider.vehiclePlate || "Motorbike"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`tel:${effectiveCard.courierRider.phone}`}
                    className="flex size-9 items-center justify-center rounded-full bg-card hover:bg-muted border border-border text-foreground transition-colors cursor-pointer shrink-0"
                    title={`Call ${effectiveCard.courierRider.name} (${effectiveCard.courierRider.phone})`}
                    aria-label={`Call ${effectiveCard.courierRider.name}`}
                  >
                    <Phone size={16} strokeWidth={1.8} />
                  </a>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
              {effectiveCard.deliveryStatus === "ready_for_pickup" ? (
                <>
                  <Button
                    type="button"
                    onClick={handleOpenActivate}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl text-[14px]"
                  >
                    Activate Card
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setInitialTrackerView("pickup-code");
                      setActiveModal("tracking");
                    }}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl text-[14px]"
                  >
                    Show Pickup Code
                  </Button>
                </>
              ) : effectiveCard.deliveryStatus === "delivered" ? (
                <>
                  <Button
                    type="button"
                    onClick={handleOpenActivate}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl text-[14px]"
                  >
                    Activate Card
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setInitialTrackerView("timeline");
                      setActiveModal("tracking");
                    }}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl text-[14px]"
                  >
                    Track Delivery
                  </Button>
                </>
              ) : effectiveCard.deliveryStatus === "out_for_delivery" ? (
                <>
                  <Button
                    type="button"
                    onClick={handleOpenActivate}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl text-[14px]"
                  >
                    Activate Card
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setInitialTrackerView("pickup-code");
                      setActiveModal("tracking");
                    }}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl text-[14px]"
                  >
                    Show Delivery Code
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    setInitialTrackerView("timeline");
                    setActiveModal("tracking");
                  }}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl text-[14px]"
                >
                  Track Delivery Progress
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* ACTIVE / INACTIVE HERO STATE WITH TABS (Matching Figma Node 1243:25983)   */
          /* ========================================================================= */
          <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
            {detailBody}
      </div>
    )}
  </div>

      {/* ========================================================================= */}
      {/* MODAL DIALOGS                                                              */}
      {/* ========================================================================= */}

      {/* Card activity */}
      <Dialog open={activeModal === "activity"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Card Activity</DialogTitle>
          </DialogHeader>
          <DialogBody className="gap-3">
            {activityListNode}
            {activities.length > 0 && (
              <Link
                href="/transactions"
                className="self-center py-1 text-[14px] text-muted-foreground transition-colors hover:text-foreground hover:underline"
              >
                View all transactions
              </Link>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* 1. Top Up Modal */}
      <Dialog open={activeModal === "top-up"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Top Up {currentCard.name}</DialogTitle>
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
                <Label>Fund From Account</Label>
                <select
                  value={topUpSourceAccountId}
                  onChange={(e) => setTopUpSourceAccountId(e.target.value)}
                  className="w-full rounded-xl border border-field-border bg-field hover:bg-field-hover px-3 py-2.5 text-[14px] text-foreground transition-colors focus:outline-none focus:border-field-border-focus focus:bg-field-focus focus:ring-0"
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
                <Label>Top Up Amount (GHS)</Label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  required
                  className="tabular"
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
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
                    className="size-12 rounded-xl bg-muted border border-border flex items-center justify-center text-[22px] font-medium text-foreground shadow-inner"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <p className="tabular text-[12px] text-muted-foreground">
                Closes automatically in {pinCountdown}s for your security
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveModal(null);
                setPinCountdown(15);
              }}
              className="w-full cursor-pointer"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal Transaction PIN Modal matching Payment Flow */}
      <TransactionOtpModal
        open={pinAuthOpen}
        onOpenChange={setPinAuthOpen}
        onSuccess={handlePinAuthSuccess}
      />

      {/* The PIN gate in front of the card details */}
      <TransactionOtpModal
        open={detailsAuthOpen}
        onOpenChange={setDetailsAuthOpen}
        onSuccess={handleDetailsAuthSuccess}
        title="Authorize Card Details"
      />

      {/* Security Authorization PIN Modal for Card Activation */}
      <TransactionOtpModal
        open={activateAuthOpen}
        onOpenChange={setActivateAuthOpen}
        onSuccess={handleActivateAuthSuccess}
        title="Authorize Activation"
      />

      {/* Unblocking is authorised with the PIN. Blocking has no pop-up at all. */}
      <TransactionOtpModal
        open={unblockAuthOpen}
        onOpenChange={setUnblockAuthOpen}
        onSuccess={() => {
          setUnblockAuthOpen(false);
          handleToggleFreeze();
        }}
        title="Authorize Unblock"
      />

      {/* Security Authorization OTP Modal for Resetting Card PIN */}
      <TransactionOtpModal
        open={resetPinAuthOpen}
        onOpenChange={setResetPinAuthOpen}
        onSuccess={handleResetPinAuthSuccess}
        title="Authorize PIN Reset"
      />

      {/* 4. Set Limits Modal */}
      <Dialog open={activeModal === "limits"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Daily Limits</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLimits}>
            <DialogBody>
              <Field label="Daily Limit (GHS)" htmlFor="daily-limit-input">
                <Input
                  id="daily-limit-input"
                  type="number"
                  min="100"
                  max={maxDailyCap}
                  value={tempDaily}
                  onChange={(e) => setTempDaily(e.target.value)}
                  placeholder="5000"
                  className="tabular"
                />
                <span className="text-[11px] text-muted-foreground">
                  Current spend today: GHS {dailySpent.toLocaleString()} · Maximum cap: GHS {maxDailyCap.toLocaleString()}
                </span>
</Field>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Limit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Card details: number, expiry and security code, each one tap to copy */}
      <Dialog open={activeModal === "details"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Card Details</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col divide-y divide-border/60">
              <DetailLine label="Name on card" value={card.holder || "RANSFORD GYASI"} />
              <DetailLine
                label="Card number"
                value={displayFullNumber}
                onCopy={() => handleCopy(displayFullNumber.replace(/\s/g, ""), "Card Number")}
              />
              <DetailLine label="Expiry" value={displayExpiry} onCopy={() => handleCopy(displayExpiry, "Expiry Date")} />
              <DetailLine
                label={securityCodeLabel(effectiveCard.scheme)}
                value={displayCvv}
                onCopy={() => handleCopy(displayCvv, securityCodeLabel(effectiveCard.scheme))}
              />
            </div>
            <p className="tabular pt-1 text-center text-[12px] text-muted-foreground">
              Closes automatically in {detailsCountdown}s for your security
            </p>
          </DialogBody>
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
            <Button onClick={() => setActiveModal(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Unblock / Reset PIN Modal */}
      <Dialog
        open={activeModal === "reset-pin"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setResetNewPin("");
            setResetConfirmPin("");
          }
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Reset Card PIN</DialogTitle>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-4">
            <p className="text-[13px] text-muted-foreground">
              Set a new 4-digit PIN for ATM cash withdrawals and point-of-sale retail transactions.
            </p>

            <Field label="New 4-Digit PIN" htmlFor="new-pin-input">
              <Input
                id="new-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={resetNewPin}
                onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="tracking-widest text-[16px] text-center font-mono"
                autoFocus
              />
            </Field>

            <Field label="Confirm New PIN" htmlFor="confirm-pin-input">
              <Input
                id="confirm-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={resetConfirmPin}
                onChange={(e) => setResetConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="tracking-widest text-[16px] text-center font-mono"
              />
            </Field>

            {resetConfirmPin.length > 0 && resetNewPin !== resetConfirmPin && (
              <p className="text-[12px] text-destructive font-medium">PINs do not match</p>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setActiveModal(null);
                setResetNewPin("");
                setResetConfirmPin("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={
                resetNewPin.length !== 4 ||
                resetConfirmPin.length !== 4 ||
                resetNewPin !== resetConfirmPin
              }
              onClick={() => {
                triggerToast("PIN reset successfully");
                setActiveModal(null);
                setResetNewPin("");
                setResetConfirmPin("");
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
            <DialogTitle>Card Nickname</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveNickname}>
            <DialogBody>
              <Field label="Card Nickname" htmlFor="card-nickname-input">
                <Input
                  id="card-nickname-input"
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  placeholder="AWS & SaaS Virtual Card"
                  
                />
</Field>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit">
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
            <div className="p-3.5 rounded-xl bg-warning/10 dark:bg-warning/40 border border-warning/30 text-warning-text text-[12.5px] flex items-start gap-2.5">
              <AlertTriangle size={18} className="shrink-0 text-warning-text mt-0.5" />
              <span>
                Once you submit the replacement, this card (•••• {maskedLast4}) is blocked
                {isFundable ? " and its balance moves to the new card" : ""}. Next, check the
                details we&rsquo;ve filled in from this card.
              </span>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              nativeButton={false}
              render={<Link href={`/cards/request?replace=${encodeURIComponent(currentCard.id)}`} />}
            >
              Continue
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
              {/* CVV Input */}
              <Field label="3-Digit CVV Security Code" htmlFor="card-cvv-input">
                <Input
                  id="card-cvv-input"
                  type="text"
                  maxLength={3}
                  placeholder="e.g. 842"
                  value={activationCvv}
                  onChange={(e) => { setActivationCvv(e.target.value.replace(/\D/g, "")); setActivationError(""); }}
                  className="tracking-wider"
                  required
                />
                <span className="text-[11.5px] text-muted-foreground">
                  Found on the signature strip on the back of your physical card.
                </span>
</Field>

              {/* Set 4-digit PIN */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Set 4-Digit Card PIN" htmlFor="card-pin-input">
                  <Input
                    id="card-pin-input"
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={activationPin}
                    onChange={(e) => { setActivationPin(e.target.value.replace(/\D/g, "")); setActivationError(""); }}
                    className="text-center tracking-widest"
                    required
                  />
</Field>
                <Field label="Confirm 4-Digit PIN" htmlFor="card-pin-confirm-input">
                  <Input
                    id="card-pin-confirm-input"
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={activationPinConfirm}
                    onChange={(e) => { setActivationPinConfirm(e.target.value.replace(/\D/g, "")); setActivationError(""); }}
                    className="text-center tracking-widest"
                    required
                  />
</Field>
              </div>
              <span className="text-[11.5px] text-muted-foreground block -mt-1">
                This PIN will be required for ATM cash withdrawals and point-of-sale transactions.
              </span>
              <InlineError message={activationError} className="text-left" />
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button type="submit">
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
        initialView={initialTrackerView}
      />

      {/* 11. Block Reason Questionnaire Modal */}
      <BlockReasonDialog
        open={blockReasonOpen}
        onOpenChange={setBlockReasonOpen}
        cardName={currentCard.name || "Card"}
        last4={currentCard.maskedNumber?.slice(-4) || "••••"}
      />
    </div>
  );
}
