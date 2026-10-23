"use client";

/**
 * One plan, to look at before committing to anything: what it is for, what it pays, the few facts that matter, and
 * one button to start. Looking never needs a profile; starting does, and the line above the button says so.
 *
 * Figma also puts "View & Manage Policies" here. The customer's policies are already listed on Insure itself, so it
 * isn't repeated: one list, one place.
 */

import Link from "next/link";
import { Check } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { FactsPanel } from "@/components/invest/parts";
import { InsureDevTools } from "@/components/insure/parts";
import { OfferDetailSkeleton } from "@/components/states/PageSkeletons";
import { formatMoney } from "@/lib/mock-data";
import { COVER_TIERS, INSURE_HOME, MIN_MONTHLY_PREMIUM, PROTECTION_BENEFIT_AGE, PROTECTION_SUMS, PROVIDER, findPlan, type PlanId } from "@/lib/insurance-plans";
import { useInsuranceHydrated, useMyInsurance } from "@/lib/insurance";

const money = (n: number) => formatMoney(n, "GHS", true);

export function PlanDetail({ planId }: { planId: PlanId }) {
  const plan = findPlan(planId);
  const hydrated = useInsuranceHydrated();
  const { profile } = useMyInsurance();

  if (!plan || !plan.kind) return null;
  if (!hydrated) return <OfferDetailSkeleton />;

  const buyHref = `/insure/plans/${planId}/buy`;
  const startHref = profile ? buyHref : `/insure/profile?next=${encodeURIComponent(buyHref)}&label=${encodeURIComponent(plan.name)}`;

  const facts: Array<[string, React.ReactNode]> =
    plan.kind === "funeral"
      ? [
          ["Cover", `${money(COVER_TIERS[0].benefit)} to ${money(COVER_TIERS[COVER_TIERS.length - 1].benefit)}`],
          ["Premiums from", `${money(COVER_TIERS[0].monthly)} a month`],
          ["Who it covers", "You, and family you add"],
          ["Provider", PROVIDER],
        ]
      : plan.kind === "protection"
        ? [
            ["Sum assured", `${money(PROTECTION_SUMS[0])} to ${money(PROTECTION_SUMS[PROTECTION_SUMS.length - 1])}`],
            ["Policy term", `${plan.term?.min} to ${plan.term?.max} years`],
            ["Disability income", `Up to age ${PROTECTION_BENEFIT_AGE}`],
            ["Provider", PROVIDER],
          ]
        : [
            ["Policy term", `${plan.term?.min} to ${plan.term?.max} years`],
            ["Premiums from", `${money(MIN_MONTHLY_PREMIUM)} a month`],
            ["Provider", PROVIDER],
          ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={plan.name} backTo={{ href: INSURE_HOME, label: "Insure" }} />
      <InsureDevTools />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6">
        <p className="px-1 text-[15px] leading-relaxed text-foreground">{plan.description}</p>

        <ul className="flex flex-col gap-3 px-1">
          {plan.benefits?.map((b) => (
            <li key={b} className="flex items-start gap-3 text-[14px] text-foreground">
              <Check size={16} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-success-text" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <FactsPanel rows={facts} />

        <div className="flex flex-col gap-2">
          {!profile && (
            <p className="px-1 text-center text-[13px] text-muted-foreground">You’ll create your insurance profile first. You only do it once.</p>
          )}
          <Button nativeButton={false} render={<Link href={startHref} />} className="h-11 w-full rounded-2xl text-[16px]">
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
