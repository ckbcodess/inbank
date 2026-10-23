"use client";

/**
 * Insure, one page in two sections:
 *
 *  - Your Policies: every policy the customer holds, across plans, with anything that needs them (a missed premium, a
 *    medical assessment) said on the row. Only there when they hold one.
 *  - Plans: the four plans on offer as cards. A card opens the plan in a side panel over the list, so the customer can
 *    look at one plan after another without leaving the page.
 *    Plans the bank hasn't opened yet are left off for now.
 *
 * `/insure/plans/[id]` renders this same page with that plan's panel already open, so a link, a refresh and Back from
 * the buy flow all land where the customer was.
 *
 * Browsing never needs an insurance profile. Without one, a line and one button explain that buying a plan does, and
 * that it is done once.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { ListErrorState } from "@/components/states/ListStates";
import { InvestRowBones, ListPageSkeleton } from "@/components/states/PageSkeletons";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import { InsureDevTools, PolicyRow } from "@/components/insure/parts";
import { PlanCard } from "@/components/insure/PlanCards";
import { PlanSheet } from "@/components/insure/PlanSheet";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { INSURANCE_PLANS, INSURE_HOME, type PlanId } from "@/lib/insurance-plans";
import { useInsuranceHydrated, useMyInsurance } from "@/lib/insurance";
import { useInsureCards, type PlanCardLayout, type PlanCardLook } from "@/lib/insure-cards-store";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import { cn } from "@/lib/utils";

const STATES = ["populated", "loading", "error"] as const;
type PageState = (typeof STATES)[number];
const STATE_LABELS: Record<PageState, string> = { populated: "Loaded", loading: "Loading", error: "Error" };

const CARD_LOOKS = [
  { id: "plain", label: "Plain" },
  { id: "colour", label: "Coloured" },
  { id: "art", label: "With art" },
  { id: "price", label: "With price" },
];
const CARD_LAYOUTS = [
  { id: "grid", label: "Two columns" },
  { id: "single", label: "One column" },
];

export function InsureHome({ openPlanId }: { openPlanId?: PlanId }) {
  const router = useRouter();
  const hydrated = useInsuranceHydrated();
  const { profile, policies } = useMyInsurance();
  const { showAmounts } = useAmountVisibility();
  const [state, setState] = useState<PageState>("populated");
  const [openId, setOpenId] = useState<PlanId | null>(openPlanId ?? null);
  // The panel keeps showing the plan it just had while it slides away.
  const [shownId, setShownId] = useState<PlanId | null>(openPlanId ?? null);

  // Scaffolding: production builds always show the plain two-column cards.
  const storedLook = useInsureCards((s) => s.look);
  const storedLayout = useInsureCards((s) => s.layout);
  const setLook = useInsureCards((s) => s.setLook);
  const setLayout = useInsureCards((s) => s.setLayout);
  const look: PlanCardLook = SHOW_DEMO_TOOLS ? storedLook : "plain";
  const layout: PlanCardLayout = SHOW_DEMO_TOOLS ? storedLayout : "grid";
  const cardGroups = useMemo<DevStateGroup[]>(
    () => [
      { label: "Plan cards", states: CARD_LOOKS, value: storedLook, onChange: (v) => setLook(v as PlanCardLook) },
      { label: "Card layout", states: CARD_LAYOUTS, value: storedLayout, onChange: (v) => setLayout(v as PlanCardLayout) },
    ],
    [storedLook, storedLayout, setLook, setLayout],
  );

  const openPlan = (id: PlanId) => {
    setShownId(id);
    setOpenId(id);
  };
  const closePlan = () => {
    setOpenId(null);
    // Opened from a plan's own link: go back to the plain list address.
    if (openPlanId) router.replace(INSURE_HOME);
  };

  if (!hydrated) return <ListPageSkeleton rows={4} toolbar={false} />;

  // Anything that needs the customer comes first; otherwise newest first.
  const sorted = [...policies].sort((a, b) => Number(b.arrears.length > 0) - Number(a.arrears.length > 0) || b.createdOn.localeCompare(a.createdOn));

  function yourPolicies() {
    if (state === "loading") {
      return (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Your Policies" />
          <div className="rounded-2xl border border-border bg-card p-1">
            <InvestRowBones rows={2} />
          </div>
        </section>
      );
    }
    if (state === "error") return <ListErrorState onRetry={() => setState("populated")} />;
    if (sorted.length === 0) return null;
    return (
      <section className="flex flex-col gap-3">
        <SectionHeading title="Your Policies" />
        <ListCard>
          {sorted.map((p) => (
            <PolicyRow key={p.id} policy={p} showAmounts={showAmounts} />
          ))}
        </ListCard>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Insure" />
      <InsureDevTools states={STATES} value={state} onChange={(v) => setState(v as PageState)} labels={STATE_LABELS} extraGroups={cardGroups} />
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10">
        {!profile && (
          <section className="flex flex-col gap-3 px-1">
            <h2 className="text-[17px] font-medium tracking-[var(--ls-tight)] text-foreground">Insurance with your bank account</h2>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Plans from StarLife Assurance, paid straight from your account. Look around freely. To buy one, we first create your insurance profile. You only do it once.
            </p>
            <div>
              <Button nativeButton={false} render={<Link href="/insure/profile" />}>
                Create Profile
              </Button>
            </div>
          </section>
        )}

        {yourPolicies()}

        <section className="flex flex-col gap-3">
          <SectionHeading title="Plans" />
          <div className={cn("grid gap-3 sm:gap-4", layout === "grid" ? "grid-cols-1 min-[480px]:grid-cols-2" : "grid-cols-1")}>
            {INSURANCE_PLANS.filter((p) => p.available).map((plan) => (
              <PlanCard key={plan.id} plan={plan} look={look} layout={layout} onOpen={() => openPlan(plan.id)} />
            ))}
          </div>
        </section>
      </div>

      {shownId && <PlanSheet planId={shownId} open={openId !== null} onClose={closePlan} />}
    </div>
  );
}
