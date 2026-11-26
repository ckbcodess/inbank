"use client";

/**
 * Sole proprietor self-onboarding — BRD v2 §5.1 Corporate ("Self-Onboarding: Sole Proprietor").
 * Account number and date of birth, a code to the mobile on file, then the business, password and PIN. No Ghana Card
 * or selfie (designer, 2026-11-26): the date of birth GCB holds is enough, as for invited business users. The
 * business shows only after the code, so an account number and a birthday alone reveal nothing. Three wrong dates
 * send them to a branch. No approval queue (single user, sole signatory). It ends at business login.
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, SearchX, ShieldAlert } from "@/components/ui/icons";
import AuthLayout from "@/components/auth/AuthLayout";
import NewPasswordFields, { newPasswordReady } from "@/components/auth/NewPasswordFields";
import OpenGcbAccountDialog from "@/components/auth/OpenGcbAccountDialog";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import PinRequirements from "@/components/auth/PinRequirements";
import { AlertToast } from "@/components/ui/alert-toast";
import { Button } from "@/components/ui/button";
import { DateOfBirthInput } from "@/components/ui/date-of-birth-input";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AppLoader } from "@/components/ui/loader";
import { hasConsecutiveDigits, hasRepeatingDigits, maskMobile } from "@/lib/auth-shared";
import {
  INVITE_MAX_ATTEMPTS,
  SOLE_PROPRIETOR_DEMO,
  soleProprietorOutcome,
} from "@/lib/corporate/onboarding";
import { setFirstRun, setPendingReferral } from "@/lib/device-trust";
import { displayDateOfBirth, isCompleteDateOfBirth, parseDateOfBirth } from "@/lib/date-of-birth";
import { findAccount } from "@/lib/mock-data";

type Step = "identity" | "otp" | "review_details" | "password" | "pin" | "confirm_pin";
type Outcome = "locked" | "no-account" | "company";

const STEPS: readonly Step[] = ["identity", "otp", "review_details", "password", "pin", "confirm_pin"];
const OUTCOMES: readonly Outcome[] = ["locked", "no-account", "company"];

function parseStep(value: string | null): Step | null {
  return STEPS.includes(value as Step) ? (value as Step) : null;
}

function parseOutcome(value: string | null): Outcome | null {
  return OUTCOMES.includes(value as Outcome) ? (value as Outcome) : null;
}

const RESEND_SECONDS = 30;

function SoleProprietorSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stepParam = parseStep(searchParams.get("step"));
  const outcomeParam = parseOutcome(searchParams.get("outcome"));

  const [step, setStep] = useState<Step>(stepParam ?? "identity");
  const [showOpenAccount, setShowOpenAccount] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(outcomeParam);

  const [accountNumber, setAccountNumber] = useState(SOLE_PROPRIETOR_DEMO.accountNumber);
  const [birthInput, setBirthInput] = useState(displayDateOfBirth(SOLE_PROPRIETOR_DEMO.dateOfBirthOnRecord));
  const [accountError, setAccountError] = useState("");
  const [birthError, setBirthError] = useState("");
  const [mismatchCount, setMismatchCount] = useState(0);
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
    if (outcomeParam) {
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

  function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (accountNumber.replace(/\D/g, "").length < 10) {
      setAccountError("Enter the full account number.");
      return;
    }
    const dateOfBirth = parseDateOfBirth(birthInput);
    if (!dateOfBirth) {
      setBirthError("Enter a real date, day first.");
      return;
    }
    setAccountError("");
    setBirthError("");
    setBusy(true);

    window.setTimeout(() => {
      setBusy(false);
      const found = soleProprietorOutcome(accountNumber);
      if (found !== "ok") {
        setOutcome(found);
        return;
      }
      if (dateOfBirth !== SOLE_PROPRIETOR_DEMO.dateOfBirthOnRecord) {
        const nextMisses = mismatchCount + 1;
        setMismatchCount(nextMisses);
        if (nextMisses >= INVITE_MAX_ATTEMPTS) {
          setOutcome("locked");
          return;
        }
        setBirthError("Doesn't match our records. Check it and try again.");
        return;
      }
      setDigits(Array(OTP_LENGTH).fill(""));
      setCountdown(RESEND_SECONDS);
      setStep("otp");
    }, 600);
  }

  function handleOtpSubmit(incomingCode?: string) {
    const code = incomingCode ?? digits.join("");
    if (code.length < OTP_LENGTH || busy) return;

    if (code === "000000") {
      setErrorMsg("Wrong or expired code. Try again, or resend it.");
      setDigits(Array(OTP_LENGTH).fill(""));
      return;
    }

    setErrorMsg("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep("review_details");
    }, 700);
  }

  function handleConfirmBusiness() {
    setPassword("");
    setConfirmPassword("");
    setStep("password");
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setErrorMsg("Enter a password.");
      return;
    }
    if (password === "00000" || password === "000000") {
      setErrorMsg("That password cannot be used. Choose another.");
      return;
    }
    if (!confirmPassword) {
      setErrorMsg("Confirm your password.");
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
      if (pin.length < 4) setErrorMsg("Enter a 4-digit PIN.");
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
      if (confirmPin.length < 4) setErrorMsg("Confirm your PIN.");
      return;
    }
    const originalPin = pinDigits.join("");
    if (originalPin.length === 4 && confirmPin !== originalPin) {
      if (pinMisses + 1 >= 2) {
        restartPin("They didn't match twice. Choose a new PIN.");
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
      // Set up, with no bank review to wait for. Nothing logs them in, as with an invited user.
      router.push("/login?type=business");
    }, 600);
  }

  function handleBackStep() {
    setErrorMsg("");
    setBusy(false);
    if (outcome) {
      if (outcome === "locked") setMismatchCount(0);
      setOutcome(null);
      setStep("identity");
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
      setStep("review_details");
    } else if (step === "review_details" || step === "otp") {
      // Going back past the code means proving it again.
      setDigits(Array(OTP_LENGTH).fill(""));
      setStep("identity");
    } else {
      router.push("/business/signup?step=type");
    }
  }

  // Off-happy-path outcomes
  if (outcome === "locked") {
    return (
      <>
        <AuthLayout
          title="We Couldn't Confirm Your Identity"
          description="For your security, finish at a branch."
          icon={ShieldAlert}
          align="center"
          onBack={handleBackStep}
          backLabel="Back to registration"
          width="compact"
        >
          <div className="flex flex-col gap-3">
            <Button size="md" className="w-full" onClick={() => router.push("/branches")}>
              Find a Branch
            </Button>
          </div>
        </AuthLayout>
      </>
    );
  }

  if (outcome === "no-account") {
    return (
      <>
        <AuthLayout
          title="No Business Account Found"
          description="Check the number, or open an account."
          icon={SearchX}
          align="center"
          onBack={handleBackStep}
          backLabel="Back to registration"
          width="compact"
        >
          <div className="flex flex-col gap-3">
            <Button
              size="md"
              className="w-full"
              onClick={() => setShowOpenAccount(true)}
            >
              Open an Account
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => {
                setOutcome(null);
                setStep("identity");
              }}
            >
              Try Again
            </Button>
          </div>
        </AuthLayout>
        <OpenGcbAccountDialog open={showOpenAccount} onOpenChange={setShowOpenAccount} />
      </>
    );
  }

  if (outcome === "company") {
    return (
      <AuthLayout
        title="This Is a Company Account"
        description="Apply as a company instead."
        icon={Building2}
        align="center"
        onBack={handleBackStep}
        backLabel="Back to registration"
        width="compact"
      >
        <div className="flex flex-col gap-3">
          <Button
            size="md"
            className="w-full"
            onClick={() => router.push("/business/signup/enrol")}
          >
            Apply as Company
          </Button>
          <Button
            variant="outline"
            size="md"
            className="w-full"
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
        step === "identity"
          ? "Verify Your Identity"
          : step === "otp"
          ? "Confirm Your Code"
          : step === "review_details"
          ? "Confirm Your Business"
          : step === "password"
          ? "Create Your Password"
          : step === "pin"
          ? "Set Your PIN"
          : "Confirm Your PIN"
      }
      description={
        step === "identity" ? (
          undefined
        ) : step === "review_details" ? (
          undefined
        ) : step === "otp" ? (
          <>
            Sent to {maskMobile(SOLE_PROPRIETOR_DEMO.mobile)}.
          </>
        ) : step === "password" ? (
          undefined
        ) : step === "pin" ? (
          "You'll use it with your password to log in."
        ) : (
          undefined
        )
      }
      onBack={handleBackStep}
      backLabel="Back to previous step"
      stepProgress={{
        current: STEPS.indexOf(step) + 1,
        total: STEPS.length,
      }}
      width="compact"
      animateHeight={true}
    >
      {/* STEP 1: Account number and date of birth */}
      {step === "identity" && (
        <form onSubmit={handleIdentitySubmit} className="flex flex-col gap-4">
          <Field label="Account Number" htmlFor="accountNumber" error={accountError}>
            <Input
              id="accountNumber"
              inputMode="numeric"
              autoComplete="off"
              className="tabular"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                if (accountError) setAccountError("");
              }}
              aria-invalid={Boolean(accountError)}
            />
          </Field>

          <Field label="Date of Birth" htmlFor="dateOfBirth" error={birthError}>
            <DateOfBirthInput
              id="dateOfBirth"
              value={birthInput}
              onValueChange={(v) => {
                setBirthInput(v);
                if (birthError) setBirthError("");
              }}
              aria-invalid={Boolean(birthError)}
            />
          </Field>

          <div className="mt-3 flex flex-col gap-3">
            <Button
              type="submit"
              variant="default"
              size="md"
              loading={busy}
              disabled={!isCompleteDateOfBirth(birthInput)}
              className="w-full"
            >
              Continue
            </Button>
            <p className="text-center text-caption leading-5 text-muted-foreground">
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

      {/* STEP 2: OTP Verification */}
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
            <p role="alert" className="-mt-2 text-center text-body text-destructive">
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
              className="cursor-pointer text-body text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
            >
              {countdown > 0 ? (
                <>
                  Resend code in <span className="tabular">{countdown}s</span>
                </>
              ) : (
                "Resend code"
              )}
            </button>

            <p className="text-center text-body text-muted-foreground">
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
            <div className="flex items-center justify-center gap-2 py-1 text-body text-muted-foreground">
              <AppLoader size={16} />
              <span>Verifying code...</span>
            </div>
          )}
        </form>
      )}

      {/* STEP 3: Confirm Business, shown only after the code */}
      {step === "review_details" && (
        <div className="flex flex-col gap-6">
          {/* Business and accounts */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-body font-medium text-foreground">
                {SOLE_PROPRIETOR_DEMO.businessName}
              </h2>
              <p className="text-caption text-muted-foreground">{SOLE_PROPRIETOR_DEMO.holderName}</p>
            </div>
            <div className="flex flex-col gap-2">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between py-1">
                  <span className="text-body text-foreground">{acc.name}</span>
                  <span className="tabular text-body text-muted-foreground">
                    •••• {acc.number.replace(/\s/g, "").slice(-4)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="md"
            className="w-full"
            onClick={handleConfirmBusiness}
          >
            Continue
          </Button>
        </div>
      )}

      {/* STEP 4: Create Password */}
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
            size="md"
            disabled={!newPasswordReady(password, confirmPassword)}
            loading={busy}
            className="mt-2 w-full"
          >
            Continue
          </Button>
        </form>
      )}

      {/* STEP 5: Set PIN */}
      {step === "pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePinSubmit();
          }}
          className="flex flex-col gap-4"
        >
          {pinNote && (
            <p className="text-center text-body text-muted-foreground">{pinNote}</p>
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
            size="md"
            disabled={pinDigits.join("").length < 4}
            loading={busy}
            className="mt-2 w-full"
          >
            Continue
          </Button>
        </form>
      )}

      {/* STEP 6: Confirm PIN */}
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
            size="md"
            disabled={confirmPinDigits.join("").length < 4}
            loading={busy}
            className="mt-2 w-full"
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
