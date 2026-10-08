"use client";

import { AlertToast } from "@/components/ui/alert-toast";
import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { parseOnboardingStep, type OnboardingStep } from "@/lib/onboarding-steps";
import {
  Check,
  User,
} from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { displayGhanaMobile, isCompleteGhanaMobile } from "@/lib/phone";
import { maskEmail, maskMobile } from "@/lib/auth-shared";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import SelfieCapture from "@/components/auth/SelfieCapture";
import { useSession } from "@/lib/session-store";
import { ACTORS } from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  setFirstRun,
  setPendingFundPrompt,
  setPendingReferral,
  setVerifiedMobile,
} from "@/lib/device-trust";

import NewPasswordFields, { newPasswordReady } from "@/components/auth/NewPasswordFields";

import { Field } from "@/components/ui/field";
import { GhanaCardInput } from "@/components/ui/ghana-card-input";
import { isCompleteGhanaCard } from "@/lib/ghana-card";
type Step = OnboardingStep;

const RESEND_SECONDS = 30;

function SignupContent() {
  const router = useRouter();
  const { signIn, selectProfile, verifyMfa } = useSession();

  const searchParams = useSearchParams();
  // `?step=` opens the flow on that step (the Demo hub jumps with it).
  const stepParam = parseOnboardingStep(searchParams.get("step"));
  const [step, setStep] = useState<Step>(stepParam ?? "ghana_card");
  useEffect(() => {
    if (!stepParam) return;
    setStep(stepParam);
    setErrorMsg("");
    setBusy(false);
  }, [stepParam]);
  const [ghanaCard, setGhanaCard] = useState("GHA-789012345-6");
  const [title, setTitle] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const detailsValid = title !== "" && isCompleteGhanaMobile(mobile) && /^\S+@\S+\.\S+$/.test(email.trim());
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // OTP State
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [otpTarget, setOtpTarget] = useState<"sms" | "email">("sms");

  // Password & PIN State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Asked alongside the password, where sign-in is being set up. Opt-in.
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(["", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState("");
  // PIN confirmation: one retry on a mismatch, then back to the start.
  const [pinMisses, setPinMisses] = useState(0);
  const [pinNote, setPinNote] = useState("");

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


  const stepNumberMap: Record<Step, number> = {
    ghana_card: 1,
    selfie: 2,
    review_details: 3,
    otp: 4,
    password: 5,
    pin: 6,
    confirm_pin: 7,
  };

  function handleGhanaCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isCompleteGhanaCard(ghanaCard)) {
      setErrorMsg("Enter all ten digits of your Ghana Card number: nine, then the check digit.");
      return;
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
    // A short pause (with a spinner) so steps don't snap past each other.
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setPinDigits(["", "", "", ""]);
      setStep("pin");
    }, 600);
  }

  function handlePinSubmit(incomingPin?: string) {
    const pin = incomingPin ?? pinDigits.join("");
    if (pin.length < 4 || busy) {
      if (pin.length < 4) setErrorMsg("Please enter a 4-digit PIN");
      return;
    }
    setErrorMsg("");
    setConfirmPinDigits(["", "", "", ""]);
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep("confirm_pin");
    }, 500);
  }

  function restartPin(note = "") {
    setPinMisses(0);
    setPinDigits(["", "", "", ""]);
    setConfirmPinDigits(["", "", "", ""]);
    setErrorMsg("");
    setPinNote(note);
    setStep("pin");
  }

  function handleConfirmPinSubmit(incomingConfirmPin?: string) {
    const confirmPin = incomingConfirmPin ?? confirmPinDigits.join("");
    if (confirmPin.length < 4 || busy) {
      if (confirmPin.length < 4) setErrorMsg("Please confirm your 4-digit PIN");
      return;
    }
    const originalPin = pinDigits.join("");
    if (originalPin.length === 4 && confirmPin !== originalPin) {
      if (pinMisses + 1 >= 2) {
        restartPin("Those didn’t match twice, so let’s start again. Choose a PIN you’ll remember.");
        return;
      }
      setPinMisses(pinMisses + 1);
      setErrorMsg("PINs don’t match. Try again.");
      setConfirmPinDigits(["", "", "", ""]);
      return;
    }
    setErrorMsg("");
    setBusy(true);

    // PIN confirmed! Complete onboarding into the dashboard (referral & source modals show over blurred dashboard)
    window.setTimeout(() => {
      // Funding is offered on the dashboard, right after the referral code.
      setPendingFundPrompt(true);
      setVerifiedMobile(mobile);
      setPendingReferral(true);
      setFirstRun("new");
      const actor = ACTORS[0]; // Log in as registered user
      signIn(actor);
      if (actor.profiles.length > 0) {
        selectProfile(actor.profiles[0]);
      }
      verifyMfa();
      router.push("/overview");
    }, 600);
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

  return (
    <AuthLayout
      title={
        step === "ghana_card"
          ? "Let's Verify Your Identity"
          : step === "selfie"
          ? "Selfie Match"
          : step === "review_details"
          ? "Review Your Details"
          : step === "otp"
          ? "Confirm Your Code"
          : step === "password"
          ? "Create Your Password"
          : step === "pin"
          ? "Set Your PIN"
          : "Confirm Your PIN"
      }
      description={
        step === "ghana_card"
          ? "We’ll securely verify you using your Ghana Card."
          : step === "selfie"
          ? "Center your face in the circle."
          : step === "review_details"
          ? "Kindly provide title, email, and phone number."
          : step === "otp"
          ? otpTarget === "sms"
            ? <>A 6-digit code has been sent to {maskMobile(displayGhanaMobile(mobile))}.<br />Please enter the code below.</>
            : <>A 6-digit code has been sent to {maskEmail(email.trim())}.<br />Please enter the code below.</>
          : step === "password"
          ? "Choose a password you will remember."
          : step === "pin"
          ? "Set a PIN for all your transactions in the app."
          : "Re-enter your 4-digit PIN to confirm."
      }
      onBack={handleBackStep}
      backLabel="Back to previous step"
      stepProgress={{
        current: stepNumberMap[step],
        total: 7,
      }}
      width={step === "review_details" ? "default" : "compact"}
      animateHeight={true}
    >
      {/* STEP 1: Enter Ghana Card */}
      {step === "ghana_card" && (
        <form onSubmit={handleGhanaCardSubmit} className="flex flex-col gap-5">
          <Field label="Ghana Card Number" htmlFor="ghanaCard">
            <GhanaCardInput
              id="ghanaCard"
              value={ghanaCard}
              onValueChange={setGhanaCard}
              required
            />
</Field>

          <AlertToast when={errorMsg} message={errorMsg} />

          <div className="mt-4 flex flex-col gap-4">
            <Button
              type="submit"
              variant="default"
              size="lg"
              data-tour="signup-card"
              loading={busy}
              className="h-11 w-full text-[14px]"
            >
              Proceed
            </Button>
            <p className="text-center text-[12.5px] leading-5 text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="#" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">Terms</a>{" "}
              and{" "}
              <a href="#" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">Privacy Policy</a>.
            </p>
          </div>

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
          dataTour="signup-selfie"
        />
      )}

      {/* STEP 3: Review Details */}
      {step === "review_details" && (
        <div className="flex flex-col gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/15 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary">
                  {selfieImage ? (
                    <Image src={selfieImage} alt="Ransford Gyasi" width={36} height={36} unoptimized className="size-full object-cover" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-foreground">Ransford Gyasi</span>
                  <span className="tabular text-[12px] text-muted-foreground">{ghanaCard}</span>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pill-success px-2 py-0.5 text-[11px] font-medium text-pill-success-text">
                <Check size={12} strokeWidth={2.5} />
                Verified
              </span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviewTitle">Title</Label>
              <Select value={title} onValueChange={(val) => val && setTitle(val)}>
                <SelectTrigger id="reviewTitle" className="border-border text-left flex items-center justify-between">
                  <span className={title ? undefined : "text-muted-foreground/60"}>{title || "Select title"}</span>
                </SelectTrigger>
                <SelectContent>
                  {["Mr.", "Mrs.", "Miss", "Ms.", "Dr.", "Prof."].map((t) => (
                    <SelectItem key={t} value={t} label={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviewEmail">Email Address</Label>
              <Input
                id="reviewEmail"
                type="email"
                autoComplete="email"
                placeholder="e.g. ransford.gyasi@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={email.trim() !== "" && !detailsValid && !/^\S+@\S+\.\S+$/.test(email.trim())}
                
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviewMobile">Mobile Number</Label>
              <PhoneInput id="reviewMobile" value={mobile} onValueChange={setMobile} />
              <p className="px-0.5 text-[12.5px] text-muted-foreground">We will send a code to verify this number.</p>
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="lg"
            data-tour="signup-review"
            onClick={handleVerifyDetails}
            disabled={!detailsValid}
            loading={busy}
            className="mt-3.5 h-11 w-full text-[14px]"
          >
            Proceed
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

          {errorMsg && (
            <p role="alert" className="-mt-3 text-center text-[13px] text-destructive">
              {errorMsg}
            </p>
          )}

          {/* Recovery path */}
          <div className="flex flex-col items-center gap-5">
            <button
              type="button"
              disabled={countdown > 0}
              onClick={() => {
                setCountdown(RESEND_SECONDS);
                setErrorMsg("");
              }}
              className="text-[13px] text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:text-muted-foreground disabled:no-underline disabled:cursor-default cursor-pointer"
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
              className="text-center text-[13px] text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:text-muted-foreground disabled:no-underline disabled:cursor-default cursor-pointer"
            >
              Send to {otpTarget === "sms" ? "email instead" : "SMS instead"}
            </button>
          </div>

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Verifying code...</span>
            </div>
          )}


        </form>
      )}

      {/* STEP 5: Set up Password — same fields, rules and remember-device offer as activation */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
          <NewPasswordFields
            password={password}
            confirm={confirmPassword}
            onPasswordChange={(v) => {
              setPassword(v);
              if (errorMsg) setErrorMsg("");
            }}
            onConfirmChange={(v) => {
              setConfirmPassword(v);
              if (errorMsg) setErrorMsg("");
            }}
            autoFocus
          />

          <AlertToast when={errorMsg} message={errorMsg} />

          <Button
            type="submit"
            variant="default"
            size="lg"
            data-tour="signup-password"
            disabled={!newPasswordReady(password, confirmPassword)} loading={busy}
            className="mt-2 h-11 w-full text-[14px]"
          >
            Proceed
          </Button>
        </form>
      )}

      {/* STEP 6: Set PIN */}
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
                if (pinNote) setPinNote("");
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
            <p role="alert" className="-mt-3 text-center text-[13px] text-destructive">
              {errorMsg}
            </p>
          )}
          {!errorMsg && pinNote && (
            <p className="-mt-3 text-center text-[13px] text-muted-foreground">{pinNote}</p>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Saving your PIN…</span>
            </div>
          )}

        </form>
      )}

      {/* STEP 7: Confirm PIN */}
      {step === "confirm_pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmPinSubmit();
          }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-full" data-tour="signup-confirm-pin">
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

          {errorMsg && (
            <p role="alert" className="-mt-3 text-center text-[13px] text-destructive">
              {errorMsg}
            </p>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Setting up account...</span>
            </div>
          )}

        </form>
      )}

    </AuthLayout>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <SignupContent />
    </Suspense>
  );
}
