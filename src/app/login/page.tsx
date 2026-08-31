"use client";

/**
 * S01 Login — the single front door shared by both populations (section 12.1).
 *
 * Design direction (section 1): focused authentication entry; minimize
 * distraction and make recovery/security actions clear.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Landmark, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import { useSession } from "@/lib/session-store";
import { ACTORS, findActorByEmail } from "@/lib/mock-data";
import { ROLE_LABEL } from "@/lib/roles";

type LoginState = "idle" | "submitting" | "error";

export default function LoginPage() {
  const router = useRouter();
  const signIn = useSession((s) => s.signIn);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");

    // Prototype credential check — the credential decides the shell, which is
    // resolved after MFA rather than here.
    window.setTimeout(() => {
      const actor = findActorByEmail(email);
      if (!actor) {
        setState("error");
        return;
      }
      signIn(actor);
      router.push("/mfa");
    }, 600);
  }

  return (
    <AuthLayout
      icon={Landmark}
      title="Sign in to NIBS"
      description="Internet banking for retail, corporate and internal users."
      footer={
        <>
          {/* Everyone who isn't signing in with a password already — activation
              and both signup paths — funnels through one quiet link rather than
              three permanently-visible cards competing with the form above.
              The two-question gate that sorts them lives at /get-started. */}
          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            New here, or don&apos;t have a password yet?{" "}
            <Link href="/get-started" className="text-primary underline-offset-4 hover:underline">
              Get started
            </Link>
          </p>

          {/* Prototype affordance — pick any identity to see its shell and nav. */}
          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <p className="mb-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              Demo identities
            </p>
            <div className="flex flex-col gap-1">
              {ACTORS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword("demo");
                    setState("idle");
                  }}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="text-[12px] text-foreground">{a.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {ROLE_LABEL[a.role]} · {a.shell === "admin" ? "Admin Portal" : "Customer"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email or user ID</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "error") setState("idle");
            }}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {/* FR-31 — self-service reset via OTP. */}
            <Link
              href="/forgot-password"
              className="text-[12px] text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {state === "error" && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
          >
            <AlertCircle size={15} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
            <span>We don&apos;t recognise those credentials. Check the email and try again.</span>
          </div>
        )}

        <Button type="submit" disabled={state === "submitting"} className="mt-1 w-full">
          {state === "submitting" ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </form>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
        <Lock size={12} strokeWidth={1.9} aria-hidden="true" />
        Protected by multi-factor authentication
      </p>
    </AuthLayout>
  );
}
