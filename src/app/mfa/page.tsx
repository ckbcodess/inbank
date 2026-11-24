"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Laptop, MapPin } from "@/components/ui/icons";
import { AlertToast } from "@/components/ui/alert-toast";
import { InlineError } from "@/components/ui/inline-error";
import { AppLoader } from "@/components/ui/loader";
import AuthLayout from "@/components/auth/AuthLayout";
import SelfieCapture from "@/components/auth/SelfieCapture";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { OtpHelp } from "@/components/payments/OtpHelp";
import { OTP_SHORTCODE, REGISTERED_PHONE, useAuthorisation } from "@/components/payments/useAuthorisation";
import { useBusinessTheme } from "@/lib/business-theme";
import { isBusinessProfile } from "@/lib/profile";
import { homePathForProfile } from "@/lib/navigation";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import { setNewDeviceSignIn, thisDeviceName } from "@/lib/device-trust";

type Stage = "selfie" | "code";

/**
 * Verification for a log-in from a browser we don't know. Two steps, both before the customer is in: a selfie, then the
 * one-time code sent to their phone. The copy says why, so the person can tell whether it was them.
 *
 * Prototype: the selfie always matches, and the demo code is 000000 (see `useAuthorisation`). A real bank matches the
 * selfie against the Ghana Card photo on file, and has a retry and branch path for a mismatch (not built yet).
 */
function NewDeviceContent() {
  const router = useRouter();
  const { actor, verifyMfa } = useSession();
  // A business login stays in smoke ash through the verification steps.
  useBusinessTheme(isBusinessProfile(actor?.profiles[0]));
  const auth = useAuthorisation("otp");
  const hydrated = useSessionHydrated();

  const [stage, setStage] = useState<Stage>("selfie");
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [checkingSelfie, setCheckingSelfie] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [shortcodeOpen, setShortcodeOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !actor) router.replace("/login");
  }, [hydrated, actor, router]);

  function handleSelfie(image: string) {
    setSelfieImage(image);
    setCheckingSelfie(true);
    window.setTimeout(() => {
      setCheckingSelfie(false);
      setStage("code");
    }, 800);
  }

  function handleComplete(code: string) {
    if (!actor || verifying || !auth.verify(code)) return;
    setVerifying(true);
    window.setTimeout(() => {
      setNewDeviceSignIn(thisDeviceName());
      verifyMfa();
      router.push(actor.shell === "admin" ? "/admin" : homePathForProfile(actor.profiles[0]));
    }, 500);
  }

  if (!hydrated || !actor) return null;

  const isCode = stage === "code";

  return (
    <AuthLayout
      title={isCode ? "Enter Your Code" : "Confirm It’s You"}
      description={
        isCode ? (
          <>
            We sent a 6-digit code to <span className="tabular whitespace-nowrap text-foreground">{REGISTERED_PHONE}</span>
          </>
        ) : (
          "We noticed you are trying to login from a different device. For your account security, complete the verification process to proceed."
        )
      }
      swap={isCode ? { show: shortcodeOpen, title: <a href={`tel:${OTP_SHORTCODE.replace("#", "%23")}`}>{OTP_SHORTCODE}</a>, description: "Dial it on your phone to see your code" } : undefined}
      onBack={
        isCode
          ? () => {
              setSelfieImage(null);
              setStage("selfie");
            }
          : undefined
      }
      backHref={isCode ? undefined : "/login"}
      backLabel={isCode ? "Back" : "Back to login"}
    >
      {/* What we saw: so the person can tell if it was them. */}
      {!isCode && (
        <div data-tour="mfa-device-info" className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-left space-y-2">
          <div className="flex items-center gap-2 text-body font-medium text-foreground">
            <Laptop size={17} className="text-primary" />
            <span>{thisDeviceName()}</span>
          </div>
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <MapPin size={15} />
            <span>Accra, Greater Accra · IP 154.160.22.84</span>
          </div>
        </div>
      )}

      {!isCode ? (
        <SelfieCapture
          onCapture={handleSelfie}
          busy={checkingSelfie}
          capturedImage={selfieImage}
          onRetake={() => setSelfieImage(null)}
          dataTour="mfa-selfie"
        />
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div data-tour="mfa-code">
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
          </div>

          <InlineError
            message={auth.state === "error" ? "That code isn’t right or has expired. Resend it below." : undefined}
            className="-mt-2"
          />
          <AlertToast when={auth.state === "resent"} kind="success" message={`A new 6-digit code has been sent to ${REGISTERED_PHONE}.`} />

          {verifying ? (
            <div className="flex items-center justify-center gap-2 text-body text-muted-foreground">
              <AppLoader size={16} />
              <span>Logging you in...</span>
            </div>
          ) : (
            <OtpHelp resend={auth.resend} onResend={auth.requestResend} shortcodeOpen={shortcodeOpen} onShortcodeOpenChange={setShortcodeOpen} />
          )}
        </div>
      )}
    </AuthLayout>
  );
}

export default function MfaPage() {
  return <NewDeviceContent />;
}
