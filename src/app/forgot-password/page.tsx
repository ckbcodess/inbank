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
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Landmark,
  Loader2,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [code, setCode] = useState("");
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
    const codeToVerify = incomingCode ?? code;
    if (codeToVerify.length !== 6 || busy) return;

    if (codeToVerify === "000000") {
      setCodeError(true);
      return;
    }
    setCodeError(false);
    advance("reset");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            {stage === "done" ? (
              <CheckCircle2 size={22} strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <Landmark size={22} strokeWidth={1.9} aria-hidden="true" />
            )}
          </div>
          <h1 className="text-[24px] leading-tight tracking-[-0.02em] text-foreground">
            {stage === "identify" && "Reset your password"}
            {stage === "verify" && "Verify it's you"}
            {stage === "reset" && "Choose a new password"}
            {stage === "done" && "Password updated"}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {stage === "identify" &&
              "We'll send a one-time code to the contact details registered on your profile."}
            {stage === "verify" && "Enter the 6-digit code we just sent you."}
            {stage === "reset" && "Pick something you haven't used on this account before."}
            {stage === "done" && "You can now sign in with your new password."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          {stage === "identify" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                advance("verify");
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="identifier">Email or user ID</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="username"
                  required
                />
              </div>

              <Button type="submit" disabled={busy || identifier.trim() === ""} className="mt-1 w-full">
                {busy ? (
                  <>
                    <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                    Sending code…
                  </>
                ) : (
                  <>
                    <MailCheck size={15} strokeWidth={1.9} aria-hidden="true" />
                    Send one-time code
                  </>
                )}
              </Button>
            </form>
          )}

          {stage === "verify" && (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp">One-time code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setCode(val);
                    setCodeError(false);
                    if (val.length === 6) {
                      handleVerify(undefined, val);
                    }
                  }}
                  placeholder="000000"
                  className="tabular"
                  aria-invalid={codeError || undefined}
                  required
                />
                {codeError ? (
                  <p className="text-[12px] text-destructive">
                    That code isn&apos;t valid or has expired. Request a new one to continue.
                  </p>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    Sent to the contact details on your profile. It expires in 5 minutes.
                  </p>
                )}
              </div>

              <Button type="submit" disabled={busy || code.length !== 6} className="mt-1 w-full">
                {busy ? (
                  <>
                    <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} strokeWidth={1.9} aria-hidden="true" />
                    Verify code
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => setStage("identify")}
                className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Use a different email or user ID
              </button>
            </form>
          )}

          {stage === "reset" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canReset) advance("done");
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                {/* Inline requirements, stated up front rather than only on failure. */}
                <p className="text-[12px] text-muted-foreground">
                  {password.length === 0
                    ? "Needs 12+ characters, upper and lower case, a number and a symbol."
                    : issues.length > 0
                      ? `Still needs ${issues.join(", ")}.`
                      : "Meets all requirements."}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••••••"
                  aria-invalid={mismatch || undefined}
                  required
                />
                {mismatch && (
                  <p className="text-[12px] text-destructive">Both passwords must match.</p>
                )}
              </div>

              <Button type="submit" disabled={busy || !canReset} className="mt-1 w-full">
                {busy ? (
                  <>
                    <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                    Updating…
                  </>
                ) : (
                  <>
                    <KeyRound size={15} strokeWidth={1.9} aria-hidden="true" />
                    Update password
                  </>
                )}
              </Button>
            </form>
          )}

          {stage === "done" && (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Your password was changed and every active session was signed out. This reset has
                been written to the audit log.
              </p>
              <Button onClick={() => router.push("/login")} className="w-full">
                Back to sign in
              </Button>
            </div>
          )}
        </div>

        {stage !== "done" && (
          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <ArrowLeft size={13} strokeWidth={1.9} aria-hidden="true" />
              Back to sign in
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          For your security, every password reset attempt is recorded with the time and the device
          used.
        </p>
      </div>
    </div>
  );
}
