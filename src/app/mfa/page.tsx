"use client";

import { InlineError } from "@/components/ui/inline-error";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Laptop, MapPin, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput from "@/components/auth/OtpInput";
import { PIN_LENGTH } from "@/components/payments/useAuthorisation";
import { useSession, useSessionHydrated } from "@/lib/session-store";

type PinState = "entry" | "verifying" | "error";

/**
 * The step after the password: the customer's transaction PIN, not a texted code. It is the same PIN that
 * authorises payments, so there is nothing new to remember and no SMS to wait for. Sign-in is recoverable,
 * so it verifies on the last digit (a payment never does).
 */
function PinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewDevice = searchParams.get("device") === "new";

  const { actor, verifyMfa } = useSession();
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [state, setState] = useState<PinState>("entry");
  const hydrated = useSessionHydrated();

  useEffect(() => {
    if (hydrated && !actor) router.replace("/login");
  }, [hydrated, actor, router]);

  const pin = digits.join("");
  const complete = pin.length === PIN_LENGTH && digits.every(Boolean);

  function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!complete || !actor || state === "verifying") return;
    setState("verifying");

    window.setTimeout(() => {
      // Any 4 digits verify except 0000, which demonstrates the error path.
      if (pin === "0000") {
        setState("error");
        setDigits(Array(PIN_LENGTH).fill(""));
        return;
      }

      verifyMfa();
      router.push(actor.shell === "admin" ? "/admin" : "/overview");
    }, 600);
  }

  // Verify as soon as the last digit lands.
  useEffect(() => {
    if (complete && state === "entry" && actor) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, state, actor]);

  if (!hydrated || !actor) return null;

  return (
    <AuthLayout
      icon={isNewDevice ? ShieldAlert : ShieldCheck}
      title={isNewDevice ? "New device authorization" : "Verify Your Identity"}
      description={
        isNewDevice ? (
          <>We detected a login from an unrecognized browser or device.<br />Enter your 4-digit transaction PIN to continue.</>
        ) : (
          <>Enter your 4-digit transaction PIN to continue.</>
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

      <form onSubmit={handleVerify} className="flex flex-col items-center gap-6">
        <div data-tour="mfa-pin">
          <OtpInput
            value={digits}
            onChange={(next) => {
              setDigits(next);
              if (state === "error") setState("entry");
            }}
            length={PIN_LENGTH}
            mask
            autoFocus
            disabled={state === "verifying"}
            invalid={state === "error"}
          />
        </div>

        {state === "verifying" && (
          <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
            <AppLoader size={16} />
            <span>Checking PIN...</span>
          </div>
        )}

        <InlineError message={state === "error" && "That PIN is incorrect. Please try again."} className="-mt-3" />
      </form>
    </AuthLayout>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background animate-pulse" />}>
      <PinContent />
    </Suspense>
  );
}
