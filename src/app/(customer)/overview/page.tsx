"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session-store";
import { useAccountPrefs } from "@/lib/accounts-store";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { toast } from "sonner";
import { GcbDashboard, type DashStatus } from "@/components/dashboard/v2/GcbDashboard";
import { HeroWaveTuner } from "@/components/dashboard/v2/HeroWaveTuner";
import { OPEN_FUND_EVENT } from "@/lib/payment-options";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import { FirstRunWelcome } from "@/components/dashboard/v2/FirstRunWelcome";
import { QuickFundModal, type FundResume } from "@/components/dashboard/v2/QuickFundModal";
import { useCardPaymentReturn } from "@/lib/card-payment";
import { SaveSourcePrompt, sourceFromFunding, useIsLinked } from "@/components/dashboard/v2/SaveSourcePrompt";
import {
  clearHasSkippedFunding,
  peekVerifiedMobile,
  setFirstRun,
  setPendingFundPrompt,
  setPendingReferral,
  type PendingFundingSource,
} from "@/lib/device-trust";
import { ChevronDown, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import {
  getSimulatedDashboardData,
  DASHBOARD_USAGE_STATES,
  DASHBOARD_STATE_LABELS,
  DASHBOARD_LAYOUTS,
  DEFAULT_DASHBOARD_LAYOUT,
  DASHBOARD_LAYOUT_LABELS,
  type DashboardLayout,
  type DashboardUsageType,
} from "@/lib/dashboard-simulations";

/** How long a simulated fetch takes — long enough to see, short enough not to annoy. */
const FETCH_MS = 700;

/** Dev Mode's layout pick survives a reload (per browser, a reviewing convenience). */
const LAYOUT_KEY = "nibs-dash-layout";

function readLayout(): DashboardLayout {
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LAYOUT_KEY) : null;
    return DASHBOARD_LAYOUTS.includes(stored as DashboardLayout) ? (stored as DashboardLayout) : DEFAULT_DASHBOARD_LAYOUT;
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
}

