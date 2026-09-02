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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, countdown]);

  const hasMinLength = password.length >= 12;
  const hasCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const passwordValid = hasMinLength && hasCase && hasNumber && hasSymbol;

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

  function handleVerifyDetails() {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep("otp");
      setCountdown(RESEND_SECONDS);
    }, 600);
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < OTP_LENGTH) {
      setErrorMsg("Please enter the complete 6-digit code");
      return;
    }
    setErrorMsg("");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep("password");
    }, 700);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid) {
      setErrorMsg("Password must satisfy all requirements");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    setErrorMsg("");
    setStep("pin");
  }

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pin = pinDigits.join("");
    if (pin.length < 4) {
      setErrorMsg("Please enter a 4-digit PIN");
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
            ? "6-digit code sent to +233 24 *** *567. It expires in 5 minutes."
            : "6-digit code sent to am•••••@example.com. It expires in 5 minutes."
          : step === "password"
          ? "Create a secure password to access your account."
          : "Create a secure PIN to authorize your transactions."
      }
      stepProgress={{
        current: stepNumberMap[step],
        total: 8,
      }}
      width={step === "review_details" ? "default" : "compact"}
      footer={
        <div className="flex justify-center">
          <Link
            href="/get-started"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={15} strokeWidth={2} />
            Back to previous step
          </Link>
        </div>
      }
    >
      {/* STEP 1: Enter Ghana Card */}
      {step === "ghana_card" && (
        <form onSubmit={handleGhanaCardSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ghanaCard" className="text-[13px] font-medium text-foreground">
              Enter Ghana Card Number
            </Label>
            <Input
              id="ghanaCard"
              type="text"
              placeholder="e.g GHA-0123456789-0"
              value={ghanaCard}
              onChange={(e) => setGhanaCard(e.target.value.toUpperCase())}
              className="h-11 rounded-xl border-border bg-background px-3.5 text-[14px] uppercase tracking-wider focus-visible:border-[#F2B200] focus-visible:ring-[#F2B200]/20"
              required
            />
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-[12.5px] text-destructive">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="mt-2 h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.99] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
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
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex size-44 sm:size-48 items-center justify-center overflow-hidden rounded-full border-4 border-[#F2B200]/30 bg-muted/30 shadow-inner">
            {selfieTaken ? (
              <div className="flex flex-col items-center gap-2 text-center text-primary">
                <CheckCircle2 size={48} className="text-[#E5A500] dark:text-[#F2B200]" />
                <span className="text-[13px] font-medium text-foreground">Selfie Verified</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                <Camera size={36} strokeWidth={1.7} />
                <span className="text-[12px]">Position face in circle</span>
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleCaptureSelfie}
            disabled={busy || selfieTaken}
            className="h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.99] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
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
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 divide-y divide-border/60">
            <div className="flex items-center justify-between pb-3">
              <span className="text-[12.5px] text-muted-foreground">Name</span>
              <span className="text-[13.5px] font-semibold text-foreground">Tsotsoo Mills</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-[12.5px] text-muted-foreground">National ID</span>
              <span className="text-[13.5px] font-semibold text-foreground">{ghanaCard}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-[12.5px] text-muted-foreground">Mobile</span>
              <span className="text-[13.5px] font-semibold text-foreground">+233 24 *** *567</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-[12.5px] text-muted-foreground">Email</span>
              <span className="text-[13.5px] font-semibold text-foreground">ts•••••@example.com</span>
            </div>
          </div>

          <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
            We&apos;ve verified your identity against national records. Proceed to verify your phone.
          </p>

          <Button
            type="button"
            onClick={handleVerifyDetails}
            disabled={busy}
            className="mt-2 h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.99] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
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
        <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
          <div className="my-2 flex justify-center">
            <OtpInput value={digits} onChange={setDigits} />
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-[12.5px] text-destructive">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col items-center gap-1.5 text-[12.5px]">
            {countdown > 0 ? (
              <span className="text-muted-foreground">
                Resend code in <strong className="text-foreground">{countdown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCountdown(RESEND_SECONDS);
                  setErrorMsg("");
                }}
                className="font-medium text-[#B27B00] dark:text-[#F2B200] hover:underline cursor-pointer"
              >
                Resend code now
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setOtpTarget(otpTarget === "sms" ? "email" : "sms");
                setCountdown(RESEND_SECONDS);
              }}
              className="text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
            >
              {otpTarget === "sms"
                ? "Send it to ts•••••@example.com instead"
                : "Send it to +233 24 *** *567 instead"}
            </button>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="mt-2 h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.99] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Validating Code…
              </>
            ) : (
              "Proceed"
            )}
          </Button>
        </form>
      )}

      {/* STEP 5: Set up Password */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pass" className="text-[13px] font-medium text-foreground">
              Create Password
            </Label>
            <div className="relative">
              <Input
                id="pass"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-11 rounded-xl border-border bg-background pr-10 pl-3.5 text-[14px] focus-visible:border-[#F2B200] focus-visible:ring-[#F2B200]/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPass" className="text-[13px] font-medium text-foreground">
              Confirm Password
            </Label>
            <Input
              id="confirmPass"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="h-11 rounded-xl border-border bg-background px-3.5 text-[14px] focus-visible:border-[#F2B200] focus-visible:ring-[#F2B200]/20"
              required
            />
          </div>

          {/* Password Requirements Checklist */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5">
            <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Password Requirements
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
              <div className="flex items-center gap-1.5">
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
              <div className="flex items-center gap-1.5">
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
              <div className="flex items-center gap-1.5">
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
              <div className="flex items-center gap-1.5">
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
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-[12.5px] text-destructive">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            className="mt-2 h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.99] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
          >
            Proceed
          </Button>
        </form>
      )}

      {/* STEP 6: Create Transaction PIN */}
      {step === "pin" && (
        <form onSubmit={handlePinSubmit} className="flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13px] text-muted-foreground text-center">
              Enter a 4-digit PIN for completing transfers and payments.
            </p>
            <div className="mt-3 flex gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={idx}
                  id={`pin-${idx}`}
                  type="password"
                  maxLength={1}
                  inputMode="numeric"
                  value={pinDigits[idx]}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    const newPins = [...pinDigits];
                    newPins[idx] = val;
                    setPinDigits(newPins);
                    if (val && idx < 3) {
                      document.getElementById(`pin-${idx + 1}`)?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !pinDigits[idx] && idx > 0) {
                      document.getElementById(`pin-${idx - 1}`)?.focus();
                    }
                  }}
                  className="size-13 rounded-2xl border border-border bg-background text-center text-[22px] font-bold tracking-widest text-foreground shadow-sm focus:border-[#F2B200] focus:ring-2 focus:ring-[#F2B200]/20 focus:outline-hidden"
                />
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="w-full flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-[12.5px] text-destructive">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="mt-2 h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.99] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Setting up your account…
              </>
            ) : (
              "Proceed"
            )}
          </Button>
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
