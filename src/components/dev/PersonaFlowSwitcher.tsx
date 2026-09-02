"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  ExternalLink,
  Laptop,
  Layers,
  Smartphone,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { useSession } from "@/lib/session-store";
import { ACTORS } from "@/lib/mock-data";

interface PersonaFlow {
  id: string;
  name: string;
  title: string;
  badge: string;
  description: string;
  icon: typeof User;
  action: () => void;
}

export default function PersonaFlowSwitcher() {
  const router = useRouter();
  const { signIn, selectProfile, verifyMfa } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const flows: PersonaFlow[] = [
    {
      id: "ama",
      name: "Ama Serwaa",
      title: "New Customer (Card / Wallet)",
      badge: "Onboarding",
      description: "Registers via Ghana Card + Selfie, then links mobile money wallet / card on dashboard.",
      icon: CreditCard,
      action: () => {
        router.push("/signup?flow=wallet_card");
        setIsOpen(false);
      },
    },
    {
      id: "kofi",
      name: "Kofi Mensah",
      title: "New Customer (COOS Redirection)",
      badge: "Account Opening",
      description: "New to GCB, routed to the COOS online portal for account opening.",
      icon: ExternalLink,
      action: () => {
        router.push("/get-started");
        setIsOpen(false);
      },
    },
    {
      id: "joint_activation",
      name: "Kwame Mensah",
      title: "Joint Account Activation",
      badge: "Joint Onboarding",
      description: "Existing customer onboarding with Joint Premier Savings (co-signatory Efua Mensah).",
      icon: Users,
      action: () => {
        router.push("/activate?persona=joint");
        setIsOpen(false);
      },
    },
    {
      id: "joint_both_sign",
      name: "Kwame Mensah",
      title: "Joint: Both to Sign Mandate",
      badge: "Dual Authority",
      description: "Joint Premier Savings with Efua Mensah. Transfers require secondary co-signatory approval.",
      icon: Users,
      action: () => {
        const actor = ACTORS.find((a) => a.id === "u-joint") || ACTORS[0];
        signIn(actor);
        if (actor.profiles.length > 0) {
          selectProfile(actor.profiles[0]);
        }
        verifyMfa();
        router.push("/overview");
        setIsOpen(false);
      },
    },
    {
      id: "joint_either_sign",
      name: "Kojo Appiah",
      title: "Joint: Either to Sign Mandate",
      badge: "Single Authority",
      description: "Joint Family Savings with Akosua Appiah. Transfers execute immediately with 1 PIN.",
      icon: Users,
      action: () => {
        const actor = ACTORS.find((a) => a.id === "u-joint-either") || ACTORS[0];
        signIn(actor);
        if (actor.profiles.length > 0) {
          selectProfile(actor.profiles[0]);
        }
        verifyMfa();
        router.push("/overview");
        setIsOpen(false);
      },
    },
    {
      id: "abena",
      name: "Abena Osei",
      title: "Mobile App → Web First-Time",
      badge: "Channel Sync",
      description: "Registered on GCB Mobile App, setting up web credentials for the first time.",
      icon: Smartphone,
      action: () => {
        router.push("/activate?persona=mobile_sync");
        setIsOpen(false);
      },
    },
    {
      id: "yaw",
      name: "Yaw Oppong",
      title: "New Device Sign-in Challenge",
      badge: "Security Gate",
      description: "Signs in from an unrecognized browser, prompting a 30-day device trust challenge.",
      icon: Laptop,
      action: () => {
        const actor = ACTORS.find((a) => a.id === "u-yaw") || ACTORS[0];
        signIn(actor);
        router.push("/mfa?device=new");
        setIsOpen(false);
      },
    },
  ];

  return (
    <>
      {/* Floating Trigger Button in Bottom Left */}
      <div className="fixed bottom-5 left-5 z-50">
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

      {/* Slide-over / Modal Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl transition-all">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/70">
              <div>
                <h3 className="text-[18px] font-bold text-foreground flex items-center gap-2">
                  <Sparkles size={18} className="text-[#E5A500] dark:text-[#F2B200]" />
                  Test Personas &amp; Onboarding Flows
                </h3>
                <p className="text-[12.5px] text-muted-foreground mt-0.5">
                  Select any persona below to immediately simulate their journey.
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

            {/* Persona Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {flows.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={f.action}
                    className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-background/60 p-4 text-left transition-all duration-200 hover:border-[#E5A500] hover:bg-[#FFFBF0] dark:hover:bg-[#F2B200]/10 hover:shadow-md active:scale-[0.96] cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200] transition-colors group-hover:bg-[#E5A500] group-hover:text-white dark:group-hover:bg-[#F2B200] dark:group-hover:text-black">
                          <Icon size={18} />
                        </div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                          {f.badge}
                        </span>
                      </div>

                      <h4 className="text-[14px] font-bold text-foreground">
                        {f.name}
                      </h4>
                      <p className="text-[12px] font-medium text-muted-foreground mt-0.5">
                        {f.title}
                      </p>
                      <p className="text-[11.5px] leading-snug text-muted-foreground/80 mt-2">
                        {f.description}
                      </p>
                    </div>

                    <div className="mt-3.5 flex items-center gap-1 text-[12px] font-semibold text-[#B27B00] dark:text-[#F2B200] group-hover:translate-x-1 transition-transform">
                      <span>Launch flow →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
