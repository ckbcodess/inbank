"use client";

/**
 * Stand-in for the card issuer's 3-D Secure page. In production the customer's own bank hosts this; the app
 * hands off to it and waits for the redirect back. Every flow that takes money from a card, or links a card,
 * comes here (see `lib/card-payment.ts` and `lib/card-link.ts`). Kept deliberately outside the customer shell
 * (no sidebar, no GCB chrome) so it reads as "you're with your bank now".
 *
 * Demo: any 6 digits approve; 000000 shows the wrong-code state; Cancel returns without taking anything.
 */

import { InlineError } from "@/components/ui/inline-error";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLoader } from "@/components/ui/loader";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { NetworkLogo } from "@/components/cards/NetworkLogo";
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

const NETWORK_SECURE_NAME: Record<string, string> = {
  Visa: "Visa Secure",
  Mastercard: "Mastercard Identity Check",
  UnionPay: "UnionPay Secure",
};

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

  const secureName = pending ? NETWORK_SECURE_NAME[pending.network] : undefined;

  return (
    <div data-auth-shell className="flex min-h-dvh w-full flex-col bg-muted/40 text-foreground">
      <header className="flex h-14 items-center justify-center gap-2 border-b border-border bg-card px-4 text-[13px] text-muted-foreground">
        <Lock size={14} strokeWidth={1.9} aria-hidden="true" />
        {secureName ?? "Secure card verification"}
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 sm:p-8">
          {!pending && step !== "verified" ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-[14px] text-muted-foreground">There&apos;s nothing waiting to be verified.</p>
              <Button type="button" onClick={() => router.replace("/overview")} className="h-11 w-full rounded-xl">
                Back to GCB
              </Button>
            </div>
          ) : step === "verified" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success-text">
                <CheckCircle2 size={26} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h1 className="text-[18px] tracking-[-0.01em]">{isPayment ? "Payment approved" : "Card verified"}</h1>
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
                  {isPayment
                    ? "GCB Bank is asking your bank to approve this payment. Enter the code we sent to the phone number on your card account."
                    : "GCB Bank wants to link your card. Enter the code we sent to the phone number on your card account."}
                </p>
              </div>

              <dl className="flex flex-col gap-2.5 rounded-xl bg-muted/60 p-4 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Card</dt>
                  <dd className="flex items-center gap-1.5 tabular">
                    {pending?.network === "Card" ? (
                      <CreditCard size={15} strokeWidth={1.8} aria-hidden="true" className="text-muted-foreground" />
                    ) : (
                      <NetworkLogo scheme={pending?.network ?? "Visa"} className="h-3 text-foreground" />
                    )}
                    •••• {pending?.last4}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Merchant</dt>
                  <dd>{paying?.merchant ?? "GCB Bank"}</dd>
                </div>
                {paying && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">For</dt>
                    <dd className="text-right">{paying.description}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="tabular">
                    {paying ? formatMoney(paying.amount, paying.currency, true) : "GHS 0.00 · card check only"}
                  </dd>
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

                <InlineError message={step === "error" && "That code didn’t match. Check the latest message from your bank and try again."} />

                <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    disabled={digits.join("").length < OTP_LENGTH}
                    loading={step === "verifying"}
                    className="h-11 w-full rounded-xl"
                  >
                    {isPayment ? "Approve payment" : "Verify"}
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
        Demo: any 6 digits approve · 000000 shows an error
      </p>
    </div>
  );
}
