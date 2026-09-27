"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Fingerprint, ShieldCheck } from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import { useSession } from "@/lib/session-store";
import { ACTORS, findActorByEmail } from "@/lib/mock-data";
import { useTrustedDevice, type TrustedDevice } from "@/lib/device-trust";
import { findLegacyUser } from "@/lib/migration";

type LoginState = "idle" | "submitting" | "error";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bankingType = searchParams.get("type") || "personal";
  const { signIn, verifyMfa } = useSession();
  const trusted = useTrustedDevice();
  // "Not you?" switches to the full form for this visit; the device stays trusted.
  const [notYou, setNotYou] = useState(false);
  // Trust is read from storage after mount; wait a frame so the full form never flashes first.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<LoginState>("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");

    window.setTimeout(() => {
      // An old internet-banking user ID: this person is moving to the new system.
      if (findLegacyUser(email)) {
        router.push(`/migrate?user=${encodeURIComponent(email.trim().toUpperCase())}`);
        return;
      }
      const actor = findActorByEmail(email);
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

  if (!mounted) {
    return (
      <AuthLayout title="Login to GCB Internet Banking" width="compact">
        {null}
      </AuthLayout>
    );
  }

  if (trusted && !notYou) {
    return <ReturningSignIn trusted={trusted} onNotYou={() => setNotYou(true)} />;
  }

  return (
    <AuthLayout
      title="Login to GCB Internet Banking"
      width="compact"
      footer={
        <div className="flex justify-center text-center">
          <p className="text-[13px] text-muted-foreground">
            Don’t have an account?{" "}
            <Link
              href="/get-started"
              data-tour="login-get-started"
              className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80 active:scale-[0.96]"
            >
              Register
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Email / User ID Input */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
            Email or user ID
          </Label>
          <Input
            id="email"
            type="text"
            autoComplete="username"
            placeholder="e.g. ama.serwaa@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "error") setState("idle");
            }}
            className="h-11 px-3.5 text-[14px]"
            required
          />
        </div>

        {/* Password Input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
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
              className="h-11 px-3.5 pr-11 text-[14px]"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {state === "error" && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive"
          >
            <AlertCircle size={15} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>The email or password entered is incorrect. Please try again.</span>
          </div>
        )}

        <Button
          type="submit"
          variant="default"
          size="lg"
          disabled={state === "submitting"}
          className="mt-3 h-11 w-full text-[14.5px]"
        >
          {state === "submitting" ? (
            <>
              <AppLoader size={16} className="mr-2" />
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </Button>
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
 * The fast path for someone on their own, trusted device: greeted by name, one
 * tap with a passkey (or just their password), and no one-time code — the
 * device itself is the second factor. "Not you?" drops back to the full form.
 */
function ReturningSignIn({ trusted, onNotYou }: { trusted: TrustedDevice; onNotYou: () => void }) {
  const router = useRouter();
  const { signIn, verifyMfa } = useSession();
  const [mode, setMode] = useState<"choose" | "passkey" | "password">("choose");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

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

  function signInWithPasskey() {
    setMode("passkey");
    // Stand-in for the platform prompt (Touch ID, Windows Hello, a phone nearby).
    window.setTimeout(finish, 1100);
  }

  return (
    <AuthLayout
      title={`Welcome back, ${firstName}`}
      width="compact"
      footer={
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
      }
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

        {mode === "passkey" ? (
          <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
            <Fingerprint size={32} strokeWidth={1.5} className="text-primary" aria-hidden="true" />
            <span className="text-[14px] text-foreground">Confirm it&apos;s you</span>
            <span className="text-[13px] text-muted-foreground">Use your fingerprint, face or device PIN</span>
            <AppLoader size={16} />
          </div>
        ) : mode === "password" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              window.setTimeout(finish, 600);
            }}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="returning-password" className="text-[13px] font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="returning-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  autoFocus
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 px-3.5 pr-11 text-[14px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" size="lg" disabled={busy} className="h-11 w-full text-[14.5px]">
              {busy ? (
                <>
                  <AppLoader size={16} className="mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <Button type="button" size="lg" onClick={signInWithPasskey} className="h-11 w-full gap-2 text-[14.5px]">
              <Fingerprint size={17} strokeWidth={1.8} aria-hidden="true" />
              Sign in with passkey
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setMode("password")}
              className="h-11 w-full text-[14.5px]"
            >
              Use password instead
            </Button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
