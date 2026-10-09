"use client";

/**
 * Stand-in for the card issuer's 3-D Secure page. In production the customer's own bank hosts this; the app
 * hands off to it and waits for the redirect back. Every flow that takes money from a card, or links a card,
 * comes here (see `lib/card-payment.ts` and `lib/card-link.ts`). Kept deliberately outside the customer shell
 * (no sidebar, no GCB chrome) so it reads as "you're with your bank now".
 *
 * Demo: any 6 digits approve; 000000 shows the wrong-code state; Cancel returns without taking anything.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLoader } from "@/components/ui/loader";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { InlineError } from "@/components/ui/inline-error";
import { useCardLink } from "@/lib/card-link";
import { useCardPayment } from "@/lib/card-payment";
import { formatMoney } from "@/lib/mock-data";

type Step = "code" | "verifying" | "error" | "verified";

/** Resolves once a persisted store has read sessionStorage, so a real pending item never flashes "nothing waiting". */
function useHydrated(...stores: { persist?: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } }[]) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const waiting = stores.filter((s) => s.persist && !s.persist.hasHydrated());
    if (waiting.length === 0) {
      setHydrated(true);
      return;
    }
    let left = waiting.length;
    const offs = waiting.map((s) =>
      s.persist!.onFinishHydration(() => {
        left -= 1;
        if (left === 0) setHydrated(true);
      }),
    );
    return () => offs.forEach((off) => off());
    // The stores are module singletons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return hydrated;
}

export default function CardVerificationPage() {
  const router = useRouter();
  const linking = useCardLink((s) => s.pending);
  const completeLink = useCardLink((s) => s.complete);
  const paying = useCardPayment((s) => s.pending);
  const completePayment = useCardPayment((s) => s.complete);
  const hydrated = useHydrated(useCardLink, useCardPayment);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [step, setStep] = useState<Step>("code");

  const pending = paying ?? linking;
  const isPayment = Boolean(paying);

  function finish(approved: boolean) {
    return isPayment ? completePayment(approved) : completeLink(approved);
  }

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
      window.setTimeout(() => router.replace(finish(true)), 1400);
    }, 900);
  }

  function cancel() {
    router.replace(finish(false));
  }

  if (!hydrated) return <div className="min-h-dvh bg-background" />;

  const last4 = pending?.last4 ?? "2222";
  const merchant = paying?.merchant ?? "GCB Bank PLC";
  const description = paying?.description ?? (isPayment ? "Fund your GCB account" : "Link card to GCB account");
  const amountStr = paying ? formatMoney(paying.amount, paying.currency, true) : "GHS 100.00";

  return (
    <div data-auth-shell className="flex min-h-dvh w-full flex-col bg-muted/30 dark:bg-background text-foreground">
      {/* Top Lock Header */}
      <header className="flex h-14 items-center justify-center gap-1.5 px-4 text-[13px] text-muted-foreground">
        <Lock size={13.5} strokeWidth={1.8} aria-hidden="true" />
        <span>Secure card verification</span>
      </header>

      {/* Main Card View */}
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="relative w-full max-w-[430px] rounded-3xl border border-border/80 bg-card p-7 sm:p-9 shadow-sm flex flex-col items-center text-center">
          {step !== "verified" && (
            <button
              type="button"
              onClick={cancel}
              disabled={step === "verifying"}
              aria-label="Close"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-40"
            >
              <X size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}

          {step === "verified" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success-text">
                <CheckCircle2 size={28} strokeWidth={2} aria-hidden="true" />
              </div>
              <h1 className="text-[20px] font-medium tracking-tight">{isPayment ? "Payment approved" : "Card verified"}</h1>
              <p className="flex items-center gap-2 text-[13.5px] text-muted-foreground mt-1">
                <AppLoader size={14} />
                Taking you back to GCB…
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Bank Logo / Mark */}
              <div className="flex flex-col items-center gap-2.5 mb-6">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-[#00E599] text-black shadow-sm select-none">
                  <span className="text-[28px] font-bold leading-none tracking-tight">U</span>
                </div>
                <span className="text-[17px] font-medium text-foreground tracking-[-0.01em]">UX Bank</span>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col items-center gap-1.5 text-center mb-6">
                <h1 className="text-[22px] font-medium tracking-tight text-foreground">Confirm it&apos;s you</h1>
                <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-muted-foreground">
                  A request to approve this payment has been created.
                  <br />
                  Enter the code to confirm.
                </p>
              </div>

              {/* Transaction Details Inset */}
              <dl className="w-full flex flex-col gap-3 rounded-2xl bg-muted/50 dark:bg-muted/30 p-4 sm:p-5 text-[13px] mb-6">
                <div className="flex items-center justify-between gap-3 text-left">
                  <dt className="text-muted-foreground">Card</dt>
                  <dd className="flex items-center gap-1.5 tabular font-medium text-foreground">
                    <CreditCard size={14} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
                    <span>•••• {last4}</span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 text-left">
                  <dt className="text-muted-foreground">Merchant</dt>
                  <dd className="font-medium text-foreground">{merchant}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 text-left">
                  <dt className="text-muted-foreground">For</dt>
                  <dd className="font-medium text-foreground text-right">{description}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 text-left">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-medium tabular text-foreground">{amountStr}</dd>
                </div>
              </dl>

              {/* OTP Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const code = digits.join("");
                  if (code.length === OTP_LENGTH) verify(code);
                }}
                className="w-full flex flex-col gap-5"
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
                  <InlineError message="That code didn’t match. Check the latest message from your bank and try again." />
                )}

                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={digits.join("").length < OTP_LENGTH}
                    loading={step === "verifying"}
                    className="h-11 w-full rounded-xl text-[14px] font-medium"
                  >
                    Approve payment
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
