"use client";

/**
 * A post-onboarding welcome and funding experience, shown over the blurred dashboard
 * after someone finishes onboarding or migration until they dismiss it.
 *
 * Implements the 1:1 Figma Showcase split-art design (node 5858:70291) persistently:
 * - Persistent right-hand gold split art with embedded dashboard preview throughout all steps
 * - Seamless directional horizontal sliding on the left column (/better-ui spring animation)
 *   1. Welcome: "Welcome to GCB, {firstName}!"
 *   2. Method: Choose between Mobile Money and Card
 *   3. Form: Required input fields with live validation
 *   4. Verification: Instant USSD push simulation / SMS OTP
 *   5. Success: Deposit receipt confirmation
 *   6. Source: "Save this wallet?" for 1-tap top-ups
 *   7. Referral: Optional branch referral code
 */

import { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Smartphone,
} from "lucide-react";
import { GCBLogo } from "@/components/ui/GCBLogo";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import OtpInput from "@/components/auth/OtpInput";
import { AppLoader } from "@/components/ui/loader";
import { AlertToast } from "@/components/ui/alert-toast";
import { InlineError } from "@/components/ui/inline-error";
import { cn } from "@/lib/utils";
import { displayGhanaMobile, toNationalDigits } from "@/lib/phone";
import { maskMobile } from "@/lib/auth-shared";
import {
  clearFirstRun,
  peekFirstRun,
  type FirstRunKind,
  peekPendingReferral,
  clearPendingReferral,
  peekPendingFundPrompt,
  peekVerifiedMobile,
  clearPendingFundPrompt,
  setHasSkippedFunding,
  type PendingFundingSource,
} from "@/lib/device-trust";
import ReferralStep from "@/components/auth/ReferralStep";
import { SourceSummary, sourceFromFunding, useSaveSource } from "./SaveSourcePrompt";

type FundDetails = { operator?: string; phone?: string; cardLast4?: string };

type FlowStep =
  | "welcome"
  | "method"
  | "momo-choice"
  | "form"
  | "otp"
  | "ussd"
  | "success"
  | "source"
  | "referral";

const BUTTON =
  "h-10.5 w-full text-[14px] font-medium active:scale-[0.96] transition-transform duration-150 cursor-pointer";

const slideVariants: Variants = {
  enter: (dir: "forward" | "backward") => ({
    x: dir === "forward" ? 28 : -28,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 400, damping: 32 },
      opacity: { duration: 0.18, ease: "easeOut" as const },
    },
  },
  exit: (dir: "forward" | "backward") => ({
    x: dir === "forward" ? -28 : 28,
    opacity: 0,
    transition: {
      x: { duration: 0.14, ease: "easeIn" as const },
      opacity: { duration: 0.1 },
    },
  }),
};

function detectOperatorFromPhone(val: string): "MTN" | "Telecel" | "AT" {
  const digits = toNationalDigits(val);
  if (/^(20|50)/.test(digits)) return "Telecel";
  if (/^(27|57|26|56)/.test(digits)) return "AT";
  return "MTN";
}

