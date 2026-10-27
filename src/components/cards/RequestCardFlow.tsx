/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useContextualBack } from "@/lib/contextual-back";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  CreditCard,
  Wallet,
  Sparkles,
  Wifi,
  Check,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SmoothCollapse } from "@/components/ui/smooth-height";
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
  findCard,
  setCardStatus,
  GCB_BRANCHES,
  type CardType,
  type DeliveryMethod,
  type PaymentCard,
  type GcbBranch,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { DeliveryModeFields } from "@/components/ui/delivery-mode-fields";
import { CARD_THEMES, type CardTheme } from "@/components/cards/card-themes";
import { TiltCard3D } from "@/components/cards/TiltCard3D";
import { EmvChip } from "@/components/cards/EmvChip";
import { ActionTile } from "@/components/ui/action-tile";
import { NetworkChip, NetworkLogo } from "@/components/cards/NetworkLogo";
import { CARD_SCHEMES, NETWORK_TIERS, type CardScheme } from "@/lib/card-schemes";
import { GcbCardLogo } from "@/components/cards/GcbCardLogo";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { GcbEagleEmblem } from "@/components/brand/GcbEagleEmblem";

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

/** One-off fee to issue (or replace) a card, charged to the source account. */
const ISSUANCE_FEE: Record<CardType, number> = {
  Debit: 50,
  Prepaid: 30,
  Virtual: 10,
};

