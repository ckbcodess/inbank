"use client";

/**
 * Signup — a brand-new individual opening a GCB account on the web.
 *
 * The reasoning for what's kept and what's cut from the mobile onboarding
 * flow lives in `src/lib/signup.ts`. Short version: this is the one retail
 * flow where Ghana Card + selfie genuinely earns its place, because there is
 * no existing account to lean on the way activation can.
 *
 * Every reachable instance is addressable from the Dev Mode switcher
 * (bottom-right).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
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
import { APPROVAL_OPTIONS, PASSWORD_RULES, maskEmail, maskMobile, passwordMeetsRules } from "@/lib/auth-shared";
import type { ApprovalMethod } from "@/lib/auth-shared";
import {
  DEMO_EXISTING_CARD,
  DEMO_NEW_CARD,
  DEMO_SIGNUP_MOBILE,
  SIGNUP_SCENARIO_IDS,
  SIGNUP_SCENARIO_LABELS,
  buildNewRetailActor,
  findSignupScenario,
  lookupGhanaCard,
  signupScenarioIdFor,
  type NiaRecord,
  type SignupStep,
  type SignupVariant,
} from "@/lib/signup";

const RESEND_SECONDS = 30;
const MAX_CODE_ATTEMPTS = 3;
const SUPPORT_LINE = "+233 302 664 914";

const DEMO_RECORD: NiaRecord = {
  cardNumber: DEMO_NEW_CARD,
  firstName: "Kwabena",
  lastName: "Asare",
  dateOfBirth: "14 Mar 1994",
};

export default function SignupPage() {
  const router = useRouter();
  const { signIn, verifyMfa } = useSession();

  const [step, setStep] = useState<SignupStep>("start");
  const [variant, setVariant] = useState<SignupVariant>("default");
  const [busy, setBusy] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [record, setRecord] = useState<NiaRecord | null>(null);
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [approval, setApproval] = useState<ApprovalMethod>("sms");

  useEffect(() => {
    if (step !== "verify" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, countdown]);

  const maskedMobile = mobile ? maskMobile(mobile) : maskMobile(DEMO_SIGNUP_MOBILE);
  const maskedEmail = email ? maskEmail(email) : undefined;

  const applyScenario = useCallback((id: string) => {
    const target = findSignupScenario(id);
    if (!target) return;

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

    const needsIdentity = target.step !== "start" && target.step !== "identity";
    if (needsIdentity || target.variant === "notFound" || target.variant === "existingCustomer") {
      if (target.variant === "existingCustomer") {
        setCardNumber(DEMO_EXISTING_CARD);
        setRecord(null);
      } else if (target.variant === "notFound") {
        setCardNumber("GHA-0000000000-0");
        setRecord(null);
      } else {
        setCardNumber(DEMO_NEW_CARD);
        setRecord(DEMO_RECORD);
      }
      setMobile(DEMO_SIGNUP_MOBILE);
      setEmail(target.step === "confirm" ? "" : "kwabena.asare@example.com");
    } else {
      setCardNumber("");
      setMobile("");
      setRecord(null);
      setEmail("");
    }
  }, []);

  function advance(next: SignupStep, nextVariant: SignupVariant = "default") {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep(next);
      setVariant(nextVariant);
      if (next === "verify") setCountdown(RESEND_SECONDS);
    }, 600);
  }

  function handleIdentity(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      const result = lookupGhanaCard(cardNumber);
      if (result.kind === "existingCustomer") {
        setVariant("existingCustomer");
        return;
      }
      if (result.kind === "notFound") {
        setVariant("notFound");
        return;
      }
      setRecord(result.record);
      setStep("confirm");
      setVariant("default");
    }, 700);
  }

  function handleSelfie() {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      // A single fixed card number demonstrates the mismatch path, same
      // convention as the OTP screens using 000000.
      if (cardNumber.trim().toUpperCase() === "GHA-0000000009-9") {
        setVariant("selfieMismatch");
        return;
      }
      advance("verify");
    }, 1100);
  }

  function handleCode(code: string) {
    if (busy) return;
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

  function completeSignup() {
    if (!record) {
      router.push("/login");
      return;
    }
    const actor = buildNewRetailActor(record, email);
    signIn(actor);
    verifyMfa();
    router.push("/overview");
  }

  const headings = resolveHeadings(step, variant, record, maskedMobile);
  const canFinish = passwordMeetsRules(password);

  return (
    <>
      <StateSwitcher
        section="12.1"
        states={SIGNUP_SCENARIO_IDS}
        value={signupScenarioIdFor(step, variant)}
        onChange={applyScenario}
        labels={SIGNUP_SCENARIO_LABELS}
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
              {step === "identity" && variant !== "existingCustomer" && (
                <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                  <p className="mb-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Demo Ghana Card numbers
                  </p>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCardNumber(DEMO_NEW_CARD);
                        setMobile(DEMO_SIGNUP_MOBILE);
                        setVariant("default");
                      }}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                    >
                      <span className="text-[12px] text-foreground tabular">{DEMO_NEW_CARD}</span>
                      <span className="text-[11px] text-muted-foreground">New — proceeds to signup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCardNumber(DEMO_EXISTING_CARD);
                        setMobile(DEMO_SIGNUP_MOBILE);
                        setVariant("default");
                      }}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                    >
                      <span className="text-[12px] text-foreground tabular">{DEMO_EXISTING_CARD}</span>
                      <span className="text-[11px] text-muted-foreground">Already a customer</span>
                    </button>
                  </div>
                </div>
              )}

              {!cardOffersExit(variant) && (
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
            </>
          )
        }
      >
        {/* ── Start ────────────────────────────────────────────────────────── */}
        {step === "start" && (
          <div className="flex flex-col gap-5">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Opening an account here means proving it&apos;s really you, the same as we would in a
              branch. Have these ready:
            </p>
            <ul className="flex flex-col gap-3">
              {[
                { icon: IdCard, text: "Your Ghana Card" },
                { icon: Camera, text: "A working camera, for a quick selfie" },
                { icon: Clock, text: "About five minutes" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[13px] text-foreground">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <Button onClick={() => advance("identity")} className="w-full">
              Let&apos;s begin
            </Button>
          </div>
        )}

        {/* ── Identity ─────────────────────────────────────────────────────── */}
        {step === "identity" && variant !== "existingCustomer" && (
          <form onSubmit={handleIdentity} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cardNumber">Ghana Card number</Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => {
                  setCardNumber(e.target.value);
                  if (variant === "notFound") setVariant("default");
                }}
                placeholder="GHA-0123456789-0"
                className="tabular"
                aria-invalid={variant === "notFound" || undefined}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+233 20 123 4567"
                className="tabular"
                required
              />
              <p className="text-[12px] text-muted-foreground">
                We&apos;ll text a code here once we&apos;ve confirmed it&apos;s you.
              </p>
            </div>

            {variant === "notFound" && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
              >
                <AlertCircle size={15} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
                <span>
                  We couldn&apos;t find that Ghana Card number. Check for typos, or call us on{" "}
                  <span className="tabular">{SUPPORT_LINE}</span> if it keeps failing.
                </span>
              </div>
            )}

            <Button
              type="submit"
              disabled={busy || cardNumber.trim() === "" || mobile.trim() === ""}
              className="mt-1 w-full"
            >
              {busy ? (
                <>
                  <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                  Checking your Ghana Card…
                </>
              ) : (
                <>
                  <UserSearch size={15} strokeWidth={1.9} aria-hidden="true" />
                  Continue
                </>
              )}
            </Button>
          </form>
        )}

        {step === "identity" && variant === "existingCustomer" && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              That Ghana Card is already linked to a GCB account, so there&apos;s no need to open a
              new one. If you just need internet banking switched on, activation takes about two
              minutes.
            </p>
            <Button nativeButton={false} render={<Link href="/activate" />} className="w-full">
              Activate internet banking
            </Button>
            <Button nativeButton={false} render={<Link href="/login" />} variant="outline" className="w-full">
              Back to sign in
            </Button>
          </div>
        )}

        {/* ── Confirm ──────────────────────────────────────────────────────── */}
        {step === "confirm" && record && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              advance("selfie");
            }}
            className="flex flex-col gap-4"
          >
            <dl className="grid grid-cols-1 gap-y-3 text-[13px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="text-foreground">
                  {record.firstName} {record.lastName}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Date of birth</dt>
                <dd className="text-foreground tabular">{record.dateOfBirth}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Mobile</dt>
                <dd className="text-foreground tabular">{mobile || DEMO_SIGNUP_MOBILE}</dd>
              </div>
            </dl>
            <p className="text-[12px] text-muted-foreground">
              Name and date of birth come straight from your Ghana Card, so they can&apos;t be
              edited here.
            </p>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <Button type="submit" disabled={busy || email.trim() === ""} className="mt-1 w-full">
              {busy ? (
                <>
                  <Loader2 size={15} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                  Continuing…
                </>
              ) : (
                "Looks right — continue"
              )}
            </Button>
          </form>
        )}

        {/* ── Selfie ───────────────────────────────────────────────────────── */}
        {step === "selfie" && (
          <div className="flex flex-col gap-5">
            <div className="mx-auto flex aspect-[3/4] w-48 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30">
              {busy ? (
                <Loader2 size={28} strokeWidth={1.6} className="animate-spin text-muted-foreground" aria-hidden="true" />
              ) : (
                <Camera size={28} strokeWidth={1.6} className="text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <p className="text-center text-[13px] text-muted-foreground">
              {busy ? "Matching your selfie to your Ghana Card…" : "Keep your face centred in the frame."}
            </p>

            {variant === "selfieMismatch" && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
              >
                <AlertCircle size={15} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
                <span>
                  That selfie doesn&apos;t match your Ghana Card photo closely enough. Try again in
                  better light, facing the camera directly.
                </span>
              </div>
            )}

            <Button onClick={handleSelfie} disabled={busy} className="w-full">
              {busy ? (
                "Matching…"
              ) : variant === "selfieMismatch" ? (
                <>
                  <RotateCcw size={15} strokeWidth={1.9} aria-hidden="true" />
                  Retake photo
                </>
              ) : (
                <>
                  <Camera size={15} strokeWidth={1.9} aria-hidden="true" />
                  Take photo
                </>
              )}
            </Button>
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
              <span>Three codes in a row didn&apos;t match, so we&apos;ve paused this for 15 minutes.</span>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Nothing has been created yet — no account, no charge. If the code never arrived, call
              us on <span className="tabular text-foreground">{SUPPORT_LINE}</span> and we&apos;ll
              check the number with you.
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
                  {revealed ? <EyeOff size={15} strokeWidth={1.9} /> : <Eye size={15} strokeWidth={1.9} />}
                </button>
              </div>

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
                        {option.label({ maskedMobile, maskedEmail: maskedEmail ?? "" })}
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
                  Opening your account…
                </>
              ) : (
                <>
                  <KeyRound size={15} strokeWidth={1.9} aria-hidden="true" />
                  Open my account
                </>
              )}
            </Button>
          </form>
        )}

        {/* ── Done ─────────────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Your account is open and internet banking is active. We&apos;ve emailed a confirmation
              to <span className="text-foreground">{maskedEmail}</span>.
            </p>
            <Button onClick={completeSignup} className="w-full">
              Go to my accounts
            </Button>
            <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
              Adding money — a transfer, a mobile money top-up, a linked card — is one tap away
              whenever you&apos;re ready. Nothing is required today.
            </p>
          </div>
        )}
      </AuthLayout>
    </>
  );
}

function cardOffersExit(variant: SignupVariant): boolean {
  return variant === "existingCustomer" || variant === "codeLocked";
}

/* ── Headings ──────────────────────────────────────────────────────────────── */

function resolveHeadings(
  step: SignupStep,
  variant: SignupVariant,
  record: NiaRecord | null,
  maskedMobile: string,
) {
  if (step === "done") {
    return { icon: Sparkles, title: "Welcome to GCB", description: "Your account is ready." };
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
      return { icon: Lock, title: "Paused for now", description: "Nothing has been created yet." };
    }
    return {
      icon: ShieldCheck,
      title: "Enter the code we sent",
      description: (
        <>
          6-digit code sent to <span className="tabular">{maskedMobile}</span>. It expires in 5
          minutes.
        </>
      ),
    };
  }
  if (step === "selfie") {
    return {
      icon: Camera,
      title: "Let's match your selfie",
      description: "We compare it with the photo on your Ghana Card — it takes a second.",
    };
  }
  if (step === "confirm" && record) {
    return {
      icon: UserSearch,
      title: "Confirm your details",
      description: "Straight from your Ghana Card. Add an email and we're ready to continue.",
    };
  }
  if (step === "identity") {
    return variant === "existingCustomer"
      ? { icon: CheckCircle2, title: "You already bank with us", description: "No need to open a new account." }
      : { icon: IdCard, title: "Verify your Ghana Card", description: "This is how we confirm it's really you." };
  }
  return {
    icon: Sparkles,
    title: "Open a GCB account",
    description: "A few minutes, done entirely online.",
  };
}
