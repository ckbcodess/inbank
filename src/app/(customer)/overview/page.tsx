"use client";

import { useMemo } from "react";
import { useSession } from "@/lib/session-store";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import {
  accountsForProfile,
  transactionsForProfile,
  cardsForProfile,
} from "@/lib/mock-data";
import { sumMoney } from "@/lib/money";
import {
  spendByRangeForProfile,
  accountAllocation,
  cashFlowForProfile,
  attentionItemsForProfile,
} from "@/lib/dashboard-insights";
import { GcbDashboard, type DashData } from "@/components/dashboard/v2/GcbDashboard";

export default function OverviewPage() {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();

  const kind = activeProfile?.kind ?? "RETAIL";

  const data: DashData | null = useMemo(() => {
    if (!actor || !activeProfile) return null;
    const accounts = accountsForProfile(kind);
    return {
      firstName: actor.name.split(" ")[0],
      accounts,
      netWorth: sumMoney(accounts.map((a) => a.balance ?? 0)),
      spendByRange: spendByRangeForProfile(kind),
      latestTxns: transactionsForProfile(kind)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date)),
      cards: cardsForProfile(kind),
      allocation: accountAllocation(accounts),
      cashFlow: cashFlowForProfile(kind),
      attention: attentionItemsForProfile(kind),
    };
  }, [actor, activeProfile, kind]);

  if (!actor || !activeProfile || !data) return null;

  return (
    <GcbDashboard data={data} showAmounts={showAmounts} onToggle={toggleAmountVisibility} />
  );
}
