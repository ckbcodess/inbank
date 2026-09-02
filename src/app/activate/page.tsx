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
  Smartphone,
  Sparkles,
  Users,
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

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const personaParam = searchParams.get("persona"); // "joint" | "mobile_sync" | null
  const isJoint = personaParam === "joint";
  const isMobileSync = personaParam === "mobile_sync";

  const { signIn, selectProfile, verifyMfa } = useSession();

  const [step, setStep] = useState<Step>("ghana_card");
  const [ghanaCard, setGhanaCard] = useState(
    isJoint ? "GHA-001234567-9" : isMobileSync ? "GHA-554433221-0" : "GHA-0123456789-0"
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
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState("");

  // OTP Countdown
  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, countdown]);

  // Password Checklist validation
  const hasMinLength = password.length >= 12;
  const hasCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const passwordValid = hasMinLength && hasCase && hasNumber && hasSymbol;

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
    }, 600);
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

    // Finalize onboarding and log user into appropriate dashboard profile
    setTimeout(() => {
      const targetActorId = isJoint ? "u-joint" : isMobileSync ? "u-abena" : "u-retail";
      const actor = ACTORS.find((a) => a.id === targetActorId) || ACTORS[0];
      signIn(actor);
      if (actor.profiles.length > 0) {
        selectProfile(actor.profiles[0]);
      }
      verifyMfa();
      router.push("/overview");
    }, 800);
  }

  return (
    <AuthLayout
      title={
        step === "ghana_card"
          ? "Enter your Ghana Card details"
          : step === "selfie"
          ? "Let's take a photo of you"
          : step === "review_details"
          ? isJoint
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
          ? isJoint
            ? "We matched your details with an active GCB Joint Account mandate."
            : isMobileSync
            ? "Existing GCB Mobile App profile matched. Verify your details below."
            : "Confirm that these details match your existing GCB account."
          : step === "otp"
          ? isJoint
            ? `Code sent to primary number +233 24 *** *192. Co-signatory notification sent to +233 20 *** *410.`
            : `Code sent via ${otpTarget === "sms" ? "SMS to +233 24 *** *567" : "Email to am•••••@example.com"}`
          : step === "password"
          ? "Your password must be at least 12 characters and include upper, lower, numbers and symbols."
          : "You will use this 4-digit PIN to authorize transfers, bill payments, and card top-ups."
      }
      stepProgress={{
        current: stepNumberMap[step],
        total: 8,
      }}
      width={step === "review_details" ? "wide" : "compact"}
      footer={
        <div className="flex justify-center">
          <Link
            href="/get-started"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-[0.96]"
          >
            <ArrowLeft size={15} strokeWidth={2} />
            Back to previous step
          </Link>
        </div>
      }
    >
      {/* Mobile App Sync Banner (if applicable) */}
      {isMobileSync && step === "ghana_card" && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-[#FFFBF0] dark:bg-amber-500/10 p-3.5 text-left">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-[#B27B00] dark:text-amber-300">
            <Smartphone size={16} />
          </div>
          <div>
            <span className="text-[13px] font-semibold text-foreground">
              Mobile App User Detected
            </span>
            <p className="text-[12px] text-muted-foreground">
              We found your GCB Mobile App account (Abena Osei). Enter your Ghana Card to link your web banking.
            </p>
          </div>
        </div>
      )}

      {/* Joint Account Banner (if applicable) */}
      {isJoint && step === "ghana_card" && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-[#FFFBF0] dark:bg-amber-500/10 p-3.5 text-left">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-[#B27B00] dark:text-amber-300">
            <Users size={16} />
          </div>
          <div>
            <span className="text-[13px] font-semibold text-foreground">
              Joint Account Onboarding
            </span>
            <p className="text-[12px] text-muted-foreground">
              Activating Internet Banking for Kwame &amp; Efua Mensah (Joint Premier Savings).
            </p>
          </div>
        </div>
      )}

      {/* STEP 1: Ghana Card Input */}
      {step === "ghana_card" && (
        <form onSubmit={handleGhanaCardSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ghana-card" className="text-[13px] font-medium">
              Ghana Card Number (PIN)
            </Label>
            <Input
              id="ghana-card"
              value={ghanaCard}
              onChange={(e) => setGhanaCard(e.target.value)}
              placeholder="e.g. GHA-0123456789-0"
              className="h-12 rounded-xl border-border bg-background px-4 font-mono text-[14px] uppercase tracking-wider focus-visible:ring-[#F2B200]"
              autoFocus
            />
            <p className="text-[12px] text-muted-foreground">
              Format: GHA-XXXXXXXXX-X as shown on your physical card.
            </p>
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
            className="mt-2 h-12 w-full rounded-2xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.96] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
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
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex size-44 sm:size-48 items-center justify-center overflow-hidden rounded-full border-4 border-[#F2B200]/30 bg-muted/30 shadow-inner">
            {selfieTaken ? (
              <div className="flex flex-col items-center gap-2 text-center text-primary">
                <CheckCircle2 size={48} className="text-[#E5A500] dark:text-[#F2B200]" />
                <span className="text-[13px] font-medium text-foreground">Photo captured</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                <Camera size={36} strokeWidth={1.7} />
                <span className="text-[12px]">Position face in frame</span>
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleCaptureSelfie}
            disabled={busy || selfieTaken}
            className="h-12 w-full rounded-2xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.96] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
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

      {/* STEP 3: Review Details */}
      {step === "review_details" && (
        <div className="flex flex-col gap-4">
          {isJoint ? (
            /* Joint Account Details Card */
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 divide-y divide-border/60">
              <div className="flex items-center justify-between pb-3">
                <span className="text-[12.5px] text-muted-foreground">Account Holders</span>
                <span className="text-[13.5px] font-semibold text-foreground">
                  Kwame Mensah &amp; Efua Mensah
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[12.5px] text-muted-foreground">Account Type</span>
                <span className="text-[13.5px] font-semibold text-foreground">
                  Joint Premier Savings ···· 8844
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[12.5px] text-muted-foreground">Signing Mandate</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3D6] px-2 py-0.5 text-[11px] font-semibold text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200]">
                  <Users size={12} />
                  Both Signatures Required
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[12.5px] text-muted-foreground">Primary Phone (Kwame)</span>
                <span className="text-[13.5px] font-semibold text-foreground">+233 24 *** *192</span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-[12.5px] text-muted-foreground">Co-Signatory (Efua)</span>
                <span className="text-[13.5px] font-semibold text-foreground">+233 20 *** *410</span>
              </div>
            </div>
          ) : isMobileSync ? (
            /* Mobile App Sync Details Card */
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 divide-y divide-border/60">
              <div className="flex items-center justify-between pb-3">
                <span className="text-[12.5px] text-muted-foreground">Account Holder</span>
                <span className="text-[13.5px] font-semibold text-foreground">Abena Osei</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[12.5px] text-muted-foreground">Account</span>
                <span className="text-[13.5px] font-semibold text-foreground">Personal Current ···· 4821</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[12.5px] text-muted-foreground">Mobile App Status</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check size={12} />
                  Linked on iOS &amp; Android
                </span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-[12.5px] text-muted-foreground">Mobile Phone</span>
                <span className="text-[13.5px] font-semibold text-foreground">+233 24 *** *234</span>
              </div>
            </div>
          ) : (
            /* Standard Individual Account Details Card */
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 divide-y divide-border/60">
              <div className="flex items-center justify-between pb-3">
                <span className="text-[12.5px] text-muted-foreground">Name</span>
                <span className="text-[13.5px] font-semibold text-foreground">Ama Serwaa</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[12.5px] text-muted-foreground">Account</span>
                <span className="text-[13.5px] font-semibold text-foreground">Reserve Savings ···· 5566</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[12.5px] text-muted-foreground">Mobile</span>
                <span className="text-[13.5px] font-semibold text-foreground">+233 24 *** *567</span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-[12.5px] text-muted-foreground">Email</span>
                <span className="text-[13.5px] font-semibold text-foreground">am•••••@example.com</span>
              </div>
            </div>
          )}

          <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
            {isJoint
              ? "Both account holders will receive security confirmation notices upon completing activation."
              : "We have partially masked your contact details for privacy and security."}
          </p>

          <Button
            type="button"
            onClick={handleVerifyDetails}
            disabled={busy}
            className="mt-2 h-12 w-full rounded-2xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.96] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
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
            className="text-center text-[12.5px] text-muted-foreground hover:text-foreground underline underline-offset-4 active:scale-[0.96] cursor-pointer"
          >
            Use a different Ghana Card
          </button>
        </div>
      )}

      {/* STEP 4: OTP Verification */}
      {step === "otp" && (
        <form onSubmit={handleOtpSubmit} className="flex flex-col items-center gap-4">
          <div className="w-full">
            <OtpInput value={digits} onChange={setDigits} disabled={busy} autoFocus />
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-[12.5px] text-destructive">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isJoint && (
            <div className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-[12px] text-muted-foreground">
              <span className="font-semibold text-foreground">Joint mandate notice:</span> An alert has also been sent to co-holder Efua (+233 20 *** *410) confirming this activation request.
            </div>
          )}

          <div className="flex items-center justify-between w-full text-[12.5px] text-muted-foreground px-1">
            <span>
              {countdown > 0 ? (
                `Resend code in ${countdown}s`
              ) : (
                <button
                  type="button"
                  onClick={() => setCountdown(RESEND_SECONDS)}
                  className="font-medium text-[#B27B00] dark:text-[#F2B200] hover:underline cursor-pointer"
                >
                  Resend code
                </button>
              )}
            </span>

            <button
              type="button"
              onClick={() => setOtpTarget(otpTarget === "sms" ? "email" : "sms")}
              className="text-foreground hover:underline cursor-pointer"
            >
              Send to {otpTarget === "sms" ? "email instead" : "SMS instead"}
            </button>
          </div>

          <Button
            type="submit"
            disabled={busy || digits.join("").length < OTP_LENGTH}
            className="mt-2 h-12 w-full rounded-2xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.96] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Verifying code...
              </>
            ) : (
              "Verify code"
            )}
          </Button>
        </form>
      )}

      {/* STEP 5: Password Creation */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-pass" className="text-[13px] font-medium">
              Create password
            </Label>
            <div className="relative">
              <Input
                id="create-pass"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password"
                className="h-12 rounded-xl border-border bg-background pr-10 text-[14px] focus-visible:ring-[#F2B200]"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-pass" className="text-[13px] font-medium">
              Confirm password
            </Label>
            <Input
              id="confirm-pass"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="h-12 rounded-xl border-border bg-background text-[14px] focus-visible:ring-[#F2B200]"
            />
          </div>

          {/* Password Checklist */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-2">
            <span className="text-[12px] font-semibold text-foreground">
              Password requirements:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                <Check size={14} className={hasMinLength ? "opacity-100" : "opacity-30"} />
                <span>At least 12 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasCase ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                <Check size={14} className={hasCase ? "opacity-100" : "opacity-30"} />
                <span>Upper and lower case</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                <Check size={14} className={hasNumber ? "opacity-100" : "opacity-30"} />
                <span>At least 1 number</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSymbol ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                <Check size={14} className={hasSymbol ? "opacity-100" : "opacity-30"} />
                <span>At least 1 special character</span>
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
            className="mt-2 h-12 w-full rounded-2xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.96] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
          >
            Save password and continue
          </Button>
        </form>
      )}

      {/* STEP 6: 4-digit PIN */}
      {step === "pin" && (
        <form onSubmit={handlePinSubmit} className="flex flex-col items-center gap-5">
          <div className="flex items-center justify-center gap-3">
            {pinDigits.map((digit, idx) => (
              <Input
                key={idx}
                id={`pin-${idx}`}
                type="password"
                maxLength={1}
                value={digit}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  const newPin = [...pinDigits];
                  newPin[idx] = val;
                  setPinDigits(newPin);
                  if (val && idx < 3) {
                    const nextInput = document.getElementById(`pin-${idx + 1}`);
                    nextInput?.focus();
                  }
                }}
                className="size-13 rounded-2xl border-2 border-border/80 text-center font-mono text-[22px] font-bold shadow-sm focus-visible:border-[#F2B200] focus-visible:ring-[#F2B200]"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-[12.5px] text-destructive">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={busy || pinDigits.join("").length < 4}
            className="mt-2 h-12 w-full rounded-2xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.96] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Completing activation...
              </>
            ) : (
              "Finish activation"
            )}
          </Button>
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
