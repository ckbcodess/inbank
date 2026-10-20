"use client";

/**
 * Password Reset — BRD FR-31.
 *
 * Mobile number → selfie → new password → back to login.
 *
 * The selfie is the verification: it's matched against the Ghana Card photo
 * the Bank already holds, so the customer doesn't need access to an inbox or
 * a code to get back in. Two deliberate security properties:
 *
 *  - The mobile step never confirms whether a profile exists. It always
 *    advances with the same wording, so this screen can't be used to
 *    enumerate customers.
 *  - Password rules come from the same component activation uses
 *    (`NewPasswordFields`), so a reset can't enforce a different standard.
 *
 * A selfie that doesn't match gets a calm retry screen (likely causes, no
 * blame). After MAX_SELFIE_ATTEMPTS misses, selfie checks stop and the
 * customer is sent to a branch with their Ghana Card.
 *
 * Demo: any mobile number ending in 0000 (e.g. 24 000 0000) never matches.
 *
 * Sits outside both shells — it is reached from Login, before authentication.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Landmark, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import AuthLayout from "@/components/auth/AuthLayout";
import SelfieCapture from "@/components/auth/SelfieCapture";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { AppLoader } from "@/components/ui/loader";
import NewPasswordFields, { newPasswordReady } from "@/components/auth/NewPasswordFields";
import { isCompleteGhanaMobile } from "@/lib/phone";
import { maskMobile } from "@/lib/auth-shared";

import { Field } from "@/components/ui/field";
type Stage = "mobile" | "selfie" | "no_match" | "branch" | "otp" | "password" | "done";

const STEP_NUMBER: Partial<Record<Stage, number>> = {
  mobile: 1,
  selfie: 2,
  no_match: 2,
  otp: 3,
  password: 4,
};

const RESEND_SECONDS = 30;
const MAX_SELFIE_ATTEMPTS = 3;
const BRANCH_LOCATOR_URL = "https://www.gcbbank.com.gh/branches-and-atms";

/** Demo hook: numbers ending in 0000 stand in for a face that won't match. */
function selfieMatches(mobile: string): boolean {
  return !mobile.endsWith("0000");
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("mobile");
  const [busy, setBusy] = useState(false);

  const [country, setCountry] = useState("GH");
  const [mobile, setMobile] = useState("");
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [errorMsg, setErrorMsg] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const mobileValid = country === "GH" ? isCompleteGhanaMobile(mobile) : mobile.trim().length >= 7;
  const canReset = newPasswordReady(password, confirm);

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
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setCountdown(RESEND_SECONDS);
      setErrorMsg("");
      advance("otp", 800);
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

  function handleOtpSubmit(incomingCode?: string) {
    const code = incomingCode ?? otpDigits.join("");
    if (code.length < OTP_LENGTH || busy) return;
    if (code === "000000") {
      setErrorMsg("The code entered is incorrect or has expired. Please try again or request a new code.");
      return;
    }
    setErrorMsg("");
    advance("password", 600);
  }

  function handleBack() {
    if (stage === "password") {
      setPassword("");
      setConfirm("");
      setStage("otp");
    } else if (stage === "otp") {
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setSelfieImage(null);
      setStage("selfie");
    } else if (stage === "selfie" || stage === "no_match") {
      setSelfieImage(null);
      setStage("mobile");
    }
  }

  const copy: Record<Stage, { title: string; description: string }> = {
    mobile: {
      title: "Reset Your Password",
      description: "Enter the mobile number registered on your account.",
    },
    selfie: {
      title: "Selfie Verification",
      description: "We'll match your selfie to the photo on your Ghana Card before you create a new password.",
    },
    no_match: {
      title: "We Couldn't Match Your Selfie",
      description:
        "This usually comes down to light, glare, or something covering part of your face. Find even light, face the camera and try again.",
    },
    branch: {
      title: "Let's Finish This at a Branch",
      description:
        "Your selfie still didn't match, so we've paused selfie checks for this number. Bring your Ghana Card to any GCB branch and we'll reset your password there.",
    },
    otp: {
      title: "Confirm Your Code",
      description: `A 6-digit code has been sent to ${maskMobile(mobile || "0244123821")}. Please enter the code below.`,
    },
    password: {
      title: "Create a New Password",
      description: "Enter it twice to make sure it's right.",
    },
    done: {
      title: "Password Reset Successful",
      description: "Your password has been reset. Log in with your new password.",
    },
  };

  useEffect(() => {
    if (stage !== "otp" || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [stage, countdown]);

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
      backHref={stage === "mobile" ? "/login" : undefined}
      backLabel={stage === "mobile" ? "Back to login" : "Back"}
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
          className="flex flex-col gap-4"
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
            disabled={!mobileValid} loading={busy}
            className="mt-2 h-10 w-full text-[14px]"
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
          dataTour="reset-selfie"
        />
      )}

      {stage === "otp" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleOtpSubmit();
          }}
          className="flex flex-col gap-5"
        >
          <div data-tour="reset-otp">
            <OtpInput
              value={otpDigits}
              onChange={(next) => {
                setOtpDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              onComplete={(code) => handleOtpSubmit(code)}
              disabled={busy}
              invalid={!!errorMsg}
              autoFocus
            />
          </div>

          {errorMsg && (
            <p role="alert" className="-mt-2 text-center text-[13px] text-destructive">
              {errorMsg}
            </p>
          )}

          <div className="flex flex-col items-center gap-2">
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

            <p className="text-center text-[13px] text-muted-foreground">
              Dial <a href="tel:*422*11%23" className="tabular font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">*422*11#</a> to retrieve your code
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

      {stage === "password" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canReset && !busy) advance("done");
          }}
          className="flex flex-col gap-4"
        >
          <NewPasswordFields
            password={password}
            confirm={confirm}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
            autoFocus
            passwordLabel="New Password"
            confirmLabel="Confirm New Password"
          />

          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={!canReset} loading={busy}
            className="mt-2 h-10 w-full text-[14px]"
          >
            Reset password
          </Button>
        </form>
      )}

      {stage === "no_match" && (
        <div className="flex flex-col gap-2">
          <Button variant="default" size="lg" onClick={retrySelfie} className="h-10 w-full text-[14px]">
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
        <div className="flex flex-col gap-2">
          <Button
            variant="default"
            size="lg"
            nativeButton={false}
            render={<a href={BRANCH_LOCATOR_URL} target="_blank" rel="noreferrer" />}
            className="h-10 w-full text-[14px]"
          >
            Find a branch
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => router.push("/login")}
            className="h-10 w-full text-[14px]"
          >
            Back to login
          </Button>
        </div>
      )}

      {stage === "done" && (
        <Button
          variant="default"
          size="lg"
          onClick={() => router.push("/login")}
          className="h-10 w-full text-[14px]"
        >
          Back to login
        </Button>
      )}
    </AuthLayout>
  );
}
