"use client";

/**
 * Demo hub — one plain panel for jumping to any onboarding step.
 *
 *   Switch app: open the personal or the business app, either signed straight in as a demo user or at its
 *   own log-in screen. The hub also shows on both homes, so the switch works from either side.
 *   Personal / Business: the onboarding flows of each app, spelled out step by step (the Business view is
 *   `BusinessFlowSections`).
 *   Log in: every sign-in and recovery screen for both apps (`LoginFlowSections`).
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
import { BusinessFlowSections } from "./BusinessFlowSections";
import { LoginFlowSections, type LoginApp } from "./LoginFlowSections";
import { homePathForActor } from "@/lib/navigation";
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

/** Business demo users by role: the navigation differs (Approvals for an approver, Administration for an admin). */
const BUSINESS_USERS = [
  { id: "u-sole", label: "Sole Proprietor" },
  { id: "u-dual", label: "Maker" },
  { id: "u-approver", label: "Approver" },
  { id: "u-corpadmin", label: "Admin" },
] as const;
type BusinessUserId = (typeof BUSINESS_USERS)[number]["id"];

const ONBOARDING_PATHS = ["/", "/signup", "/business/signup", "/business/activate", "/activate", "/get-started", "/select-banking", "/login", "/mfa", "/forgot-password", "/migrate", "/overview", "/business/overview"];

function PersonaFlowSwitcherContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { signIn, selectProfile, verifyMfa, signOut } = useSession();
  const activeTourId = useTour((s) => s.activeTourId);
  const devToolsHidden = useDevToolsHidden();
  const [open, setOpen] = useState(false);
  const activeKind = useSession((s) => s.activeProfile?.kind);
  const [businessUser, setBusinessUser] = useState<BusinessUserId>("u-dual");
  const [view, setView] = useState<"personal" | "business" | "login">("personal");

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

  /** Sign straight in as a demo user and open that app's home: no log-in screen, no code. */
  function switchApp(actorId: string, to?: string) {
    const actor = ACTORS.find((a) => a.id === actorId);
    if (!actor) return;
    signIn(actor);
    if (actor.profiles.length > 0) selectProfile(actor.profiles[0]);
    verifyMfa();
    go(to ?? homePathForActor(actor));
  }

  /** A regular on their own laptop: this browser already trusts them, so login is one tap. */
  function goPowerUser() {
    const actor = ACTORS[0];
    signOut();
    trustThisDevice(actor);
    go("/login");
  }

  /** The ordinary log-in screen. This browser forgets any trusted device first, so it opens on the full form. */
  function goLogin(type: LoginApp, state?: "error") {
    signOut();
    forgetThisDevice();
    const params = new URLSearchParams();
    if (type === "business") params.set("type", "business");
    if (state) params.set("state", state);
    const query = params.toString();
    go(query ? `/login?${query}` : "/login");
  }

  /** The demo user a log-in screen stands in for: a business maker, or the default personal customer. */
  function loginActor(type: LoginApp) {
    return ACTORS.find((a) => a.id === (type === "business" ? "u-dual" : "u-retail")) ?? ACTORS[0];
  }

  /** A trusted device for that app's demo user, then its log-in screen: greeted by name, password only. */
  function goWelcomeBack(type: LoginApp) {
    signOut();
    trustThisDevice(loginActor(type));
    go(type === "business" ? "/login?type=business" : "/login");
  }

  /** The step after the password: signed in as that app's demo user but not yet verified. */
  function goEnterPin(type: LoginApp, newDevice: boolean) {
    signOut();
    signIn(loginActor(type));
    go(newDevice ? "/mfa?device=new" : "/mfa");
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
          "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13.5px] transition-colors cursor-pointer",
          active ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/60",
        )}
      >
        <span className="w-3.5 shrink-0 text-right text-[12px] text-muted-foreground tabular">{n}</span>
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
            "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13.5px] transition-colors cursor-pointer",
            active ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/60",
          )}
        >
          <span className="w-3.5 shrink-0 text-right text-[12px] text-muted-foreground tabular">{n}</span>
          {label}
        </button>
      </li>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setView(activeKind === "CORPORATE" || pathname?.startsWith("/business") || searchParams.get("type") === "business" ? "business" : "personal");
          setOpen(true);
        }}
        className="fixed bottom-4 left-1/2 z-40 flex h-8 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 text-[13px] text-foreground shadow-lg transition-colors hover:bg-muted"
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
              className="mr-5 flex items-center gap-2 rounded-lg border border-border/80 px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Hide all floating dev tools. Press Ctrl+Shift+D to show them again anytime."
            >
              <EyeOff size={13} strokeWidth={1.8} />
              <span>Hide floating tools <span className="opacity-60 text-[10px] font-mono">(Ctrl+Shift+D)</span></span>
            </button>
          </DialogHeader>
          <DialogBody>
            {/* Switch app */}
            <section className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border/60 pb-5">
              <h3 className="px-2 text-[14px] font-medium text-foreground">Switch app</h3>
              <div
                className={cn(
                  "flex flex-col gap-1 rounded-lg px-3 py-2 transition-colors",
                  activeKind === "RETAIL" && "bg-muted",
                )}
              >
                <span className="text-[13.5px] text-foreground">Personal banking</span>
                <span className="flex items-center gap-3 text-[12px] text-muted-foreground">
                  <button type="button" onClick={() => switchApp("u-retail")} className="cursor-pointer hover:text-foreground hover:underline">
                    Signed in
                  </button>
                  <button type="button" onClick={() => goLogin("personal")} className="cursor-pointer hover:text-foreground hover:underline">
                    Log in screen
                  </button>
                </span>
              </div>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                  activeKind === "CORPORATE" && "bg-muted",
                )}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[13.5px] text-foreground">Business banking</span>
                  <span className="flex items-center gap-3 text-[12px] text-muted-foreground">
                    <button type="button" onClick={() => switchApp(businessUser)} className="cursor-pointer hover:text-foreground hover:underline">
                      Signed in
                    </button>
                    <button type="button" onClick={() => goLogin("business")} className="cursor-pointer hover:text-foreground hover:underline">
                      Log in screen
                    </button>
                  </span>
                </div>
                <Select value={businessUser} onValueChange={(v) => v && setBusinessUser(v as BusinessUserId)}>
                  <SelectTrigger className="h-7 w-[110px] rounded-lg text-[13px]">
                    <span className="truncate">{BUSINESS_USERS.find((u) => u.id === businessUser)?.label}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_USERS.map((u) => (
                      <SelectItem key={u.id} value={u.id} label={u.label} className="text-[13px]">
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            {/* Onboarding flows: Personal or Business */}
            <div className="mb-4 flex items-center gap-3">
              <h3 className="px-2 text-[14px] font-medium text-foreground">Flows</h3>
              <div className="inline-flex rounded-lg border border-border p-0.5" role="tablist" aria-label="Flows">
                {(["personal", "business", "login"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={view === v}
                    onClick={() => setView(v)}
                    className={cn(
                      "rounded-sm px-3 py-1 text-[13px] transition-colors cursor-pointer",
                      view === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v === "personal" ? "Personal onboarding" : v === "business" ? "Business onboarding" : "Log in"}
                  </button>
                ))}
              </div>
            </div>

            {view === "login" ? (
              <LoginFlowSections
                stepRow={stepRow}
                actions={{ login: goLogin, welcomeBack: goWelcomeBack, enterPin: goEnterPin }}
                pathname={pathname}
                stage={searchParams.get("stage")}
                type={searchParams.get("type")}
              />
            ) : view === "business" ? (
              <BusinessFlowSections
                stepRow={stepRow}
                go={go}
                signInAs={switchApp}
                pathname={pathname}

                step={searchParams.get("step")}
                outcome={searchParams.get("outcome")}
                expired={searchParams.get("expired")}
                type={searchParams.get("type")}
                scenario={searchParams.get("scenario")}
                ref_={searchParams.get("ref")}


              />
            ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* GCB account holder */}
              <section className="flex flex-col gap-2">
                <h3 className="px-2 text-[14px] font-medium text-foreground">GCB account holder</h3>
                <div className="flex items-center justify-between gap-2 px-2 text-[13px] text-muted-foreground">
                  Customer
                  <Select value={persona} onValueChange={(v) => v && setPersona(v as PersonaId)}>
                    <SelectTrigger className="h-7 w-[170px] rounded-lg text-[13px]">
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
              <section className="flex flex-col gap-2">
                <h3 className="px-2 text-[14px] font-medium text-foreground">New to GCB</h3>
                <div className="h-7" aria-hidden="true" />
                <ol className="flex flex-col">
                  {SIGNUP_STEPS.map((s, i) =>
                    stepRow(`/signup?step=${s.id}`, s.label, i + 1, pathname === "/signup" && currentStep === s.id),
                  )}
                  <li>
                    <button
                      type="button"
                      onClick={goLinkAfterSignup}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13.5px] text-foreground transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="w-3.5 shrink-0 text-right text-[12px] text-muted-foreground tabular">
                        {SIGNUP_STEPS.length + 1}
                      </span>
                      Link Source Account
                    </button>
                  </li>
                </ol>
              </section>

              {/* Post-onboarding cards */}
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[14px] font-medium text-foreground">Post-onboarding cards</h3>
                </div>
                <div className="flex h-7 items-center px-2">
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
              <section className="flex flex-col gap-2">
                <h3 className="px-2 text-[14px] font-medium text-foreground">Returning customers</h3>
                <div className="h-7" aria-hidden="true" />
                <ol className="flex flex-col">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        forgetThisDevice();
                        go("/select-banking");
                      }}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="text-[13.5px] text-foreground">Choose personal or business</span>
                      <span className="text-[12px] text-muted-foreground">The old landing screen</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => goLogin("personal")}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="text-[13.5px] text-foreground">Personal banking log in</span>
                      <span className="text-[12px] text-muted-foreground">The front door</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => goLogin("business")}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="text-[13.5px] text-foreground">Business banking log in</span>
                      <span className="text-[12px] text-muted-foreground">With the way back to personal</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={goPowerUser}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="text-[13.5px] text-foreground">Welcome back screen</span>
                      <span className="text-[12px] text-muted-foreground">Trusted device, greeted by name, password only</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={goFirstTimer}
                      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <span className="text-[13.5px] text-foreground">First time, new device</span>
                      <span className="text-[12px] text-muted-foreground">Activation, remember device, welcome</span>
                    </button>
                  </li>
                </ol>
                <span className="mt-2 px-2 text-[12.5px] text-muted-foreground">Moving from old internet banking</span>
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
            )}
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
