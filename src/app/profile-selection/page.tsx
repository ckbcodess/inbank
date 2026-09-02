"use client";

/**
 * S03 Profile Selection — section 12.4.
 *
 * Only reached when the identity holds 2+ banking relationships; a single
 * relationship resolves silently at MFA. Internal staff never land here
 * (section 12.5) and are redirected out.
 *
 * Design direction (section 1): treat the banking relationship as a deliberate
 * context choice.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, User } from "lucide-react";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import type { Profile } from "@/lib/roles";

export default function ProfileSelectionPage() {
  const router = useRouter();
  const { actor, mfaVerified, selectProfile } = useSession();
  const hydrated = useSessionHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (!actor) router.replace("/login");
    else if (!mfaVerified) router.replace("/mfa");
    else if (actor.shell === "admin") router.replace("/admin");
    else if (actor.profiles.length < 2) router.replace("/overview");
  }, [hydrated, actor, mfaVerified, router]);

  if (!hydrated || !actor || !mfaVerified || actor.shell === "admin" || actor.profiles.length < 2) {
    return null;
  }

  function choose(p: Profile) {
    selectProfile(p);
    router.push("/overview");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-6 py-16 sm:px-10 sm:py-20">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 text-center">
          <h1 className="text-[24px] leading-tight tracking-[-0.02em] text-foreground">
            Choose a banking relationship
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            You hold more than one relationship with the bank. Everything you see next — accounts,
            payments and permissions — belongs to the one you pick.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {actor.profiles.map((p) => {
            const Icon = p.kind === "CORPORATE" ? Building2 : User;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => choose(p)}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] active:scale-[0.99] transition-transform focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.25)]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] text-foreground">{p.name}</span>
                  <span className="mt-0.5 text-[13px] text-muted-foreground tabular">
                    {p.kind === "CORPORATE" ? "Corporate" : "Retail"} · {p.reference}
                  </span>
                </span>
                <ArrowRight
                  size={17}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                />
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[12px] text-muted-foreground">
          You can switch relationships at any time from the header.
        </p>
      </div>
    </div>
  );
}
