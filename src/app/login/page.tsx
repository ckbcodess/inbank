"use client";

import { AlertToast } from "@/components/ui/alert-toast";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Eye, EyeOff, User } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { KeyboardDock } from "@/components/ui/keyboard-dock";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import { useSession } from "@/lib/session-store";
import { ACTORS, findActorByPhone } from "@/lib/mock-data";
import { toLocalMobile } from "@/lib/phone";
import type { Actor } from "@/lib/roles";
import { findLegacyUser } from "@/lib/migration";
import { BUSINESS_SIGN_IN_OPEN, signInOpenFor } from "@/lib/launch";
import { WorkInProgress } from "@/components/states/WorkInProgress";

import { Field } from "@/components/ui/field";
type LoginState = "idle" | "submitting" | "error";

/** Same field as the rest of the app. */

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bankingType, setBankingType] = useState<"personal" | "business">(() => {
    return searchParams.get("type") === "business" ? "business" : "personal";
  });
  const { signIn } = useSession();
  // Set when login is closed: the form is replaced by the work-in-progress screen.
  const [closed, setClosed] = useState(false);
  // Business login is closed for now (lib/launch.ts). Retail login is open.
  const doorOpen = bankingType !== "business" || BUSINESS_SIGN_IN_OPEN;

  const [mobile, setMobile] = useState("");
  const [country, setCountry] = useState("GH");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<LoginState>(() => (searchParams.get("state") === "error" ? "error" : "idle"));

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
      // Business login is closed for now: the work-in-progress screen, whatever credentials were entered.
      if (!doorOpen) {
        setClosed(true);
        return;
      }
      // An old internet-banking customer: this person is moving to the new system.
      if (findLegacyUser(mobile)) {
        router.push(`/migrate?user=${encodeURIComponent(toLocalMobile(mobile))}`);
        return;
      }
      const actor = findActorByPhone(mobile);
      if (!actor) {
        // Fallback for prototype testing: allow login if email matches demo pattern or default actor
        const defaultActor =
          bankingType === "business"
            ? (ACTORS.find((a) => a.role.startsWith("CORPORATE_")) ?? ACTORS[5])
            : (ACTORS.find((a) => a.id === "u-retail") ?? ACTORS[0]);
        if (!signInOpenFor(defaultActor)) {
          setClosed(true);
          return;
        }
        continueWith(defaultActor);
        return;
      }
      if (!signInOpenFor(actor)) {
        setClosed(true);
        return;
      }
      continueWith(actor);
    }, 600);
  }

  /** Every password log-in goes on to the verification step (a selfie, then a one-time code) before the customer is in. */
  function continueWith(actor: Actor) {
    signIn(actor);
    router.push("/mfa");
  }

  if (closed) {
    return <SignInClosed onBack={() => setClosed(false)} />;
  }

  return (
    <AuthLayout
      vAlign="center"
      title={bankingType === "business" ? "GCB Business Internet Banking" : "Log in to GCB Internet Banking"}
      width="compact"
      footer={
        <div className="flex flex-col items-center gap-2 text-center">
          {/* Where business login is open, each door links to the other. */}
          {(bankingType === "business" || BUSINESS_SIGN_IN_OPEN) && (
            <button
              type="button"
              data-tour={bankingType === "business" ? "entry-personal" : "entry-business"}
              onClick={() => handleTypeChange(bankingType === "business" ? "personal" : "business")}
              className="inline-flex items-center gap-2 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground underline underline-offset-4 cursor-pointer"
            >
              {bankingType === "business" ? (
                <>
                  <User size={13.5} className="shrink-0" />
                  <span>Switch to Personal Banking</span>
                </>
              ) : (
                <>
                  <Building2 size={13.5} className="shrink-0" />
                  <span>Switch to Business Banking</span>
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Fields Group */}
        <div className="flex flex-col gap-3">
          {/* Mobile number */}
          <Field label="Mobile Number" htmlFor="mobile">
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
              required
            />
</Field>

          {/* Password Input */}
          <div className={`flex flex-col gap-2 ${state === "error" ? "animate-pin-shake" : ""}`}>
            <Label htmlFor="password">
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
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Link
              href="/forgot-password"
              className="mt-1 self-end text-caption text-foreground underline underline-offset-4 hover:text-foreground/70"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <AlertToast when={state === "error"} message="The mobile number or password entered is incorrect. Please try again." />

        {/* Action Buttons Group */}
        <div className="mt-5 flex flex-col gap-2">
          <KeyboardDock>
            <Button
              type="submit"
              variant="default"
              size="md"
              loading={state === "submitting"}
              className="sm:h-10 w-full"
            >
              Log in
            </Button>
          </KeyboardDock>

          <Button
            nativeButton={false}
            render={<Link href={bankingType === "business" ? "/business/signup" : "/get-started"} data-tour="login-get-started" />}
            variant="outline"
            size="md"
            className="sm:h-10 w-full"
          >
            {bankingType === "business" ? (
              "Register"
            ) : (
              <>
                <span>New to Internet Banking?</span> Register
              </>
            )}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

/** Shown in place of the login form while login is closed. Nothing is logged in. */
function SignInClosed({ onBack }: { onBack: () => void }) {
  return (
    <AuthLayout vAlign="center" title="Log in" width="compact">
      <div className="flex flex-col gap-5">
        <WorkInProgress title="Online banking login" />
        <Button variant="outline" onClick={onBack}>
          Back to log in
        </Button>
      </div>
    </AuthLayout>
  );
}

/**
 * The form reads `?type=` and `?state=` once, when it is built. Keying it on them rebuilds it whenever they change
 * while the page stays mounted (the Demo hub moves between the personal and business doors, and to the error
 * state, without leaving `/login`), so the URL and the screen can't disagree.
 */
function LoginDoor() {
  const params = useSearchParams();
  return <LoginForm key={`${params.get("type") ?? ""}|${params.get("state") ?? ""}`} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background animate-pulse" />}>
      <LoginDoor />
    </Suspense>
  );
}
