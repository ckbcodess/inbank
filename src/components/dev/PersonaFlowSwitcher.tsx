"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Layers,
  Laptop,
  Play,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useSession } from "@/lib/session-store";
import { useTour } from "@/lib/tour-store";
import { TOURS, type Tour, type TourIcon } from "@/lib/tours";
import { ACTORS } from "@/lib/mock-data";
import type { Actor, Profile } from "@/lib/roles";

const TOUR_ICONS: Record<TourIcon, React.ComponentType<{ size?: number; className?: string }>> = {
  userCheck: UserCheck,
  laptop: Laptop,
  landmark: Building2,
  wallet: Wallet,
  creditCard: CreditCard,
};

interface DemoPersonaQuickPick {
  id: string;
  name: string;
  category: "Existing GCB Customer" | "New to GCB" | "Direct Dashboard";
  title: string;
  description: string;
  badge: string;
  route: string;
  actorId?: string;
  isTour?: boolean;
  tourId?: string;
}

const DEMO_PERSONAS: DemoPersonaQuickPick[] = [
  // Existing GCB Customers
  {
    id: "multi",
    name: "Kwame Mensah",
    category: "Existing GCB Customer",
    title: "Multi-Account · Personal & Joint Accounts",
    description: "Matches 4 accounts (Personal Current, Joint Savings, Reserve Savings, USD); pick primary account.",
    badge: "Primary Picker",
    route: "/activate?persona=multi",
    actorId: "u-joint",
  },
  {
    id: "single",
    name: "Ama Serwaa",
    category: "Existing GCB Customer",
    title: "Single Account · 1 Savings Account",
    description: "Standard retail customer with one savings account auto-designated as primary.",
    badge: "Single Account",
    route: "/activate?persona=single",
    actorId: "u-retail",
  },
  {
    id: "mobile_sync",
    name: "Abena Osei",
    category: "Existing GCB Customer",
    title: "Mobile App User · Fast Web Sync",
    description: "Existing GCB Mobile App user activating web banking with matched profile.",
    badge: "Mobile Sync",
    route: "/activate?persona=mobile_sync",
    actorId: "u-abena",
  },
  {
    id: "new_device",
    name: "Yaw Oppong",
    category: "Existing GCB Customer",
    title: "Existing Customer · New Device MFA",
    description: "Unrecognised browser/device security challenge with 30-day trust option.",
    badge: "Security / MFA",
    route: "/mfa?device=new",
    actorId: "u-yaw",
  },

  // New to GCB Customers
  {
    id: "new_cos",
    name: "Kofi Mensah",
    category: "New to GCB",
    title: "Open Full Account · COS Portal",
    description: "Redirects to GCB Customer Onboarding & Origination System (COOS).",
    badge: "COOS Portal",
    route: "/get-started",
    actorId: "u-kofi",
  },
  {
    id: "new_wallet",
    name: "Tsotsoo Mills",
    category: "New to GCB",
    title: "Start with Mobile Money Wallet",
    description: "Registers with Ghana Card and links a mobile-money wallet for everyday banking.",
    badge: "Wallet Registration",
    route: "/signup?flow=wallet_card",
  },
  {
    id: "new_card",
    name: "Kofi Addo",
    category: "New to GCB",
    title: "Start with Bank Card",
    description: "Registers with Ghana Card and links an existing bank debit/credit card.",
    badge: "Card Registration",
    route: "/signup?flow=wallet_card",
  },
  {
    id: "new_business",
    name: "Adinkra Textiles Ltd",
    category: "New to GCB",
    title: "Business Account Onboarding",
    description: "Corporate entity registration with TIN, certificate of incorporation, and mandate.",
    badge: "Corporate",
    route: "/signup/business",
  },
];

function PersonaFlowSwitcherContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { signIn, selectProfile, verifyMfa } = useSession();
  const startTour = useTour((s) => s.start);
  const activeTourId = useTour((s) => s.activeTourId);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"existing" | "new" | "tours" | "dashboards">("existing");
  // Client-only: the dock sits in the root layout and reads search params, so the
  // server may render this boundary as its fallback while the browser renders the
  // dock — a hydration mismatch. A demo overlay has nothing worth server-rendering,
  // so it appears after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Onboarding / entry surfaces only
  const isOnboardingSide =
    pathname === "/" ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/activate") ||
    pathname?.startsWith("/get-started") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/mfa") ||
    pathname?.startsWith("/forgot-password");

  if (!mounted || !isOnboardingSide || activeTourId) return null;

  // Active persona context label
  const personaParam = searchParams.get("persona");
  let currentPersonaLabel = "Demo Showcase";
  if (pathname === "/activate") {
    if (personaParam === "single") currentPersonaLabel = "Single Account (Ama)";
    else if (personaParam === "mobile_sync") currentPersonaLabel = "Mobile Sync (Abena)";
    else currentPersonaLabel = "Multi-Account (Kwame M.)";
  } else if (pathname === "/get-started") {
    currentPersonaLabel = "Registration Entry";
  } else if (pathname?.startsWith("/signup")) {
    currentPersonaLabel = "New Customer Sign Up";
  }

  function handleSelectPersona(item: DemoPersonaQuickPick) {
    if (item.actorId) {
      const actor = ACTORS.find((a) => a.id === item.actorId);
      if (actor) signIn(actor);
    }
    router.push(item.route);
    setIsOpen(false);
  }

  function handleJumpDashboard(actorId: string) {
    const actor = ACTORS.find((a) => a.id === actorId) || ACTORS[0];
    signIn(actor);
    if (actor.profiles.length > 0) selectProfile(actor.profiles[0]);
    verifyMfa();
    router.push("/overview");
    setIsOpen(false);
  }

  function handleLaunchTour(tour: Tour) {
    if (tour.startActorId) {
      const actor = ACTORS.find((a) => a.id === tour.startActorId);
      if (actor) signIn(actor);
    }
    startTour(tour.id);
    router.push(tour.startRoute);
    setIsOpen(false);
  }

  return (
    <>
      {/* Floating Demo Control Dock */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-xl transition-all hover:border-border">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-9 items-center gap-2 rounded-full bg-muted/60 px-3 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.97] cursor-pointer"
        >
          <div className="flex size-5 items-center justify-center rounded-full bg-foreground/10 text-foreground">
            <Sparkles size={11} strokeWidth={2.2} />
          </div>
          <span>Demo Hub:</span>
          <span className="text-foreground/90 font-normal">
            {currentPersonaLabel}
          </span>
          <ChevronDown size={14} className="text-muted-foreground ml-0.5" />
        </button>

        {/* In-dock quick toggles for activate page */}
        {pathname === "/activate" && (
          <div className="hidden sm:flex items-center gap-1 border-l border-border/80 pl-1.5 pr-1">
            <button
              type="button"
              onClick={() => router.push("/activate?persona=multi")}
              className={`rounded-full px-2.5 py-1 text-[11.5px] transition-colors cursor-pointer ${
                personaParam === "multi" || !personaParam
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Multi (Personal + Joint)
            </button>
            <button
              type="button"
              onClick={() => router.push("/activate?persona=single")}
              className={`rounded-full px-2.5 py-1 text-[11.5px] transition-colors cursor-pointer ${
                personaParam === "single"
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => router.push("/activate?persona=mobile_sync")}
              className={`rounded-full px-2.5 py-1 text-[11.5px] transition-colors cursor-pointer ${
                personaParam === "mobile_sync"
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Mobile
            </button>
          </div>
        )}
      </div>

      {/* Demo Showcase Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border/70">
              <div>
                <h3 className="text-[19px] text-foreground flex items-center gap-2 tracking-[-0.01em]">
                  <Sparkles size={20} className="text-foreground" />
                  Onboarding &amp; Persona Showcase Hub
                </h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Select any persona or use case to immediately demonstrate the full user flow and UI states.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 mt-4 p-1 rounded-2xl bg-muted/40 border border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab("existing")}
                className={`flex-1 rounded-xl py-2 text-[12.5px] transition-all cursor-pointer ${
                  activeTab === "existing"
                    ? "bg-card text-foreground font-medium shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Existing GCB Customers
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("new")}
                className={`flex-1 rounded-xl py-2 text-[12.5px] transition-all cursor-pointer ${
                  activeTab === "new"
                    ? "bg-card text-foreground font-medium shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                New to GCB
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tours")}
                className={`flex-1 rounded-xl py-2 text-[12.5px] transition-all cursor-pointer ${
                  activeTab === "tours"
                    ? "bg-card text-foreground font-medium shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Guided Walkthroughs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("dashboards")}
                className={`flex-1 rounded-xl py-2 text-[12.5px] transition-all cursor-pointer ${
                  activeTab === "dashboards"
                    ? "bg-card text-foreground font-medium shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Direct Jumps
              </button>
            </div>

            {/* TAB 1: Existing GCB Customers */}
            {activeTab === "existing" && (
              <div className="mt-4 space-y-2.5">
                {DEMO_PERSONAS.filter((p) => p.category === "Existing GCB Customer").map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPersona(item)}
                    className="group w-full flex items-center justify-between rounded-2xl border border-border/80 bg-background/50 p-4 text-left transition-all duration-150 hover:border-border hover:bg-card hover:shadow-xs active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                        {item.id === "multi" ? (
                          <Layers size={18} />
                        ) : item.id === "joint" ? (
                          <Users size={18} />
                        ) : item.id === "mobile_sync" ? (
                          <Smartphone size={18} />
                        ) : item.id === "new_device" ? (
                          <Laptop size={18} />
                        ) : (
                          <UserCheck size={18} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-foreground truncate">
                            {item.name}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground shrink-0">
                            {item.badge}
                          </span>
                        </div>
                        <span className="text-[13px] text-foreground/80 mt-0.5 block">
                          {item.title}
                        </span>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all ml-3">
                      <ChevronRight size={18} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* TAB 2: New to GCB */}
            {activeTab === "new" && (
              <div className="mt-4 space-y-2.5">
                {DEMO_PERSONAS.filter((p) => p.category === "New to GCB").map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPersona(item)}
                    className="group w-full flex items-center justify-between rounded-2xl border border-border/80 bg-background/50 p-4 text-left transition-all duration-150 hover:border-border hover:bg-card hover:shadow-xs active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                        {item.id === "new_cos" ? (
                          <Building2 size={18} />
                        ) : item.id === "new_wallet" ? (
                          <Wallet size={18} />
                        ) : item.id === "new_card" ? (
                          <CreditCard size={18} />
                        ) : (
                          <Building2 size={18} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-foreground truncate">
                            {item.name}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground shrink-0">
                            {item.badge}
                          </span>
                        </div>
                        <span className="text-[13px] text-foreground/80 mt-0.5 block">
                          {item.title}
                        </span>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all ml-3">
                      <ChevronRight size={18} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* TAB 3: Guided Walkthroughs */}
            {activeTab === "tours" && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TOURS.map((tour) => {
                  const Icon = TOUR_ICONS[tour.icon];
                  return (
                    <button
                      key={tour.id}
                      type="button"
                      onClick={() => handleLaunchTour(tour)}
                      className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-background/50 p-4 text-left transition-all duration-150 hover:border-border hover:bg-card hover:shadow-xs active:scale-[0.98] cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                            <Icon size={16} />
                          </div>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground font-medium">
                            {tour.badge}
                          </span>
                        </div>
                        <h4 className="text-[13.5px] font-medium text-foreground">{tour.name}</h4>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{tour.title}</p>
                        <p className="text-[11.5px] leading-snug text-muted-foreground/80 mt-1.5">
                          {tour.summary}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-[12px] font-medium text-foreground group-hover:translate-x-0.5 transition-transform">
                        <span>Launch walkthrough →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 4: Direct Dashboard Jumps */}
            {activeTab === "dashboards" && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleJumpDashboard("u-retail")}
                  className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/50 p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-card cursor-pointer group"
                >
                  <div>
                    <span className="text-[13px] font-medium text-foreground block">Ama Serwaa</span>
                    <span className="text-[11.5px] text-muted-foreground">Retail Single Dashboard</span>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => handleJumpDashboard("u-dual")}
                  className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/50 p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-card cursor-pointer group"
                >
                  <div>
                    <span className="text-[13px] font-medium text-foreground block">Kwame Boateng</span>
                    <span className="text-[11.5px] text-muted-foreground">Dual Retail + Corporate</span>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => handleJumpDashboard("u-joint")}
                  className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/50 p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-card cursor-pointer group"
                >
                  <div>
                    <span className="text-[13px] font-medium text-foreground block">Kwame &amp; Efua</span>
                    <span className="text-[11.5px] text-muted-foreground">Joint Mandate Dashboard</span>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => handleJumpDashboard("u-corpadmin")}
                  className="flex items-center justify-between rounded-2xl border border-border/80 bg-background/50 p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-card cursor-pointer group"
                >
                  <div>
                    <span className="text-[13px] font-medium text-foreground block">Yaw Oppong</span>
                    <span className="text-[11.5px] text-muted-foreground">Corporate Admin Portal</span>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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

