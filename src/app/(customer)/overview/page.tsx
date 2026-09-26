"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session-store";
import { useAccountPrefs } from "@/lib/accounts-store";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { GcbDashboard, type DashStatus } from "@/components/dashboard/v2/GcbDashboard";
import { HeroWaveTuner } from "@/components/dashboard/v2/HeroWaveTuner";
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
  const [usageType, setUsageType] = useState<DashboardUsageType>("active");
  const [layout, setLayout] = useState<DashboardLayout>(readLayout);
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
      />
      {/* The hero card has its own floating tuner. */}
      {isHero && <HeroWaveTuner />}
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
