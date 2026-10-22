"use client";

/**
 * Sole proprietor self-onboarding — BRD v2 §5.1 Corporate ("Self-Onboarding: Sole Proprietor").
 * Seven steps mirroring retail activation: Ghana Card, selfie, business confirmation, OTP, password, PIN.
 * Completes into /business/overview with no approval queue required (single user / sole signatory).
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Check, ExternalLink, SearchX, ShieldAlert, User } from "@/components/ui/icons";
import AuthLayout from "@/components/auth/AuthLayout";
import NewPasswordFields, { newPasswordReady } from "@/components/auth/NewPasswordFields";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import PinRequirements from "@/components/auth/PinRequirements";
import SelfieCapture from "@/components/auth/SelfieCapture";
import { AlertToast } from "@/components/ui/alert-toast";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GhanaCardInput } from "@/components/ui/ghana-card-input";
import { AppLoader } from "@/components/ui/loader";
import { hasConsecutiveDigits, hasRepeatingDigits, maskMobile } from "@/lib/auth-shared";
import {
  GHANA_CARD_LINKAGE_URL,
  SOLE_PROPRIETOR_DEMO,
  soleProprietorOutcome,
} from "@/lib/corporate/onboarding";
import { setFirstRun, setPendingReferral } from "@/lib/device-trust";
import { isCompleteGhanaCard } from "@/lib/ghana-card";
import { findAccount } from "@/lib/mock-data";
import { parseOnboardingStep, type OnboardingStep } from "@/lib/onboarding-steps";

type Step = OnboardingStep;
type Outcome = "not-verified" | "no-account" | "company";

const RESEND_SECONDS = 30;

const stepNumberMap: Record<Step, number> = {
  ghana_card: 1,
  selfie: 2,
  review_details: 3,
  otp: 4,
  password: 5,
  pin: 6,
  confirm_pin: 7,
};

function SoleProprietorSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stepParam = parseOnboardingStep(searchParams.get("step"));
  const outcomeParam = searchParams.get("outcome");

  const [step, setStep] = useState<Step>(stepParam ?? "ghana_card");
  const [outcome, setOutcome] = useState<Outcome | null>(
    outcomeParam === "not-verified" || outcomeParam === "no-account" || outcomeParam === "company"
      ? outcomeParam
      : null,
  );

  const [ghanaCard, setGhanaCard] = useState(SOLE_PROPRIETOR_DEMO.ghanaCard);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // OTP state
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  // Password & PIN state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(["", "", "", ""]);
  const [pinMisses, setPinMisses] = useState(0);
  const [pinNote, setPinNote] = useState("");


  useEffect(() => {
    if (stepParam) {
      setStep(stepParam);
      setOutcome(null);
      setErrorMsg("");
      setBusy(false);
    }
  }, [stepParam]);

  useEffect(() => {
    if (outcomeParam === "not-verified" || outcomeParam === "no-account" || outcomeParam === "company") {
      setOutcome(outcomeParam);
      setErrorMsg("");
      setBusy(false);
    }
  }, [outcomeParam]);

  // OTP Countdown
  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, countdown]);

  const accounts = useMemo(() => {
    return SOLE_PROPRIETOR_DEMO.accountIds
      .map((id) => findAccount(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
  }, []);

  function handleGhanaCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isCompleteGhanaCard(ghanaCard)) {
      setErrorMsg("Enter all ten digits of your Ghana Card number: nine, then the check digit.");
      return;
    }
    setErrorMsg("");
    setBusy(true);

    window.setTimeout(() => {
      setBusy(false);
      const outcomeResult = soleProprietorOutcome(ghanaCard);
      if (outcomeResult !== "ok") {
        setOutcome(outcomeResult);
        return;
      }
      setStep("selfie");
    }, 600);
  }

  function handleCaptureSelfie(imageDataUrl: string) {
    setSelfieImage(imageDataUrl);
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep("review_details");
    }, 800);
  }

  function handleConfirmBusiness() {
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

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setErrorMsg("Please enter a password.");
      return;
    }
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
    if (hasConsecutiveDigits(pin)) {
      setErrorMsg("PIN cannot contain consecutive numbers.");
      return;
    }
    if (hasRepeatingDigits(pin)) {
      setErrorMsg("PIN cannot contain repeating numbers.");
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
        restartPin("Those didn't match twice, so let's start again. Choose a PIN you'll remember.");
        return;
      }
      setPinMisses(pinMisses + 1);
      setErrorMsg("PINs don't match. Try again.");
      setConfirmPinDigits(["", "", "", ""]);
      return;
    }
    setErrorMsg("");
    setBusy(true);

    window.setTimeout(() => {
      setFirstRun("new");
      setPendingReferral(false);
      // The application is in: the applicant goes to its status. Nothing signs them in.
      router.push("/business/signup/status");
    }, 600);
  }

  function handleBackStep() {
    setErrorMsg("");
    setBusy(false);
    if (outcome) {
      setOutcome(null);
      setStep("ghana_card");
      return;
    }
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
      router.push("/business/signup?step=type");
    }
  }

  // Off-happy-path outcomes
  if (outcome === "not-verified") {
    return (
      <AuthLayout
        title="We Couldn't Verify Your Ghana Card"
        description="Link your Ghana Card to your GCB account, then try again."
        icon={ShieldAlert}
        align="center"
        onBack={handleBackStep}
        backLabel="Back to registration"
        width="compact"
      >
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="h-10 w-full gap-2 text-[14px]"
            onClick={() => window.open(GHANA_CARD_LINKAGE_URL, "_blank")}
          >
            Link Your Ghana Card
            <ExternalLink size={15} />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-10 w-full text-[14px]"
            onClick={() => {
              setOutcome(null);
              setStep("ghana_card");
            }}
          >
            Try Again
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (outcome === "no-account") {
    return (
        <AuthLayout
          title="We Couldn't Find a Business Account"
          description="There's no sole proprietor account under this Ghana Card. If you don't bank with GCB yet, we'll call you to open one."
          icon={SearchX}
          align="center"
          onBack={handleBackStep}
          backLabel="Back to registration"
          width="compact"
        >
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="h-10 w-full text-[14px]"
              onClick={() => router.push("/business/signup/new-to-gcb?type=sole")}
            >
              Open an Account
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-10 w-full text-[14px]"
              onClick={() => {
                setOutcome(null);
                setStep("ghana_card");
              }}
            >
              Try Again
            </Button>
          </div>
        </AuthLayout>
    );
  }

  if (outcome === "company") {
    return (
      <AuthLayout
        title="Your Business Is Registered as a Company"
        description="Companies apply with their account number. Your signatories sign a letter we prepare."
        icon={Building2}
        align="center"
        onBack={handleBackStep}
        backLabel="Back to registration"
        width="compact"
      >
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="h-10 w-full text-[14px]"
            onClick={() => router.push("/business/signup/enrol")}
          >
            Apply for Your Company
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-10 w-full text-[14px]"
            onClick={() => router.push("/business/signup?step=type")}
          >
            Back to Options
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={
        step === "ghana_card"
          ? "Verify Your Identity"
          : step === "selfie"
          ? "Selfie Match"
          : step === "review_details"
          ? "Confirm Your Business"
          : step === "otp"
          ? "Confirm Your Code"
          : step === "password"
          ? "Create Your Password"
          : step === "pin"
          ? "Set Your PIN"
          : "Confirm Your PIN"
      }
      description={
        step === "ghana_card" ? (
          "We will securely verify your identity using your Ghana Card."
        ) : step === "selfie" ? (
          "Center your face in the circle."
        ) : step === "review_details" ? (
          "We found this business under your Ghana Card."
        ) : step === "otp" ? (
          <>
            A 6-digit code has been sent to {maskMobile(SOLE_PROPRIETOR_DEMO.mobile)}.
            <br />
            Please enter the code below.
          </>
        ) : step === "password" ? (
          "Choose a password you will remember."
        ) : step === "pin" ? (
          "Set a 4-digit PIN for secure access."
        ) : (
          "Re-enter your 4-digit PIN to confirm."
        )
      }
      onBack={handleBackStep}
      backLabel="Back to previous step"
      stepProgress={{
        current: stepNumberMap[step],
        total: 7,
      }}
      width="compact"
      animateHeight={true}
    >
      {/* STEP 1: Enter Ghana Card */}
      {step === "ghana_card" && (
        <form onSubmit={handleGhanaCardSubmit} className="flex flex-col gap-4">
          <Field label="Ghana Card Number" htmlFor="ghanaCard">
            <GhanaCardInput
              id="ghanaCard"
              value={ghanaCard}
              onValueChange={setGhanaCard}
              required
            />
          </Field>

          <AlertToast when={errorMsg} message={errorMsg} />

          <div className="mt-3 flex flex-col gap-3">
            <Button
              type="submit"
              variant="default"
              size="lg"
              loading={busy}
              className="h-10 w-full text-[14px]"
            >
              Continue
            </Button>
            <p className="text-center text-[12.5px] leading-5 text-muted-foreground">
              By continuing, you agree to our{" "}
              <a
                href="#"
                className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </form>
      )}

      {/* STEP 2: Selfie */}
      {step === "selfie" && (
        <SelfieCapture
          onCapture={handleCaptureSelfie}
          busy={busy}
          capturedImage={selfieImage}
          onRetake={() => setSelfieImage(null)}
        />
      )}

      {/* STEP 3: Confirm Business */}
      {step === "review_details" && (
        <div className="flex flex-col gap-6">
          {/* Verified holder row */}
          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/15 px-3 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary">
                {selfieImage ? (
                  <Image
                    src={selfieImage}
                    alt={SOLE_PROPRIETOR_DEMO.holderName}
                    width={36}
                    height={36}
                    unoptimized
                    className="size-full object-cover"
                  />
                ) : (
                  <User size={16} />
                )}
              </div>
              <div className="min-w-0">
                <span className="block truncate text-[14px] font-medium text-foreground">
                  {SOLE_PROPRIETOR_DEMO.holderName}
                </span>
                <span className="tabular text-[12px] text-muted-foreground">{ghanaCard}</span>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pill-success px-2 py-0.5 text-[11px] font-medium text-pill-success-text">
              <Check size={12} />
              Verified
            </span>
          </div>

          {/* Business and accounts */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[14px] font-medium text-foreground">
              {SOLE_PROPRIETOR_DEMO.businessName}
            </h2>
            <div className="flex flex-col gap-2">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between py-1">
                  <span className="text-[13px] text-foreground">{acc.name}</span>
                  <span className="tabular text-[13px] text-muted-foreground">
                    •••• {acc.number.replace(/\s/g, "").slice(-4)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="lg"
            loading={busy}
            className="h-10 w-full text-[14px]"
            onClick={handleConfirmBusiness}
          >
            Continue
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
          className="flex flex-col gap-5"
        >
          <div>
            <OtpInput
              value={digits}
              onChange={(next) => {
                setDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              onComplete={(code) => handleOtpSubmit(code)}
              disabled={busy}
              invalid={Boolean(errorMsg)}
              autoFocus
            />
          </div>

          {errorMsg && (
            <p role="alert" className="-mt-2 text-center text-[13px] text-destructive">
              {errorMsg}
            </p>
          )}

          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              disabled={countdown > 0}
              onClick={() => {
                setCountdown(RESEND_SECONDS);
                setErrorMsg("");
              }}
              className="cursor-pointer text-[13px] text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
            >
              {countdown > 0 ? (
                <>
                  Resend code in <span className="tabular">{countdown}s</span>
                </>
              ) : (
                "Resend code"
              )}
            </button>

            <p className="text-center text-[13px] text-muted-foreground">
              Dial{" "}
              <a
                href="tel:*422*11%23"
                className="tabular font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                *422*11#
              </a>{" "}
              to retrieve your code
            </p>
          </div>

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Verifying code...</span>
            </div>
          )}
        </form>
      )}

      {/* STEP 5: Create Password */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
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
            disabled={!newPasswordReady(password, confirmPassword)}
            loading={busy}
            className="mt-2 h-10 w-full text-[14px]"
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
          className="flex flex-col gap-4"
        >
          {pinNote && (
            <p className="text-center text-[13px] text-muted-foreground">{pinNote}</p>
          )}

          <div className="flex justify-center">
            <OtpInput
              value={pinDigits}
              onChange={(next) => {
                setPinDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              onComplete={(pin) => handlePinSubmit(pin)}
              disabled={busy}
              length={4}
              invalid={Boolean(errorMsg)}
              autoFocus
            />
          </div>

          <PinRequirements pin={pinDigits.join("")} />

          <AlertToast when={errorMsg} message={errorMsg} />

          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={pinDigits.join("").length < 4}
            loading={busy}
            className="mt-2 h-10 w-full text-[14px]"
          >
            Continue
          </Button>
        </form>
      )}

      {/* STEP 7: Confirm PIN */}
      {step === "confirm_pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmPinSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex justify-center">
            <OtpInput
              value={confirmPinDigits}
              onChange={(next) => {
                setConfirmPinDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              onComplete={(pin) => handleConfirmPinSubmit(pin)}
              disabled={busy}
              length={4}
              invalid={Boolean(errorMsg)}
              autoFocus
            />
          </div>

          <AlertToast when={errorMsg} message={errorMsg} />

          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={confirmPinDigits.join("").length < 4}
            loading={busy}
            className="mt-2 h-10 w-full text-[14px]"
          >
            Confirm &amp; Finish
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default function SoleProprietorSignupPage() {
  return (
    <Suspense fallback={null}>
      <SoleProprietorSignupContent />
    </Suspense>
  );
}
