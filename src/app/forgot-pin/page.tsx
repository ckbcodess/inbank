"use client";

/**
 * PIN Reset — Forgot PIN.
 *
 * Mobile number → selfie → set new PIN → confirm new PIN → done.
 *
 * The selfie matches against the Ghana Card photo on file.
 * Once verified, the customer chooses a new 4-digit transaction PIN
 * adhering to the bank's rules (no consecutive numbers, no repeating numbers).
 */

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Landmark, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import AuthLayout from "@/components/auth/AuthLayout";
import SelfieCapture from "@/components/auth/SelfieCapture";
import OtpInput from "@/components/auth/OtpInput";
import PinRequirements from "@/components/auth/PinRequirements";
import { AppLoader } from "@/components/ui/loader";
import { isCompleteGhanaMobile } from "@/lib/phone";
import { hasConsecutiveDigits, hasRepeatingDigits } from "@/lib/auth-shared";
import { useSession } from "@/lib/session-store";
import { Field } from "@/components/ui/field";

type Stage = "mobile" | "selfie" | "no_match" | "branch" | "pin" | "confirm_pin" | "done";

const STEP_NUMBER: Partial<Record<Stage, number>> = {
  mobile: 1,
  selfie: 2,
  no_match: 2,
  pin: 3,
  confirm_pin: 4,
};

const MAX_SELFIE_ATTEMPTS = 3;
const BRANCH_LOCATOR_URL = "https://www.gcbbank.com.gh/branches-and-atms";

function selfieMatches(mobile: string): boolean {
  return !mobile.endsWith("0000");
}

