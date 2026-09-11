"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  CreditCard,
  Landmark,
  Laptop,
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

const TOUR_ICONS: Record<TourIcon, typeof UserCheck> = {
  userCheck: UserCheck,
  laptop: Laptop,
  landmark: Landmark,
  wallet: Wallet,
  creditCard: CreditCard,
};

/**
 * Signed-in states that aren't a walk-through — they drop the tester straight
 * onto a dashboard or a variant activation screen. Kept from the old switcher
 * so no persona coverage is lost.
 */
interface QuickJump {
  id: string;
  name: string;
  title: string;
  action: (helpers: {
    router: ReturnType<typeof useRouter>;
    signIn: (actor: Actor) => void;
    selectProfile: (profile: Profile) => void;
    verifyMfa: () => void;
  }) => void;
}

const QUICK_JUMPS: QuickJump[] = [
  {
    id: "joint_both",
    name: "Kwame Mensah",
    title: "Joint · both to sign → dashboard",
    action: ({ router, signIn, selectProfile, verifyMfa }) => {
      const actor = ACTORS.find((a) => a.id === "u-joint") || ACTORS[0];
      signIn(actor);
      if (actor.profiles.length > 0) selectProfile(actor.profiles[0]);
      verifyMfa();
      router.push("/overview");
    },
  },
  {
    id: "joint_either",
    name: "Kojo Appiah",
    title: "Joint · either to sign → dashboard",
    action: ({ router, signIn, selectProfile, verifyMfa }) => {
      const actor = ACTORS.find((a) => a.id === "u-joint-either") || ACTORS[0];
      signIn(actor);
      if (actor.profiles.length > 0) selectProfile(actor.profiles[0]);
      verifyMfa();
      router.push("/overview");
    },
  },
  {
    id: "joint_activation",
    name: "Kwame & Efua Mensah",
    title: "Joint account activation",
    action: ({ router }) => router.push("/activate?persona=joint"),
  },
  {
    id: "mobile_sync",
    name: "Abena Osei",
    title: "Mobile app → web sync",
    action: ({ router }) => router.push("/activate?persona=mobile_sync"),
  },
];

export default function PersonaFlowSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { signIn, selectProfile, verifyMfa } = useSession();
  const startTour = useTour((s) => s.start);
  const activeTourId = useTour((s) => s.activeTourId);
  const [isOpen, setIsOpen] = useState(false);

  // Onboarding / entry surfaces only.
  const isOnboardingSide =
    pathname === "/" ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/activate") ||
    pathname?.startsWith("/get-started") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/mfa") ||
    pathname?.startsWith("/forgot-password");

  // Hide the trigger while a tour is running — the coach card owns the screen.
  if (!isOnboardingSide || activeTourId) return null;

  function launchTour(tour: Tour) {
    if (tour.startActorId) {
      const actor = ACTORS.find((a) => a.id === tour.startActorId);
      if (actor) signIn(actor);
    }
    startTour(tour.id);
    router.push(tour.startRoute);
    setIsOpen(false);
  }

  function runQuickJump(jump: QuickJump) {
    jump.action({ router, signIn, selectProfile, verifyMfa });
    setIsOpen(false);
  }

  return (
    <>
      {/* Floating trigger */}
      <div className="fixed bottom-5 left-5 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-9 items-center gap-2 rounded-full border border-amber-500/40 bg-card/95 px-3.5 text-[12.5px] font-semibold text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:border-amber-500 active:scale-[0.96] cursor-pointer"
        >
          <div className="flex size-5 items-center justify-center rounded-full bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200]">
            <Sparkles size={12} />
          </div>
          <span>Persona &amp; Flow Switcher</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border/70">
              <div>
                <h3 className="text-[18px] text-foreground flex items-center gap-2 tracking-[-0.01em]">
                  <Sparkles size={18} className="text-[#E5A500] dark:text-[#F2B200]" />
                  Onboarding journeys
                </h3>
                <p className="text-[12.5px] text-muted-foreground mt-0.5">
                  Pick a user type — we&apos;ll walk you through it, highlighting exactly what to click.
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

            {/* Guided tours — the five user types */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TOURS.map((tour) => {
                const Icon = TOUR_ICONS[tour.icon];
                return (
                  <button
                    key={tour.id}
                    type="button"
                    onClick={() => launchTour(tour)}
                    className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-background/60 p-4 text-left transition-all duration-200 hover:border-[#E5A500] hover:bg-[#FFFBF0] dark:hover:bg-[#F2B200]/10 hover:shadow-md active:scale-[0.96] cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200] transition-colors group-hover:bg-[#E5A500] group-hover:text-white dark:group-hover:bg-[#F2B200] dark:group-hover:text-black">
                          <Icon size={18} />
                        </div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                          {tour.badge}
                        </span>
                      </div>
                      <h4 className="text-[13.5px] text-foreground tracking-[-0.01em]">{tour.name}</h4>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{tour.title}</p>
                      <p className="text-[11.5px] leading-snug text-muted-foreground/80 mt-2">
                        {tour.summary}
                      </p>
                    </div>
                    <div className="mt-3.5 flex items-center gap-1 text-[12px] font-semibold text-[#B27B00] dark:text-[#F2B200] group-hover:translate-x-1 transition-transform">
                      <span>Start guided walk-through →</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick jumps — signed-in states, no walk-through */}
            <div className="mt-5 pt-4 border-t border-border/70">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users size={13} />
                Jump straight in — no walk-through
              </p>
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_JUMPS.map((jump) => (
                  <button
                    key={jump.id}
                    type="button"
                    onClick={() => runQuickJump(jump)}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-background/40 px-3 py-2.5 text-left transition-colors hover:border-[#E5A500] hover:bg-[#FFFBF0] dark:hover:bg-[#F2B200]/10 active:scale-[0.97] cursor-pointer"
                  >
                    <div>
                      <span className="block text-[12.5px] text-foreground">{jump.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{jump.title}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 ml-2">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