export function FirstRunWelcome({
  firstName,
  onFunded,
}: {
  firstName: string;
  /** Called when the first deposit lands, so the dashboard can update its numbers. */
  onFunded?: (amount: number, method: "momo" | "card", details: FundDetails) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [kind, setKind] = useState<FirstRunKind | null>(null);

  // Flow & Animation State
  const [step, setStep] = useState<FlowStep>("welcome");
  const [slideDirection, setSlideDirection] = useState<"forward" | "backward">("forward");

  // Funding Form State
  const [method, setMethod] = useState<"momo" | "card">("momo");
  const registeredPhone = peekVerifiedMobile() || "0241234567";
  const [phone, setPhone] = useState(registeredPhone);
  const [isCustomNumber, setIsCustomNumber] = useState(false);
  const [operator, setOperator] = useState<"MTN" | "Telecel" | "AT">(() =>
    detectOperatorFromPhone(registeredPhone)
  );
  const usingRegistered =
    !isCustomNumber &&
    !!registeredPhone &&
    toNationalDigits(phone) === toNationalDigits(registeredPhone);
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [amount, setAmount] = useState("100");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [countdown, setCountdown] = useState(30);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingSource, setPendingSource] = useState<PendingFundingSource | null>(null);

  const fundingSucceededRef = useRef(false);

  const goTo = (nextStep: FlowStep) => {
    setSlideDirection("forward");
    setStep(nextStep);
  };

  const goBack = (prevStep: FlowStep) => {
    setSlideDirection("backward");
    setStep(prevStep);
  };

  useEffect(() => {
    const verified = peekVerifiedMobile();
    if (verified) {
      setPhone(verified);
      setOperator(detectOperatorFromPhone(verified));
    }
  }, []);

  const handleCustomPhoneChange = (val: string) => {
    setPhone(val);
    setOperator(detectOperatorFromPhone(val));
  };

  // OTP Countdown timer
  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, countdown]);

  // USSD Auto-Approval simulation
  useEffect(() => {
    if (step !== "ussd") return;
    const timer = window.setTimeout(() => {
      handleFinalizeDeposit();
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [step]);

  const applyStage = (
    targetStage: "referral" | "ready" | "fund" | "source" | "all",
    targetKind: FirstRunKind = "new"
  ) => {
    setKind(targetKind);
    fundingSucceededRef.current = false;
    setSlideDirection("forward");
    if (targetStage === "all" || targetStage === "ready") {
      setStep("welcome");
    } else if (targetStage === "fund") {
      setStep("method");
    } else if (targetStage === "source") {
      setPendingSource({ type: "momo", operator: "MTN MoMo", momoNumber: "+233 24 123 4567" });
      setStep("source");
    } else if (targetStage === "referral") {
      setStep("referral");
    }
  };

  // Shown until dismissed, or triggered via URL searchParam / event
  useEffect(() => {
    const welcome = searchParams.get("welcome");
    if (welcome) {
      if (welcome === "all" || welcome === "true") {
        applyStage("all");
      } else if (welcome === "referral") {
        applyStage("referral");
      } else if (welcome === "ready") {
        applyStage("ready");
      } else if (welcome === "fund") {
        applyStage("fund");
      } else if (welcome === "source") {
        applyStage("source");
      }
      return;
    }

    const k = peekFirstRun();
    setKind(k);
    if (k === "migrated") {
      clearFirstRun();
      setKind(null);
    } else if (k === "new") {
      const fund = peekPendingFundPrompt();
      const ref = peekPendingReferral();
      if (fund) {
        setStep("welcome");
      } else if (ref) {
        setStep("referral");
      } else {
        clearFirstRun();
        setKind(null);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    function handleTrigger(e: Event) {
      const custom = e as CustomEvent<{
        stage?: "referral" | "ready" | "fund" | "source" | "all";
        kind?: FirstRunKind;
      }>;
      const targetStage = custom.detail?.stage ?? "all";
      const targetKind = custom.detail?.kind ?? "new";
      applyStage(targetStage, targetKind);
    }
    window.addEventListener("open-welcome-flow", handleTrigger);
    return () => window.removeEventListener("open-welcome-flow", handleTrigger);
  }, []);

  if (!kind) return null;

  const close = () => {
    clearFirstRun();
    clearPendingReferral();
    clearPendingFundPrompt();
    setKind(null);
    if (searchParams.get("welcome")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("welcome");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  };

  const skipFunding = () => {
    setHasSkippedFunding(true);
    clearPendingFundPrompt();
    goTo("referral");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amount);
    if (!parsedAmt || parsedAmt <= 0) {
      setErrorMsg("Please enter an amount to fund.");
      return;
    }
    setErrorMsg("");
    setBusy(true);

    if (method === "momo") {
      window.setTimeout(() => {
        setBusy(false);
        if (usingRegistered) {
          // Already verified at registration: straight to phone approval
          goTo("ussd");
          return;
        }
        setOtpDigits(Array(6).fill(""));
        setCountdown(30);
        goTo("otp");
      }, 400);
    } else {
      window.setTimeout(() => {
        setBusy(false);
        handleFinalizeDeposit();
      }, 600);
    }
  };

  const handleOtpComplete = (code: string) => {
    if (code.length < 6 || busy) return;
    if (code === "000000") {
      setErrorMsg("The code entered is incorrect or expired. Please try again.");
      setOtpDigits(Array(6).fill(""));
      return;
    }
    setErrorMsg("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      goTo("ussd");
    }, 400);
  };

  const handleFinalizeDeposit = () => {
    const parsedAmt = parseFloat(amount) || 100;
    const details = {
      operator: method === "momo" ? operator : undefined,
      phone: method === "momo" ? displayGhanaMobile(phone) : undefined,
      cardLast4: method === "card" ? cardNumber.replace(/\s/g, "").slice(-4) : undefined,
    };
    fundingSucceededRef.current = true;
    onFunded?.(parsedAmt, method, details);
    clearPendingFundPrompt();
    setPendingSource(sourceFromFunding(method, details));
    goTo("success");
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    if (step === "referral") {
      clearPendingReferral();
      close();
    } else if (step === "method" || step === "momo-choice" || step === "form" || step === "otp") {
      clearPendingFundPrompt();
      skipFunding();
    } else if (step === "source") {
      goTo("referral");
    } else {
      close();
    }
  };

  const sourceToUse: PendingFundingSource = pendingSource || {
    type: "momo",
    operator: "MTN MoMo",
    momoNumber: "+233 24 123 4567",
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        size="lg"
        className="overflow-hidden sm:max-w-[812px] p-2.5 sm:p-3 border border-border/80 bg-card dark:bg-[#181818] shadow-2xl sm:rounded-[20px]"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] min-h-[440px] max-h-[calc(92vh-2rem)] overflow-hidden">
          {/* Left Column: Interactive sliding view */}
          <div className="relative flex flex-col justify-between overflow-hidden p-5 sm:px-6 sm:py-7 min-h-[440px] min-w-0">
            <AnimatePresence mode="wait" custom={slideDirection} initial={false}>
              <motion.div
                key={step}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-1 flex-col justify-between h-full w-full min-w-0"
              >
                {/* STEP 1: WELCOME (1:1 Figma Showcase Node 5858:70291) */}
                {step === "welcome" && (
                  <div className="flex flex-1 flex-col justify-between h-full">
                    <div className="flex flex-col gap-6 sm:gap-8">
                      <div className="flex items-center">
                        <GCBLogo className="h-9 w-auto" />
                      </div>

                      <div className="flex flex-col gap-2">
                        <DialogTitle className="text-[22px] font-medium tracking-tight text-foreground sm:text-[24px] leading-tight">
                          Welcome to GCB, {firstName}!
                        </DialogTitle>
                        <p className="text-[14px] leading-relaxed text-muted-foreground max-w-[360px]">
                          Your virtual wallet is ready. Add funds before sending, paying, or shopping online from your dashboard.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-6 sm:pt-0">
                      <Button
                        type="button"
                        onClick={() => goTo("method")}
                        className={BUTTON}
                      >
                        Fund account
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={skipFunding}
                        className={BUTTON}
                      >
                        Skip for now
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2: CHOOSE FUNDING METHOD */}
                {step === "method" && (
                  <div className="flex flex-1 flex-col justify-between h-full">
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => goBack("welcome")}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer -ml-1.5"
                          aria-label="Back to welcome"
                        >
                          <ChevronLeft size={18} strokeWidth={2} />
                        </button>
                        <DialogTitle className="text-[20px] font-medium tracking-tight text-foreground sm:text-[22px]">
                          Choose funding method
                        </DialogTitle>
                      </div>

                      <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                        Select how you&apos;d like to deposit funds into your virtual wallet.
                      </p>

                      <div className="flex flex-col gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg("");
                            setMethod("momo");
                            setIsCustomNumber(false);
                            if (registeredPhone) {
                              setPhone(registeredPhone);
                              setOperator(detectOperatorFromPhone(registeredPhone));
                              goTo("momo-choice");
                            } else {
                              setIsCustomNumber(true);
                              goTo("form");
                            }
                          }}
                          className="group flex w-full items-center justify-between rounded-2xl border border-border/80 bg-card p-4 transition-all hover:border-primary/60 hover:bg-muted/40 hover:shadow-xs active:scale-[0.96] cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 sm:gap-4">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0 shadow-xs">
                              <Smartphone size={20} strokeWidth={2} />
                            </div>
                            <span className="text-[14px] font-medium text-foreground tracking-[-0.01em] sm:text-[14.5px]">
                              Fund with Mobile Money Wallet
                            </span>
                          </div>
                          <ArrowRight
                            size={16}
                            strokeWidth={1.8}
                            className="text-muted-foreground transition-transform group-hover:translate-x-0.5 shrink-0"
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg("");
                            setMethod("card");
                            goTo("form");
                          }}
                          className="group flex w-full items-center justify-between rounded-2xl border border-border/80 bg-card p-4 transition-all hover:border-primary/60 hover:bg-muted/40 hover:shadow-xs active:scale-[0.96] cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 sm:gap-4">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0 shadow-xs">
                              <CreditCard size={20} strokeWidth={2} />
                            </div>
                            <span className="text-[14px] font-medium text-foreground tracking-[-0.01em] sm:text-[14.5px]">
                              Fund with a Card
                            </span>
                          </div>
                          <ArrowRight
                            size={16}
                            strokeWidth={1.8}
                            className="text-muted-foreground transition-transform group-hover:translate-x-0.5 shrink-0"
                          />
                        </button>
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={skipFunding}
                        className="h-9 w-full text-[13px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        I&apos;ll do this later
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2B: MOMO NUMBER CHOICE */}
                {step === "momo-choice" && (
                  <div className="flex flex-1 flex-col justify-between h-full">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => goBack("method")}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer -ml-1.5"
                          aria-label="Back to methods"
                        >
                          <ChevronLeft size={18} strokeWidth={2} />
                        </button>
                        <DialogTitle className="text-[20px] font-medium tracking-tight text-foreground sm:text-[22px]">
                          Mobile Money
                        </DialogTitle>
                      </div>

                      {/* Verified Number Tile (Matches screenshot 1:1) */}
                      <div className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-muted/20 p-3.5 text-left sm:p-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card">
                          <Image
                            src={
                              operator === "Telecel"
                                ? "/telecel.svg"
                                : operator === "AT"
                                ? "/at.svg"
                                : "/mtn.svg"
                            }
                            alt={operator}
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium tracking-[-0.01em] text-foreground sm:text-[14.5px]">
                            {operator} Wallet
                          </p>
                          <p className="tabular-nums truncate text-[12.5px] text-muted-foreground sm:text-[13px]">
                            {displayGhanaMobile(phone)}
                          </p>
                        </div>
                      </div>

                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        This is the number you onboarded with. To use a different one, we&apos;ll text you a code.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-4">
                      <Button
                        type="button"
                        className={BUTTON}
                        onClick={() => {
                          setIsCustomNumber(false);
                          setPhone(registeredPhone);
                          setOperator(detectOperatorFromPhone(registeredPhone));
                          goTo("form");
                        }}
                      >
                        Continue with same number
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          BUTTON,
                          "bg-transparent border-border/80 text-foreground hover:bg-muted/40"
                        )}
                        onClick={() => {
                          setIsCustomNumber(true);
                          goTo("form");
                        }}
                      >
                        Use a different number
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: REQUIRED FIELDS FORM */}
                {step === "form" && (
                  <form onSubmit={handleFormSubmit} className="flex flex-1 flex-col justify-between h-full">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (method === "momo" && registeredPhone) {
                              goBack("momo-choice");
                            } else {
                              goBack("method");
                            }
                          }}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer -ml-1.5"
                          aria-label="Back"
                        >
                          <ChevronLeft size={18} strokeWidth={2} />
                        </button>
                        <DialogTitle className="text-[20px] font-medium tracking-tight text-foreground sm:text-[22px]">
                          {method === "momo" ? "Mobile Money" : "Card deposit"}
                        </DialogTitle>
                      </div>

                      {method === "momo" ? (
                        !isCustomNumber ? (
                          /* ── Branch 1: Same verified number (NO phone field, NO network field) ── */
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/20 p-3 sm:p-3.5 text-left">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card">
                                <Image
                                  src={
                                    operator === "Telecel"
                                      ? "/telecel.svg"
                                      : operator === "AT"
                                      ? "/at.svg"
                                      : "/mtn.svg"
                                  }
                                  alt={operator}
                                  width={22}
                                  height={22}
                                  className="object-contain"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13.5px] font-medium tracking-[-0.01em] text-foreground">
                                  {operator} Wallet
                                </p>
                                <p className="tabular-nums truncate text-[12px] text-muted-foreground">
                                  {displayGhanaMobile(phone)}
                                </p>
                              </div>
                            </div>

                            {/* Amount Input */}
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="momoAmt" className="text-[12.5px] font-medium text-foreground">
                                Amount
                              </Label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 text-[13.5px] text-muted-foreground font-medium pointer-events-none select-none">
                                  GHS
                                </span>
                                <Input
                                  id="momoAmt"
                                  type="number"
                                  min="1"
                                  step="any"
                                  value={amount}
                                  onChange={(e) => setAmount(e.target.value)}
                                  className="h-10.5 pl-14 text-[14.5px] font-medium bg-card border-border/80 rounded-xl"
                                  required
                                  autoFocus
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* ── Branch 2: Different number (HAS phone field + network selector + Amount) ── */
                          <div className="flex flex-col gap-3.5">
                            {/* Mobile Number input */}
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="momoPhone" className="text-[12.5px] font-medium text-foreground">
                                Mobile Number
                              </Label>
                              <PhoneInput
                                id="momoPhone"
                                value={phone}
                                onValueChange={handleCustomPhoneChange}
                                className="h-10.5 bg-card border-border/80 rounded-xl"
                                required
                                autoFocus
                              />
                              <p className="px-0.5 text-[11.5px] text-muted-foreground">
                                A verification code will be sent to confirm this number.
                              </p>
                            </div>

                            {/* Network Provider Selector */}
                            <div className="flex flex-col gap-1.5">
                              <Label className="text-[12.5px] font-medium text-foreground">
                                Network Provider
                              </Label>
                              <Select
                                value={operator}
                                onValueChange={(val) => setOperator(val as "MTN" | "Telecel" | "AT")}
                              >
                                <SelectTrigger className="h-10.5 w-full bg-card border-border/80">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/40">
                                      {operator === "MTN" && (
                                        <Image
                                          src="/mtn.svg"
                                          alt="MTN"
                                          width={24}
                                          height={24}
                                          className="size-6 object-contain"
                                        />
                                      )}
                                      {operator === "Telecel" && (
                                        <Image
                                          src="/telecel.svg"
                                          alt="Telecel"
                                          width={24}
                                          height={24}
                                          className="size-6 object-contain"
                                        />
                                      )}
                                      {operator === "AT" && (
                                        <Image
                                          src="/at.svg"
                                          alt="AT"
                                          width={24}
                                          height={24}
                                          className="size-6 object-contain"
                                        />
                                      )}
                                    </div>
                                    <span className="text-[13.5px] text-foreground font-medium">
                                      {operator === "MTN" && "MTN Mobile Money"}
                                      {operator === "Telecel" && "Telecel Cash"}
                                      {operator === "AT" && "AT Money"}
                                    </span>
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MTN">
                                    <div className="flex items-center gap-2.5 py-0.5">
                                      <Image
                                        src="/mtn.svg"
                                        alt="MTN"
                                        width={22}
                                        height={22}
                                        className="size-5.5 object-contain"
                                      />
                                      <span>MTN Mobile Money</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="Telecel">
                                    <div className="flex items-center gap-2.5 py-0.5">
                                      <Image
                                        src="/telecel.svg"
                                        alt="Telecel"
                                        width={22}
                                        height={22}
                                        className="size-5.5 object-contain"
                                      />
                                      <span>Telecel Cash</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="AT">
                                    <div className="flex items-center gap-2.5 py-0.5">
                                      <Image
                                        src="/at.svg"
                                        alt="AT"
                                        width={22}
                                        height={22}
                                        className="size-5.5 object-contain"
                                      />
                                      <span>AT Money</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Amount Input */}
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="momoAmtCustom" className="text-[12.5px] font-medium text-foreground">
                                Amount
                              </Label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 text-[13.5px] text-muted-foreground font-medium pointer-events-none select-none">
                                  GHS
                                </span>
                                <Input
                                  id="momoAmtCustom"
                                  type="number"
                                  min="1"
                                  step="any"
                                  value={amount}
                                  onChange={(e) => setAmount(e.target.value)}
                                  className="h-10.5 pl-14 text-[14.5px] font-medium bg-card border-border/80 rounded-xl"
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col gap-3.5">
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="cardNum" className="text-[12.5px] font-medium text-foreground">
                              Card Number
                            </Label>
                            <Input
                              id="cardNum"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              className="h-10.5 text-[14px] bg-card border-border/80 rounded-xl"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="cardExp" className="text-[12.5px] font-medium text-foreground">
                                Expiry
                              </Label>
                              <Input
                                id="cardExp"
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value)}
                                className="h-10.5 text-[14px] bg-card border-border/80 rounded-xl"
                                required
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="cardCvv" className="text-[12.5px] font-medium text-foreground">
                                CVV
                              </Label>
                              <Input
                                id="cardCvv"
                                maxLength={3}
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value)}
                                className="h-10.5 text-[14px] bg-card border-border/80 rounded-xl"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="cardAmt" className="text-[12.5px] font-medium text-foreground">
                              Amount
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10 text-[13.5px] text-muted-foreground font-medium pointer-events-none select-none">
                                GHS
                              </span>
                              <Input
                                id="cardAmt"
                                type="number"
                                min="1"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="h-10.5 pl-14 text-[14.5px] font-medium bg-card border-border/80 rounded-xl"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <AlertToast when={errorMsg} message={errorMsg} />
                    </div>

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={!amount}
                        loading={busy}
                        className={BUTTON}
                      >
                        Continue
                      </Button>
                    </div>
                  </form>
                )}

                {/* STEP 4A: OTP VERIFICATION (Only when using non-registered phone) */}
                {step === "otp" && (
                  <div className="flex flex-1 flex-col justify-between h-full">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => goBack("form")}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer -ml-1.5"
                          aria-label="Back to form"
                        >
                          <ChevronLeft size={18} strokeWidth={2} />
                        </button>
                        <DialogTitle className="text-[20px] font-medium tracking-tight text-foreground sm:text-[22px]">
                          Confirm mobile number
                        </DialogTitle>
                      </div>

                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        Enter the 6-digit code sent to{" "}
                        <span className="font-medium text-foreground">
                          {maskMobile(displayGhanaMobile(phone))}
                        </span>.
                      </p>

                      <div className="flex flex-col items-center gap-4 py-3">
                        <OtpInput
                          value={otpDigits}
                          onChange={(next: string[]) => {
                            setOtpDigits(next);
                            if (errorMsg) setErrorMsg("");
                          }}
                          length={6}
                          onComplete={handleOtpComplete}
                          disabled={busy}
                          invalid={!!errorMsg}
                          autoFocus
                        />

                        {busy && (
                          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            <AppLoader size={15} />
                            <span>Verifying code…</span>
                          </div>
                        )}

                        <InlineError message={errorMsg} />

                        <div className="flex items-center justify-center pt-2 text-[12.5px]">
                          <button
                            type="button"
                            disabled={countdown > 0}
                            onClick={() => setCountdown(30)}
                            className={cn(
                              "transition-colors",
                              countdown > 0
                                ? "text-muted-foreground/60 cursor-default"
                                : "text-foreground font-medium underline underline-offset-4 hover:text-foreground/80 cursor-pointer"
                            )}
                          >
                            {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4B: USSD APPROVAL PROMPT */}
                {step === "ussd" && (
                  <div className="flex flex-1 flex-col items-center justify-center text-center gap-4 py-6">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-foreground shadow-2xs">
                      <Smartphone size={26} strokeWidth={1.8} className="animate-pulse" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="tabular-nums text-[22px] font-medium tracking-tight text-foreground">
                        GHS {parseFloat(amount).toFixed(2)}
                      </span>
                      <p className="text-[13.5px] text-muted-foreground max-w-[280px]">
                        Enter your Mobile Money PIN on your phone to approve.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 text-[12.5px] text-muted-foreground">
                      <AppLoader size={14} />
                      <span>Waiting for approval…</span>
                    </div>
                  </div>
                )}

                {/* STEP 5: DEPOSIT SUCCESS */}
                {step === "success" && (
                  <div className="flex flex-1 flex-col justify-between h-full py-2">
                    <div className="flex flex-col items-center text-center gap-4 pt-6">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-2xs">
                        <CheckCircle2 size={28} strokeWidth={1.9} />
                      </div>

                      <div className="flex flex-col gap-1">
                        <DialogTitle className="tabular-nums text-[22px] font-medium tracking-tight text-foreground">
                          GHS {parseFloat(amount).toFixed(2)} deposited
                        </DialogTitle>
                        <p className="text-[13.5px] text-muted-foreground">
                          Available in your virtual wallet now.
                        </p>
                      </div>
                    </div>

                    <div className="pt-6">
                      <Button
                        type="button"
                        onClick={() => goTo("source")}
                        className={BUTTON}
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 6: SAVE FUNDING SOURCE */}
                {step === "source" && (
                  <SaveSourcePane
                    source={sourceToUse}
                    onDone={() => goTo("referral")}
                  />
                )}

                {/* STEP 7: REFERRAL */}
                {step === "referral" && (
                  <ReferralStep
                    onDone={() => {
                      clearPendingReferral();
                      close();
                    }}
                    dataTour="dashboard-referral"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column: Persistent Figma Gold Split Art with Dashboard Preview (1:1 Node 5858:70291) */}
          <PersistentSplitArt />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Component to handle the Save Funding Source state with useSaveSource hook */
function SaveSourcePane({
  source,
  onDone,
}: {
  source: PendingFundingSource;
  onDone: () => void;
}) {
  const { save, heading, saveLabel } = useSaveSource(source, onDone);
  return (
    <div className="flex flex-1 flex-col justify-between h-full">
      <div className="flex flex-col gap-4">
        <DialogTitle className="text-[20px] font-medium tracking-tight text-foreground sm:text-[22px]">
          {heading}
        </DialogTitle>
        <SourceSummary source={source} />
      </div>
      <div className="flex flex-col gap-2.5 pt-4">
        <Button type="button" onClick={save} className={BUTTON}>
          {saveLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} className={BUTTON}>
          Not now
        </Button>
      </div>
    </div>
  );
}

/**
 * Isolated, memoized Figma Showcase Gold Split Art (Node 5858:70291).
 *
 * Hardened against flicker & layout repaint:
 * 1. React.memo prevents unnecessary re-renders when parent states change.
 * 2. `unoptimized` prevents Next.js image loader re-triggering.
 * 3. `[transform:translateZ(0)]` & `[backface-visibility:hidden]` promote to a dedicated GPU compositing layer.
 */
const PersistentSplitArt = memo(function PersistentSplitArt() {
  return (
    <div
      aria-hidden="true"
      className="relative hidden overflow-hidden rounded-xl sm:block min-h-[440px] min-w-0 select-none [transform:translateZ(0)] [backface-visibility:hidden]"
      style={{
        background:
          "radial-gradient(ellipse at center, #ffd400 0%, #ffbb00 100%)",
      }}
    >
      <div className="absolute left-[79px] top-[98px] h-[538px] w-[625px] rounded-[8px] border-8 border-[#2a2a2a] overflow-hidden shadow-2xl bg-[#141414] [transform:translateZ(0)] [backface-visibility:hidden]">
        <Image
          src="/welcome-dashboard-preview.png"
          alt=""
          width={625}
          height={538}
          className="size-full object-cover object-left-top pointer-events-none select-none [transform:translateZ(0)]"
          priority
          unoptimized
        />
      </div>
    </div>
  );
});
