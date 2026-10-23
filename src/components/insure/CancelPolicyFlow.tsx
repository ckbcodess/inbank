"use client";

/**
 * Policy → Cancel Policy. A request: StarLife contacts the customer to complete it. What cancelling means is said
 * before the button, as plain facts (cover ends, premiums stop, what a savings plan pays back), and asking for the
 * reason is the only other step. No code: stopping is never harder than starting, and nothing moves until StarLife
 * calls. A policy still waiting for its medical is "withdrawn" rather than cancelled, since it never started.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { FactsPanel } from "@/components/invest/parts";
import { PolicyNotFound } from "@/components/insure/parts";
import { formatMoney } from "@/lib/mock-data";
import { MOCK_TODAY } from "@/lib/treasury";
import { CANCEL_REASONS, INSURE_HOME, PROVIDER, findPlan } from "@/lib/insurance-plans";
import { surrenderValue, useInsurance, useInsuranceHydrated, usePolicy } from "@/lib/insurance";

const money = (n: number) => formatMoney(n, "GHS", true);

export function CancelPolicyFlow({ policyId }: { policyId: string }) {
  const router = useRouter();
  const hydrated = useInsuranceHydrated();
  const { policy } = usePolicy(policyId);
  const requestCancellation = useInsurance((s) => s.requestCancellation);
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!hydrated) return <FormPageSkeleton fields={2} />;
  if (!policy) return <PolicyNotFound title="Cancel Policy" />;

  const plan = findPlan(policy.planId);
  const base = `/insure/policies/${policy.id}`;
  const withdraw = policy.status === "pending-medical";
  const title = withdraw ? "Withdraw Application" : "Cancel Policy";

  if (done) {
    return (
      <PaymentSuccessScreen
        title="Request received"
        message={`${PROVIDER} will contact you shortly to complete it. Your cover continues until then. Thank you for your feedback.`}
        onPrimaryAction={() => router.push(base)}
        primaryActionLabel="Back to Policy"
        onSecondaryAction={() => router.push(INSURE_HOME)}
        secondaryActionLabel="Back to Insure"
        showSaveBeneficiary={false}
        customActionCards={[]}
      />
    );
  }

  const savings = plan?.kind === "savings";
  const cashBack = savings ? surrenderValue(policy) : 0;
  const consequences: Array<[string, React.ReactNode]> = withdraw
    ? [
        ["Your application", "Withdrawn"],
        ["Premiums taken", money(0)],
      ]
    : [
        ["Your cover", "Ends once cancelled"],
        ["Premiums", "Stop being taken"],
        ...(savings
          ? ([["Paid back to you", cashBack > 0 ? `About ${money(cashBack)}` : "Nothing yet, in the first 2 years"]] as Array<[string, React.ReactNode]>)
          : []),
      ];

  const reasonText = reason === "Other" ? other.trim() : reason;
  const ready = Boolean(reason) && (reason !== "Other" || other.trim().length >= 3);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} backTo={{ href: base, label: plan?.name ?? "Policy" }} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5">
        <p className="tabular px-1 text-[13px] text-muted-foreground">{`${plan?.name} · ${policy.number}`}</p>
        <FactsPanel rows={consequences} />
        {savings && !withdraw && (
          <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
            {`This is the plan’s cash value today, before ${PROVIDER} confirms it. It’s paid into your account once the cancellation is complete.`}
          </p>
        )}

        <Field label="Why Are You Cancelling?" hint="It helps us improve. Your answer doesn’t change anything about the request.">
          <Select value={reason} onValueChange={(v) => v && setReason(v)}>
            <SelectTrigger aria-label="Reason for cancelling">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {CANCEL_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {reason === "Other" && (
          <Field label="Your Reason" htmlFor="cancel-reason" className="animate-in fade-in slide-in-from-top-2 duration-200">
            <Textarea id="cancel-reason" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Tell us in a few words" />
          </Field>
        )}

        <div className="pt-2">
          <Button
            type="button"
            variant="destructive"
            className="h-11 w-full rounded-2xl text-[16px]"
            disabled={!ready}
            loading={busy}
            onClick={() => {
              setBusy(true);
              window.setTimeout(() => {
                requestCancellation(policy.id, reasonText, MOCK_TODAY);
                setBusy(false);
                setDone(true);
              }, 600);
            }}
          >
            {withdraw ? "Withdraw Application" : "Request Cancellation"}
          </Button>
          <p className="px-1 pt-2 text-center text-[12px] text-muted-foreground">{`${PROVIDER} will call you to complete it.`}</p>
        </div>
      </div>
    </div>
  );
}
