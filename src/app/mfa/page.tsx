"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Laptop, Loader2, MapPin, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { useSession, useSessionHydrated } from "@/lib/session-store";

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
  const [trustDevice, setTrustDevice] = useState(true);
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

  const maskedDestination = actor.email.replace(/(.{2}).*(@.*)/, "$1•••••$2");

  return (
    <AuthLayout
      icon={isNewDevice ? ShieldAlert : ShieldCheck}
      title={isNewDevice ? "New device authorization" : "Verify your identity"}
      description={
        isNewDevice ? (
          "We detected a sign-in from an unrecognized browser or device. Enter the code sent to your phone."
        ) : (
          <span className="flex items-center justify-center gap-1.5">
            <Smartphone size={14} strokeWidth={1.9} aria-hidden="true" />
            Code sent to {maskedDestination}
          </span>
        )
      }
      footer={
        <p className="mt-5 text-center text-[12px] text-muted-foreground">
          Enter any 6 digits to continue · use 000000 to see the error state
        </p>
      }
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

        {/* Trust Device Checkbox */}
        {isNewDevice && (
          <label className="flex items-center gap-3 px-1 text-[13.5px] text-foreground cursor-pointer select-none">
            <Checkbox
              checked={trustDevice}
              onCheckedChange={(checked) => setTrustDevice(!!checked)}
            />
            <span>Trust this browser for 30 days</span>
          </label>
        )}

        {state === "verifying" && (
          <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
            <Loader2 size={16} className="animate-spin text-primary" aria-hidden="true" />
            <span>Verifying code...</span>
          </div>
        )}

        {state === "error" && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3.5 text-[13px] text-destructive"
          >
            <AlertCircle size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>The code entered is incorrect or has expired. Request a new code below.</span>
          </div>
        )}

        {state === "resent" && (
          <p className="rounded-xl bg-muted px-3.5 py-3 text-center text-[13px] text-muted-foreground">
            A new verification code has been sent to your phone.
          </p>
        )}
      </form>

      {/* Recovery path */}
      <div className="mt-6 flex flex-col items-center gap-2 border-t border-border pt-5">
        <button
          type="button"
          disabled={countdown > 0}
          onClick={() => {
            setCountdown(RESEND_SECONDS);
            setState("resent");
          }}
          className="text-[13px] text-foreground underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline cursor-pointer"
        >
          {countdown > 0 ? (
            <>
              Resend code in <span className="tabular">{countdown}s</span>
            </>
          ) : (
            "Resend code"
          )}
        </button>
      </div>
    </AuthLayout>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
      <MfaContent />
    </Suspense>
  );
}
