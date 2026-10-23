"use client";

/**
 * Policy → Statement. Every premium paid, by year, with the year's total, so the customer can see it here without
 * downloading anything. "Email Statement" sends the chosen year to the registered address (Figma: "Your statement will
 * be sent to your registered email"). It needs no code: it only goes to an address the bank already holds.
 */

import { useState } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/ui/list-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { PolicyNotFound } from "@/components/insure/parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { sumMoney } from "@/lib/money";
import { useSession } from "@/lib/session-store";
import { findPlan } from "@/lib/insurance-plans";
import { useInsuranceHydrated, usePolicy } from "@/lib/insurance";

export function PolicyStatement({ policyId }: { policyId: string }) {
  const hydrated = useInsuranceHydrated();
  const { policy } = usePolicy(policyId);
  const email = useSession((s) => s.actor?.email) ?? "";
  const { showAmounts } = useAmountVisibility();
  const [picked, setPicked] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!hydrated) return <FormPageSkeleton fields={2} />;
  if (!policy) return <PolicyNotFound title="Statement" />;

  const plan = findPlan(policy.planId);
  const money = (n: number) => formatMoney(n, "GHS", showAmounts);
  const yearsHeld = [...new Set(policy.payments.map((p) => p.date.slice(0, 4)))].sort().reverse();
  const year = picked && (picked === "all" || yearsHeld.includes(picked)) ? picked : (yearsHeld[0] ?? "all");
  const options = [...yearsHeld.map((y) => ({ value: y, label: y })), { value: "all", label: "All" }];
  const shown = policy.payments.filter((p) => year === "all" || p.date.startsWith(year)).sort((a, b) => b.date.localeCompare(a.date));
  const total = sumMoney(shown.map((p) => p.amount));

  function send() {
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      toast.success(year === "all" ? `Your full statement is on its way to ${email}.` : `Your ${year} statement is on its way to ${email}.`, {
        id: "insure-statement",
      });
    }, 700);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Statement" backTo={{ href: `/insure/policies/${policy.id}`, label: plan?.name ?? "Policy" }} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5">
        <p className="tabular px-1 text-[13px] text-muted-foreground">{`${plan?.name} · ${policy.number}`}</p>

        {yearsHeld.length > 0 ? (
          <>
            <SegmentedControl aria-label="Year" options={options} value={year} onChange={setPicked} />
            <div className="flex items-baseline justify-between gap-4 px-1">
              <span className="text-[14px] text-muted-foreground">{year === "all" ? "Paid in total" : `Paid in ${year}`}</span>
              <span className="tabular text-[22px] tracking-[var(--ls-tight)] text-foreground">{money(total)}</span>
            </div>
            <ListCard>
              {shown.map((p) => (
                <li key={p.date} className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 sm:px-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[14px] text-foreground">Premium</span>
                    <span className="tabular text-[12px] text-muted-foreground">{formatDate(p.date)}</span>
                  </span>
                  <span className="tabular shrink-0 text-[14px] text-foreground">{money(p.amount)}</span>
                </li>
              ))}
            </ListCard>
            {email && (
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" className="h-11 w-full rounded-2xl text-[15px]" loading={sending} onClick={send}>
                  Email Statement
                </Button>
                <p className="px-1 text-center text-[12px] text-muted-foreground">{`Sent to ${email}, your registered email.`}</p>
              </div>
            )}
          </>
        ) : (
          <p className="px-1 text-[14px] text-muted-foreground">No premiums have been paid yet. They’ll show here as each one is taken.</p>
        )}
      </div>
    </div>
  );
}
