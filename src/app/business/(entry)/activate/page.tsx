"use client";

/**
 * Invited business user activation — BRD v2 §8.3, FR-COR-04 to FR-COR-06.
 * The bank sets up the user. The invitation link comes by email; they confirm their date of birth, then a code sent
 * to their mobile, and set a password and PIN. The two channels stay apart on purpose: fraud on the old platform
 * stopped once the username and the password link went different ways (bank call, 2026-10-22). Date of birth
 * replaces the Ghana Card (designer, 2026-11-25), because the bank's form doesn't ask for one and many business
 * users have none on file.
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, ShieldAlert } from "@/components/ui/icons";
import AuthLayout from "@/components/auth/AuthLayout";
import NewPasswordFields, { newPasswordReady } from "@/components/auth/NewPasswordFields";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import PinRequirements from "@/components/auth/PinRequirements";
import { AlertToast } from "@/components/ui/alert-toast";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { DateOfBirthInput } from "@/components/ui/date-of-birth-input";
import { AppLoader } from "@/components/ui/loader";
import { hasConsecutiveDigits, hasRepeatingDigits, maskMobile } from "@/lib/auth-shared";
import {
  BUSINESS_INVITE_DEMO,
  BUSINESS_ROLE_LINE,
  INVITE_MAX_ATTEMPTS,
} from "@/lib/corporate/onboarding";
import { setFirstRun, setPendingReferral } from "@/lib/device-trust";
import { companyUserFor } from "@/lib/corporate/controls";
import { displayDateOfBirth, isCompleteDateOfBirth, parseDateOfBirth } from "@/lib/date-of-birth";
import { findAccount, formatMoney } from "@/lib/mock-data";

type Step = "invite" | "identity" | "otp" | "password" | "pin" | "confirm_pin";

const RESEND_SECONDS = 30;

const stepNumberMap: Record<Step, number> = {
  invite: 1,
  identity: 2,
  otp: 3,
  password: 4,
  pin: 5,
  confirm_pin: 6,
};

function parseBusinessActivateStep(step: string | null): Step | null {
  if (!step) return null;
  if (["invite", "identity", "otp", "password", "pin", "confirm_pin"].includes(step)) {
    return step as Step;
  }
  return null;
}

function BusinessActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stepParam = parseBusinessActivateStep(searchParams.get("step"));
  const expiredParam = searchParams.get("expired") === "1" || searchParams.get("expired") === "true";
  const outcomeParam = searchParams.get("outcome");

  const [step, setStep] = useState<Step>(stepParam ?? "invite");
  const [isExpired, setIsExpired] = useState(expiredParam);
  const [isLocked, setIsLocked] = useState(outcomeParam === "locked");

  const [birthInput, setBirthInput] = useState(displayDateOfBirth(BUSINESS_INVITE_DEMO.dateOfBirthOnRecord));
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
      setIsExpired(false);
      setIsLocked(false);
      setErrorMsg("");
      setBusy(false);
    }
  }, [stepParam]);

  useEffect(() => {
    if (expiredParam) {
      setIsExpired(true);
      setIsLocked(false);
    }
  }, [expiredParam]);

  useEffect(() => {
    if (outcomeParam === "locked") {
      setIsLocked(true);
      setIsExpired(false);
    }
  }, [outcomeParam]);

  // OTP Countdown
  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, countdown]);

  const inviteLimit = companyUserFor({ id: BUSINESS_INVITE_DEMO.actorId })?.limit ?? 0;
  const inviteAccounts = useMemo(() => {
    return BUSINESS_INVITE_DEMO.accountIds
      .map((id) => findAccount(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
  }, []);

  function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();
    const dateOfBirth = parseDateOfBirth(birthInput);
    if (!dateOfBirth) {
      setErrorMsg("Enter a real date, day first.");
      return;
    }

    if (dateOfBirth !== BUSINESS_INVITE_DEMO.dateOfBirthOnRecord) {
      const nextMisses = mismatchCount + 1;
      setMismatchCount(nextMisses);
      if (nextMisses >= INVITE_MAX_ATTEMPTS) {
        setErrorMsg("");
        setIsLocked(true);
        return;
      }
      setErrorMsg("Doesn't match our records. Check it and try again.");
      return;
    }

    setErrorMsg("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setDigits(Array(OTP_LENGTH).fill(""));
      setStep("otp");
      setCountdown(RESEND_SECONDS);
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
      setStep("password");
    }, 700);
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
      // Activation is done. Nothing signs them in: they go to login, which is closed for now.
      router.push("/login?type=business");
    }, 600);
  }

  function handleBackStep() {
    setErrorMsg("");
    setBusy(false);
    if (isLocked) {
      setIsLocked(false);
      setMismatchCount(0);
      setStep("invite");
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
      setStep("identity");
    } else if (step === "identity") {
      setStep("invite");
    } else {
      router.push("/login?type=business");
    }
  }

  if (isExpired) {
    return (
      <AuthLayout
        title="Invitation Expired"
        description="Ask your branch or relationship manager for a new one."
        icon={Clock}
        align="center"
        backHref="/login?type=business"
        backLabel="Back to login"
        width="compact"
      >
        <div className="flex flex-col gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/login?type=business" />}
            size="md"
            className="w-full"
          >
            Go to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (isLocked) {
    return (
      <>
        <AuthLayout
          title="We Couldn't Confirm Your Identity"
          description="For your security, finish at a branch."
          icon={ShieldAlert}
          align="center"
          onBack={handleBackStep}
          backLabel="Back to invitation"
          width="compact"
        >
          <div className="flex flex-col gap-3">
            <Button
              size="md"
              className="w-full"
              onClick={() => router.push("/branches")}
            >
              Find a Branch
            </Button>
          </div>
        </AuthLayout>
      </>
    );
  }

  return (
    <AuthLayout
      title={
        step === "invite"
          ? "Accept Your Invitation"
          : step === "identity"
          ? "Confirm Your Identity"
          : step === "otp"
          ? "Confirm Your Code"
          : step === "password"
          ? "Create Your Password"
          : step === "pin"
          ? "Set Your PIN"
          : "Confirm Your PIN"
      }
      description={
        step === "invite" ? (
          `You've been added to ${BUSINESS_INVITE_DEMO.companyName}.`
        ) : step === "identity" ? (
          "As your company gave it to GCB."
        ) : step === "otp" ? (
          <>
            Sent to {maskMobile(BUSINESS_INVITE_DEMO.mobile)}.
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
        current: stepNumberMap[step],
        total: 6,
      }}
      width="compact"
      animateHeight={true}
    >
      {/* STEP 1: Invite Overview */}
      {step === "invite" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-caption text-muted-foreground">Your Role</span>
              <span className="text-body font-medium text-foreground">
                {BUSINESS_INVITE_DEMO.role}
              </span>
              <span className="text-caption text-muted-foreground">
                {BUSINESS_ROLE_LINE[BUSINESS_INVITE_DEMO.role]}
              </span>
            </div>

            {inviteLimit > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-caption text-muted-foreground">Payment Limit</span>
                <span className="tabular text-body text-foreground">{formatMoney(inviteLimit, "GHS", true)}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-caption text-muted-foreground">Your Accounts</span>
              <div className="flex flex-col gap-1.5">
                {inviteAccounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between text-body">
                    <span className="text-foreground">{acc.name}</span>
                    <span className="tabular text-muted-foreground">
                      •••• {acc.number.replace(/\s/g, "").slice(-4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button
            size="md"
            className="w-full"
            onClick={() => setStep("identity")}
          >
            Accept Invitation
          </Button>
        </div>
      )}

      {/* STEP 2: Confirm identity by date of birth */}
      {step === "identity" && (
        <form onSubmit={handleIdentitySubmit} className="flex flex-col gap-4">
          <Field label="Date of Birth" htmlFor="dateOfBirth" error={errorMsg}>
            <DateOfBirthInput
              id="dateOfBirth"
              value={birthInput}
              onValueChange={(v) => {
                setBirthInput(v);
                if (errorMsg) setErrorMsg("");
              }}
              aria-invalid={Boolean(errorMsg)}
              autoFocus
            />
          </Field>

          <Button
            type="submit"
            variant="default"
            size="md"
            loading={busy}
            disabled={!isCompleteDateOfBirth(birthInput)}
            className="mt-2 w-full"
          >
            Continue
          </Button>
        </form>
      )}

      {/* STEP 3: OTP Verification */}
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

export default function BusinessActivatePage() {
  return (
    <Suspense fallback={null}>
      <BusinessActivateContent />
    </Suspense>
  );
}
