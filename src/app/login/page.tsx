"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, Sparkles, User, Users, Smartphone, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import { useSession } from "@/lib/session-store";
import { ACTORS, findActorByEmail } from "@/lib/mock-data";
import { ROLE_LABEL } from "@/lib/roles";

type LoginState = "idle" | "submitting" | "error";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bankingType = searchParams.get("type") || "personal";
  const signIn = useSession((s) => s.signIn);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<LoginState>("idle");
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");

    window.setTimeout(() => {
      const actor = findActorByEmail(email);
      if (!actor) {
        // Fallback for prototype testing: allow login if email matches demo pattern or default actor
        const defaultActor = bankingType === "business" ? ACTORS[5] : ACTORS[0];
        signIn(defaultActor);
        router.push("/mfa");
        return;
      }
      signIn(actor);
      if (actor.id === "u-yaw") {
        router.push("/mfa?device=new");
      } else {
        router.push("/mfa");
      }
    }, 600);
  }

  function handleQuickLogin(actorId: string, isNewDevice = false) {
    const actor = ACTORS.find((a) => a.id === actorId) || ACTORS[0];
    signIn(actor);
    if (isNewDevice) {
      router.push("/mfa?device=new");
    } else {
      router.push("/mfa");
    }
  }

  return (
    <AuthLayout
      title="Get Started with GCB Internet Banking"
      description="Enter your credentials to access your accounts securely."
      width="compact"
      footer={
        <div className="flex flex-col gap-4 text-center">
          <p className="text-[13px] text-muted-foreground">
            New here, or do not have a password yet?{" "}
            <Link
              href="/get-started"
              className="font-semibold text-[#B27B00] dark:text-[#F2B200] underline-offset-4 hover:underline active:scale-[0.96]"
            >
              Get started
            </Link>
          </p>

          {/* Quick Demo Identities Trigger */}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-4 active:scale-[0.96] cursor-pointer"
            >
              {showDemoMenu ? "Hide Demo Personas" : "⚡ Switch Demo Personas & Flows"}
            </button>

            {showDemoMenu && (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-card/90 p-4 backdrop-blur-md text-left">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Persona to Test Flow
                </p>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("u-retail")}
                    className="flex items-center justify-between rounded-xl p-2 text-left text-[12.5px] transition-colors hover:bg-muted/70 active:scale-[0.96] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <User size={15} className="text-amber-500" />
                      <div>
                        <span className="font-semibold text-foreground">Ama Serwaa</span>
                        <p className="text-[11px] text-muted-foreground">Personal / Card &amp; Wallet Customer</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Log in →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("u-joint")}
                    className="flex items-center justify-between rounded-xl p-2 text-left text-[12.5px] transition-colors hover:bg-muted/70 active:scale-[0.96] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-amber-500" />
                      <div>
                        <span className="font-semibold text-foreground">Kwame Mensah</span>
                        <p className="text-[11px] text-muted-foreground">Joint: Both to Sign Mandate (with Efua)</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Log in →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("u-joint-either")}
                    className="flex items-center justify-between rounded-xl p-2 text-left text-[12.5px] transition-colors hover:bg-muted/70 active:scale-[0.96] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-emerald-500" />
                      <div>
                        <span className="font-semibold text-foreground">Kojo Appiah</span>
                        <p className="text-[11px] text-muted-foreground">Joint: Either to Sign Mandate (with Akosua)</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Log in →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("u-abena")}
                    className="flex items-center justify-between rounded-xl p-2 text-left text-[12.5px] transition-colors hover:bg-muted/70 active:scale-[0.96] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone size={15} className="text-amber-500" />
                      <div>
                        <span className="font-semibold text-foreground">Abena Osei</span>
                        <p className="text-[11px] text-muted-foreground">Mobile App User → Web Sync</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Log in →</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("u-yaw", true)}
                    className="flex items-center justify-between rounded-xl p-2 text-left text-[12.5px] transition-colors hover:bg-muted/70 active:scale-[0.96] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Laptop size={15} className="text-amber-500" />
                      <div>
                        <span className="font-semibold text-foreground">Yaw Oppong</span>
                        <p className="text-[11px] text-muted-foreground">New Device Sign-in Challenge</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Challenge →</span>
                  </button>

                  <div className="border-t border-border/60 my-1 pt-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase px-1 mb-1">
                      Corporate Personas
                    </p>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin("u-dual")}
                      className="flex items-center justify-between w-full rounded-xl p-2 text-left text-[12px] transition-colors hover:bg-muted/70 active:scale-[0.96] cursor-pointer"
                    >
                      <span className="font-medium text-foreground">Kwame Boateng (Corporate Maker)</span>
                      <span className="text-[11px] text-muted-foreground">Adinkra Ltd</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin("u-approver")}
                      className="flex items-center justify-between w-full rounded-xl p-2 text-left text-[12px] transition-colors hover:bg-muted/70 active:scale-[0.96] cursor-pointer"
                    >
                      <span className="font-medium text-foreground">Efua Mensah (Corporate Approver)</span>
                      <span className="text-[11px] text-muted-foreground">Adinkra Ltd</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email / User ID Input */}
        <div className="flex flex-col gap-1.5">
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
            className="h-12 rounded-xl border-border bg-background px-4 text-[14px] focus-visible:border-[#F2B200] focus-visible:ring-[#F2B200]/20"
            required
          />
        </div>

        {/* Password Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-medium text-muted-foreground hover:text-foreground active:scale-[0.96]"
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
              className="h-12 rounded-xl border-border bg-background pr-10 text-[14px] focus-visible:border-[#F2B200] focus-visible:ring-[#F2B200]/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {state === "error" && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-3.5 py-3 text-[13px] text-destructive"
          >
            <AlertCircle size={15} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>The email or password entered is incorrect. Please try again.</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={state === "submitting"}
          className="mt-2 h-12 w-full rounded-2xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] active:scale-[0.96] transition-all shadow-md shadow-[#F2B200]/20 cursor-pointer"
        >
          {state === "submitting" ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
      <LoginForm />
    </Suspense>
  );
}
