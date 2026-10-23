"use client";

/**
 * Policy → Update Beneficiaries. Figma splits this into an Edit row (change the shares) and a Delete row (remove
 * someone, then give their share to someone else); here both happen in the one editor the purchase uses, and one code
 * saves the result. Nothing changes on the policy until then, so a removal can be undone from its toast.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { ProceedButton } from "@/components/payments/flows/shared";
import { AuthSummary } from "@/components/invest/parts";
import { BeneficiaryEditor, beneficiariesReady, isMinor } from "@/components/insure/BeneficiaryEditor";
import { PolicyNotFound } from "@/components/insure/parts";
import { findPlan } from "@/lib/insurance-plans";
import { useInsurance, useInsuranceHydrated, usePolicy, type BeneficiaryShare, type Policy } from "@/lib/insurance";

function Editor({ policy }: { policy: Policy }) {
  const router = useRouter();
  const { ownerId, people } = usePolicy(policy.id);
  const setBeneficiaries = useInsurance((s) => s.setBeneficiaries);
  const [list, setList] = useState<BeneficiaryShare[]>(policy.beneficiaries);
  const [trusteeId, setTrusteeId] = useState<string | undefined>(policy.trusteeId);
  const [authOpen, setAuthOpen] = useState(false);

  const base = `/insure/policies/${policy.id}`;
  const plan = findPlan(policy.planId);
  const changed =
    JSON.stringify(list) !== JSON.stringify(policy.beneficiaries) || (trusteeId ?? "") !== (policy.trusteeId ?? "");
  const needsTrustee = list.some((b) => isMinor(people.find((p) => p.id === b.personId)));
  const name = (id: string) => people.find((p) => p.id === id)?.fullName ?? "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Update Beneficiaries" backTo={{ href: base, label: plan?.name ?? "Policy" }} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5">
        <p className="tabular px-1 text-[13px] text-muted-foreground">{`${plan?.name} · ${policy.number}`}</p>
        <BeneficiaryEditor ownerId={ownerId} people={people} value={list} onChange={setList} trusteeId={trusteeId} onTrusteeChange={setTrusteeId} />
        <ProceedButton disabled={!changed || !beneficiariesReady(list, people, trusteeId)} onClick={() => setAuthOpen(true)} label="Save Changes" />
        {!changed && <p className="-mt-2 px-1 text-center text-[12px] text-muted-foreground">Change a share, or add or remove someone, to save.</p>}
      </div>

      <TransactionOtpModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => {
          setBeneficiaries(policy.id, list, needsTrustee ? trusteeId : undefined);
          setAuthOpen(false);
          toast.success("Beneficiaries updated.", { id: "insure-beneficiaries" });
          router.push(base);
        }}
        summary={
          <AuthSummary
            headline={`Update who your ${plan?.name ?? "policy"} pays`}
            rows={list.map((b) => [name(b.personId), `${b.share}%`] as [string, string])}
          />
        }
      />
    </div>
  );
}

export function UpdateBeneficiariesFlow({ policyId }: { policyId: string }) {
  const hydrated = useInsuranceHydrated();
  const { policy } = usePolicy(policyId);
  if (!hydrated) return <FormPageSkeleton fields={3} />;
  if (!policy) return <PolicyNotFound title="Update Beneficiaries" />;
  return <Editor policy={policy} />;
}
