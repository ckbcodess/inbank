"use client";

/**
 * S02 MFA Verification — the last shared surface (section 12.1).
 *
 * On success the credential type decides the destination:
 *   internal staff  -> Admin Portal, no Profile Selection (section 12.5)
 *   customer, 2+    -> Profile Selection (S03)
 *   customer, 1     -> straight to Banking Overview (section 12.4)
 *
 * Design direction (section 1): clearly communicate method, progress and
 * recovery.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { useSession, useSessionHydrated } from "@/lib/session-store";

type MfaState = "entry" | "verifying" | "error" | "resent";

const CODE_LENGTH = OTP_LENGTH;
const RESEND_SECONDS = 30;

export default function MfaPage() {
  const router = useRouter();
  const { actor, verifyMfa } = useSession();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [state, setState] = useState<MfaState>("entry");
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
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
      } else if (actor.profiles.length > 1) {
        router.push("/profile-selection");
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
      icon={ShieldCheck}
      title="Verify it's you"
      /* Method + destination stated explicitly */
      description={
        <span className="flex items-center justify-center gap-1.5">
          <Smartphone size={14} strokeWidth={1.9} aria-hidden="true" />
          Code sent to {maskedDestination}
        </span>
      }
      footer={
        <p className="mt-5 text-center text-[12px] text-muted-foreground">
          Enter any 6 digits to continue · use 000000 to see the error state
        </p>
      }
    >
      <form onSubmit={handleVerify} className="flex flex-col gap-5">
        <OtpInput
          value={digits}
          onChange={(next) => {
            setDigits(next);
            if (state === "error") setState("entry");
          }}
          disabled={state === "verifying"}
          invalid={state === "error"}
        />

        {state === "error" && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
          >
            <AlertCircle size={15} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
            <span>That code isn&apos;t right or has expired. Request a new one below.</span>
          </div>
        )}

        {state === "resent" && (
          <p className="rounded-lg bg-muted px-3 py-2.5 text-center text-[13px] text-muted-foreground">
            A new code is on its way.
          </p>
        )}

        <Button type="submit" disabled={!complete || state === "verifying"} className="w-full">
          {state === "verifying" ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              Verifying…
            </>
          ) : (
            "Verify"
          )}
        </Button>
      </form>

      {/* Recovery path stated clearly */}
      <div className="mt-5 flex flex-col items-center gap-2 border-t border-border pt-4">
        <button
          type="button"
          disabled={countdown > 0}
          onClick={() => {
            setCountdown(RESEND_SECONDS);
            setState("resent");
          }}
          className="text-[13px] text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {countdown > 0 ? (
            <>
              Resend code in <span className="tabular">{countdown}s</span>
            </>
          ) : (
            "Resend code"
          )}
        </button>
        <button type="button" className="text-[12px] text-muted-foreground underline-offset-4 hover:underline">
          Use a different verification method
        </button>
      </div>
    </AuthLayout>
  );
}
