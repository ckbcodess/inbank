"use client";

import { AlertToast } from "@/components/ui/alert-toast";
import { InlineError } from "@/components/ui/inline-error";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Laptop, MapPin, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import { maskEmail, maskMobile } from "@/lib/auth-shared";
import { displayGhanaMobile } from "@/lib/phone";

type MfaState = "entry" | "verifying" | "error" | "resent";

const CODE_LENGTH = OTP_LENGTH;
const RESEND_SECONDS = 30;

function MfaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewDevice = searchParams.get("device") === "new";

  const { actor, verifyMfa } = useSession();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [state, setState] = useState<MfaState>("entry");
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [target, setTarget] = useState<"sms" | "email">("sms");
  // Opt-in: remembering a device on a shared or public computer is a real risk.
  const hydrated = useSessionHydrated();

  useEffect(() => {
    if (hydrated && !actor) router.replace("/login");
  }, [hydrated, actor, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  const code = digits.join("");
  const complete = code.length === CODE_LENGTH && digits.every(Boolean);

  function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!complete || !actor || state === "verifying") return;
    setState("verifying");

    window.setTimeout(() => {
      // Any 6 digits verify except 000000, which demonstrates the error path.
      if (code === "000000") {
        setState("error");
        setDigits(Array(CODE_LENGTH).fill(""));
        return;
      }

      verifyMfa();
      // Remembered: next time the login screen greets them and skips this code.

      if (actor.shell === "admin") {
        router.push("/admin");
      } else {
        router.push("/overview");
      }
    }, 700);
  }

  // Auto-verify when all digits are entered
  useEffect(() => {
    if (complete && state === "entry" && actor) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, state, actor]);

  if (!hydrated || !actor) return null;

  const maskedDestination = target === "sms" ? maskMobile(displayGhanaMobile(actor.phone)) : maskEmail(actor.email);

  return (
    <AuthLayout
      icon={isNewDevice ? ShieldAlert : ShieldCheck}
      title={isNewDevice ? "New device authorization" : "Verify Your Identity"}
      description={
        isNewDevice ? (
          <>We detected a login from an unrecognized browser or device.<br />A 6-digit code has been sent to {maskedDestination}. Please enter the code below.</>
        ) : (
          <>A 6-digit code has been sent to {maskedDestination}.<br />Please enter the code below.</>
        )
      }
      backHref="/login"
      backLabel="Back to login"
    >
      {/* New Device Information Card (if applicable) */}
      {isNewDevice && (
        <div data-tour="mfa-device-info" className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left space-y-2.5">
          <div className="flex items-center gap-2.5 text-[13.5px] font-medium text-foreground">
            <Laptop size={17} className="text-primary" />
            <span>Windows PC · Google Chrome</span>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <MapPin size={15} />
            <span>Accra, Greater Accra · IP 154.160.22.84</span>
          </div>
        </div>
      )}

      <form onSubmit={handleVerify} className="flex flex-col gap-6">
        <div data-tour="mfa-otp">
          <OtpInput
            value={digits}
            onChange={(next) => {
              setDigits(next);
              if (state === "error") setState("entry");
            }}
            disabled={state === "verifying"}
            invalid={state === "error"}
          />
        </div>

        {/* Recovery path */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 text-[13px]">
          <button
            type="button"
            disabled={countdown > 0}
            onClick={() => {
              setCountdown(RESEND_SECONDS);
              setState("resent");
            }}
            className="cursor-pointer text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
          >
            {countdown > 0 ? (
              <>
                Resend in <span className="tabular">{countdown}s</span>
              </>
            ) : (
              "Resend code"
            )}
          </button>
          <span className="text-muted-foreground/60" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => {
              setTarget(target === "sms" ? "email" : "sms");
              setCountdown(RESEND_SECONDS);
              setDigits(Array(CODE_LENGTH).fill(""));
              setState("resent");
            }}
            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
          >
            Send to {target === "sms" ? "email instead" : "SMS instead"}
          </button>
        </div>

        {state === "verifying" && (
          <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
            <AppLoader size={16} />
            <span>Verifying code...</span>
          </div>
        )}

        <InlineError message={state === "error" && "That code is incorrect or has expired. Request a new one below."} className="-mt-3" />

        <AlertToast when={state === "resent"} kind="success" message={`A new verification code has been sent to ${maskedDestination}.`} />
      </form>

    </AuthLayout>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background animate-pulse" />}>
      <MfaContent />
    </Suspense>
  );
}