function OverviewContent() {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  const defaultAccountId = useAccountPrefs((s) => s.defaultAccountId);
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();
  // Opens on the clean Active state; Dev Mode's Data state switches it.
  const [usageType, setUsageType] = useState<DashboardUsageType>("active");
  const [layout, setLayout] = useState<DashboardLayout>(readLayout);
  const [fundModalOpen, setFundModalOpen] = useState(false);
  // Back from the bank's 3-D Secure page after funding with a card: reopen on the receipt, or on the form.
  const [fundResume, setFundResume] = useState<FundResume | null>(null);
  useCardPaymentReturn("quick-fund", ({ status, payment }) => {
    setFundResume({ status, amount: payment.amount, cardLast4: payment.last4 });
    setFundModalOpen(true);
  });
  // Asked after a later top-up (the first one is asked inside FirstRunWelcome).
  const [saveSource, setSaveSource] = useState<PendingFundingSource | null>(null);
  const saveSourceLinked = useIsLinked(saveSource);
  const [fetching, setFetching] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  // The switched-to account lives in the URL so a refresh keeps it; leaving
  // the dashboard and coming back lands on the default again.
  const accountId = useSearchParams().get("account");

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // "Top up → My Account" in the action picker asks the dashboard to open the add-money flow.
  useEffect(() => {
    const open = () => setFundModalOpen(true);
    window.addEventListener(OPEN_FUND_EVENT, open);
    return () => window.removeEventListener(OPEN_FUND_EVENT, open);
  }, []);

  const isHero = layout === "hero" || layout === "hero-split";

  const layoutGroups = useMemo<DevStateGroup[]>(
    () => [
      {
        label: "Dashboard layout",
        states: DASHBOARD_LAYOUTS.map((id) => ({ id, label: DASHBOARD_LAYOUT_LABELS[id] })),
        value: layout,
        onChange: (next) => {
          setLayout(next as DashboardLayout);
          try {
            localStorage.setItem(LAYOUT_KEY, next);
          } catch {
            // Storage blocked — the pick lasts for this visit only.
          }
        },
      },
    ],
    [layout],
  );

  const data = useMemo(() => {
    if (!actor || !activeProfile) return null;
    return getSimulatedDashboardData({ actor, activeProfile, usageType, accountId, defaultAccountId });
  }, [actor, activeProfile, usageType, accountId, defaultAccountId]);

  if (!actor || !activeProfile || !data) return null;

  // Dev Mode can pin either state; otherwise it follows a real refresh.
  const status: DashStatus =
    usageType === "loading" || fetching ? "loading" : usageType === "error" ? "error" : "ready";

  const refresh = () => {
    if (usageType === "error") setUsageType("active"); // a retry recovers the demo
    setFetching(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setFetching(false);
      setUpdatedAt(Date.now());
    }, FETCH_MS);
  };

  const selectAccount = (id: string) => {
    // The default needs no param — keep its URL clean.
    router.replace(id === data.defaultAccountId ? pathname : `${pathname}?account=${id}`, { scroll: false });
  };

  const applyFunding = (
    amount: number,
    method: "momo" | "card",
    details: { operator?: string; phone?: string; cardLast4?: string }
  ) => {
    clearHasSkippedFunding();
    setUsageType("new_customer");
    toast.success(`GHS ${amount.toFixed(2)} deposited successfully!`, {
      description: `${method === "momo" ? (details.operator || "Mobile Money") : "Card"} deposit added to your account.`,
    });
  };

  const handleFundSuccess = (
    amount: number,
    method: "momo" | "card",
    details: { operator?: string; phone?: string; cardLast4?: string }
  ) => {
    applyFunding(amount, method, details);
    setSaveSource(sourceFromFunding(method, details));
  };

  const triggerPostOnboarding = (
    stage: "all" | "referral" | "ready" | "fund" | "source"
  ) => {
    setFirstRun("new");
    if (stage === "all" || stage === "referral") {
      setPendingReferral(true);
    }
    if (stage === "all" || stage === "ready" || stage === "fund") {
      setPendingFundPrompt(true);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-welcome-flow", {
          detail: { stage, kind: "new" },
        })
      );
    }
  };

  return (
    <>
      <StateSwitcher
        section="Dashboard"
        states={DASHBOARD_USAGE_STATES}
        value={usageType}
        onChange={setUsageType}
        labels={DASHBOARD_STATE_LABELS}
        label="Data state"
        groups={layoutGroups}
      />
      <GcbDashboard
        layout={layout}
        data={data}
        status={status}
        updatedAt={updatedAt}
        showAmounts={showAmounts}
        onToggle={toggleAmountVisibility}
        onSelectAccount={selectAccount}
        onRefresh={refresh}
        onOpenFundModal={() => setFundModalOpen(true)}
      />
      {/* The hero card has its own floating tuner. */}
      {isHero && <HeroWaveTuner />}
      {/* Once, right after onboarding or moving from the old internet banking. */}
      <FirstRunWelcome firstName={data.firstName} onFunded={applyFunding} />
      {/* Interactive Quick Fund Modal */}
      <QuickFundModal
        open={fundModalOpen}
        onOpenChange={(next) => {
          setFundModalOpen(next);
          if (!next) setFundResume(null);
        }}
        resume={fundResume}
        onSuccess={handleFundSuccess}
        registeredPhone={fundModalOpen ? peekVerifiedMobile() : undefined}
        accountName={data.accounts[0]?.name || "Virtual Wallet"}
      />
      {saveSource && !saveSourceLinked && (
        <SaveSourcePrompt source={saveSource} onDone={() => setSaveSource(null)} />
      )}

      {SHOW_DEMO_TOOLS && (
        <>
        {/* Session helper: button to bring up post-onboarding cards for editing (easily removed after session) */}
        <div className="fixed bottom-5 right-5 z-40">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[13px] font-medium text-foreground shadow-lg transition-colors hover:bg-muted outline-none">
              <Sparkles size={14} className="text-muted-foreground" aria-hidden="true" />
              <span>Post-Onboarding Cards</span>
              <ChevronDown size={13} className="text-muted-foreground" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                className="cursor-pointer text-[13px] font-medium"
                onClick={() => triggerPostOnboarding("all")}
              >
                Play Full Sequence →
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-[13px]"
                onClick={() => triggerPostOnboarding("referral")}
              >
                1. Referral Code
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-[13px]"
                onClick={() => triggerPostOnboarding("ready")}
              >
                2. Fund Account Prompt
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-[13px]"
                onClick={() => triggerPostOnboarding("fund")}
              >
                3. Quick Fund Modal
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-[13px]"
                onClick={() => triggerPostOnboarding("source")}
              >
                4. Save Funding Source
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </>
      )}
    </>
  );
}

export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewContent />
    </Suspense>
  );
}
