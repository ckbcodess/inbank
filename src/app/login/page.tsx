"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import { useSession } from "@/lib/session-store";
import { ACTORS, findActorByEmail } from "@/lib/mock-data";

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
