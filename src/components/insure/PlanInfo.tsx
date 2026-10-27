"use client";

/**
 * A plan's information for the generic pitch (`ProductPitch.tsx`): its price, its facts, its benefits. The plan page shows the
 * pitch (`PlanPitchBody`); its About page shows the benefits over the list card (`PlanAboutBody`).
 */

import { ProductAboutBody, ProductPitchBody } from "@/components/insure/ProductPitch";
import { formatMoney } from "@/lib/mock-data";
import { COVER_TIERS, PROTECTION_BENEFIT_AGE, PROTECTION_SUMS, PROVIDER, type InsurancePlan } from "@/lib/insurance-plans";
import { planFromMonthly } from "@/lib/insurance";

/** The facts that matter for the plan: its cover or term, who it covers, and who provides it. */
function planFactRows(plan: InsurancePlan, showAmounts: boolean): Array<[string, string]> {
  const money = (n: number) => formatMoney(n, "GHS", showAmounts);
  const term: [string, string] = ["Policy term", `${plan.term?.min} to ${plan.term?.max} years`];
  const rows: Array<[string, string]> =
    plan.kind === "funeral"
      ? [
          ["Cover", `${money(COVER_TIERS[0].benefit)} to ${money(COVER_TIERS[COVER_TIERS.length - 1].benefit)}`],
          ["Who it covers", "You, and family you add"],
        ]
      : plan.kind === "protection"
        ? [
            ["Sum assured", `${money(PROTECTION_SUMS[0])} to ${money(PROTECTION_SUMS[PROTECTION_SUMS.length - 1])}`],
            term,
            ["Disability income", `Up to age ${PROTECTION_BENEFIT_AGE}`],
          ]
        : [term];
  return [...rows, ["Provider", PROVIDER]];
}

/** The pitch: picture, benefits, and "From GHS 8.00 a month" on the divider. */
export function PlanPitchBody({ plan, showAmounts }: { plan: InsurancePlan; showAmounts: boolean }) {
  const from = planFromMonthly(plan);
  return (
    <ProductPitchBody
      productId={plan.id}
      image={plan.image}
      highlights={plan.highlights ?? []}
      price={from === null ? undefined : { prefix: "From", figure: formatMoney(from, "GHS", showAmounts), suffix: "a month" }}
    />
  );
}

/** About: the benefits, then the card with the price first and larger, then the facts. */
export function PlanAboutBody({ plan, showAmounts }: { plan: InsurancePlan; showAmounts: boolean }) {
  const from = planFromMonthly(plan);
  const rows: Array<[React.ReactNode, React.ReactNode]> = [
    ...(from !== null
      ? ([["Premiums from", <span key="from" className="text-[20px]">{`${formatMoney(from, "GHS", showAmounts)} a month`}</span>]] as Array<[React.ReactNode, React.ReactNode]>)
      : []),
    ...planFactRows(plan, showAmounts),
  ];
  return <ProductAboutBody productId={plan.id} highlights={plan.highlights ?? []} rows={rows} />;
}
