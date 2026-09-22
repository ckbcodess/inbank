"use client";

/**
 * Password Reset — BRD FR-31.
 *
 * "The system shall allow customers to reset passwords using OTP or other
 * Bank-approved verification methods… Customers can reset their passwords after
 * successful verification, and all activities are logged."
 *
 * Three stages: identify → verify OTP → set a new password. Two deliberate
 * security properties:
 *
 *  - The identify step never confirms whether an account exists. It always
 *    advances with the same wording, so this screen can't be used to enumerate
 *    customers.
 *  - Every stage states that the activity is logged, matching FR-31's
 *    acceptance criterion and section 8's audit promise.
 *
 * Sits outside both shells — it is reached from Login, before authentication.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Landmark,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { PASSWORD_RULES } from "@/lib/activation";

type Stage = "identify" | "verify" | "reset" | "done";

/**
 * Rules live in one place with activation — a reset that enforces a different
 * standard from enrolment is how the two quietly drift apart.
 */
function passwordIssues(pw: string): string[] {
  return PASSWORD_RULES.filter((r) => !r.test(pw)).map((r) => r.label.toLowerCase());
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("identify");
  const [busy, setBusy] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [codeError, setCodeError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const issues = passwordIssues(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const canReset = password.length > 0 && issues.length === 0 && !mismatch && confirm.length > 0;

  function advance(next: Stage) {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStage(next);
    }, 600);
  }

  function handleVerify(e?: React.FormEvent, incomingCode?: string) {
    if (e) e.preventDefault();
    const codeToVerify = incomingCode ?? digits.join("");
    if (codeToVerify.length !== 6 || busy) return;

    if (codeToVerify === "000000") {
      setCodeError(true);
      setDigits(Array(OTP_LENGTH).fill(""));
      return;
    }
    setCodeError(false);
    advance("reset");
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 pt-20 pb-12 sm:pt-24 sm:pb-16">
      <div className="w-full max-w-[480px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            {stage === "done" ? (
              <CheckCircle2 size={24} strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <Landmark size={24} strokeWidth={1.9} aria-hidden="true" />
            )}
          </div>
          <h1 className="text-[24px] sm:text-[26px] font-medium leading-tight tracking-[-0.02em] text-foreground">
            {stage === "identify" && "Reset your password"}
            {stage === "verify" && "Verify it's you"}
            {stage === "reset" && "Choose a new password"}
            {stage === "done" && "Password updated"}
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            {stage === "identify" &&
              "We'll send a one-time code to the contact details registered on your profile."}
            {stage === "verify" && "Enter the 6-digit code we just sent you."}
            {stage === "reset" && "Pick something you haven't used on this account before."}
            {stage === "done" && "You can now sign in with your new password."}
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-7 sm:p-9 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          {stage === "identify" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                advance("verify");
              }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="identifier" className="text-[13.5px] font-medium text-foreground">
                  Email or user ID
                </Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="username"
                  className="h-11 text-[14.5px]"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                disabled={busy || identifier.trim() === ""}
                className="mt-2 h-11 w-full text-[14px]"
              >
                {busy ? (
                  <>
                    <AppLoader size={16} className="mr-2" />
                    Sending code…
                  </>
                ) : (
                  <>
                    <MailCheck size={16} strokeWidth={1.9} className="mr-2" aria-hidden="true" />
                    Send one-time code
                  </>
                )}
              </Button>
            </form>
          )}

          {stage === "verify" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify();
              }}
              className="flex flex-col gap-6"
            >
              <div>
                <OtpInput
                  value={digits}
                  onChange={(next) => {
                    setDigits(next);
                    if (codeError) setCodeError(false);
                  }}
                  onComplete={(c) => handleVerify(undefined, c)}
                  disabled={busy}
                  invalid={codeError}
                  autoFocus
                />
              </div>

              {busy && (
                <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
                  <AppLoader size={16} />
                  <span>Verifying code...</span>
                </div>
              )}

              {codeError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3.5 text-[13px] text-destructive"
                >
                  <AlertCircle size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
                  <span>That code isn&apos;t valid or has expired. Request a new code or enter any other 6 digits.</span>
                </div>
              )}

              <div className="mt-2 flex flex-col items-center gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setDigits(Array(OTP_LENGTH).fill(""));
                    setCodeError(false);
                    setStage("identify");
                  }}
                  className="text-center text-[12.5px] text-muted-foreground transition-colors hover:text-foreground underline underline-offset-4 cursor-pointer"
                >
                  Use a different email or user ID
                </button>
              </div>
            </form>
          )}

          {stage === "reset" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canReset) advance("done");
              }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-password" className="text-[13.5px] font-medium text-foreground">
                  New password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-11 text-[14.5px]"
                  required
                />
                {/* Inline requirements, stated up front rather than only on failure. */}
                <p className="text-[12.5px] text-muted-foreground">
                  {password.length === 0
                    ? "Needs 12+ characters, upper and lower case, a number and a symbol."
                    : issues.length > 0
                      ? `Still needs ${issues.join(", ")}.`
                      : "Meets all requirements."}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-password" className="text-[13.5px] font-medium text-foreground">
                  Confirm new password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-11 text-[14.5px]"
                  aria-invalid={mismatch || undefined}
                  required
                />
                {mismatch && (
                  <p className="text-[12.5px] text-destructive">Both passwords must match.</p>
                )}
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                disabled={busy || !canReset}
                className="mt-2 h-11 w-full text-[14px]"
              >
                {busy ? (
                  <>
                    <AppLoader size={16} className="mr-2" />
                    Updating…
                  </>
                ) : (
                  <>
                    <KeyRound size={16} strokeWidth={1.9} className="mr-2" aria-hidden="true" />
                    Update password
                  </>
                )}
              </Button>
            </form>
          )}

          {stage === "done" && (
            <div className="flex flex-col gap-5">
              <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                Your password was changed and every active session was signed out. This reset has
                been written to the audit log.
              </p>
              <Button
                variant="default"
                size="lg"
                onClick={() => router.push("/login")}
                className="h-11 w-full text-[14px]"
              >
                Back to sign in
              </Button>
            </div>
          )}
        </div>

        {stage !== "done" && (
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
              Back to sign in
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-[12px] leading-relaxed text-muted-foreground">
          For your security, every password reset attempt is recorded with the time and the device
          used.
        </p>
      </div>
    </div>
  );
}
