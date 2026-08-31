"use client";

/**
 * Activation — first-time enrolment into internet banking.
 *
 * Three screens for retail, two for corporate. The reasoning for what was cut
 * out of the mobile onboarding flow lives in `src/lib/activation.ts`; this file
 * is only the surface.
 *
 * Every reachable instance is addressable from the Dev Mode switcher
 * (bottom-right) so the whole flow — including the failure branches — can be
 * walked without typing through it.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  MailCheck,
  ShieldCheck,
  UserSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import DevStatePanel from "@/components/states/DevStatePanel";
import { useSession } from "@/lib/session-store";
import {
  ACTIVATION_SCENARIO_IDS,
  ACTIVATION_SCENARIO_LABELS,
  APPROVAL_OPTIONS,
  DEMO_IDENTIFIERS,
  DEMO_MOBILE,
  PASSWORD_RULES,
  demoIdentifierFor,
  findScenario,
  getCorporateInvite,
  matchIdentity,
  passwordMeetsRules,
  scenarioIdFor,
  type ActivationMatch,
  type ActivationMode,
  type ActivationStep,
  type ActivationVariant,
  type ApprovalMethod,
} from "@/lib/activation";

const RESEND_SECONDS = 30;
const MAX_CODE_ATTEMPTS = 3;
const SUPPORT_LINE = "+233 302 664 914";

export default function ActivatePage() {
  const router = useRouter();
  const { signIn, verifyMfa, selectProfile } = useSession();

  const [mode, setMode] = useState<ActivationMode>("retail");
  const [step, setStep] = useState<ActivationStep>("identify");
  const [variant, setVariant] = useState<ActivationVariant>("default");
  const [busy, setBusy] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [mobile, setMobile] = useState("");
  const [match, setMatch] = useState<ActivationMatch | null>(null);
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [approval, setApproval] = useState<ApprovalMethod>("sms");

  const invite = useMemo(() => getCorporateInvite(), []);

  /**
   * An invitation link puts the flow in corporate mode. Read from the location
   * rather than `useSearchParams`, which would force this page under a Suspense
   * boundary for a value that never changes after mount.
   */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("invite")) setMode("corporate");
  }, []);

  useEffect(() => {
    if (step !== "verify" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, countdown]);

  const destination = mode === "corporate" ? invite?.maskedMobile : match?.maskedMobile;
  const maskedEmail = mode === "corporate" ? invite?.maskedEmail : match?.maskedEmail;

  /** Jump straight to any instance of the flow, seeding whatever it needs to render. */
  const applyScenario = useCallback((id: string) => {
    const target = findScenario(id);
    if (!target) return;

    setMode(target.mode);
    setStep(target.step);
    setVariant(target.variant);
    setBusy(false);
    setResent(false);
    setAttempts(target.variant === "codeLocked" ? MAX_CODE_ATTEMPTS : 0);
    setCountdown(target.step === "verify" ? RESEND_SECONDS : 0);
    setDigits(Array<string>(OTP_LENGTH).fill(""));
    setPassword("");
    setRevealed(false);
    setApproval("sms");

    // Later steps read a matched identity, so seed one when the switcher skips
    // over the step that would normally have produced it. "Already active" is
    // seeded from the enrolled identifier so the screen shows real details.
    const needsMatch =
      (target.mode === "retail" && target.step !== "identify") ||
      target.variant === "matched" ||
      target.variant === "alreadyActive";

    if (needsMatch) {
      const seed = demoIdentifierFor(target.variant === "alreadyActive");
      setIdentifier(seed);
      setMobile(DEMO_MOBILE);
      setMatch(matchIdentity(seed, DEMO_MOBILE));
    } else if (target.step === "identify") {
      setIdentifier("");
      setMobile("");
      setMatch(null);
    }
  }, []);

  function advance(next: ActivationStep, nextVariant: ActivationVariant = "default") {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep(next);
      setVariant(nextVariant);
      if (next === "verify") setCountdown(RESEND_SECONDS);
    }, 600);
  }

  /**
   * Three outcomes, not two: no match, a match we can activate, and a match
   * that is already activated — the last one is a wrong-door, not an error.
   */
  function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      const found = matchIdentity(identifier, mobile);
      setMatch(found);
      if (!found) setVariant("notFound");
      else setVariant(found.alreadyEnrolled ? "alreadyActive" : "matched");
    }, 600);
  }

  function handleCode(code: string) {
    if (busy) return;
    // 000000 exercises the rejection path; three rejections exercise the lock.
    if (code === "000000") {
      const used = attempts + 1;
      setAttempts(used);
      setDigits(Array<string>(OTP_LENGTH).fill(""));
      setVariant(used >= MAX_CODE_ATTEMPTS ? "codeLocked" : "codeError");
      return;
    }
    setAttempts(0);
    advance("setup");
  }

  /**
   * Signing in here rather than bouncing through /mfa is deliberate: the code
   * they just entered *was* the second factor. Asking for another one in the
   * same sitting reads as the system not trusting a step it just ran.
   */
  function completeActivation() {
    const actor = mode === "corporate" ? invite?.actor : match?.actor;
    if (!actor) {
      router.push("/login");
      return;
    }
    signIn(actor);
    verifyMfa();
    const corporate = actor.profiles.find((p) => p.kind === "CORPORATE");
    if (mode === "corporate" && corporate) selectProfile(corporate);
    router.push("/overview");
  }

  const headings = resolveHeadings(mode, step, variant, destination);
  const canFinish = passwordMeetsRules(password);
  /** Terminal branches end in their own button, so the footer link would double up. */
  const cardOffersExit =
    variant === "alreadyActive" || variant === "inviteExpired" || variant === "codeLocked";

  return (
    <>
      <StateSwitcher
        section="12.1"
        states={ACTIVATION_SCENARIO_IDS}
        value={scenarioIdFor(mode, step, variant)}
        onChange={applyScenario}
        labels={ACTIVATION_SCENARIO_LABELS}
      />
      <DevStatePanel />

      <AuthLayout
        icon={headings.icon}
        title={headings.title}
        description={headings.description}
        width={step === "setup" ? "wide" : "default"}
        footer={
          step === "done" ? null : (
            <>
              {mode === "retail" &&
                step === "identify" &&
                (variant === "default" || variant === "notFound") && (
                <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                  <p className="mb-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Demo details · mobile {DEMO_MOBILE}
                  </p>
                  <div className="flex flex-col gap-1">
                    {DEMO_IDENTIFIERS.map((demo) => (
                      <button
                        key={demo.value}
                        type="button"
                        onClick={() => {
                          setIdentifier(demo.value);
                          setMobile(DEMO_MOBILE);
                          setVariant("default");
                        }}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                      >
                        <span className="text-[12px] text-foreground tabular">{demo.value}</span>
                        <span className="text-[11px] text-muted-foreground">{demo.outcome}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suppressed where the card already carries its own way out —
                  two "back to sign in" exits on one screen reads as indecision. */}
              {!cardOffersExit && (
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

              {/* Only while they're still looking — pointless once we've matched them.
                  Now that /signup exists, this can point at it directly rather than
                  shrugging the customer off to a branch. */}
              {mode === "retail" &&
                step === "identify" &&
                (variant === "default" || variant === "notFound") && (
                  <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
                    Don&apos;t bank with GCB yet?{" "}
                    <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
                      Open an account
                    </Link>{" "}
                    — it takes about five minutes.
                  </p>
                )}
            </>
          )
        }
      >
        {/* ── Identify ─────────────────────────────────────────────────────── */}
        {step === "identify" && mode === "retail" && variant !== "matched" && variant !== "alreadyActive" && (
          <form onSubmit={handleIdentify} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="identifier">Ghana Card or account number</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (variant === "notFound") setVariant("default");
                }}
                placeholder="GHA-0123456789-0"
                className="tabular"
                aria-invalid={variant === "notFound" || undefined}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mobile">Registered mobile number</Label>
              <Input
                id="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  if (variant === "notFound") setVariant("default");
                }}
                placeholder="+233 24 123 4567"
                className="tabular"
                aria-invalid={variant === "notFound" || undefined}
                required
              />
              <p className="text-[12px] text-muted-foreground">
                The number the Bank already holds for this account. We&apos;ll text a code to it.
              </p>
            </div>

            {variant === "notFound" && (
              <>
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
                >
                  <AlertCircle size={15} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
                  <span>
                    Those two details don&apos;t match an account we can activate. Check both numbers,
                    or call us on <span className="tabular">{SUPPORT_LINE}</span> and we&apos;ll sort
                    it out with you.
                  </span>
                </div>

                {/* This screen only checks the retail identifiers, so a corporate
                    invitee who lost their email would otherwise read "no match"
                    and have nowhere to go — access there is invite-only by design
                    (section 12.2), so the fix is a resend, not a form field here. */}
                <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
                  Invited by your company instead? Ask your Corporate Admin to resend the link.
                </p>
              </>
            )}

            <Button
              type="submit"
              disabled={busy || identifier.trim() === "" || mobile.trim() === ""}
              className="mt-1 w-full"
            >
              {busy ? (
                <>
                  <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                  Checking…
                </>
              ) : (
                <>
                  <UserSearch size={15} strokeWidth={1.9} aria-hidden="true" />
                  Find my account
                </>
              )}
            </Button>
          </form>
        )}

        {step === "identify" && mode === "retail" && variant === "matched" && match && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-y-3 text-[13px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="text-foreground">{match.actor.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Account</dt>
                <dd className="text-foreground tabular">{match.accountLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Mobile</dt>
                <dd className="text-foreground tabular">{match.maskedMobile}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate text-foreground">{match.maskedEmail}</dd>
              </div>
            </dl>

            <p className="border-t border-border pt-4 text-[12px] leading-relaxed text-muted-foreground">
              We&apos;ve hidden part of each detail for your security. Nothing is sent until you tap
              below.
            </p>

            <Button onClick={() => advance("verify")} disabled={busy} className="w-full">
              {busy ? (
                <>
                  <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                  Sending code…
                </>
              ) : (
                <>
                  <MailCheck size={15} strokeWidth={1.9} aria-hidden="true" />
                  Send code to {match.maskedMobile}
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setVariant("default");
                setMatch(null);
                setIdentifier("");
                setMobile("");
              }}
              className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Not you? Use different details
            </button>
          </div>
        )}

        {step === "identify" && mode === "retail" && variant === "alreadyActive" && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Internet banking is already switched on{" "}
              {match ? (
                <>
                  for <span className="text-foreground tabular">{match.accountLabel}</span>
                </>
              ) : (
                "for this account"
              )}
              , so there&apos;s nothing to activate. Sign in with your password — or reset it if you
              can&apos;t remember it.
            </p>
            <Button nativeButton={false} render={<Link href="/login" />} className="w-full">
              Sign in
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/forgot-password" />}
              variant="outline"
              className="w-full"
            >
              Reset my password
            </Button>
          </div>
        )}

        {step === "identify" && mode === "corporate" && variant !== "inviteExpired" && invite && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-y-3 text-[13px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Company</dt>
                <dd className="text-foreground">{invite.company}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Your role</dt>
                <dd className="text-foreground">{invite.roleLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Invited by</dt>
                <dd className="text-foreground">{invite.invitedBy}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Invitation expires</dt>
                <dd className="text-foreground tabular">in {invite.expiresIn}</dd>
              </div>
            </dl>

            <p className="border-t border-border pt-4 text-[12px] leading-relaxed text-muted-foreground">
              Your role and what you can approve were set by {invite.invitedBy}. You only need to
              confirm it&apos;s you and choose a password.
            </p>

            <Button onClick={() => advance("verify")} disabled={busy} className="w-full">
              {busy ? (
                <>
                  <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                  Sending code…
                </>
              ) : (
                <>
                  <MailCheck size={15} strokeWidth={1.9} aria-hidden="true" />
                  Send code to {invite.maskedMobile}
                </>
              )}
            </Button>

            <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
              Not you, or not this company? Call us on{" "}
              <span className="tabular text-foreground">{SUPPORT_LINE}</span> before continuing.
            </p>
          </div>
        )}

        {step === "identify" && mode === "corporate" && variant === "inviteExpired" && invite && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Invitations last 7 days so an unused link can&apos;t sit around. Ask{" "}
              {invite.invitedBy} to send a new one from Administration — it arrives in a couple of
              minutes. Nothing about your access has changed.
            </p>
            <Button nativeButton={false} render={<Link href="/login" />} className="w-full">
              Back to sign in
            </Button>
            <p className="text-center text-[12px] text-muted-foreground">
              Or call us on <span className="tabular text-foreground">{SUPPORT_LINE}</span>.
            </p>
          </div>
        )}

        {/* ── Verify ───────────────────────────────────────────────────────── */}
        {step === "verify" && variant !== "codeLocked" && (
          <div className="flex flex-col gap-5">
            <OtpInput
              value={digits}
              onChange={(next) => {
                setDigits(next);
                if (variant === "codeError") setVariant("default");
                if (resent) setResent(false);
              }}
              onComplete={handleCode}
              disabled={busy}
              invalid={variant === "codeError"}
            />

            {variant === "codeError" && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
              >
                <AlertCircle size={15} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
                <span>
                  That code isn&apos;t right or has expired.{" "}
                  {MAX_CODE_ATTEMPTS - attempts === 1
                    ? "One more attempt before we pause this."
                    : `${MAX_CODE_ATTEMPTS - attempts} attempts left.`}
                </span>
              </div>
            )}

            {resent && (
              <p className="rounded-lg bg-muted px-3 py-2.5 text-center text-[13px] text-muted-foreground">
                A new code is on its way.
              </p>
            )}

            {busy && (
              <p className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
                <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                Checking your code…
              </p>
            )}

            <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
              <button
                type="button"
                disabled={countdown > 0}
                onClick={() => {
                  setCountdown(RESEND_SECONDS);
                  setResent(true);
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
              <button
                type="button"
                onClick={() => setResent(true)}
                className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Send it to {maskedEmail} instead
              </button>
            </div>
          </div>
        )}

        {step === "verify" && variant === "codeLocked" && (
          <div className="flex flex-col gap-4">
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
            >
              <Lock size={15} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
              <span>
                Three codes in a row didn&apos;t match, so we&apos;ve paused activation for 15
                minutes.
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Your account and your money are untouched — this only pauses activation. If the code
              never arrived, your registered number may be out of date, and we can check that with
              you on <span className="tabular text-foreground">{SUPPORT_LINE}</span>.
            </p>
            <Button nativeButton={false} render={<Link href="/login" />} variant="outline" className="w-full">
              Back to sign in
            </Button>
          </div>
        )}

        {/* ── Set up sign-in ───────────────────────────────────────────────── */}
        {step === "setup" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canFinish) advance("done");
            }}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={revealed ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pr-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setRevealed((r) => !r)}
                  aria-label={revealed ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {revealed ? (
                    <EyeOff size={15} strokeWidth={1.9} />
                  ) : (
                    <Eye size={15} strokeWidth={1.9} />
                  )}
                </button>
              </div>

              {/* Unmet rules stay muted rather than red — nothing has failed yet
                  while the customer is still typing their first password. */}
              <ul className="mt-1 flex flex-col gap-1.5">
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(password);
                  return (
                    <li
                      key={rule.id}
                      className={`flex items-center gap-2 text-[12px] ${
                        met ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <Check
                        size={14}
                        strokeWidth={1.9}
                        aria-hidden="true"
                        className={met ? "text-primary" : "text-muted-foreground/40"}
                      />
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            <fieldset className="flex flex-col gap-2 border-t border-border pt-5">
              <legend className="sr-only">How we check it&apos;s you when you make a payment</legend>
              <p className="text-[15px] text-foreground">Approving payments</p>
              <p className="mb-1 text-[13px] leading-relaxed text-muted-foreground">
                Signing in uses your password. Payments get a second check — pick the one that suits
                how you work.
              </p>

              {APPROVAL_OPTIONS.map((option) => {
                const selected = approval === option.id;
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                      selected
                        ? "border-[var(--active-border)] bg-[var(--active-bg)]"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="approval"
                      value={option.id}
                      checked={selected}
                      onChange={() => setApproval(option.id)}
                      className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[13px] text-foreground tabular">
                        {option.label({
                          maskedMobile: destination ?? "",
                          maskedEmail: maskedEmail ?? "",
                        })}
                      </span>
                      <span className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}

              <p className="mt-1 text-[12px] text-muted-foreground">
                You can change this at any time in Settings.
              </p>
            </fieldset>

            <Button type="submit" disabled={busy || !canFinish} className="w-full">
              {busy ? (
                <>
                  <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                  Setting up…
                </>
              ) : (
                <>
                  <KeyRound size={15} strokeWidth={1.9} aria-hidden="true" />
                  Finish and sign in
                </>
              )}
            </Button>

            {!canFinish && password.length > 0 && (
              <p className="text-center text-[12px] text-muted-foreground">
                A few requirements above still to meet.
              </p>
            )}
          </form>
        )}

        {/* ── Done ─────────────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              We&apos;ve emailed a confirmation to{" "}
              <span className="text-foreground">{maskedEmail}</span>. This activation is recorded in
              the audit log with the time and the device used.
            </p>
            <Button onClick={completeActivation} className="w-full">
              Go to my accounts
            </Button>
            <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
              Choosing a default account and statement alerts takes about two minutes — we&apos;ll
              offer that on your overview, whenever you want it.
            </p>
          </div>
        )}
      </AuthLayout>
    </>
  );
}

/* ── Headings ──────────────────────────────────────────────────────────────── */

function resolveHeadings(
  mode: ActivationMode,
  step: ActivationStep,
  variant: ActivationVariant,
  destination?: string,
) {
  if (step === "done") {
    return {
      icon: CheckCircle2,
      title: "You're in",
      description: "Your accounts are ready.",
    };
  }

  if (step === "setup") {
    return {
      icon: KeyRound,
      title: "Set up how you sign in",
      description: "One password to get in, and one way to approve payments.",
    };
  }

  if (step === "verify") {
    if (variant === "codeLocked") {
      return {
        icon: Lock,
        title: "Activation paused",
        description: "Nothing has changed on your account.",
      };
    }
    return {
      icon: ShieldCheck,
      title: "Enter the code we sent",
      description: (
        <>
          6-digit code sent to <span className="tabular">{destination}</span>. It expires in 5
          minutes.
        </>
      ),
    };
  }

  if (mode === "corporate") {
    return variant === "inviteExpired"
      ? {
          icon: Building2,
          title: "This invitation has expired",
          description: "It only takes a moment to get a new one.",
        }
      : {
          icon: Building2,
          title: "You've been invited to NIBS",
          description: "Confirm it's you, and you're in.",
        };
  }

  if (variant === "alreadyActive") {
    return {
      icon: CheckCircle2,
      title: "You're already set up",
      description: "This account has internet banking switched on.",
    };
  }

  if (variant === "matched") {
    return {
      icon: UserSearch,
      title: "We found you",
      description: "Check these are yours before we send a code.",
    };
  }

  return {
    icon: UserSearch,
    title: "Let's find your account",
    description: "Two numbers we already hold — then a code, then you're in.",
  };
}
