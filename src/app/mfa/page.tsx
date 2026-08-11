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

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, useSessionHydrated } from "@/lib/session-store";

type MfaState = "entry" | "verifying" | "error" | "resent";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function MfaPage() {
  const router = useRouter();
  const { actor, verifyMfa } = useSession();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [state, setState] = useState<MfaState>("entry");
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const hydrated = useSessionHydrated();
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

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

  /**
   * Accepts however many digits arrive at once. A fast typist (or an
   * autofilled OTP) can deliver several characters to a single box before
   * focus moves, so spill the extras into the following boxes instead of
   * dropping them.
   */
  function setDigit(index: number, value: string) {
    const incoming = value.replace(/\D/g, "");
    if (!incoming) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < incoming.length && index + i < CODE_LENGTH; i++) {
        next[index + i] = incoming[i];
      }
      return next;
    });

    if (state === "error") setState("entry");
    const landed = Math.min(index + incoming.length, CODE_LENGTH - 1);
    inputsRef.current[landed]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((c, i) => (next[i] = c));
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!complete || !actor || state === "verifying") return;
    setState("verifying");

    window.setTimeout(() => {
      // Any 6 digits verify except 000000, which demonstrates the error path.
      if (code === "000000") {
        setState("error");
        setDigits(Array(CODE_LENGTH).fill(""));
        inputsRef.current[0]?.focus();
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
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      {/* Left Side: Solid black background with (NIBS- First Draft) */}
      <div 
        className="w-full lg:w-1/2 min-h-[250px] lg:min-h-screen flex flex-col items-center justify-center p-8 lg:p-12 text-white shrink-0"
        style={{ backgroundColor: '#000000', color: '#ffffff' }}
      >
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-white leading-tight">
            (NIBS- First Draft)
          </h1>
        </div>
      </div>

      {/* Right Side: Form content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-5 py-12 lg:px-12 bg-[var(--surface)] min-h-screen grow">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck size={22} strokeWidth={1.9} aria-hidden="true" />
            </div>
            <h2 className="text-[24px] leading-tight tracking-[-0.02em] text-foreground">Verify it&apos;s you</h2>
            {/* Method + destination stated explicitly */}
            <p className="mt-2 flex items-center gap-1.5 text-[13px] leading-relaxed text-muted-foreground">
              <Smartphone size={14} strokeWidth={1.9} aria-hidden="true" />
              Code sent to {maskedDestination}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            <form onSubmit={handleVerify} className="flex flex-col gap-5">
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    // Intentionally no maxLength: a capped input silently drops
                    // characters typed before focus advances. setDigit spills
                    // any overflow into the following boxes instead.
                    value={d}
                    autoFocus={i === 0}
                    disabled={state === "verifying"}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    aria-label={`Digit ${i + 1}`}
                    className={`size-12 rounded-xl border bg-background text-center text-[18px] text-foreground outline-none transition-all tabular focus:border-ring focus:ring-3 focus:ring-ring/40 disabled:opacity-60 ${
                      state === "error" ? "border-destructive" : "border-border"
                    }`}
                  />
                ))}
              </div>

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
                {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
              </button>
              <button type="button" className="text-[12px] text-muted-foreground underline-offset-4 hover:underline">
                Use a different verification method
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-[12px] text-muted-foreground">
            Enter any 6 digits to continue · use 000000 to see the error state
          </p>
        </div>
      </div>
    </div>
  );
}
