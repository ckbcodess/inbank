"use client";

/**
 * Demo hub — one plain panel for jumping to any onboarding step.
 *
 *   GCB account holder (/activate): pick the demo customer, then a step.
 *   New to GCB (/signup): a step, or straight to linking after sign-up.
 *   Returning customers: the trusted-device power user, a first-timer on a
 *   new device, and someone moving from the old internet banking (/migrate).
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
import { ACTIVATION_STEPS, SIGNUP_STEPS, parseOnboardingStep } from "@/lib/onboarding-steps";
import { forgetThisDevice, setFirstRun, setPendingFundPrompt, setPendingReferral, trustThisDevice } from "@/lib/device-trust";
import { LEGACY_DEMO_MOBILE, MIGRATION_STEPS, parseMigrationStep } from "@/lib/migration";
import { setDevToolsHidden, useDevToolsHidden } from "@/lib/dev-tools-visibility";
import { EyeOff } from "lucide-react";

const PERSONAS = [
  { id: "multi", label: "Several accounts" },
  { id: "single", label: "One account" },
  { id: "joint", label: "Joint account" },
  { id: "mobile_sync", label: "Mobile app user" },
] as const;
type PersonaId = (typeof PERSONAS)[number]["id"];

const ONBOARDING_PATHS = ["/", "/signup", "/activate", "/get-started", "/select-banking", "/login", "/mfa", "/forgot-password", "/migrate", "/overview"];

function PersonaFlowSwitcherContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { signIn, selectProfile, verifyMfa, signOut } = useSession();
  const activeTourId = useTour((s) => s.activeTourId);
  const devToolsHidden = useDevToolsHidden();
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
  if (!mounted || !onOnboarding || activeTourId || devToolsHidden) return null;

  const currentStep = parseOnboardingStep(searchParams.get("step"));

  function go(route: string) {
    setOpen(false);
    router.push(route);
  }

  function triggerWelcome(stage: "all" | "referral" | "ready" | "fund" | "source") {
    setOpen(false);
    const currentActor = useSession.getState().actor;
    if (!currentActor) {
      const actor = ACTORS[0];
      signIn(actor);
      if (actor.profiles.length > 0) selectProfile(actor.profiles[0]);
      verifyMfa();
    }
    setFirstRun("new");
    if (stage === "all" || stage === "referral") {
      setPendingReferral(true);
    }
    if (stage === "all" || stage === "ready" || stage === "fund") {
      setPendingFundPrompt(true);
    }
    const targetUrl = `/overview?welcome=${stage}`;
    router.push(targetUrl);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-welcome-flow", {
          detail: { stage, kind: "new" },
        })
      );
    }
  }

  /** A regular on their own laptop: this browser already trusts them, so login is one tap. */
  function goPowerUser() {
    const actor = ACTORS[0];
    signOut();
    trustThisDevice(actor);
    go("/login");
  }

  /** The ordinary log-in screen. This browser forgets any trusted device first, so it opens on the full form. */
  function goLogin(type: "personal" | "business") {
    signOut();
    forgetThisDevice();
    go(type === "business" ? "/login?type=business" : "/login");
  }

  /** First internet-banking sign-in, on a device we've never seen: activation, then the welcome. */
  function goFirstTimer() {
    signOut();
    forgetThisDevice();
    go("/activate?persona=single&step=ghana_card");
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

  const postStepRow = (stage: "all" | "referral" | "ready" | "fund" | "source", label: string, n: number) => {
    const active = pathname === "/overview" && searchParams.get("welcome") === stage;
    return (
      <li key={stage}>
        <button
          type="button"
          onClick={() => triggerWelcome(stage)}
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
  };

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
        <DialogContent size="xl" className="sm:max-w-[920px]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Jump to a step</DialogTitle>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDevToolsHidden(true);
              }}
              className="mr-6 flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Hide all floating dev tools. Press Ctrl+Shift+D to show them again anytime."
            >
              <EyeOff size={13} strokeWidth={1.8} />
              <span>Hide floating tools <span className="opacity-60 text-[10px] font-mono">(Ctrl+Shift+D)</span></span>
            </button>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
                  {ACTIVATION_STEPS.map((s, i) =>
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
                  {SIGNUP_STEPS.map((s, i) =>
                    stepRow(`/signup?step=${s.id}`, s.label, i + 1, pathname === "/signup" && currentStep === s.id),
                  )}
                  <li>
                    <button
                      type="button"
                      onClick={goLinkAfterSignup}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] text-foreground transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="w-4 shrink-0 text-right text-[12px] text-muted-foreground tabular">
                        {SIGNUP_STEPS.length + 1}
                      </span>
                      Link Source Account
                    </button>
                  </li>
                </ol>
              </section>

              {/* Post-onboarding cards */}
              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-2.5">
                  <h3 className="text-[14px] font-medium text-foreground">Post-onboarding cards</h3>
                </div>
                <div className="flex h-8 items-center px-2.5">
                  <button
                    type="button"
                    onClick={() => triggerWelcome("all")}
                    className="text-[12px] font-medium text-foreground hover:underline cursor-pointer"
                  >
                    Play full sequence →
                  </button>
                </div>
                <ol className="flex flex-col">
                  {postStepRow("referral", "Referral Code", 1)}
                  {postStepRow("ready", "Fund Account Prompt", 2)}
                  {postStepRow("fund", "Quick Fund Modal", 3)}
                  {postStepRow("source", "Save Funding Source", 4)}
                </ol>
              </section>

              {/* Returning customers */}
              <section className="flex flex-col gap-2.5">
                <h3 className="px-2.5 text-[14px] font-medium text-foreground">Returning customers</h3>
                <div className="h-8" aria-hidden="true" />
                <ol className="flex flex-col">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        forgetThisDevice();
                        go("/select-banking");
                      }}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="text-[13.5px] text-foreground">Choose personal or business</span>
                      <span className="text-[12px] text-muted-foreground">The old landing screen</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => goLogin("personal")}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="text-[13.5px] text-foreground">Personal banking log in</span>
                      <span className="text-[12px] text-muted-foreground">The front door</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => goLogin("business")}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="text-[13.5px] text-foreground">Business banking log in</span>
                      <span className="text-[12px] text-muted-foreground">With the way back to personal</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={goPowerUser}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="text-[13.5px] text-foreground">Welcome back screen</span>
                      <span className="text-[12px] text-muted-foreground">Trusted device, greeted by name, password only</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={goFirstTimer}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="text-[13.5px] text-foreground">First time, new device</span>
                      <span className="text-[12px] text-muted-foreground">Activation, remember device, welcome</span>
                    </button>
                  </li>
                </ol>
                <span className="mt-2 px-2.5 text-[12.5px] text-muted-foreground">Moving from old internet banking</span>
                <ol className="flex flex-col">
                  {MIGRATION_STEPS.map((s, i) =>
                    stepRow(
                      `/migrate?user=${LEGACY_DEMO_MOBILE}&step=${s.id}`,
                      s.label,
                      i + 1,
                      pathname === "/migrate" && parseMigrationStep(searchParams.get("step")) === s.id,
                    ),
                  )}
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
