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

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Landmark, ScanFace } from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import SelfieCapture from "@/components/auth/SelfieCapture";
import NewPasswordFields, { newPasswordReady } from "@/components/auth/NewPasswordFields";
import { isCompleteGhanaMobile } from "@/lib/phone";

type Stage = "mobile" | "selfie" | "no_match" | "branch" | "password" | "done";

const STEP_NUMBER: Partial<Record<Stage, number>> = {
  mobile: 1,
  selfie: 2,
  no_match: 2,
  password: 3,
};

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

  const [mobile, setMobile] = useState("");
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const mobileValid = isCompleteGhanaMobile(mobile);
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
      advance("password", 800);
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

  function handleBack() {
    if (stage === "password") {
      setPassword("");
      setConfirm("");
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
      title: "Take a Selfie",
      description: "We'll match it to the photo on your Ghana Card.",
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
    password: {
      title: "Create a New Password",
      description: "Enter it twice to make sure it's right.",
    },
    done: {
      title: "Password Reset",
      description: "Log in with your new password. Any other devices have been signed out.",
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
      stepProgress={STEP_NUMBER[stage] ? { current: STEP_NUMBER[stage], total: 3 } : undefined}
      width="compact"
      footer={
        stage === "done" || stage === "branch" ? undefined : (
          <div className="flex justify-center">
            {stage === "mobile" ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={15} strokeWidth={1.9} aria-hidden="true" />
                Back to login
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft size={15} strokeWidth={1.9} aria-hidden="true" />
                Back
              </button>
            )}
          </div>
        )
      }
    >
      {stage === "mobile" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (mobileValid && !busy) advance("selfie");
          }}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="mobile" className="text-[13px] font-medium text-foreground">
              Mobile number
            </Label>
            <PhoneInput
              id="mobile"
              value={mobile}
              onValueChange={setMobile}
              autoFocus
              required
            />
          </div>

          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={busy || !mobileValid}
            className="mt-2 h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <AppLoader size={16} className="mr-2" />
                Checking…
              </>
            ) : (
              "Continue"
            )}
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

      {stage === "password" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canReset && !busy) advance("done");
          }}
          className="flex flex-col gap-5"
        >
          <NewPasswordFields
            password={password}
            confirm={confirm}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
            autoFocus
          />

          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={busy || !canReset}
            className="mt-2 h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <AppLoader size={16} className="mr-2" />
                Resetting…
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>
      )}

      {stage === "no_match" && (
        <div className="flex flex-col gap-3">
          <Button variant="default" size="lg" onClick={retrySelfie} className="h-11 w-full text-[14px]">
            Try again
          </Button>
          <p className="text-center text-[12.5px] text-muted-foreground">
            <span className="tabular">{MAX_SELFIE_ATTEMPTS - failedAttempts}</span>{" "}
            {MAX_SELFIE_ATTEMPTS - failedAttempts === 1 ? "try" : "tries"} left before we ask you to visit a branch
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
            onClick={() => router.push("/login")}
            className="h-11 w-full text-[14px]"
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
          className="h-11 w-full text-[14px]"
        >
          Back to login
        </Button>
      )}
    </AuthLayout>
  );
}