function fmtGhs(amount: number, currency = "GHS"): string {
  return `${currency} ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Default artwork per card type — mirrors the card detail view. */
function defaultThemeId(type: CardType): string {
  return type === "Virtual" ? "blue" : type === "Prepaid" ? "maroon" : "gold";
}

export function RequestCardFlow() {
  const router = useRouter();
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);

  const availableAccounts = useMemo(
    () => (activeProfile ? accountsForProfile(activeProfile.kind) : []),
    [activeProfile]
  );

  // Replacement: `?replace=<cardId>` starts on the details step with every
  // field carried over from the old card, so the customer only confirms.
  const searchParams = useSearchParams();
  const replacing = useMemo(() => {
    const id = searchParams.get("replace");
    return id ? findCard(id) ?? null : null;
  }, [searchParams]);
  const isReplacement = replacing !== null;

  const { handleBack: handleBackNavigation } = useContextualBack(
    replacing ? `/cards/${replacing.id}` : "/cards"
  );

  // Flow State
  const [step, setStep] = useState<FlowStep>(() => (replacing ? "details" : "select-type"));
  const [cardType, setCardType] = useState<CardType>(() => replacing?.type ?? "Debit");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() =>
    replacing && availableAccounts.some((a) => a.id === replacing.linkedAccountId)
      ? replacing.linkedAccountId
      : availableAccounts[0]?.id ?? "acc-001"
  );
  const [cardName, setCardName] = useState(() => replacing?.name ?? "");
  const [fundAmount, setFundAmount] = useState("");
  const [cardScheme, setCardScheme] = useState<CardScheme>(() => replacing?.scheme ?? "Visa");
  const [networkType, setNetworkType] = useState<string>(() => {
    if (!replacing || replacing.type === "Virtual") return "";
    // Older cards may not record a tier; fall back to the network's base tier.
    const tiers = NETWORK_TIERS[replacing.scheme] ?? NETWORK_TIERS.Visa;
    return tiers.some((t) => t.id === replacing.networkType)
      ? (replacing.networkType as string)
      : tiers[0].id;
  });
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>(() => {
    if (!replacing) return CARD_THEMES[1]; // Default to Gold
    const id = replacing.colorTheme || defaultThemeId(replacing.type);
    return CARD_THEMES.find((t) => t.id === id) ?? CARD_THEMES[1];
  });

  function handleSchemeChange(scheme: CardScheme) {
    setCardScheme(scheme);
    setNetworkType("");
  }

  // Mode of delivery state
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(
    () => replacing?.deliveryMethod ?? null
  );
  const [selectedBranch, setSelectedBranch] = useState<GcbBranch | null>(
    () => GCB_BRANCHES.find((b) => b.name === replacing?.deliveryBranch) ?? null
  );
  const [recipientName, setRecipientName] = useState(actor?.name ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(() => replacing?.deliveryAddress ?? "");
  const [deliveryCity, setDeliveryCity] = useState("");
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
  // A replacement carries the old card's balance over instead of new funding.
  const carriedBalance = isReplacement && isFundable ? replacing?.balance ?? 0 : null;
  const needsFunding = isFundable && !isReplacement;
  const issuanceFee = ISSUANCE_FEE[cardType];
  const currency = selectedAccount?.currency ?? "GHS";

  const isDetailsValid = useMemo(() => {
    if (!selectedAccountId) return false;
    if (!cardName.trim()) return false;
    if (cardType === "Virtual") {
      if (!needsFunding) return true;
      const parsedAmt = Number(fundAmount.replace(/,/g, ""));
      if (isNaN(parsedAmt) || parsedAmt <= 0) return false;
      return true;
    }
    if (!cardScheme) return false;
    if (!networkType) return false;
    if (cardType === "Prepaid" && needsFunding) {
      const parsedAmt = Number(fundAmount.replace(/,/g, ""));
      if (isNaN(parsedAmt) || parsedAmt <= 0) return false;
    }
    if (isPhysical) {
      if (!deliveryMethod) return false;
      if (deliveryMethod === "BRANCH_PICKUP" && !selectedBranch) return false;
      if (deliveryMethod === "DELIVERY") {
        if (!recipientName.trim() || !deliveryAddress.trim() || !deliveryPhone.trim()) {
          return false;
        }
      }
    }
    return true;
  }, [
    selectedAccountId,
    cardName,
    cardType,
    fundAmount,
    needsFunding,
    cardScheme,
    networkType,
    isPhysical,
    deliveryMethod,
    selectedBranch,
    recipientName,
    deliveryAddress,
    deliveryPhone,
  ]);

  function handleAuthorizeSuccess() {
    setAuthModalOpen(false);

    const lastFour = String(Math.floor(1000 + Math.random() * 9000));
    const prefix = cardScheme === "Visa" ? "4532" : "5412";
    const fullNum = `${prefix} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${lastFour}`;
    const generatedCvv = String(Math.floor(100 + Math.random() * 900));
    const numericFund = isFundable
      ? carriedBalance ?? (Number(fundAmount.replace(/,/g, "")) || 0)
      : null;
    const trackingCode = `GCB-CRD-${Math.floor(100000 + Math.random() * 900000)}`;
    const pickupPin = String(Math.floor(1000 + Math.random() * 9000));
    const finalCardName = cardName.trim() || `${cardType} Card`;

    const newCard: PaymentCard = {
      id: `card-req-${Date.now()}`,
      name: finalCardName,
      maskedNumber: `∗∗∗∗ ${lastFour}`,
      fullNumber: fullNum,
      cvv: generatedCvv,
      type: cardType,
      scheme: cardType === "Virtual" ? "Visa" : (cardScheme ?? "Visa"),
      networkType: cardType === "Virtual" ? "Virtual" : (networkType || "Classic"),
      currency: selectedAccount?.currency ?? "GHS",
      balance: numericFund,
      spendLimit: cardType === "Virtual" ? 5000 : null,
      linkedAccountId: selectedAccount?.id ?? "acc-001",
      holder: actor?.name ?? "Ransford Gyasi",
      expiry: "09/30",
      status: isPhysical ? "Inactive" : "Active",
      fundable: isFundable,
      isVirtual: cardType === "Virtual",
      profileKind: activeProfile?.kind ?? "RETAIL",
      colorTheme: selectedTheme.id,
      deliveryMethod: isPhysical && deliveryMethod ? deliveryMethod : undefined,
      deliveryBranch: isPhysical && deliveryMethod === "BRANCH_PICKUP" && selectedBranch ? selectedBranch.name : undefined,
      deliveryAddress:
        isPhysical && deliveryMethod === "DELIVERY"
          ? `${deliveryAddress.trim()}${deliveryCity.trim() ? `, ${deliveryCity.trim()}` : ""}`
          : undefined,
      deliveryStatus: isPhysical ? "in_production" : undefined,
      trackingNumber: isPhysical ? trackingCode : undefined,
      estimatedDeliveryDate: isPhysical ? "3-5 business days" : undefined,
      pickupCode: isPhysical && deliveryMethod === "BRANCH_PICKUP" ? pickupPin : undefined,
    };

    addCard(newCard);
    if (replacing) setCardStatus(replacing.id, "Blocked");
    setCreatedCard(newCard);
    setStep("success");
    toast.success(
      isPhysical
        ? `Your ${newCard.type.toLowerCase()} card request has been submitted for production.`
        : `Virtual card "${newCard.name}" issued and active.`
    );
  }

  return (
    <div className="flex flex-col w-full py-3 sm:py-6">
      <AnimatePresence mode="wait">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* STEP 1: SELECT CARD TYPE                                      */}
        {/* ───────────────────────────────────────────────────────────── */}
        {step === "select-type" && (
          <motion.div
            key="step-select-type"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-[540px] mx-auto flex flex-col gap-5"
          >
          {/* Header Row: Back Link & Title */}
          <div data-page-header className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackNavigation}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              title="Back"
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <h1 className="type-page-title font-medium leading-[24px] sm:leading-[28px] tracking-[var(--ls-heading)] text-foreground">
              Request a Card
            </h1>
          </div>

          {/* List of Card Types */}
          <div className="flex flex-col gap-3 w-full">
            {CARD_TYPE_OPTIONS.map((opt) => (
              <ActionTile
                key={opt.type}
                icon={opt.icon}
                title={opt.title}
                description={opt.description}
                onClick={() => {
                  setCardType(opt.type);
                  setCardName("");
                  setFundAmount("");
                  setCardScheme("Visa");
                  setNetworkType("");
                  setDeliveryMethod(null);
                  setSelectedBranch(null);
                  setRecipientName(actor?.name ?? "");
                  setDeliveryAddress("");
                  setDeliveryCity("");
                  setDeliveryPhone("+233 24 412 3456");
                  setStep("details");
                }}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 2: CONFIGURE CARD & MODE OF DELIVERY                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "details" && (
        <motion.div
          key="step-details"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-[540px] mx-auto flex flex-col gap-5"
        >
          {/* Header Row: Back to Step 1 & Title */}
          <div data-page-header className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                replacing ? handleBackNavigation() : setStep("select-type")
              }
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <h1 className="type-page-title font-medium leading-[24px] sm:leading-[28px] tracking-[var(--ls-heading)] text-foreground">
              {isReplacement ? "Replace" : "Configure"} {cardType} Card
            </h1>
          </div>

          {/* Form Container */}
          <div className="flex flex-col gap-4 w-full">
            {/* Source Account Selector */}
            <FromAccountSelector
              accounts={availableAccounts}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              label="Source Account"
            />

            {/* Card Nickname - Universal for all card types */}
            <Field label="Card Nickname" htmlFor="card-name-input">
              <Input
                id="card-name-input"
                type="text"
                placeholder="Card nickname"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                
              />
</Field>

            {/* Virtual Card Flow: Initial Funding & Continue */}
            {cardType === "Virtual" ? (
              <>
                {/* Initial Funding (a replacement carries the old balance instead) */}
                {needsFunding ? (
                  <AmountInput
                    value={fundAmount}
                    onChange={setFundAmount}
                    currency={currency}
                    label="Initial Funding Amount"
                  />
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/30 px-3 py-3">
                  <span className="text-[13.5px] text-muted-foreground">Balance moving to the new card</span>
                  <span className="tabular text-[14px] text-foreground">{fmtGhs(carriedBalance ?? 0, currency)}</span>
                </div>
                )}

                {/* Proceed Button */}
                <div className="pt-2">
                  <Button
                    type="button"
                    disabled={!isDetailsValid}
                    onClick={() => setStep("customize")}
                    className="w-full h-10 rounded-xl text-[14px]"
                  >
                    Continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Card network: Visa, Mastercard, GH-Link, UnionPay */}
                <Field label="Card Network">
                  <Select
                    value={cardScheme}
                    onValueChange={(val) => {
                      if (val) handleSchemeChange(val as CardScheme);
                    }}
                  >
                    <SelectTrigger className="h-auto">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <NetworkChip scheme={cardScheme} />
                        <span className="text-[14.5px] font-medium text-foreground truncate">{cardScheme}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_SCHEMES.map((scheme) => (
                        <SelectItem key={scheme} value={scheme}>
                          <div className="flex items-center gap-2 py-0.5">
                            <NetworkChip scheme={scheme} />
                            <span className="text-[14px] font-medium text-foreground">{scheme}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
</Field>

                {/* Network Type Selector - Always visible on entry of the page */}
                <Field label="Network Type">
                  <Select
                    value={networkType}
                    onValueChange={(val) => {
                      if (val) setNetworkType(val);
                    }}
                  >
                    <SelectTrigger className="h-auto">
                      <div className="flex flex-col min-w-0 text-left flex-1">
                        <span
                          className={`text-[14.5px] font-medium truncate leading-tight ${
                            networkType ? "text-foreground" : "text-muted-foreground font-normal"
                          }`}
                        >
                          {networkType || "Select card tier"}
                        </span>
                        {networkType && (
                          <span className="text-[12px] text-muted-foreground truncate leading-tight mt-0.5">
                            {NETWORK_TIERS[cardScheme].find((t) => t.id === networkType)?.description ?? "Card tier"}
                          </span>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {NETWORK_TIERS[cardScheme].map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          <div className="flex flex-col min-w-0 py-0.5 text-left">
                            <span className="text-[14px] font-medium text-foreground">{opt.label}</span>
                            <span className="text-[12px] text-muted-foreground">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
</Field>

                {/* Progressive Disclosure: Disclose funding and fulfillment ONLY after network type is selected */}
                <SmoothCollapse open={Boolean(networkType)} className="w-full">
                  <div className="flex flex-col gap-4 w-full pt-1">
                    {/* Initial Funding - for Prepaid Physical Cards */}
                    {cardType === "Prepaid" && needsFunding && (
                      <AmountInput
                        value={fundAmount}
                        onChange={setFundAmount}
                        currency={currency}
                        label="Initial Funding Amount"
                      />
                    )}
                    {cardType === "Prepaid" && !needsFunding && (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/30 px-3 py-3">
                  <span className="text-[13.5px] text-muted-foreground">Balance moving to the new card</span>
                  <span className="tabular text-[14px] text-foreground">{fmtGhs(carriedBalance ?? 0, currency)}</span>
                </div>
                    )}

                    {/* Mode of Delivery */}
                    <div className="flex flex-col gap-3 pt-2 border-t border-border/80">
                      <DeliveryModeFields
                        value={{
                          method: deliveryMethod,
                          branch: selectedBranch,
                          recipientName,
                          address: deliveryAddress,
                          city: deliveryCity,
                          phone: deliveryPhone,
                        }}
                        onChange={(patch) => {
                          if ("method" in patch) setDeliveryMethod(patch.method ?? null);
                          if ("branch" in patch) setSelectedBranch(patch.branch ?? null);
                          if (patch.recipientName !== undefined) setRecipientName(patch.recipientName);
                          if (patch.address !== undefined) setDeliveryAddress(patch.address);
                          if (patch.city !== undefined) setDeliveryCity(patch.city);
                          if (patch.phone !== undefined) setDeliveryPhone(patch.phone);
                        }}
                      />
                    </div>

                    {/* Proceed Button */}
                    <div className="pt-2">
                      <Button
                        type="button"
                        disabled={!isDetailsValid}
                        onClick={() => setStep("customize")}
                        className="w-full h-10 rounded-xl text-[14px]"
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                </SmoothCollapse>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 3: CUSTOMIZE YOUR CARD                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "customize" && (
        <motion.div
          key="step-customize"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-[540px] mx-auto flex flex-col items-center gap-5"
        >
          {/* Header Row: Back to Step 2 & Title */}
          <div data-page-header className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={() => setStep("details")}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <h1 className="type-page-title font-medium leading-[24px] sm:leading-[28px] tracking-[var(--ls-heading)] text-foreground">
              Customize card
            </h1>
          </div>

          {/* Interactive Full Card Preview with 3D Mouse Tilt & Smooth Color Crossfades */}
          <div className="w-full flex flex-col items-center gap-5">
            <TiltCard3D className="w-full max-w-[500px]">
              <motion.div
                animate={{
                  backgroundColor: selectedTheme.colorHex,
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`relative w-full aspect-[1.586/1] rounded-3xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden select-none shadow-xl transition-colors duration-400 [transform-style:preserve-3d] ${selectedTheme.textColor}`}
              >
                {/* Pre-rendered Stacked Theme Backgrounds for Silky 60fps GPU Crossfade */}
                {CARD_THEMES.map((theme) => {
                  const isActive = selectedTheme.id === theme.id;
                  return (
                    <motion.img
                      key={theme.id}
                      src={theme.bgImage}
                      alt={theme.name}
                      initial={false}
                      animate={{
                        opacity: isActive ? 1 : 0,
                        scale: isActive ? 1.03 : 1.01,
                      }}
                      transition={{
                        duration: 0.45,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="absolute -inset-[3px] w-[calc(100%+6px)] h-[calc(100%+6px)] max-w-none object-cover pointer-events-none select-none will-change-[opacity,transform]"
                    />
                  );
                })}

                {/* Top Row: GCB Logo (Left) & Unboxed Card Type (Right) */}
                <div className="relative z-10 flex items-center justify-between transition-colors duration-300">
                  <GcbCardLogo themeId={selectedTheme.id} className="h-7 sm:h-8 w-auto aspect-[37.1621/32] drop-shadow-xs shrink-0 transition-colors duration-300" />
                  <span className="text-[14px] sm:text-[15.5px] font-normal tracking-wide opacity-90 capitalize transition-colors duration-300 shrink-0">
                    {cardType}
                  </span>
                </div>

                {/* Middle Row: Gold EMV Chip with Metallic Sheen + Contactless Waves */}
                {cardType === "Virtual" ? (
                  <div className="my-auto" aria-hidden="true" />
                ) : (
                  <div className="relative z-10 my-auto py-2 flex items-center gap-3">
                    <EmvChip />
                    <Wifi size={22} className="rotate-90 opacity-85 shrink-0 transition-colors duration-300" />
                  </div>
                )}

                {/* Bottom Row: CARD HOLDER (Left), EXP (Center), VISA/Mastercard (Right) */}
                <div className="relative z-10 flex items-end justify-between whitespace-nowrap gap-3 transition-colors duration-300">
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-[10.5px] sm:text-[11px] font-medium opacity-60 leading-[16px] uppercase tracking-wider">
                      CARD HOLDER
                    </span>
                    <span className="text-[15px] sm:text-[17px] font-medium leading-[22px] tracking-tight uppercase">
                      {actor?.name ?? "RANSFORD GYASI"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-[10.5px] sm:text-[11px] font-medium opacity-60 leading-[16px] uppercase tracking-wider">
                      EXP
                    </span>
                    <span className="text-[15px] sm:text-[17px] font-medium leading-[22px] tracking-tight">
                      09/28
                    </span>
                  </div>

                  <div className="shrink-0 flex items-end justify-end pl-2">
                    <NetworkLogo
                      scheme={cardScheme}
                      className={cardScheme === "Visa" ? "h-4 sm:h-5 drop-shadow-xs" : "h-6 sm:h-7 drop-shadow-xs"}
                    />
                  </div>
                </div>
              </motion.div>
            </TiltCard3D>

            {/* 7 Flat Color Circles with generous responsive spacing */}
            <div className="w-full flex items-center justify-center gap-2 sm:gap-3 md:gap-4 px-2 sm:px-3 py-2 flex-wrap">
              {CARD_THEMES.map((theme) => {
                const isSelected = selectedTheme.id === theme.id;
                const isDarkIcon =
                  theme.textColor.includes("zinc-950") ||
                  theme.textColor.includes("082f49");
                return (
                  <button
                    key={theme.id}
                    type="button"
                    aria-label={`Select ${theme.name} card color`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTheme(theme)}
                    className={`relative size-8 sm:size-9 rounded-full cursor-pointer flex items-center justify-center transition duration-hover border border-black/10 dark:border-white/15 ${
                      isSelected
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-105 shadow-sm"
                        : "hover:scale-105 opacity-90 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: theme.colorHex }}
                  >
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 450, damping: 26 }}
                          className="flex items-center justify-center"
                        >
                          <Check
                            size={15}
                            className={isDarkIcon ? "text-primary-foreground" : "text-white"}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>

            {/* Proceed to Review Button */}
            <div className="w-full pt-2">
              <Button
                type="button"
                onClick={() => setStep("review")}
                className="w-full h-10 rounded-xl text-[14px]"
              >
                Continue
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 4: REVIEW SCREEN                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "review" && (
        <motion.div
          key="step-review"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-[540px] mx-auto flex flex-col gap-5"
        >
          {/* Header Row: Back to Customize & Title */}
          <div data-page-header className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep("customize")}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft size={22} />
            </button>
            <h1 className="type-page-title font-medium leading-[24px] sm:leading-[28px] tracking-[var(--ls-heading)] text-foreground">
              {isReplacement ? "Review replacement" : "Review request"}
            </h1>
          </div>

          {/* Mini Card Spec Banner */}
          <div className="rounded-2xl border border-border/80 bg-card p-3 flex items-center gap-3">
            <div
              className={`relative w-14 aspect-[1.586/1] rounded-lg overflow-hidden ${selectedTheme.textColor} p-2 flex flex-col justify-between shrink-0 shadow-xs`}
            >
              <img
                src={selectedTheme.bgImage}
                alt=""
                className="absolute inset-0 size-full object-cover pointer-events-none select-none"
              />
              <div className="relative z-10 flex items-center justify-between">
                <GcbCardLogo themeId={selectedTheme.id} className="h-2.5 w-auto aspect-[37.1621/32] shrink-0" />
                <span className="text-[6px] font-medium uppercase opacity-80 shrink-0">{cardType}</span>
              </div>
              <div className="relative z-10 flex items-end justify-between">
                <span className="text-[7.5px] font-medium truncate max-w-[40px]">
                  {cardType}
                </span>
                <span className="text-[6.5px] opacity-80">∗∗∗∗</span>
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-medium text-foreground tracking-[var(--ls-tight)] truncate">
                {cardName.trim() || `${cardType} Card`}
              </span>
              <span className="text-[13px] text-muted-foreground mt-0.5">
                {cardType === "Virtual"
                  ? `Virtual Card • ${selectedTheme.name}`
                  : `${cardType} Card • ${cardScheme} (${networkType}) • ${selectedTheme.name}`}
              </span>
            </div>
          </div>

          {/* Detailed Summary Rows */}
          <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/80 overflow-hidden">
            <div className="p-3 flex items-center justify-between gap-3">
              <span className="text-[13.5px] text-muted-foreground">Card Nickname</span>
              <span className="text-[14px] font-medium text-foreground truncate">
                {cardName.trim() || `${cardType} Card`}
              </span>
            </div>

            <div className="p-3 flex items-center justify-between gap-3">
              <span className="text-[13.5px] text-muted-foreground">Source account</span>
              <div className="flex flex-col items-end text-right">
                <span className="text-[14px] font-medium text-foreground">
                  {selectedAccount?.name ?? "Current Account"}
                </span>
                <span className="text-[12px] text-muted-foreground tabular-nums">
                  {selectedAccount?.number ?? "1414 4124 4214"}
                </span>
              </div>
            </div>

            <div className="p-3 flex items-center justify-between gap-3">
              <span className="text-[13.5px] text-muted-foreground">Cardholder</span>
              <span className="text-[14px] font-medium text-foreground">
                {actor?.name ?? "Ransford Gyasi"}
              </span>
            </div>

            {cardType !== "Virtual" && (
              <div className="p-3 flex items-center justify-between gap-3">
                <span className="text-[13.5px] text-muted-foreground">Card Network</span>
                <span className="text-[14px] font-medium text-foreground">
                  {cardScheme} • {networkType}
                </span>
              </div>
            )}

            {isFundable && (
              <div className="p-3 flex items-center justify-between gap-3">
                <span className="text-[13.5px] text-muted-foreground">
                  {isReplacement ? "Balance carried over" : "Initial funding"}
                </span>
                <span className="text-[14px] font-medium text-foreground tabular">
                  {fmtGhs(carriedBalance ?? (Number(fundAmount.replace(/,/g, "")) || 0), currency)}
                </span>
              </div>
            )}

            <div className="p-3 flex items-start justify-between gap-3">
              <span className="text-[13.5px] text-muted-foreground pt-0.5">Mode of delivery</span>
              <div className="flex flex-col items-end text-right max-w-[280px]">
                {isPhysical ? (
                  deliveryMethod === "BRANCH_PICKUP" ? (
                    <>
                      <span className="text-[14px] font-medium text-foreground">
                        Branch pickup
                      </span>
                      <span className="text-[12px] text-muted-foreground mt-0.5">
                        {selectedBranch?.name ?? "Branch pickup"}
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

            <div className="p-3 flex items-center justify-between gap-3">
              <span className="text-[13.5px] text-muted-foreground">
                {isReplacement ? "Replacement fee" : "Issuance fee"}
              </span>
              <div className="flex flex-col items-end text-right">
                <span className="text-[14px] font-medium text-foreground tabular">
                  {fmtGhs(issuanceFee, currency)}
                </span>
                <span className="text-[12px] text-muted-foreground">Charged to source account</span>
              </div>
            </div>
          </div>

          {/* Authorize CTA Button */}
          <div className="w-full flex flex-col gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="w-full h-10 rounded-xl text-[14.5px] cursor-pointer"
            >
              Authorize
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setStep("customize")}
              className="w-full h-9 rounded-xl text-[13.5px] text-muted-foreground hover:text-foreground"
            >
              Back
            </Button>
          </div>
        </motion.div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 5: SUCCESS SCREEN                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "success" && createdCard && (
        <motion.div
          key="step-success"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative mx-auto flex w-full max-w-[460px] min-h-[65vh] flex-col items-center justify-center gap-6 py-10 px-3 text-center overflow-visible"
        >
          {/* 1. Dynamic Hero Stage: Standalone Eagle -> Morph -> Emerald Check */}
          <motion.div
            layout="position"
            transition={{ layout: { duration: 0.62, ease: [0.22, 1, 0.36, 1] } }}
            className="relative flex flex-col items-center gap-3 text-center w-full"
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
                    className="group relative z-10 flex size-[100px] sm:size-[108px] items-center justify-center rounded-full bg-gradient-to-br from-success to-success text-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] ring-1 ring-white/20 select-none overflow-hidden"
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
            <div className="flex flex-col gap-2 items-center w-full max-w-[420px] text-center">
              <motion.h1
                key={`title-${burstKey}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.44, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="text-[26px] sm:text-[28px] font-medium leading-[34px] tracking-[var(--ls-heading)] text-foreground text-center"
              >
                {isReplacement ? "Replacement Request Confirmed" : "Card Request Confirmed"}
              </motion.h1>
              {revealRest && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="text-[14.5px] text-muted-foreground text-center"
                >
                  {isPhysical
                    ? `Your ${createdCard.type.toLowerCase()} card request has been submitted for production.`
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
                onClick={() => router.replace(`/cards/${createdCard.id}`)}
                className="relative overflow-hidden w-full rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-3 text-[14.5px] font-medium active:scale-[0.99] transition cursor-pointer text-center shadow-xs"
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
        </motion.div>
      )}
      </AnimatePresence>

      {/* PIN & SMS OTP Authorization Modal */}
      <TransactionOtpModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthorizeSuccess}
        title={isReplacement ? "Authorize Card Replacement" : "Authorize Card Request"}
      />
    </div>
  );
}
