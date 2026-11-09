"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session-store";
import { useAccountPrefs } from "@/lib/accounts-store";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { toast } from "sonner";
import { GcbDashboard, type DashStatus } from "@/components/dashboard/v2/GcbDashboard";
import { HeroWaveTuner } from "@/components/dashboard/v2/HeroWaveTuner";
import { OPEN_FUND_EVENT } from "@/lib/payment-options";
import { useRefreshHandler } from "@/lib/pull-refresh";
import { FirstRunWelcome } from "@/components/dashboard/v2/FirstRunWelcome";
import { ProductTour } from "@/components/dashboard/v2/ProductTour";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import { useProductTour } from "@/lib/product-tour";
import { QuickFundModal, type FundResume } from "@/components/dashboard/v2/QuickFundModal";
import { useCardPaymentReturn } from "@/lib/card-payment";
import { SaveSourcePrompt, sourceFromFunding, useIsLinked } from "@/components/dashboard/v2/SaveSourcePrompt";
import {
  clearHasSkippedFunding,
  peekVerifiedMobile,
  type PendingFundingSource,
} from "@/lib/device-trust";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  getSimulatedDashboardData,
  DASHBOARD_USAGE_STATES,
  DASHBOARD_BANNER_STATES,
  DASHBOARD_STATE_LABELS,
  DASHBOARD_LAYOUTS,
  DEFAULT_DASHBOARD_LAYOUT,
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

/**
 * `accountId` is the switched-to account from the URL (the page reads it and needs Suspense for it). `loading` forces the
 * loading status: the route's loading.tsx draws the dashboard itself, so its own loading states do the arriving.
 */
export function OverviewContent({ accountId = null, loading: forced = false }: { accountId?: string | null; loading?: boolean }) {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  const defaultAccountId = useAccountPrefs((s) => s.defaultAccountId);
  const { showAmounts } = useAmountVisibility();
  // Opens on the clean Active state; Dev Mode's Data state switches it.
  const [usageType, setUsageType] = useState<DashboardUsageType>("active");
  const [layout] = useState<DashboardLayout>(readLayout);
  const [fundModalOpen, setFundModalOpen] = useState(false);
  // Back from the bank's 3-D Secure page after funding with a card: reopen on the receipt, or on the form.
  const [fundResume, setFundResume] = useState<FundResume | null>(null);
  useCardPaymentReturn("quick-fund", ({ status, payment }) => {
    setFundResume({ status, amount: payment.amount, cardLast4: payment.last4 });
    setFundModalOpen(true);
  }, !forced);
  // Asked after a later top-up (the first one is asked inside FirstRunWelcome).
  const [saveSource, setSaveSource] = useState<PendingFundingSource | null>(null);
  const saveSourceLinked = useIsLinked(saveSource);
  const [fetching, setFetching] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();

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


  const data = useMemo(() => {
    if (!actor || !activeProfile) return null;
    return getSimulatedDashboardData({ actor, activeProfile, usageType, accountId, defaultAccountId });
  }, [actor, activeProfile, usageType, accountId, defaultAccountId]);

  // Dev Mode: the banner scenarios, and the customer's product tour on demand (it starts by itself once, after the first-run welcome).
  const devGroups = useMemo<DevStateGroup[]>(
    () => [
      {
        label: "Banner",
        states: DASHBOARD_BANNER_STATES.map((id) => ({ id, label: DASHBOARD_STATE_LABELS[id] })),
        // Empty while a data state is picked, so only one of the two lists shows a selection.
        value: DASHBOARD_BANNER_STATES.includes(usageType) ? usageType : "",
        onChange: (next) => setUsageType(next as DashboardUsageType),
      },
      {
        label: "Product tour",
        states: [{ id: "replay", label: "Replay the tour" }],
        value: "",
        onChange: () => useProductTour.getState().start(),
      },
    ],
    [usageType],
  );

  const refresh = () => {
    if (usageType === "error") setUsageType("active"); // a retry recovers the demo
    setFetching(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setFetching(false);
      setUpdatedAt(Date.now());
    }, FETCH_MS);
  };
  // Pulling down at the top of the page runs the same refresh as the button, and waits for it.
  useRefreshHandler(() => {
    refresh();
    return new Promise<void>((done) => window.setTimeout(done, FETCH_MS));
  });

  if (!actor || !activeProfile || !data) return null;

  // Dev Mode can pin either state; otherwise it follows a real refresh.
  const status: DashStatus =
    forced || usageType === "loading" || fetching ? "loading" : usageType === "error" ? "error" : "ready";

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

  return (
    <>
      {!forced && (
        <StateSwitcher
          section="Dashboard"
          states={DASHBOARD_USAGE_STATES}
          value={usageType}
          onChange={setUsageType}
          labels={DASHBOARD_STATE_LABELS}
          label="Data state"
          groups={devGroups}
        />
      )}
      <GcbDashboard
        layout={layout}
        data={data}
        status={status}
        updatedAt={updatedAt}
        showAmounts={showAmounts}
        onSelectAccount={selectAccount}
        onRefresh={refresh}
        onOpenFundModal={() => setFundModalOpen(true)}
      />
      {/* The hero card has its own floating tuner. */}
      {isHero && !forced && <HeroWaveTuner />}
      {/* Once, right after onboarding or moving from the old internet banking. */}
      {!forced && <FirstRunWelcome firstName={data.firstName} onFunded={applyFunding} />}
      {/* A few tooltips pointing at the controls above, started once after the welcome. */}
      {!forced && (
        <ProductTour multiAccount={data.accounts.length > 1} />
      )}
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
    </>
  );
}
