"use client";

/**
 * What a plan is: the explanation a customer who holds policies under it opens from the About chip on the plan page
 * (`AboutSheet`). The description, the benefits, and the list card with the price and the facts.
 */

import { PlanAboutBody } from "@/components/insure/PlanInfo";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { findPlan, type PlanId } from "@/lib/insurance-plans";

export function PlanAboutContent({ planId }: { planId: PlanId }) {
  const { showAmounts } = useAmountVisibility();
  const plan = findPlan(planId);

  if (!plan || !plan.kind) return null;

  return (
    <>
      {plan.description && <p className="px-1 text-[14px] leading-relaxed text-muted-foreground">{plan.description}</p>}
      <PlanAboutBody plan={plan} showAmounts={showAmounts} />
    </>
  );
}
