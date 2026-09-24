"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session-store";
import { useAccountPrefs } from "@/lib/accounts-store";
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
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  const defaultAccountId = useAccountPrefs((s) => s.defaultAccountId);
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();
  const [usageType, setUsageType] = useState<DashboardUsageType>("active");
  const router = useRouter();
  const pathname = usePathname();
  // The switched-to account lives in the URL so a refresh keeps it; leaving
  // the dashboard and coming back lands on the default again.
  const accountId = useSearchParams().get("account");

  const data = useMemo(() => {
    if (!actor || !activeProfile) return null;
    return getSimulatedDashboardData({ actor, activeProfile, usageType, accountId, defaultAccountId });
  }, [actor, activeProfile, usageType, accountId, defaultAccountId]);

  if (!actor || !activeProfile || !data) return null;

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
      />
      <GcbDashboard
        data={data}
        showAmounts={showAmounts}
        onToggle={toggleAmountVisibility}
        onSelectAccount={selectAccount}
      />
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
