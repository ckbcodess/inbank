"use client";

/**
 * Insure is a shelf: the plans on offer as cards, the same for every customer. Each card carries one quiet line about
 * what the customer already holds under it ("2 policies"), amber when something needs them (a missed premium, a medical
 * assessment). A card opens the plan's own page (`PlanPage`), where the policies sit above the explanation and one
 * button changes with the customer. No policy list and no profile prompt on this page: the profile is asked for at the
 * button, where the customer has just chosen a plan. Plans the bank hasn't opened yet are left off for now.
 */

import { useState } from "react";
import { ProductBanner } from "@/components/ui/product-banner";
import { useProductAlertItems } from "@/lib/product-alerts";
import { InsureWelcome } from "@/components/insure/InsureWelcome";
import PageHeader from "@/components/layout/PageHeader";
import { ListErrorState } from "@/components/states/ListStates";
import { ShelfPageSkeleton } from "@/components/states/PageSkeletons";
import { InsureDevTools } from "@/components/insure/parts";
import { PlanCard, useCardLooks, type ProductStatus } from "@/components/insure/PlanCards";
import { INSURANCE_PLANS, type PlanId } from "@/lib/insurance-plans";
import { needsAttention, useInsuranceHydrated, useMyInsurance } from "@/lib/insurance";
import { cn } from "@/lib/utils";

const STATES = ["populated", "loading", "error"] as const;
type PageState = (typeof STATES)[number];
const STATE_LABELS: Record<PageState, string> = { populated: "Loaded", loading: "Loading", error: "Error" };

export function InsureHome() {
  const alerts = useProductAlertItems().insure;
  const hydrated = useInsuranceHydrated();
  const { policies } = useMyInsurance();
  const [state, setState] = useState<PageState>("populated");
  const { look, layout, groups: cardGroups } = useCardLooks();

  if (!hydrated || state === "loading") {
    return (
      <div className="flex flex-col gap-6">
        {hydrated && <InsureDevTools states={STATES} value={state} onChange={(v) => setState(v as PageState)} labels={STATE_LABELS} extraGroups={cardGroups} />}
        <ShelfPageSkeleton cards={4} />
      </div>
    );
  }

  const statusOf = (planId: PlanId): ProductStatus | undefined => {
    const mine = policies.filter((p) => p.planId === planId);
    if (mine.length === 0) return undefined;
    const attention = mine.filter(needsAttention).length;
    const count = mine.length === 1 ? "1 policy" : `${mine.length} policies`;
    return attention > 0 ? { text: `${count} · ${attention} needs attention`, attention: true } : { text: count };
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Insure" />
      <InsureDevTools states={STATES} value={state} onChange={(v) => setState(v as PageState)} labels={STATE_LABELS} extraGroups={cardGroups} />
      <InsureWelcome />
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10">
        <ProductBanner items={alerts} noun="policies" />
        {state === "error" ? (
          <ListErrorState onRetry={() => setState("populated")} />
        ) : (
          <div className={cn("grid gap-3 sm:gap-4", layout === "grid" ? "grid-cols-1 min-[480px]:grid-cols-2" : "grid-cols-1")}>
            {INSURANCE_PLANS.filter((p) => p.available).map((plan) => (
              <PlanCard key={plan.id} plan={plan} look={look} layout={layout} status={statusOf(plan.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