function ForgotPinContent() {
  const router = useRouter();
  const { actor } = useSession();

  const [stage, setStage] = useState<Stage>("mobile");
  const [busy, setBusy] = useState(false);

  const [country, setCountry] = useState("GH");
  const [mobile, setMobile] = useState(actor?.phone ?? "");
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(["", "", "", ""]);
  const [pinMisses, setPinMisses] = useState(0);
  const [pinNote, setPinNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const mobileValid = country === "GH" ? isCompleteGhanaMobile(mobile) : mobile.trim().length >= 7;

  function advance(next: Stage, delay = 600) {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStage(next);
    }, delay);
  }

  function handleSelfie(image: string) {
    setSelfieImage(image);
    if (selfieMatches(mobile)) {
      setPinDigits(["", "", "", ""]);
      setConfirmPinDigits(["", "", "", ""]);
      setErrorMsg("");
      advance("pin", 800);
      return;
    }
    const attempts = failedAttempts + 1;
    setFailedAttempts(attempts);
    advance(attempts >= MAX_SELFIE_ATTEMPTS ? "branch" : "no_match", 800);
  }

  function retrySelfie() {
    setSelfieImage(null);
    setStage("selfie");
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
    advance("confirm_pin", 500);
  }

  function restartPin(note = "") {
    setPinMisses(0);
    setPinDigits(["", "", "", ""]);
    setConfirmPinDigits(["", "", "", ""]);
    setErrorMsg("");
    setPinNote(note);
    setStage("pin");
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
    advance("done", 600);
  }

  function handleBack() {
    setErrorMsg("");
    if (stage === "confirm_pin") {
      setConfirmPinDigits(["", "", "", ""]);
      setStage("pin");
    } else if (stage === "pin") {
      setPinDigits(["", "", "", ""]);
      setSelfieImage(null);
      setStage("selfie");
    } else if (stage === "selfie" || stage === "no_match") {
      setSelfieImage(null);
      setStage("mobile");
    }
  }

  const copy: Record<Stage, { title: string; description: string }> = {
    mobile: {
      title: "Reset Your PIN",
      description: "Enter the mobile number registered on your account.",
    },
    selfie: {
      title: "Selfie Verification",
      description: "We'll match your selfie to the photo on your Ghana Card before you set a new PIN.",
    },
    no_match: {
      title: "We Couldn't Match Your Selfie",
      description:
        "This usually comes down to light, glare, or something covering part of your face. Find even light, face the camera and try again.",
    },
    branch: {
      title: "Let's Finish This at a Branch",
      description:
        "Your selfie still didn't match, so we've paused selfie checks for this number. Bring your Ghana Card to any GCB branch and we'll reset your PIN there.",
    },
    pin: {
      title: "Set a New PIN",
      description: "Choose a 4-digit PIN for all your transactions.",
    },
    confirm_pin: {
      title: "Confirm New PIN",
      description: "Re-enter your 4-digit PIN to confirm.",
    },
    done: {
      title: "PIN Reset Successful",
      description: "Your transaction PIN has been reset. You can now use your new PIN.",
    },
  };

  return (
    <AuthLayout
      title={copy[stage].title}
      description={copy[stage].description}
      icon={
        stage === "done"
          ? CheckCircle2
          : stage === "no_match"
            ? ScanFace
            : stage === "branch"
              ? Landmark
              : undefined
      }
      onBack={stage !== "done" && stage !== "branch" && stage !== "mobile" ? handleBack : undefined}
      backHref={stage === "mobile" ? (actor ? "/overview" : "/login") : undefined}
      backLabel={stage === "mobile" ? (actor ? "Back to dashboard" : "Back to login") : "Back"}
      align={stage === "done" || stage === "no_match" || stage === "branch" ? "center" : "left"}
      stepProgress={STEP_NUMBER[stage] ? { current: STEP_NUMBER[stage], total: 4 } : undefined}
      width="compact"
    >
      {stage === "mobile" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (mobileValid && !busy) advance("selfie");
          }}
          className="flex flex-col gap-5"
        >
          <Field label="Mobile Number" htmlFor="mobile">
            <PhoneInput
              id="mobile"
              value={mobile}
              country={country}
              onCountryChange={(code) => {
                setCountry(code);
                setMobile("");
              }}
              onValueChange={setMobile}
              autoFocus
              required
            />
          </Field>

          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={!mobileValid}
            loading={busy}
            className="mt-2 h-11 w-full text-[14px]"
          >
            Proceed
          </Button>
        </form>
      )}

      {stage === "selfie" && (
        <SelfieCapture
          onCapture={handleSelfie}
          busy={busy}
          capturedImage={selfieImage}
          onRetake={() => setSelfieImage(null)}
          dataTour="reset-pin-selfie"
        />
      )}

      {stage === "pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePinSubmit();
          }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-full" data-tour="reset-pin">
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

          <PinRequirements pin={pinDigits.join("")} />

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

      {stage === "confirm_pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmPinSubmit();
          }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-full" data-tour="reset-confirm-pin">
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

          <PinRequirements
            pin={confirmPinDigits.join("")}
            originalPin={pinDigits.join("")}
            isConfirm
          />

          {errorMsg && (
            <p role="alert" className="-mt-3 text-center text-[13px] text-destructive">
              {errorMsg}
            </p>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Updating PIN...</span>
            </div>
          )}
        </form>
      )}

      {stage === "no_match" && (
        <div className="flex flex-col gap-3">
          <Button variant="default" size="lg" onClick={retrySelfie} className="h-11 w-full text-[14px]">
            Try again
          </Button>
          <p className="text-center text-[12.5px] text-muted-foreground tabular">
            {MAX_SELFIE_ATTEMPTS - failedAttempts === 1
              ? "1 try left before we ask you to visit a branch"
              : `${MAX_SELFIE_ATTEMPTS - failedAttempts} tries left before we ask you to visit a branch`}
          </p>
        </div>
      )}

      {stage === "branch" && (
        <div className="flex flex-col gap-3">
          <Button
            variant="default"
            size="lg"
            nativeButton={false}
            render={<a href={BRANCH_LOCATOR_URL} target="_blank" rel="noreferrer" />}
            className="h-11 w-full text-[14px]"
          >
            Find a branch
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => router.push(actor ? "/overview" : "/login")}
            className="h-11 w-full text-[14px]"
          >
            {actor ? "Back to dashboard" : "Back to login"}
          </Button>
        </div>
      )}

      {stage === "done" && (
        <Button
          variant="default"
          size="lg"
          onClick={() => router.push(actor ? "/overview" : "/login")}
          className="h-11 w-full text-[14px]"
        >
          {actor ? "Back to dashboard" : "Back to login"}
        </Button>
      )}
    </AuthLayout>
  );
}

export default function ForgotPinPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background animate-pulse" />}>
      <ForgotPinContent />
    </Suspense>
  );
}
