"use client";

/**
 * One plan, to look at before committing to anything, in a side panel over the plans list: what it is for, what it
 * costs from, what it pays, the few facts that matter, and one button to start. Looking never needs a profile;
 * starting does, and the line above the button says so.
 *
 * Figma also puts "View & Manage Policies" here. The customer's policies are already listed on Insure itself, so it
 * isn't repeated: one list, one place.
 */

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FactsPanel } from "@/components/invest/parts";
import { PlanDisc, perPeriod } from "@/components/insure/parts";
import { formatMoney } from "@/lib/mock-data";
import { COVER_TIERS, MIN_MONTHLY_PREMIUM, PROTECTION_BENEFIT_AGE, PROTECTION_SUMS, PROVIDER, findPlan, type PlanId } from "@/lib/insurance-plans";
import { planFromMonthly, useMyInsurance } from "@/lib/insurance";

const money = (n: number) => formatMoney(n, "GHS", true);

export function PlanSheet({ planId, open, onClose }: { planId: PlanId; open: boolean; onClose: () => void }) {
  const plan = findPlan(planId);
  const { profile } = useMyInsurance();
  if (!plan || !plan.kind) return null;

  const buyHref = `/insure/plans/${planId}/buy`;
  const startHref = profile ? buyHref : `/insure/profile?next=${encodeURIComponent(buyHref)}&label=${encodeURIComponent(plan.name)}`;
  const from = planFromMonthly(plan);

  const facts: Array<[string, React.ReactNode]> =
    plan.kind === "funeral"
      ? [
          ["Cover", `${money(COVER_TIERS[0].benefit)} to ${money(COVER_TIERS[COVER_TIERS.length - 1].benefit)}`],
          ["Premiums from", perPeriod(COVER_TIERS[0].monthly, "monthly")],
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
            ["Premiums from", perPeriod(MIN_MONTHLY_PREMIUM, "monthly")],
            ["Provider", PROVIDER],
          ];

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent>
        <SheetHeader className="gap-4 pt-6 sm:pt-7">
          <PlanDisc planId={planId} size={48} />
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-[20px] tracking-[var(--ls-heading)]">{plan.name}</SheetTitle>
            <SheetDescription className="text-[14px] leading-relaxed">{plan.description}</SheetDescription>
          </div>
        </SheetHeader>

        <SheetBody className="gap-6 pt-4">
          {from !== null && (
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-muted-foreground">From</span>
              <span className="tabular text-[32px] leading-none tracking-[var(--ls-heading)] text-foreground">{perPeriod(from, "monthly")}</span>
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {plan.benefits?.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[14px] text-foreground">
                <Check size={16} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-success-text" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <FactsPanel rows={facts} />
        </SheetBody>

        <SheetFooter>
          {!profile && <p className="text-center text-[13px] text-muted-foreground">You’ll create your insurance profile first. You only do it once.</p>}
          <Button nativeButton={false} render={<Link href={startHref} />} className="h-11 w-full rounded-2xl text-[16px]">
            Get Started
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
