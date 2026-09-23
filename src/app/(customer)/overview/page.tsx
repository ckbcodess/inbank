"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session-store";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { GcbDashboard } from "@/components/dashboard/v2/GcbDashboard";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  getSimulatedDashboardData,
  DASHBOARD_USAGE_STATES,
  DASHBOARD_STATE_LABELS,
  type DashboardUsageType,
} from "@/lib/dashboard-simulations";

function OverviewContent() {
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "true";
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();
  const [usageType, setUsageType] = useState<DashboardUsageType>("active");

  const data = useMemo(() => {
    if (!actor || !activeProfile) return null;
    return getSimulatedDashboardData({ actor, activeProfile, usageType });
  }, [actor, activeProfile, usageType]);

  if (!actor || !activeProfile || !data) return null;

  return (
    <>
      <StateSwitcher
        section="Dashboard"
        states={DASHBOARD_USAGE_STATES}
        value={usageType}
        onChange={setUsageType}
        labels={DASHBOARD_STATE_LABELS}
      />
      <GcbDashboard
        data={data}
        showAmounts={showAmounts}
        onToggle={toggleAmountVisibility}
        showWelcome={isWelcome}
      />
    </>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={null}>
      <OverviewContent />
    </Suspense>
  );
}
