"use client";

/**
 * Stand-in for the card issuer's 3-D Secure page. In production the customer's
 * own bank hosts this; the app hands off to it and waits for the redirect back.
 * Kept deliberately outside the customer shell (no sidebar, no GCB chrome) so
 * it reads as "you're with your bank now".
 *
 * Demo: any 6 digits verify; 000000 shows the error state.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLoader } from "@/components/ui/loader";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { useCardLink } from "@/lib/card-link";

type Step = "code" | "verifying" | "error" | "verified";

export default function CardVerificationPage() {
  const router = useRouter();
  const pending = useCardLink((s) => s.pending);
  const complete = useCardLink((s) => s.complete);

  // sessionStorage is only readable after mount; render nothing until then so
  // a real pending card never flashes "nothing to verify".
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const api = useCardLink.persist;
    if (!api || api.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return api.onFinishHydration(() => setHydrated(true));
  }, []);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [step, setStep] = useState<Step>("code");

  function verify(code: string) {
    if (step === "verifying" || step === "verified") return;
    setStep("verifying");
    window.setTimeout(() => {
      if (code === "000000") {
        setStep("error");
        setDigits(Array(OTP_LENGTH).fill(""));
        return;
      }
      setStep("verified");
      window.setTimeout(() => router.replace(complete(true)), 1400);
    }, 900);
  }

  function cancel() {
    router.replace(complete(false));
  }

  if (!hydrated) return <div className="min-h-dvh bg-background" />;

  return (
    <div className="flex min-h-dvh w-full flex-col bg-muted/40 text-foreground">
      <header className="flex h-14 items-center justify-center gap-2 border-b border-border bg-card px-4 text-[13px] text-muted-foreground">
        <Lock size={14} strokeWidth={1.9} aria-hidden="true" />
        Secure card verification
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 sm:p-8">
          {!pending && step !== "verified" ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-[14px] text-muted-foreground">There&apos;s no card waiting to be verified.</p>
              <Button type="button" onClick={() => router.replace("/accounts")} className="h-11 w-full rounded-xl">
                Back to GCB
              </Button>
            </div>
          ) : step === "verified" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={26} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h1 className="text-[18px] tracking-[-0.01em]">Card verified</h1>
              <p className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
                <AppLoader size={14} />
                Taking you back to GCB…
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[20px] tracking-[-0.015em]">Confirm it&apos;s you</h1>
                <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                  GCB Bank wants to link your card. Enter the code we sent to the phone number on your card account.
                </p>
              </div>

              <dl className="flex flex-col gap-2.5 rounded-xl bg-muted/60 p-4 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Card</dt>
                  <dd className="flex items-center gap-1.5 tabular">
                    <CreditCard size={15} strokeWidth={1.8} aria-hidden="true" className="text-muted-foreground" />
                    {pending?.network} •••• {pending?.last4}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Merchant</dt>
                  <dd>GCB Bank</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="tabular">GHS 0.00 · card check only</dd>
                </div>
              </dl>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const code = digits.join("");
                  if (code.length === OTP_LENGTH) verify(code);
                }}
                className="flex flex-col gap-5"
              >
                <OtpInput
                  value={digits}
                  onChange={(next) => {
                    setDigits(next);
                    if (step === "error") setStep("code");
                  }}
                  onComplete={verify}
                  disabled={step === "verifying"}
                  invalid={step === "error"}
                />

                {step === "error" && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive"
                  >
                    <AlertCircle size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
                    <span>That code didn&apos;t match. Check the latest message from your bank and try again.</span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    disabled={step === "verifying" || digits.join("").length < OTP_LENGTH}
                    className="h-11 w-full rounded-xl"
                  >
                    {step === "verifying" ? "Verifying…" : "Verify"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancel}
                    disabled={step === "verifying"}
                    className="text-[13px] text-muted-foreground"
                  >
                    Cancel and return to GCB
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <p className="pb-6 text-center text-[12px] text-muted-foreground">
        Demo: any 6 digits verify · 000000 shows an error
      </p>
    </div>
  );
}
