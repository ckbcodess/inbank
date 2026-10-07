"use client";

import { AlertToast } from "@/components/ui/alert-toast";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import { useSession } from "@/lib/session-store";
import { ACTORS, findActorByPhone } from "@/lib/mock-data";
import { toLocalMobile } from "@/lib/phone";
import { useTrustedDevice, type TrustedDevice } from "@/lib/device-trust";
import { findLegacyUser } from "@/lib/migration";

type LoginState = "idle" | "submitting" | "error";

/** Same field as the rest of the app. */
const FIELD = "h-11 text-[15px]";
const LABEL = "text-[12px] text-foreground";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bankingType, setBankingType] = useState<"personal" | "business">(() => {
    return searchParams.get("type") === "business" ? "business" : "personal";
  });
  const { signIn, verifyMfa } = useSession();
  const trusted = useTrustedDevice();
  // "Not you?" switches to the full form for this visit; the device stays trusted.
  const [notYou, setNotYou] = useState(false);

  const [mobile, setMobile] = useState("");
  const [country, setCountry] = useState("GH");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<LoginState>("idle");

  function handleTypeChange(nextType: "personal" | "business") {
    setBankingType(nextType);
    setMobile("");
    setCountry("GH");
    setPassword("");
    setState("idle");
    const params = new URLSearchParams(window.location.search);
    params.set("type", nextType);
    router.replace(`/login?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");

    window.setTimeout(() => {
      // An old internet-banking customer: this person is moving to the new system.
      if (findLegacyUser(mobile)) {
        router.push(`/migrate?user=${encodeURIComponent(toLocalMobile(mobile))}`);
        return;
      }
      const actor = findActorByPhone(mobile);
      if (!actor) {
        // Fallback for prototype testing: allow login if email matches demo pattern or default actor
        const defaultActor = bankingType === "business" ? ACTORS[5] : ACTORS[0];
        signIn(defaultActor);
        router.push("/mfa");
        return;
      }
      signIn(actor);
      // This device is already trusted for them: no one-time code.
      if (trusted?.actorId === actor.id) {
        verifyMfa();
        router.push("/overview");
        return;
      }
      if (actor.id === "u-yaw") {
        router.push("/mfa?device=new");
      } else {
        router.push("/mfa");
      }
    }, 600);
  }

  if (trusted && !notYou) {
    return <ReturningSignIn trusted={trusted} onNotYou={() => setNotYou(true)} />;
  }

  return (
    <AuthLayout
      vAlign="center"
      title={bankingType === "business" ? "GCB Business Internet Banking" : "Log in to GCB Internet Banking"}
      width="compact"
      footer={
        <div className="flex flex-col items-center gap-2.5 text-center">
          {/* Personal is the front door. Only a business sign-in (reached by link) offers the way back. */}
          {bankingType === "business" && (
            <button
              type="button"
              data-tour="entry-personal"
              onClick={() => handleTypeChange("personal")}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground underline underline-offset-4 cursor-pointer"
            >
              <User size={13.5} strokeWidth={1.8} className="shrink-0" />
              <span>Switch to Personal Banking</span>
            </button>
          )}
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Fields Group */}
        <div className="flex flex-col gap-4">
          {/* Mobile number */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mobile" className={LABEL}>
              Mobile number
            </Label>
            <PhoneInput
              id="mobile"
              autoComplete="username"
              value={mobile}
              country={country}
              onCountryChange={(code) => {
                setCountry(code);
                setMobile("");
                if (state === "error") setState("idle");
              }}
              onValueChange={(v) => {
                setMobile(v);
                if (state === "error") setState("idle");
              }}
              className={FIELD}
              required
            />
          </div>

          {/* Password Input */}
          <div className={`flex flex-col gap-1.5 ${state === "error" ? "animate-pin-shake" : ""}`}>
            <Label htmlFor="password" className={LABEL}>
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (state === "error") setState("idle");
                }}
                className={`${FIELD} pr-9`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-0 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Link
              href="/forgot-password"
              className="mt-1 self-end text-[12.5px] text-foreground underline underline-offset-4 hover:text-foreground/70"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <AlertToast when={state === "error"} message="The mobile number or password entered is incorrect. Please try again." />

        {/* Action Buttons Group */}
        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            type="submit"
            variant="default"
            size="lg"
            loading={state === "submitting"}
            className="h-11 sm:h-11.5 w-full text-[14.5px]"
          >
            Log in
          </Button>

          <Button
            nativeButton={false}
            render={<Link href={bankingType === "business" ? "/signup/business" : "/get-started"} data-tour="login-get-started" />}
            variant="outline"
            size="lg"
            className="h-11 sm:h-11.5 w-full text-[14.5px]"
          >
            {bankingType === "business" ? "Don’t have an account? Apply for business account" : "Don’t have an account? Register"}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background animate-pulse" />}>
      <LoginForm />
    </Suspense>
  );
}

/**
 * The fast path for someone on their own, trusted device: greeted by name and
 * asked for their password. No mobile number to retype and no one-time code — the
 * device itself is the second factor. "Use another account" drops back to the full form.
 */
function ReturningSignIn({ trusted, onNotYou }: { trusted: TrustedDevice; onNotYou: () => void }) {
  const router = useRouter();
  const { signIn, verifyMfa } = useSession();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const firstName = trusted.name.split(" ")[0];
  const initials = trusted.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const until = new Date(trusted.until).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  function finish() {
    const actor = ACTORS.find((a) => a.id === trusted.actorId) ?? ACTORS[0];
    signIn(actor);
    verifyMfa();
    router.push("/overview");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    window.setTimeout(finish, 600);
  }

  return (
    <AuthLayout
      vAlign="center"
      title={`Welcome back, ${firstName}`}
      width="compact"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] text-primary-foreground">
            {initials}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] text-foreground">{trusted.name}</span>
            <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <ShieldCheck size={13} strokeWidth={1.9} aria-hidden="true" />
              <span className="tabular">Trusted device until {until}</span>
            </span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="returning-password" className={LABEL}>
              Password
            </Label>
            <div className="relative">
              <Input
                id="returning-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${FIELD} pr-9`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-0 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Link
              href="/forgot-password"
              className="mt-1 self-end text-[12.5px] text-foreground underline underline-offset-4 hover:text-foreground/70"
            >
              Forgot password?
            </Link>
          </div>
          <Button type="submit" variant="default" size="lg" loading={submitting} className="h-11 sm:h-11.5 w-full text-[14.5px]">
            Log in
          </Button>
        </form>

        <p className="text-center text-[13px] text-muted-foreground">
          Not {firstName}?{" "}
          <button
            type="button"
            onClick={onNotYou}
            className="text-foreground underline underline-offset-4 hover:text-foreground/80 cursor-pointer"
          >
            Use another account
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}
