"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Laptop, MapPin } from "lucide-react";
import { AlertToast } from "@/components/ui/alert-toast";
import { InlineError } from "@/components/ui/inline-error";
import { AppLoader } from "@/components/ui/loader";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { OtpHelp } from "@/components/payments/OtpHelp";
import { OTP_SHORTCODE, PIN_LENGTH, REGISTERED_PHONE, useAuthorisation } from "@/components/payments/useAuthorisation";
import { useSession, useSessionHydrated } from "@/lib/session-store";

/**
 * The step after the password. It runs on the same authorisation as Send & Pay (`useAuthorisation`): the
 * transaction PIN by default, a one-time code by SMS or shortcode as the way past a forgotten PIN. Sign-in is
 * recoverable, so it verifies on the last digit (a payment never does). Kept quiet on purpose: one heading, the
 * boxes, one link.
 */
function PinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewDevice = searchParams.get("device") === "new";

  const { actor, verifyMfa } = useSession();
  const auth = useAuthorisation("pin");
  const [verifying, setVerifying] = useState(false);
  const hydrated = useSessionHydrated();
  const usingPin = auth.method === "pin";
  const [shortcodeOpen, setShortcodeOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !actor) router.replace("/login");
  }, [hydrated, actor, router]);

  function handleComplete(code: string) {
    if (!actor || verifying || !auth.verify(code)) return;
    setVerifying(true);
    window.setTimeout(() => {
      verifyMfa();
      router.push(actor.shell === "admin" ? "/admin" : "/overview");
    }, 500);
  }

  if (!hydrated || !actor) return null;

  const title = !usingPin ? "Enter Your Code" : isNewDevice ? "Confirm It’s You" : "Enter Your PIN";
  const description = !usingPin ? (
    <>
      We sent a 6-digit code to <span className="tabular whitespace-nowrap text-foreground">{REGISTERED_PHONE}</span>
    </>
  ) : isNewDevice ? (
    "We don’t recognise this browser."
  ) : undefined;

  return (
    <AuthLayout
      title={title}
      description={description}
      swap={!usingPin ? { show: shortcodeOpen, title: <a href={`tel:${OTP_SHORTCODE.replace("#", "%23")}`}>{OTP_SHORTCODE}</a>, description: "Dial it on your phone to see your code" } : undefined}
      backHref="/login"
      backLabel="Back to login"
    >
      {/* New device: what we saw, so the person can tell if it was them. */}
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

      <div className="flex flex-col items-center gap-6">
        <div data-tour="mfa-pin">
          {usingPin ? (
            <OtpInput
              key="pin"
              value={auth.pin}
              onChange={auth.setPin}
              length={PIN_LENGTH}
              mask
              autoFocus
              disabled={verifying}
              invalid={auth.state === "error"}
              onComplete={(code) => window.setTimeout(() => handleComplete(code), 150)}
            />
          ) : (
            <OtpInput
              key="otp"
              value={auth.otp}
              onChange={auth.setOtp}
              length={OTP_LENGTH}
              autoFocus
              disabled={verifying}
              invalid={auth.state === "error"}
              onComplete={(code) => window.setTimeout(() => handleComplete(code), 150)}
            />
          )}
        </div>

        <InlineError
          message={
            auth.state === "error" &&
            (usingPin
              ? "That PIN isn’t right. Try again, or get a code by SMS instead."
              : "That code isn’t right or has expired. Resend it below.")
          }
          className="-mt-3"
        />
        <AlertToast when={auth.state === "resent"} kind="success" message={`A new 6-digit code has been sent to ${REGISTERED_PHONE}.`} />

        {verifying ? (
          <div className="flex items-center justify-center gap-2 text-[13.5px] text-muted-foreground">
            <AppLoader size={16} />
            <span>Logging you in...</span>
          </div>
        ) : usingPin ? (
          <Link
            href="/forgot-pin"
            className="cursor-pointer text-[13px] text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
          >
            Forgot PIN?
          </Link>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <OtpHelp resend={auth.resend} onResend={auth.requestResend} shortcodeOpen={shortcodeOpen} onShortcodeOpenChange={setShortcodeOpen} />
            <button
              type="button"
              onClick={() => auth.setMethod("pin")}
              className="cursor-pointer text-[13px] text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
            >
              Use your PIN instead
            </button>
          </div>
        )}
      </div>
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
