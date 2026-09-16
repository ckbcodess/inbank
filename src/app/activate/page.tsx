"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { useSession } from "@/lib/session-store";
import { ACTORS } from "@/lib/mock-data";
import {
  ACTIVATION_PERSONAS,
  getPersonaByGhanaCard,
  type ActivationPersonaConfig,
  type DiscoveredAccount,
} from "@/lib/activation";

type Step = "ghana_card" | "selfie" | "review_details" | "otp" | "password" | "pin";

const RESEND_SECONDS = 30;

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const personaParam = searchParams.get("persona") as
    | "single"
    | "multi"
    | "joint"
    | "mobile_sync"
    | null;

  const [activePersonaKey, setActivePersonaKey] = useState<
    "single" | "multi" | "joint" | "mobile_sync"
  >(personaParam && ACTIVATION_PERSONAS[personaParam] ? personaParam : "multi");

  const activePersona: ActivationPersonaConfig = ACTIVATION_PERSONAS[activePersonaKey];
  const isJoint = activePersona.isJoint ?? false;
  const isMobileSync = activePersona.mobileAppLinked ?? false;
  const isMultiAccount = activePersona.accounts.length > 1;

  const { signIn, selectProfile, verifyMfa } = useSession();

  const [step, setStep] = useState<Step>("ghana_card");
  const [ghanaCard, setGhanaCard] = useState(activePersona.ghanaCard);
  const [selectedPrimaryAccountId, setSelectedPrimaryAccountId] = useState<string>(
    activePersona.accounts.find((a) => a.isPrimaryDefault)?.id ?? activePersona.accounts[0]?.id ?? ""
  );

  const [selfieTaken, setSelfieTaken] = useState(false);
  const [busy, setBusy] = useState(false);

  // OTP State
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [otpTarget, setOtpTarget] = useState<"sms" | "email">("sms");

  // Password & PIN State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState("");

  // Sync state when persona parameter or selection changes
  const applyPersona = (key: "single" | "multi" | "joint" | "mobile_sync") => {
    setActivePersonaKey(key);
    const config = ACTIVATION_PERSONAS[key];
    setGhanaCard(config.ghanaCard);
    const primaryAcc = config.accounts.find((a) => a.isPrimaryDefault) ?? config.accounts[0];
    if (primaryAcc) setSelectedPrimaryAccountId(primaryAcc.id);
    setErrorMsg("");
  };

  useEffect(() => {
    if (personaParam && ACTIVATION_PERSONAS[personaParam]) {
      applyPersona(personaParam);
    }
  }, [personaParam]);

  // OTP Countdown
  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, countdown]);

  function handleVerifyDetails() {
    setBusy(true);
    window.setTimeout(() => {
      setDigits(Array(OTP_LENGTH).fill(""));
      setBusy(false);
      setStep("otp");
      setCountdown(RESEND_SECONDS);
    }, 600);
  }

  function handleOtpSubmit(incomingCode?: string) {
    const code = incomingCode ?? digits.join("");
    if (code.length < OTP_LENGTH || busy) return;

    // Demo: 000000 triggers the invalid error state
    if (code === "000000") {
      setErrorMsg("The code entered is incorrect or has expired. Please try again or request a new code.");
      setDigits(Array(OTP_LENGTH).fill(""));
      return;
    }

    setErrorMsg("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep("password");
    }, 600);
  }

  // Password Checklist validation
  const hasMinLength = password.length >= 12;
  const hasCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  // Step Progress Index (out of 8)
  const stepNumberMap: Record<Step, number> = {
    ghana_card: 3,
    selfie: 4,
    review_details: 5,
    otp: 6,
    password: 7,
    pin: 8,
  };

  function handleGhanaCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ghanaCard.trim()) {
      setErrorMsg("Please enter your Ghana Card number");
      return;
    }

    // Auto-detect persona if card matches known demo pattern
    const detected = getPersonaByGhanaCard(ghanaCard);
    if (detected.id !== activePersonaKey) {
      setActivePersonaKey(detected.id);
      const defaultPrimary = detected.accounts.find((a) => a.isPrimaryDefault) ?? detected.accounts[0];
      if (defaultPrimary) setSelectedPrimaryAccountId(defaultPrimary.id);
    }

    setErrorMsg("");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep("selfie");
    }, 600);
  }

  function handleCaptureSelfie() {
    setBusy(true);
    setTimeout(() => {
      setSelfieTaken(true);
      setBusy(false);
      setTimeout(() => {
        setStep("review_details");
      }, 500);
    }, 1000);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setErrorMsg("Please enter a password.");
      return;
    }
    // Demo: 00000 or 000000 triggers error state
    if (password === "00000" || password === "000000") {
      setErrorMsg("That password cannot be used. Choose another.");
      return;
    }
    if (!confirmPassword) {
      setErrorMsg("Please confirm your password.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setErrorMsg("");
    setStep("pin");
  }

  function handlePinSubmit(incomingPin?: string) {
    const pin = incomingPin ?? pinDigits.join("");
    if (pin.length < 4 || busy) {
      if (pin.length < 4) setErrorMsg("Please enter a 4-digit PIN");
      return;
    }
    setErrorMsg("");
    setBusy(true);

    // Finalize onboarding and log user into appropriate dashboard profile
    setTimeout(() => {
      const actor = ACTORS.find((a) => a.id === activePersona.actorId) || ACTORS[0];
      signIn(actor);
      if (actor.profiles.length > 0) {
        selectProfile(actor.profiles[0]);
      }
      verifyMfa();
      router.push("/overview");
    }, 800);
  }

  function handleBackStep() {
    setErrorMsg("");
    setBusy(false);
    if (step === "pin") {
      setPinDigits(["", "", "", ""]);
      setStep("password");
    } else if (step === "password") {
      setPassword("");
      setConfirmPassword("");
      setDigits(Array(OTP_LENGTH).fill(""));
      setCountdown(RESEND_SECONDS);
      setStep("otp");
    } else if (step === "otp") {
      setDigits(Array(OTP_LENGTH).fill(""));
      setStep("review_details");
    } else if (step === "review_details") {
      setStep("selfie");
    } else if (step === "selfie") {
      setStep("ghana_card");
    } else {
      router.push("/get-started");
    }
  }

  const selectedPrimaryAccount =
    activePersona.accounts.find((a) => a.id === selectedPrimaryAccountId) ??
    activePersona.accounts[0];

  return (
    <AuthLayout
      title={
        step === "ghana_card"
          ? "Enter your Ghana Card details"
          : step === "selfie"
          ? "Let's take a photo of you"
          : step === "review_details"
          ? isMultiAccount
            ? "Choose your primary account"
            : isJoint
            ? "Verify joint account details"
            : "Review and verify your details"
          : step === "otp"
          ? "Enter the verification code"
          : step === "password"
          ? "Create a secure password"
          : "Create your transaction PIN"
      }
      description={
        step === "ghana_card"
          ? "We will verify your identity using the National Identification Authority register."
          : step === "selfie"
          ? "Hold your phone at eye level. Make sure you are in a well-lit area."
          : step === "review_details"
          ? isMultiAccount
            ? "We found multiple accounts linked to your Ghana Card. Select which account to set as your primary operating account."
            : isJoint
            ? "We matched your identity with an active GCB Joint Account mandate."
            : isMobileSync
            ? "Existing GCB Mobile App profile matched. Verify your details below."
            : "Confirm that these details match your existing GCB account."
          : step === "otp"
          ? isJoint
            ? `6-digit code sent to primary number ${activePersona.phone}. Co-signatory notice dispatched to ${activePersona.coSignatoryPhone}.`
            : `6-digit code sent via ${
                otpTarget === "sms"
                  ? `SMS to ${activePersona.phone}`
                  : `Email to ${activePersona.email}`
              }. Enter 000000 to see the error state.`
          : step === "password"
          ? "Your password must be at least 12 characters and include upper, lower, numbers and symbols."
          : "Choose a 4-digit PIN to authorize transfers and payments."
      }
      stepProgress={{
        current: stepNumberMap[step],
        total: 8,
      }}
      width={step === "review_details" ? "wide" : "compact"}
      footer={
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleBackStep}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-[0.96] cursor-pointer"
          >
            <ArrowLeft size={15} strokeWidth={2} />
            Back to previous step
          </button>
        </div>
      }
    >
      {/* STEP 1: Ghana Card Input */}
      {step === "ghana_card" && (
        <form onSubmit={handleGhanaCardSubmit} className="flex flex-col gap-5">
          {/* Context Banner */}
          {isMobileSync && (
            <div className="flex items-start gap-3.5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Smartphone size={17} />
              </div>
              <div>
                <span className="text-[13.5px] font-medium text-foreground">
                  Mobile App User Detected
                </span>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  We found your GCB Mobile App account ({activePersona.holderName}). Enter your Ghana Card to link your web banking.
                </p>
              </div>
            </div>
          )}

          {isJoint && (
            <div className="flex items-start gap-3.5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Users size={17} />
              </div>
              <div>
                <span className="text-[13.5px] font-medium text-foreground">
                  Joint Account Onboarding
                </span>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  Activating Internet Banking for {activePersona.holderName} (Joint Mandate: {activePersona.jointMandate}).
                </p>
              </div>
            </div>
          )}

          {/* Card Input Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ghana-card" className="text-[13.5px] font-medium text-foreground">
              Ghana Card Number (PIN)
            </Label>
            <Input
              id="ghana-card"
              value={ghanaCard}
              onChange={(e) => setGhanaCard(e.target.value)}
              placeholder="e.g. GHA-0123456789-0"
              className="h-11 font-mono text-[14.5px] uppercase tracking-wider"
              autoFocus
            />
            <p className="text-[12.5px] text-muted-foreground">
              Format: GHA-XXXXXXXXX-X as shown on your physical card.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-[13px] text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="default"
            size="lg"
            data-tour="activate-card"
            disabled={busy}
            className="mt-2 h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Verifying card details...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      )}

      {/* STEP 2: Selfie / Photo Capture */}
      {step === "selfie" && (
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex size-44 sm:size-52 items-center justify-center overflow-hidden rounded-full border-4 border-primary/30 bg-muted/30 shadow-inner">
            {selfieTaken ? (
              <div className="flex flex-col items-center gap-2 text-center text-primary">
                <CheckCircle2 size={52} className="text-primary" />
                <span className="text-[14px] font-medium text-foreground">Photo captured</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 text-center text-muted-foreground">
                <Camera size={40} strokeWidth={1.7} />
                <span className="text-[12.5px]">Position face in frame</span>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="default"
            size="lg"
            data-tour="activate-selfie"
            onClick={handleCaptureSelfie}
            disabled={busy || selfieTaken}
            className="h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Verifying facial biometrics...
              </>
            ) : selfieTaken ? (
              "Verified ✓"
            ) : (
              "Capture photo"
            )}
          </Button>
        </div>
      )}

      {/* STEP 3: Review Details & Primary Account Picker */}
      {step === "review_details" && (
        <div className="flex flex-col gap-5">
          {/* Verified Customer Header Info */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  {isJoint ? <Users size={18} /> : <User size={18} />}
                </div>
                <div>
                  <span className="text-[14.5px] font-medium text-foreground block">
                    {activePersona.holderName}
                  </span>
                  <span className="text-[12px] text-muted-foreground font-mono">
                    {activePersona.ghanaCard}
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <Check size={12} />
                NIA Verified
              </span>
            </div>
          </div>

          {/* CASE A: Multi-Account - Interactive Primary Account Selection (Includes Joint Accounts) */}
          {isMultiAccount && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
                  <Layers size={14} className="text-primary" />
                  Select Primary Account ({activePersona.accounts.length} found)
                </span>
                <span className="text-[11.5px] text-muted-foreground">
                  Default for transfers &amp; statements
                </span>
              </div>

              <div className="space-y-2.5" data-tour="activate-account-picker">
                {activePersona.accounts.map((acc) => {
                  const isSelected = acc.id === selectedPrimaryAccountId;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedPrimaryAccountId(acc.id)}
                      className={`group w-full flex items-center justify-between rounded-2xl border p-4 text-left transition-all duration-150 cursor-pointer active:scale-[0.99] ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                          : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Radio circle */}
                        <div
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40 group-hover:border-primary/60"
                          }`}
                        >
                          {isSelected && <div className="size-2 rounded-full bg-primary-foreground" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-medium text-foreground truncate">
                              {acc.name}
                            </span>
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] text-muted-foreground shrink-0">
                              {acc.type}
                            </span>
                            {acc.isJoint && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10.5px] font-medium text-foreground shrink-0">
                                <Users size={11} className="text-primary" />
                                Joint
                              </span>
                            )}
                          </div>
                          <span className="text-[12.5px] text-muted-foreground font-mono mt-0.5 block">
                            •••• {acc.number.slice(-4)}
                            {acc.isJoint && acc.jointHolders && ` · ${acc.jointHolders.join(" & ")}`}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <span className="text-[13.5px] font-medium text-foreground tabular">
                          {acc.currency} {acc.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                        {isSelected ? (
                          <span className="mt-1 block rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground text-center">
                            Primary Account
                          </span>
                        ) : (
                          <span className="mt-1 block text-[11px] text-muted-foreground text-right">
                            Click to set primary
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Mandate Disclosure if selected account is Joint */}
              {selectedPrimaryAccount.isJoint && (
                <div className="mt-2 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-left animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <Users size={16} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[13px] font-medium text-foreground block">
                        Joint Mandate: {selectedPrimaryAccount.mandate || "Both Signatures Required"}
                      </span>
                      <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                        Security and notification alerts will be sent to both primary signatory Kwame and co-signatory Efua upon activation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CASE B: Single Account Display */}
          {!isMultiAccount && (
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 divide-y divide-border/60">
              <div className="flex items-center justify-between pb-3.5">
                <span className="text-[13px] text-muted-foreground">Primary Account</span>
                <div className="text-right">
                  <span className="text-[14px] font-medium text-foreground block">
                    {selectedPrimaryAccount.name}
                  </span>
                  <span className="text-[12.5px] text-muted-foreground font-mono">
                    •••• {selectedPrimaryAccount.number.slice(-4)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-3.5">
                <span className="text-[13px] text-muted-foreground">Registered Phone</span>
                <span className="text-[14px] font-medium text-foreground">{activePersona.phone}</span>
              </div>
              <div className="flex items-center justify-between pt-3.5">
                <span className="text-[13px] text-muted-foreground">Registered Email</span>
                <span className="text-[14px] font-medium text-foreground">{activePersona.email}</span>
              </div>
            </div>
          )}

          <p className="text-center text-[12.5px] leading-relaxed text-muted-foreground">
            {isJoint
              ? "Both account holders will receive security confirmation notices upon completing activation."
              : isMultiAccount
              ? "All your accounts will be accessible on Internet Banking. You can change your primary account anytime in Settings."
              : "We have partially masked your contact details for privacy and security."}
          </p>

          <Button
            type="button"
            variant="default"
            size="lg"
            data-tour="activate-review"
            onClick={handleVerifyDetails}
            disabled={busy}
            className="mt-2 h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Sending verification code...
              </>
            ) : (
              "Confirm and send code"
            )}
          </Button>

          <button
            type="button"
            onClick={() => setStep("ghana_card")}
            className="text-center text-[13px] text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
          >
            Use a different Ghana Card
          </button>
        </div>
      )}

      {/* STEP 4: OTP Verification */}
      {step === "otp" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleOtpSubmit();
          }}
          className="flex flex-col gap-6"
        >
          <div data-tour="activate-otp">
            <OtpInput
              value={digits}
              onChange={(next) => {
                setDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              onComplete={(code) => handleOtpSubmit(code)}
              disabled={busy}
              invalid={!!errorMsg}
              autoFocus
            />
          </div>

          {isJoint && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-[12.5px] text-muted-foreground">
              <span className="font-medium text-foreground">Joint mandate notice:</span> An alert has also been sent to co-holder Efua ({activePersona.coSignatoryPhone}) confirming this activation request.
            </div>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <Loader2 size={16} className="animate-spin text-primary" aria-hidden="true" />
              <span>Verifying code...</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3.5 text-[13px] text-destructive"
            >
              <AlertCircle size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Recovery path */}
          <div className="mt-2 flex flex-col items-center gap-2 border-t border-border pt-4">
            <button
              type="button"
              disabled={countdown > 0}
              onClick={() => {
                setCountdown(RESEND_SECONDS);
                setErrorMsg("");
              }}
              className="text-[13px] text-foreground underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline cursor-pointer"
            >
              {countdown > 0 ? (
                <>
                  Resend code in <span className="tabular">{countdown}s</span>
                </>
              ) : (
                "Resend code"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpTarget(otpTarget === "sms" ? "email" : "sms");
                setCountdown(RESEND_SECONDS);
                setErrorMsg("");
              }}
              className="text-center text-[12.5px] text-muted-foreground transition-colors hover:text-foreground underline underline-offset-4 cursor-pointer"
            >
              Send to {otpTarget === "sms" ? "email instead" : "SMS instead"}
            </button>
          </div>
        </form>
      )}

      {/* STEP 5: Password Creation */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
          {/* Password Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-pass" className="text-[13px] font-medium text-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="create-pass"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder="Choose a strong password"
                className="h-11 pr-11 text-[14px]"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-pass" className="text-[13px] font-medium text-foreground">
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="confirm-pass"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder="Re-enter your password"
                className="h-11 pr-11 text-[14px]"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <p className="text-[12.5px] text-muted-foreground">
            Demo — any matching password works. Enter{" "}
            <span className="tabular font-mono text-foreground">00000</span> to see the error state.
          </p>

          {/* Password Checklist */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-2.5">
            <span className="text-[12.5px] font-medium text-foreground">
              Password requirements:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[12.5px]">
              <div className={`flex items-center gap-2 ${hasMinLength ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                <Check size={14} className={hasMinLength ? "opacity-100" : "opacity-30"} />
                <span>At least 12 characters</span>
              </div>
              <div className={`flex items-center gap-2 ${hasCase ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                <Check size={14} className={hasCase ? "opacity-100" : "opacity-30"} />
                <span>Upper and lower case</span>
              </div>
              <div className={`flex items-center gap-2 ${hasNumber ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                <Check size={14} className={hasNumber ? "opacity-100" : "opacity-30"} />
                <span>At least 1 number</span>
              </div>
              <div className={`flex items-center gap-2 ${hasSymbol ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                <Check size={14} className={hasSymbol ? "opacity-100" : "opacity-30"} />
                <span>At least 1 special character</span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3.5 text-[13px] text-destructive"
            >
              <AlertCircle size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="default"
            size="lg"
            data-tour="activate-password"
            className="mt-2 h-11 w-full text-[14px]"
          >
            Save password and continue
          </Button>
        </form>
      )}

      {/* STEP 6: 4-digit PIN */}
      {step === "pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePinSubmit();
          }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-full" data-tour="activate-pin">
            <OtpInput
              value={pinDigits}
              onChange={(next) => {
                setPinDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              length={4}
              mask
              onComplete={(pin) => handlePinSubmit(pin)}
              disabled={busy}
              invalid={!!errorMsg}
              autoFocus
            />
          </div>

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <Loader2 size={16} className="animate-spin text-primary" aria-hidden="true" />
              <span>Completing activation...</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="w-full flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3.5 text-[13px] text-destructive"
            >
              <AlertCircle size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>
      )}
    </AuthLayout>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
      <ActivateContent />
    </Suspense>
  );
}

