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
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { useSession } from "@/lib/session-store";
import { ACTORS } from "@/lib/mock-data";

type Step = "ghana_card" | "selfie" | "review_details" | "otp" | "password" | "pin";

const RESEND_SECONDS = 30;

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow") || "wallet_card";
  const { signIn, selectProfile, verifyMfa } = useSession();

  const [step, setStep] = useState<Step>("ghana_card");
  const [ghanaCard, setGhanaCard] = useState("GHA-7890123456-1");
  const [selfieTaken, setSelfieTaken] = useState(false);
  const [busy, setBusy] = useState(false);

  // OTP State
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [otpTarget, setOtpTarget] = useState<"sms" | "email">("sms");

  // Password & PIN State
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState("");

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
    }, 700);
  }

  const hasMinLength = password.length >= 12;
  const hasCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

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
    }, 1200);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Demo: any password proceeds. Enter 00000 to see the error state (same
    // convention as the MFA screen).
    if (password === "00000") {
      setErrorMsg("That password can’t be used. Choose another.");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter a password");
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

    // Finalize registration and redirect to Accounts with linking modal trigger!
    setTimeout(() => {
      const actor = ACTORS[0]; // Log in as registered user
      signIn(actor);
      if (actor.profiles.length > 0) {
        selectProfile(actor.profiles[0]);
      }
      verifyMfa();
      router.push("/accounts?link_source=true");
    }, 800);
  }

  function handleBackStep() {
    setErrorMsg("");
    setBusy(false);
    if (step === "pin") {
      setPinDigits(["", "", "", ""]);
      setStep("password");
    } else if (step === "password") {
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

  return (
    <AuthLayout
      title={
        step === "ghana_card" || step === "selfie"
          ? "Let’s find your account"
          : step === "review_details"
          ? "Please verify your details"
          : step === "otp"
          ? "Enter the code we sent"
          : step === "password"
          ? "Set up how you sign in"
          : "Create transaction PIN"
      }
      description={
        step === "ghana_card" || step === "selfie"
          ? "To keep things simple and secure, we’ll quickly verify your identity with your Ghana Card."
          : step === "review_details"
          ? "Please review your information to make sure everything is accurate before you continue."
          : step === "otp"
          ? otpTarget === "sms"
            ? "6-digit code sent to +233 24 *** *567. It expires in 5 minutes. Enter 000000 to see the error state."
            : "6-digit code sent to am•••••@example.com. It expires in 5 minutes. Enter 000000 to see the error state."
          : step === "password"
          ? "Create a secure password to access your account."
          : "Choose a 4-digit PIN to authorize transfers and payments."
      }
      stepProgress={{
        current: stepNumberMap[step],
        total: 8,
      }}
      width={step === "review_details" ? "default" : "compact"}
      footer={
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleBackStep}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="ghanaCard" className="text-[13.5px] font-medium text-foreground">
              Enter Ghana Card Number
            </Label>
            <Input
              id="ghanaCard"
              type="text"
              placeholder="e.g GHA-0123456789-0"
              value={ghanaCard}
              onChange={(e) => setGhanaCard(e.target.value.toUpperCase())}
              className="h-11 font-mono text-[14.5px] uppercase tracking-wider"
              required
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
            data-tour="signup-card"
            disabled={busy}
            className="mt-3.5 h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Verifying Card with NIA…
              </>
            ) : (
              "Proceed"
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
                <span className="text-[14px] font-medium text-foreground">Selfie Verified</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 text-center text-muted-foreground">
                <Camera size={40} strokeWidth={1.7} />
                <span className="text-[12.5px]">Position face in circle</span>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="default"
            size="lg"
            data-tour="signup-selfie"
            onClick={handleCaptureSelfie}
            disabled={busy || selfieTaken}
            className="h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Verifying Biometric Liveness…
              </>
            ) : selfieTaken ? (
              "Verified ✓"
            ) : (
              "Take photo"
            )}
          </Button>
        </div>
      )}

      {/* STEP 3: Review Details */}
      {step === "review_details" && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 divide-y divide-border/60">
            <div className="flex items-center justify-between pb-3.5">
              <span className="text-[13px] text-muted-foreground">Name</span>
              <span className="text-[14px] font-medium text-foreground">Tsotsoo Mills</span>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <span className="text-[13px] text-muted-foreground">National ID</span>
              <span className="text-[14px] font-medium text-foreground">{ghanaCard}</span>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <span className="text-[13px] text-muted-foreground">Mobile</span>
              <span className="text-[14px] font-medium text-foreground">+233 24 *** *567</span>
            </div>
            <div className="flex items-center justify-between pt-3.5">
              <span className="text-[13px] text-muted-foreground">Email</span>
              <span className="text-[14px] font-medium text-foreground">ts•••••@example.com</span>
            </div>
          </div>

          <p className="text-center text-[12.5px] leading-relaxed text-muted-foreground">
            We&apos;ve verified your identity against national records. Proceed to verify your phone.
          </p>

          <Button
            type="button"
            variant="default"
            size="lg"
            data-tour="signup-review"
            onClick={handleVerifyDetails}
            disabled={busy}
            className="mt-3.5 h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending verification code…
              </>
            ) : (
              "Proceed"
            )}
          </Button>
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
          <div data-tour="signup-otp">
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

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <Loader2 size={16} className="animate-spin text-primary" aria-hidden="true" />
              <span>Validating Code…</span>
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
              {otpTarget === "sms"
                ? "Send it to ts•••••@example.com instead"
                : "Send it to +233 24 *** *567 instead"}
            </button>
          </div>
        </form>
      )}

      {/* STEP 5: Set up Password */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pass" className="text-[13.5px] font-medium text-foreground">
              Create Password
            </Label>
            <div className="relative">
              <Input
                id="pass"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-11 pr-11 text-[14.5px]"
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

          <p className="text-[12.5px] text-muted-foreground">
            Demo — any password works. Enter{" "}
            <span className="tabular font-mono text-foreground">00000</span> to see the error state.
          </p>

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
                  At least 12 characters
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
            <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-[13px] text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="default"
            size="lg"
            data-tour="signup-password"
            className="mt-3.5 h-11 w-full text-[14px]"
          >
            Proceed
          </Button>
        </form>
      )}

      {/* STEP 6: Create Transaction PIN */}
      {step === "pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePinSubmit();
          }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-full" data-tour="signup-pin">
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
              <span>Setting up your account…</span>
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignupContent />
    </Suspense>
  );
}
