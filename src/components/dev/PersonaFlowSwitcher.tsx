"use client";

/**
 * Demo hub — one plain panel for jumping to any onboarding step.
 *
 *   GCB account holder (/activate): pick the demo customer, then a step.
 *   New to GCB (/signup): a step, or straight to linking after sign-up.
 *
 * Steps open with `?step=<id>` (see `src/lib/onboarding-steps.ts`). Shown on
 * the entry/onboarding screens only, hidden during a guided tour.
 */

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useSession } from "@/lib/session-store";
import { useTour } from "@/lib/tour-store";
import { ACTORS } from "@/lib/mock-data";
import { ONBOARDING_STEPS, parseOnboardingStep } from "@/lib/onboarding-steps";

const PERSONAS = [
  { id: "multi", label: "Several accounts" },
  { id: "single", label: "One account" },
  { id: "joint", label: "Joint account" },
  { id: "mobile_sync", label: "Mobile app user" },
] as const;
type PersonaId = (typeof PERSONAS)[number]["id"];

const ONBOARDING_PATHS = ["/", "/signup", "/activate", "/get-started", "/login", "/mfa", "/forgot-password"];

function PersonaFlowSwitcherContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { signIn, selectProfile, verifyMfa } = useSession();
  const activeTourId = useTour((s) => s.activeTourId);
  const [open, setOpen] = useState(false);

  const urlPersona = searchParams.get("persona");
  const [persona, setPersona] = useState<PersonaId>(
    PERSONAS.some((p) => p.id === urlPersona) ? (urlPersona as PersonaId) : "multi",
  );

  // Client-only: the dock sits in the root layout and reads search params, so the
  // server may render this boundary as its fallback while the browser renders the
  // dock — a hydration mismatch. A demo overlay has nothing worth server-rendering,
  // so it appears after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onOnboarding = ONBOARDING_PATHS.some((p) => (p === "/" ? pathname === "/" : pathname?.startsWith(p)));
  if (!mounted || !onOnboarding || activeTourId) return null;

  const currentStep = parseOnboardingStep(searchParams.get("step"));

  function go(route: string) {
    setOpen(false);
    router.push(route);
  }

  function goLinkAfterSignup() {
    const actor = ACTORS[0];
    signIn(actor);
    if (actor.profiles.length > 0) selectProfile(actor.profiles[0]);
    verifyMfa();
    go("/accounts?link_source=true");
  }

  const stepRow = (href: string, label: string, n: number, active: boolean) => (
    <li key={href}>
      <button
        type="button"
        onClick={() => go(href)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors cursor-pointer",
          active ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/60",
        )}
      >
        <span className="w-4 shrink-0 text-right text-[12px] text-muted-foreground tabular">{n}</span>
        {label}
      </button>
    </li>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-1/2 z-40 flex h-9 -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[13px] text-foreground shadow-lg transition-colors hover:bg-muted"
      >
        Demo
        <ChevronDown size={14} strokeWidth={1.8} className="text-muted-foreground" aria-hidden="true" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Jump to a step</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* GCB account holder */}
              <section className="flex flex-col gap-2.5">
                <h3 className="px-2.5 text-[14px] font-medium text-foreground">GCB account holder</h3>
                <div className="flex items-center justify-between gap-3 px-2.5 text-[13px] text-muted-foreground">
                  Customer
                  <Select value={persona} onValueChange={(v) => v && setPersona(v as PersonaId)}>
                    <SelectTrigger className="h-8 w-[170px] rounded-lg text-[13px]">
                      <span className="truncate">{PERSONAS.find((p) => p.id === persona)?.label}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONAS.map((p) => (
                        <SelectItem key={p.id} value={p.id} label={p.label} className="text-[13px]">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ol className="flex flex-col">
                  {ONBOARDING_STEPS.map((s, i) =>
                    stepRow(
                      `/activate?persona=${persona}&step=${s.id}`,
                      s.label,
                      i + 1,
                      pathname === "/activate" && currentStep === s.id && urlPersona === persona,
                    ),
                  )}
                </ol>
              </section>

              {/* New to GCB */}
              <section className="flex flex-col gap-2.5">
                <h3 className="px-2.5 text-[14px] font-medium text-foreground">New to GCB</h3>
                <div className="h-8" aria-hidden="true" />
                <ol className="flex flex-col">
                  {ONBOARDING_STEPS.map((s, i) =>
                    stepRow(`/signup?step=${s.id}`, s.label, i + 1, pathname === "/signup" && currentStep === s.id),
                  )}
                  <li>
                    <button
                      type="button"
                      onClick={goLinkAfterSignup}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] text-foreground transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="w-4 shrink-0 text-right text-[12px] text-muted-foreground tabular">
                        {ONBOARDING_STEPS.length + 1}
                      </span>
                      Link Source Account
                    </button>
                  </li>
                </ol>
              </section>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PersonaFlowSwitcher() {
  return (
    <Suspense fallback={null}>
      <PersonaFlowSwitcherContent />
    </Suspense>
  );
}
