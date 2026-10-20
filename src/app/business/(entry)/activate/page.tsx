"use client";

/**
 * Invited business user activation — BRD v2 §8.3, FR-COR-04 to FR-COR-06.
 * The bank sets up the user; they activate online by verifying their invitation, confirming their Ghana Card,
 * validating an OTP, and setting up their password and PIN.
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, ShieldAlert } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import NewPasswordFields, { newPasswordReady } from "@/components/auth/NewPasswordFields";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import PinRequirements from "@/components/auth/PinRequirements";
import FindBranchDialog from "@/components/corporate/FindBranchDialog";
import { AlertToast } from "@/components/ui/alert-toast";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { GhanaCardInput } from "@/components/ui/ghana-card-input";
import { AppLoader } from "@/components/ui/loader";
import { hasConsecutiveDigits, hasRepeatingDigits, maskMobile } from "@/lib/auth-shared";
import {
  BUSINESS_INVITE_DEMO,
  BUSINESS_ROLE_LINE,
  INVITE_MAX_ATTEMPTS,
} from "@/lib/corporate/onboarding";
import { setFirstRun, setPendingReferral } from "@/lib/device-trust";
import { isCompleteGhanaCard } from "@/lib/ghana-card";
import { ACTORS, findAccount } from "@/lib/mock-data";
import { homePathForActor } from "@/lib/navigation";
import { useSession } from "@/lib/session-store";

type Step = "invite" | "ghana_card" | "otp" | "password" | "pin" | "confirm_pin";

const RESEND_SECONDS = 30;

const stepNumberMap: Record<Step, number> = {
  invite: 1,
  ghana_card: 2,
  otp: 3,
  password: 4,
  pin: 5,
  confirm_pin: 6,
};

function parseBusinessActivateStep(step: string | null): Step | null {
  if (!step) return null;
  if (["invite", "ghana_card", "otp", "password", "pin", "confirm_pin"].includes(step)) {
    return step as Step;
  }
  return null;
}

function BusinessActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, selectProfile, verifyMfa } = useSession();

  const stepParam = parseBusinessActivateStep(searchParams.get("step"));
  const expiredParam = searchParams.get("expired") === "1" || searchParams.get("expired") === "true";
  const outcomeParam = searchParams.get("outcome");

  const [step, setStep] = useState<Step>(stepParam ?? "invite");
  const [isExpired, setIsExpired] = useState(expiredParam);
  const [isLocked, setIsLocked] = useState(outcomeParam === "locked");

  const [cardInput, setCardInput] = useState(BUSINESS_INVITE_DEMO.ghanaCardOnRecord);
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

  const [showBranchDialog, setShowBranchDialog] = useState(false);

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

  const inviteAccounts = useMemo(() => {
    return BUSINESS_INVITE_DEMO.accountIds
      .map((id) => findAccount(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
  }, []);

  function handleGhanaCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isCompleteGhanaCard(cardInput)) {
      setErrorMsg("Enter all ten digits of your Ghana Card number: nine, then the check digit.");
      return;
    }

    const cleanEntered = cardInput.replace(/\D/g, "");
    const cleanExpected = BUSINESS_INVITE_DEMO.ghanaCardOnRecord.replace(/\D/g, "");

    if (cleanEntered !== cleanExpected) {
      const nextMisses = mismatchCount + 1;
      setMismatchCount(nextMisses);
      if (nextMisses >= INVITE_MAX_ATTEMPTS) {
        setErrorMsg("");
        setIsLocked(true);
        return;
      }
      setErrorMsg("This number doesn't match the one GCB Bank holds for you. Check it and try again.");
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
      const actor = ACTORS.find((a) => a.id === BUSINESS_INVITE_DEMO.actorId) ?? ACTORS[0];
      signIn(actor);
      if (actor.profiles.length > 0) {
        selectProfile(actor.profiles[0]);
      }
      verifyMfa();
      router.push(homePathForActor(actor));
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
      setStep("ghana_card");
    } else if (step === "ghana_card") {
      setStep("invite");
    } else {
      router.push("/login?type=business");
    }
  }

  if (isExpired) {
    return (
      <AuthLayout
        title="This Invitation Has Expired"
        description="Ask your branch or relationship manager to send you a new one."
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
            size="lg"
            className="h-10 w-full text-[14px]"
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
          description="For your security, finish setting up at your branch."
          icon={ShieldAlert}
          align="center"
          onBack={handleBackStep}
          backLabel="Back to invitation"
          width="compact"
        >
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="h-10 w-full text-[14px]"
              onClick={() => setShowBranchDialog(true)}
            >
              Find a Branch
            </Button>
          </div>
        </AuthLayout>

        <FindBranchDialog
          open={showBranchDialog}
          onOpenChange={setShowBranchDialog}
        />
      </>
    );
  }

  return (
    <AuthLayout
      title={
        step === "invite"
          ? "Accept Your Invitation"
          : step === "ghana_card"
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
          `GCB Bank has set you up on ${BUSINESS_INVITE_DEMO.companyName}'s business banking.`
        ) : step === "ghana_card" ? (
          "Enter the Ghana Card number GCB Bank holds for you."
        ) : step === "otp" ? (
          <>
            A 6-digit code has been sent to {maskMobile(BUSINESS_INVITE_DEMO.mobile)}.
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
              <span className="text-[12px] text-muted-foreground">Your Role</span>
              <span className="text-[14px] font-medium text-foreground">
                {BUSINESS_INVITE_DEMO.role}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {BUSINESS_ROLE_LINE[BUSINESS_INVITE_DEMO.role]}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[12px] text-muted-foreground">Accounts You Can See</span>
              <div className="flex flex-col gap-1.5">
                {inviteAccounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between text-[13px]">
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
            size="lg"
            className="h-10 w-full text-[14px]"
            onClick={() => setStep("ghana_card")}
          >
            Accept Invitation
          </Button>
        </div>
      )}

      {/* STEP 2: Confirm Identity via Ghana Card */}
      {step === "ghana_card" && (
        <form onSubmit={handleGhanaCardSubmit} className="flex flex-col gap-4">
          <Field label="Ghana Card Number" htmlFor="ghanaCard">
            <GhanaCardInput
              id="ghanaCard"
              value={cardInput}
              onValueChange={setCardInput}
              required
            />
          </Field>

          <AlertToast when={errorMsg} message={errorMsg} />

          <Button
            type="submit"
            variant="default"
            size="lg"
            loading={busy}
            className="mt-2 h-10 w-full text-[14px]"
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
            size="lg"
            disabled={!newPasswordReady(password, confirmPassword)}
            loading={busy}
            className="mt-2 h-10 w-full text-[14px]"
          >
            Proceed
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

export default function BusinessActivatePage() {
  return (
    <Suspense fallback={null}>
      <BusinessActivateContent />
    </Suspense>
  );
}
