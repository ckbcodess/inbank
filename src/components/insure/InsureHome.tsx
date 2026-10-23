"use client";

/**
 * Insure, one page in two sections:
 *
 *  - Your Policies: every policy the customer holds, across plans, with anything that needs them (a missed premium, a
 *    medical assessment) said on the row. Only there when they hold one.
 *  - Plans: the four plans on offer, each opening its own page to look at before starting. Plans the bank hasn't
 *    opened yet are listed quietly as "Coming soon", so the customer knows they exist rather than wondering.
 *
 * Browsing never needs an insurance profile. Without one, a line and one button explain that buying a plan does, and
 * that it is done once.
 */

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { ListErrorState } from "@/components/states/ListStates";
import { InvestRowBones, ListPageSkeleton } from "@/components/states/PageSkeletons";
import { InsureDevTools, PlanIcon, PolicyRow } from "@/components/insure/parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { INSURANCE_PLANS } from "@/lib/insurance-plans";
import { useInsuranceHydrated, useMyInsurance } from "@/lib/insurance";

const STATES = ["populated", "loading", "error"] as const;
type PageState = (typeof STATES)[number];
const STATE_LABELS: Record<PageState, string> = { populated: "Loaded", loading: "Loading", error: "Error" };

export function InsureHome() {
  const hydrated = useInsuranceHydrated();
  const { profile, policies } = useMyInsurance();
  const { showAmounts } = useAmountVisibility();
  const [state, setState] = useState<PageState>("populated");

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
      <InsureDevTools states={STATES} value={state} onChange={(v) => setState(v as PageState)} labels={STATE_LABELS} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-10">
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
          <ListCard>
            {INSURANCE_PLANS.map((plan) => {
              const inner = (
                <>
                  <PlanIcon planId={plan.id} muted={!plan.available} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={plan.available ? "truncate text-[14px] text-foreground" : "truncate text-[14px] text-muted-foreground"}>{plan.name}</span>
                    {plan.line && <span className="truncate text-[12px] text-muted-foreground">{plan.line}</span>}
                  </span>
                  {plan.available ? (
                    <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                  ) : (
                    <span className="shrink-0 text-[12px] text-muted-foreground">Coming soon</span>
                  )}
                </>
              );
              return (
                <li key={plan.id}>
                  {plan.available ? (
                    <Link
                      href={`/insure/plans/${plan.id}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl px-2 py-3 sm:px-3">{inner}</div>
                  )}
                </li>
              );
            })}
          </ListCard>
        </section>
      </div>
    </div>
  );
}
