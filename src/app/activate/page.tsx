"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  User,
  Users,
} from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import SelfieCapture from "@/components/auth/SelfieCapture";
import { useSession } from "@/lib/session-store";
import { ACTORS } from "@/lib/mock-data";
import {
  ACTIVATION_PERSONAS,
  getPersonaByGhanaCard,
  type ActivationPersonaConfig,
} from "@/lib/activation";

type Step = "ghana_card" | "selfie" | "review_details" | "otp" | "password" | "pin" | "confirm_pin";

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

  const [selfieImage, setSelfieImage] = useState<string | null>(null);
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
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(["", "", "", ""]);
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
  const hasMinLength = password.length >= 8;
  const hasCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  // Step Progress Index (out of 9)
  const stepNumberMap: Record<Step, number> = {
    ghana_card: 3,
    selfie: 4,
    review_details: 5,
    otp: 6,
    password: 7,
    pin: 8,
    confirm_pin: 9,
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

  function handleCaptureSelfie(imageDataUrl: string) {
    setSelfieImage(imageDataUrl);
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep("review_details");
    }, 800);
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
    setPinDigits(["", "", "", ""]);
    setConfirmPinDigits(["", "", "", ""]);
    setStep("pin");
  }

  function handlePinSubmit(incomingPin?: string) {
    const pin = incomingPin ?? pinDigits.join("");
    if (pin.length < 4 || busy) {
      if (pin.length < 4) setErrorMsg("Please enter a 4-digit PIN");
      return;
    }
    setErrorMsg("");
    setConfirmPinDigits(["", "", "", ""]);
    setStep("confirm_pin");
  }

  function handleConfirmPinSubmit(incomingConfirmPin?: string) {
    const confirmPin = incomingConfirmPin ?? confirmPinDigits.join("");
    if (confirmPin.length < 4 || busy) {
      if (confirmPin.length < 4) setErrorMsg("Please confirm your 4-digit PIN");
      return;
    }
    const originalPin = pinDigits.join("");
    if (confirmPin !== originalPin) {
      setErrorMsg("PINs do not match. Please try again.");
      setConfirmPinDigits(["", "", "", ""]);
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
    if (step === "confirm_pin") {
      setConfirmPinDigits(["", "", "", ""]);
      setStep("pin");
    } else if (step === "pin") {
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
      setSelfieImage(null);
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
          ? "Let's Verify Your Account"
          : step === "selfie"
          ? "Take a Selfie"
          : step === "review_details"
          ? isMultiAccount
            ? "Choose Your Primary Account"
            : isJoint
            ? "Review Joint Account Details"
            : "Review Your Details"
          : step === "otp"
          ? "Enter Verification Code"
          : step === "password"
          ? "Create Password"
          : step === "pin"
          ? "Set Your PIN"
          : "Confirm Your PIN"
      }
      description={
        step === "ghana_card"
          ? "Enter your card number to verify your identity."
          : step === "selfie"
          ? "Center your face in the frame."
          : step === "review_details"
          ? isMultiAccount
            ? "Select your primary account for everyday banking."
            : isJoint
            ? "Confirm your joint account details."
            : isMobileSync
            ? "Confirm your details to link internet banking."
            : "Confirm your details match your account records."
          : step === "otp"
          ? isJoint
            ? `6-digit code sent to ${activePersona.phone}. Co-signatory notice sent to ${activePersona.coSignatoryPhone}.`
            : `6-digit code sent via ${
                otpTarget === "sms"
                  ? `SMS to ${activePersona.phone}`
                  : `email to ${activePersona.email}`
              }.`
          : step === "password"
          ? "Choose a password you will remember."
          : step === "pin"
          ? "Set a PIN for all your transactions in the app."
          : "Re-enter your 4-digit PIN to confirm."
      }
      stepProgress={{
        current: stepNumberMap[step],
        total: 9,
      }}
      width="compact"
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
      {/* STEP 1: Enter Ghana Card */}
      {step === "ghana_card" && (
        <form onSubmit={handleGhanaCardSubmit} className="flex flex-col gap-5">
          {/* Demo persona picker — dev only, never in the live build */}
          {process.env.NODE_ENV !== "production" && (
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3.5 py-2.5 text-[12.5px] text-muted-foreground">
            <span className="font-medium text-foreground">Interactive Demo Mode</span>
            <div className="flex items-center gap-1.5">
              {(["single", "multi", "joint", "mobile_sync"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPersona(key)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    activePersonaKey === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {key === "single"
                    ? "Single"
                    : key === "multi"
                    ? "Multi"
                    : key === "joint"
                    ? "Joint"
                    : "Mobile Sync"}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Card Input Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ghana-card" className="text-[13.5px] font-medium text-foreground">
              Ghana Card number
            </Label>
            <Input
              id="ghana-card"
              value={ghanaCard}
              onChange={(e) => setGhanaCard(e.target.value)}
              placeholder="e.g. GHA-0123456789-0"
              className="h-11 font-mono text-[14.5px] uppercase tracking-wider"
              autoFocus
            />
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
                <AppLoader size={16} className="mr-2" />
                Verifying...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      )}

      {/* STEP 2: Selfie / Photo Capture */}
      {step === "selfie" && (
        <SelfieCapture
          onCapture={handleCaptureSelfie}
          busy={busy}
          capturedImage={selfieImage}
          onRetake={() => {
            setSelfieImage(null);
          }}
          dataTour="activate-selfie"
        />
      )}

      {/* STEP 3: Review Details & Primary Account Picker */}
      {step === "review_details" && (
        <div className="flex flex-col gap-5">
          {/* Verified Customer Header Info */}
          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/15 px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary overflow-hidden">
                {selfieImage ? (
                  <img src={selfieImage} alt={activePersona.holderName} className="size-full object-cover" />
                ) : isJoint ? (
                  <Users size={16} />
                ) : (
                  <User size={16} />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[14px] font-medium text-foreground block truncate">
                  {activePersona.holderName}
                </span>
                <span className="text-[12px] text-muted-foreground font-mono">
                  {activePersona.ghanaCard}
                </span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
              <Check size={12} strokeWidth={2.5} />
              Verified
            </span>
          </div>

          {/* CASE A: Multi-Account Dropdown Selection */}
          {isMultiAccount && (
            <div className="space-y-2">
              <label htmlFor="primary-account-select" className="text-[13px] font-medium text-foreground px-0.5">
                Primary Account
              </label>

              <div data-tour="activate-account-picker">
                <Select
                  value={selectedPrimaryAccountId}
                  onValueChange={(val) => val && setSelectedPrimaryAccountId(val)}
                >
                  <SelectTrigger
                    id="primary-account-select"
                    className="h-11 min-h-11 py-2 px-3.5 w-full rounded-xl border border-border/80 bg-card hover:bg-muted/20 text-left cursor-pointer transition-colors shadow-none flex items-center justify-between"
                  >
                    <SelectValue>
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-medium text-foreground truncate">
                          {selectedPrimaryAccount.name}
                        </span>
                        <span className="text-muted-foreground font-mono text-[12.5px] shrink-0">
                          •••• {selectedPrimaryAccount.number.slice(-4)}
                        </span>
                        {selectedPrimaryAccount.isJoint && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.2 text-[10px] font-medium text-foreground shrink-0">
                            <Users size={10} className="text-primary" />
                            Joint
                          </span>
                        )}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activePersona.accounts.map((acc) => (
                      <SelectItem
                        key={acc.id}
                        value={acc.id}
                        label={`${acc.name} · •••• ${acc.number.slice(-4)}`}
                      >
                        <div className="flex items-center justify-between w-full gap-3 py-0.5">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-medium text-foreground truncate">{acc.name}</span>
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
                          <span className="text-[12px] text-muted-foreground font-mono shrink-0">
                            •••• {acc.number.slice(-4)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Mandate Disclosure if selected account is Joint */}
              {selectedPrimaryAccount.isJoint && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-left animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <Users size={15} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[12.5px] font-medium text-foreground block">
                        Joint Mandate: {selectedPrimaryAccount.mandate || "Both Signatures Required"}
                      </span>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">
                        Alerts will be sent to both signatories upon activation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CASE B: Single Account Display */}
          {!isMultiAccount && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 divide-y divide-border/60">
              <div className="flex items-center justify-between pb-3">
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
              <div className="flex items-center justify-between py-3">
                <span className="text-[13px] text-muted-foreground">Registered Phone</span>
                <span className="text-[13.5px] font-medium text-foreground">{activePersona.phone}</span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-[13px] text-muted-foreground">Registered Email</span>
                <span className="text-[13.5px] font-medium text-foreground">{activePersona.email}</span>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="default"
            size="lg"
            data-tour="activate-review"
            onClick={handleVerifyDetails}
            disabled={busy}
            className="mt-1 h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <AppLoader size={16} className="mr-2" />
                Sending code...
              </>
            ) : (
              "Continue"
            )}
          </Button>

          <button
            type="button"
            onClick={() => setStep("ghana_card")}
            className="text-center text-[12.5px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
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
              <span className="font-medium text-foreground">Joint mandate notice:</span> Notice sent to co-holder Efua ({activePersona.coSignatoryPhone}).
            </div>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
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

          {/* Password Requirements Checklist */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
            <p className="mb-2.5 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Password Requirements
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[12.5px]">
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-4 items-center justify-center rounded-full text-[10px] ${
                    hasMinLength ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                <span className={hasMinLength ? "text-foreground font-medium" : "text-muted-foreground"}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-4 items-center justify-center rounded-full text-[10px] ${
                    hasCase ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                <span className={hasCase ? "text-foreground font-medium" : "text-muted-foreground"}>
                  Upper and lower case
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-4 items-center justify-center rounded-full text-[10px] ${
                    hasNumber ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                <span className={hasNumber ? "text-foreground font-medium" : "text-muted-foreground"}>
                  A number
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-4 items-center justify-center rounded-full text-[10px] ${
                    hasSymbol ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                <span className={hasSymbol ? "text-foreground font-medium" : "text-muted-foreground"}>
                  A symbol
                </span>
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
            Continue
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

      {/* STEP 7: Confirm 4-digit PIN */}
      {step === "confirm_pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmPinSubmit();
          }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-full" data-tour="activate-confirm-pin">
            <OtpInput
              value={confirmPinDigits}
              onChange={(next) => {
                setConfirmPinDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              length={4}
              mask
              onComplete={(pin) => handleConfirmPinSubmit(pin)}
              disabled={busy}
              invalid={!!errorMsg}
              autoFocus
            />
          </div>

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Activating...</span>
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

