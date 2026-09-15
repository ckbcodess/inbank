"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CreditCard,
  Wallet,
  Sparkles,
  Landmark,
  Wifi,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  accountsForProfile,
  addCard,
  formatMoney,
  type CardType,
  type PaymentCard,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { CARD_THEMES, type CardTheme } from "@/components/cards/card-themes";

type FlowStep = "select-type" | "details" | "customize";

interface CardTypeOption {
  type: CardType;
  title: string;
  description?: string;
  icon: typeof CreditCard;
}

const CARD_TYPE_OPTIONS: CardTypeOption[] = [
  {
    type: "Debit",
    title: "Debit Card",
    icon: CreditCard,
  },
  {
    type: "Prepaid",
    title: "Prepaid Card",
    icon: Wallet,
  },
  {
    type: "Virtual",
    title: "Virtual Card",
    icon: Sparkles,
  },
];

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
  const [cardType, setCardType] = useState<CardType>("Virtual");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    () => availableAccounts[0]?.id ?? "acc-001"
  );
  const [cardName, setCardName] = useState("");
  const [fundAmount, setFundAmount] = useState("4344");
  const [cardScheme, setCardScheme] = useState<"Visa" | "Mastercard">("Visa");
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>(CARD_THEMES[1]); // Default to Gold

  const selectedAccount = useMemo(
    () => availableAccounts.find((a) => a.id === selectedAccountId) ?? availableAccounts[0],
    [availableAccounts, selectedAccountId]
  );

  const isFundable = cardType === "Virtual" || cardType === "Prepaid";

  const isDetailsValid = useMemo(() => {
    if (!cardName.trim()) return false;
    if (isFundable) {
      const parsedAmt = Number(fundAmount.replace(/,/g, ""));
      if (isNaN(parsedAmt) || parsedAmt <= 0) return false;
    }
    return true;
  }, [cardName, isFundable, fundAmount]);

  function handleCompleteCreation() {
    const lastFour = String(Math.floor(1000 + Math.random() * 9000));
    const prefix = cardScheme === "Visa" ? "4532" : "5412";
    const fullNum = `${prefix} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${lastFour}`;
    const generatedCvv = String(Math.floor(100 + Math.random() * 900));

    const numericFund = isFundable ? Number(fundAmount.replace(/,/g, "")) || 0 : null;

    const newCard: PaymentCard = {
      id: `card-req-${Date.now()}`,
      name: cardName.trim(),
      maskedNumber: `•••• ${lastFour}`,
      fullNumber: fullNum,
      cvv: generatedCvv,
      type: cardType,
      scheme: cardScheme,
      currency: selectedAccount?.currency ?? "GHS",
      balance: numericFund,
      spendLimit: cardType === "Virtual" ? 5000 : null,
      linkedAccountId: selectedAccount?.id ?? "acc-001",
      holder: actor?.name ?? "Ama Serwaa",
      expiry: "08/30",
      status: "Active",
      fundable: isFundable,
      isVirtual: cardType === "Virtual",
      profileKind: activeProfile?.kind ?? "RETAIL",
      colorTheme: selectedTheme.id,
    };

    addCard(newCard);
    router.push(`/cards?created=true&name=${encodeURIComponent(cardName.trim())}`);
  }

  return (
    <div className="flex flex-col w-full py-4 sm:py-8">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 1: SELECT CARD TYPE                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "select-type" && (
        <div className="w-full max-w-[586px] mx-auto flex flex-col gap-8">
          {/* Header Row: Back Link & Title */}
          <div className="flex items-center gap-4">
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
            <h1 className="text-[24px] sm:text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
              Request a Card
            </h1>
          </div>

          {/* List of Card Types */}
          <div className="flex flex-col gap-4 w-full">
            {CARD_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    setCardType(opt.type);
                    setStep("details");
                  }}
                  className="group w-full h-[72px] px-4 sm:px-5 flex items-center justify-between rounded-[16px] bg-muted/40 hover:bg-muted/70 active:scale-[0.99] border border-border transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="size-10 rounded-[12px] bg-background border border-border flex items-center justify-center shrink-0 text-foreground group-hover:scale-105 transition-transform">
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    <span className="text-[16px] font-medium text-foreground tracking-[-0.01em]">
                      {opt.title}
                    </span>
                  </div>
                  <ChevronRight size={20} strokeWidth={1.8} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 2: CONFIGURE CARD & FUNDING                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "details" && (
        <div className="w-full max-w-[586px] mx-auto flex flex-col gap-8">
          {/* Header Row: Back to Step 1 & Title */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setStep("select-type")}
              className="size-10 rounded-xl flex items-center justify-center hover:bg-muted text-foreground transition-colors shrink-0 cursor-pointer"
              aria-label="Back to card selection"
            >
              <ChevronLeft size={22} strokeWidth={1.8} />
            </button>
            <h1 className="text-[24px] sm:text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground capitalize">
              Request {cardType.toLowerCase()} card
            </h1>
          </div>

          {/* Form Container */}
          <div className="flex flex-col gap-6 w-full">
            {/* Linked Account Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium text-foreground">
                Linked account
              </label>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="w-full min-h-[68px] p-4 flex items-center justify-between rounded-[16px] bg-muted/40 border border-border hover:bg-muted/60 transition-colors text-left cursor-pointer"
                    />
                  }
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-9 rounded-xl bg-background border border-border flex items-center justify-center shrink-0 text-foreground">
                      <Landmark size={18} strokeWidth={1.8} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15px] font-medium text-foreground truncate">
                        {selectedAccount?.name ?? "Current Account"}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground tabular-nums">
                        {selectedAccount?.number ?? "1414 4124 4214"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <span className="text-[15px] font-medium text-foreground tabular-nums">
                      {selectedAccount
                        ? formatMoney(selectedAccount.balance, selectedAccount.currency)
                        : "GHS 1,320,201.00"}
                    </span>
                    <ChevronDown size={16} strokeWidth={1.8} className="text-muted-foreground" />
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-[320px]">
                  {availableAccounts.map((acc) => (
                    <DropdownMenuItem
                      key={acc.id}
                      onClick={() => setSelectedAccountId(acc.id)}
                      className="flex items-center justify-between py-2.5 cursor-pointer"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13.5px] font-medium text-foreground truncate">
                          {acc.name}
                        </span>
                        <span className="text-[12px] text-muted-foreground tabular-nums">
                          {acc.number}
                        </span>
                      </div>
                      <span className="text-[13px] font-medium tabular-nums shrink-0 ml-2">
                        {formatMoney(acc.balance, acc.currency)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Card Name */}
            <div className="flex flex-col gap-2">
              <label htmlFor="card-name-input" className="text-[14px] font-medium text-foreground">
                Card name
              </label>
              <Input
                id="card-name-input"
                type="text"
                placeholder="Enter a name for your card"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="h-12 px-4 rounded-[12px] bg-muted/40 border-border text-[15px] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Fund Card (for Virtual and Prepaid cards) */}
            {isFundable && (
              <div className="flex flex-col gap-2">
                <label htmlFor="fund-card-input" className="text-[14px] font-medium text-foreground">
                  Fund Card
                </label>
                <div className="h-[68px] rounded-[16px] bg-muted/40 border border-border flex items-center justify-center px-4 gap-2 transition-within:border-ring">
                  <span className="text-[17px] font-medium text-muted-foreground select-none">
                    {selectedAccount?.currency ?? "GHS"}
                  </span>
                  <input
                    id="fund-card-input"
                    type="text"
                    inputMode="numeric"
                    value={fundAmount}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, "");
                      setFundAmount(clean);
                    }}
                    placeholder="0"
                    className="w-[120px] text-left text-[24px] font-medium tracking-tight text-foreground bg-transparent tabular-nums outline-none"
                  />
                </div>
              </div>
            )}

            {/* Scheme Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium text-foreground">
                Card network
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["Visa", "Mastercard"] as const).map((scheme) => (
                  <button
                    key={scheme}
                    type="button"
                    onClick={() => setCardScheme(scheme)}
                    className={`h-11 rounded-[12px] border text-[14px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                      cardScheme === scheme
                        ? "bg-foreground text-background border-foreground"
                        : "bg-muted/40 border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{scheme}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Proceed Button */}
            <div className="pt-4">
              <Button
                type="button"
                disabled={!isDetailsValid}
                onClick={() => setStep("customize")}
                className="w-full h-11 rounded-[12px] text-[14px] font-medium shadow-xs"
              >
                Proceed
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 3: CUSTOMIZE YOUR CARD                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {step === "customize" && (
        <div className="w-full max-w-[586px] mx-auto flex flex-col items-center gap-8">
          {/* Header Row: Back to Step 2 & Title */}
          <div className="flex items-center gap-4 w-full">
            <button
              type="button"
              onClick={() => setStep("details")}
              className="size-10 rounded-xl flex items-center justify-center hover:bg-muted text-foreground transition-colors shrink-0 cursor-pointer"
              aria-label="Back to card details"
            >
              <ChevronLeft size={22} strokeWidth={1.8} />
            </button>
            <h1 className="text-[24px] sm:text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
              Customize your card
            </h1>
          </div>

          {/* Interactive Full Card Preview */}
          <div className="w-full flex flex-col items-center gap-8">
            <div
              className={`relative w-full aspect-[1.586/1] max-w-[528px] rounded-[20px] p-6 sm:p-7 flex flex-col justify-between overflow-hidden select-none shadow-lg transition-all duration-300 bg-gradient-to-tr ${selectedTheme.cardGradient} ${selectedTheme.textColor} ${
                selectedTheme.borderColor ? `border ${selectedTheme.borderColor}` : ""
              }`}
            >
              {/* Subtle Ambient Shapes */}
              <div className="absolute -right-12 -top-12 size-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -left-12 -bottom-12 size-48 rounded-full bg-black/10 blur-2xl pointer-events-none" />

              {/* Top Row: Bank branding & Scheme / Tag */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] tracking-widest font-medium uppercase opacity-90">
                    GCB Bank
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Wifi size={16} strokeWidth={2} className="rotate-90 opacity-70" />
                  <span className="rounded-full bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider">
                    {cardType}
                  </span>
                </div>
              </div>

              {/* Middle Row: EMV Chip Graphic */}
              <div className="relative z-10 flex items-center gap-3">
                <div className={`size-10 rounded-[6px] border ${selectedTheme.chipColor ?? "bg-amber-300/90 border-amber-500/40"} relative overflow-hidden shadow-xs`}>
                  <div className="absolute inset-0 grid grid-cols-2 divide-x divide-black/20">
                    <div className="border-b border-black/20" />
                    <div className="border-b border-black/20" />
                  </div>
                  <div className="absolute inset-x-1.5 inset-y-2 rounded-[2px] border border-black/25" />
                </div>
              </div>

              {/* Bottom Row: Card Name, Number, Holder, Scheme */}
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
                      <span className="text-[11px] font-medium tabular-nums">
                        08/30
                      </span>
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

            {/* 7 Color Palette Swatches Matching Figma */}
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
                    className={`relative size-11 sm:size-12 rounded-full ${theme.swatchGradient} shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center ${
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

            {/* Proceed Button */}
            <div className="w-full pt-2">
              <Button
                type="button"
                onClick={handleCompleteCreation}
                className="w-full h-11 rounded-[12px] text-[14px] font-medium shadow-xs"
              >
                Proceed
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
