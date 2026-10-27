"use client";

/**
 * One plan's own page (`/insure/plans/[id]`). It is two pages, never both, because the customer is in one of two
 * situations (PATTERNS §24):
 *
 *  - No policy under this plan: the pitch. A picture, the three benefits, the price set into a dashed divider
 *    (`PlanPitchBody`), and one button that names the plan (Apply for ...), or Create a Profile when there is no
 *    profile. The facts (term, cover, provider) are on the About page and in the buy flow's quote. Looking never needs a profile; it is asked for at the button, where the customer has just chosen a plan,
 *    and the plan is kept.
 *  - One or more policies: only the policies. A heading with a small Apply for Another, the policies (the one that needs
 *    the customer first), and an About chip beside the title that opens the explanation in a sheet. However many policies
 *    there are, nothing else moves.
 */

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Info } from "@/components/ui/icons";
import { AboutSheet } from "@/components/ui/about-sheet";
import { HolderActions } from "@/components/ui/holder-actions";
import { ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductPageSkeleton } from "@/components/states/PageSkeletons";
import { PlanAboutContent } from "@/components/insure/PlanAbout";
import { InsureDevTools, PlanPolicyRow } from "@/components/insure/parts";
import { useCardLooks } from "@/components/insure/PlanCards";
import { PlanPitchBody } from "@/components/insure/PlanInfo";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { INSURE_HOME, findPlan, type PlanId } from "@/lib/insurance-plans";
import { needsAttention, useInsuranceHydrated, useMyInsurance } from "@/lib/insurance";

export function PlanPage({ planId }: { planId: PlanId }) {
  const hydrated = useInsuranceHydrated();
  const { profile, policies } = useMyInsurance();
  const { showAmounts } = useAmountVisibility();
  const plan = findPlan(planId);
  const { groups: cardGroups } = useCardLooks();

  if (!hydrated) return <ProductPageSkeleton />;
  if (!plan || !plan.kind) return null;

  const mine = policies
    .filter((p) => p.planId === planId)
    .sort((a, b) => Number(needsAttention(b)) - Number(needsAttention(a)) || b.createdOn.localeCompare(a.createdOn));
  const buyHref = `/insure/plans/${planId}/buy`;
  const startHref = profile ? buyHref : `/insure/profile?next=${encodeURIComponent(buyHref)}&label=${encodeURIComponent(plan.name)}`;

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader
        title={plan.name}
        backTo={{ href: INSURE_HOME, label: "Insure" }}
        actions={
          mine.length > 0 ? (
            <AboutSheet title={`About ${plan.name}`}>
              <PlanAboutContent planId={planId} />
            </AboutSheet>
          ) : undefined
        }
      />
      <InsureDevTools extraGroups={cardGroups} />

      {mine.length > 0 ? (
        <div className="flex flex-col gap-10">
          <section className="flex flex-col gap-3">
            <SectionHeading title="Your Policies" />
            <ListCard>
              {mine.map((p) => (
                <PlanPolicyRow key={p.id} policy={p} showAmounts={showAmounts} />
              ))}
            </ListCard>
          </section>

          <HolderActions primary={{ label: "Apply for Another", href: buyHref }} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <PlanPitchBody plan={plan} showAmounts={showAmounts} />
          <div className="flex flex-col gap-3">
            <Button nativeButton={false} render={<Link href={startHref} />} className="h-12 w-full text-[16px]">
              {profile ? `Apply for ${plan.name}` : "Create a Profile"}
            </Button>
            {!profile && (
              <p className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
                <Info size={16} aria-hidden="true" className="shrink-0" />
                {`You only do it once. We keep ${plan.name} for you.`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
