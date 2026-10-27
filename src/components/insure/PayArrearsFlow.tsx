"use client";

/**
 * Policy → Pay Outstanding: the premiums that fell due and weren't taken, paid in one go. It is the one insurance action
 * that moves money now, so it follows the payment chassis: what is owed and from where on one screen (the list of
 * missed premiums is the review), then the one-time code, then the outcome with a receipt.
 *
 * The amount isn't editable: paying part of it would still leave the cover at risk, and the customer would have to
 * work out which months it covered. Figma's "nothing to pay" screen is kept for anyone who lands here with nothing owed.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Receipt } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ReviewSummary } from "@/components/ui/review-summary";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { FromAccountSelector, InsufficientFundsAlert, ProceedButton } from "@/components/payments/flows/shared";
import { OutcomeFailure } from "@/components/invest/term-deposit-parts";
import { PolicyNotFound, dueLabel, postPremiumEntry } from "@/components/insure/parts";
import { formatMoney } from "@/lib/mock-data";
import { useTreasuryAccounts, MOCK_TODAY } from "@/lib/treasury";
import { PROVIDER, findPlan } from "@/lib/insurance-plans";
import { outstanding, useInsurance, useInsuranceHydrated, usePolicy } from "@/lib/insurance";

const money = (n: number) => formatMoney(n, "GHS", true);

export function PayArrearsFlow({ policyId }: { policyId: string }) {
  const router = useRouter();
  const hydrated = useInsuranceHydrated();
  const { policy } = usePolicy(policyId);
  const payArrears = useInsurance((s) => s.payArrears);
  const failRequests = useInsurance((s) => s.failRequests);
  const accounts = useTreasuryAccounts();
  const [pickedFrom, setPickedFrom] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [result, setResult] = useState<{ trn: string; amount: number; months: number } | null>(null);
  const [failed, setFailed] = useState(false);

  const fromId = useMemo(() => {
    if (pickedFrom && accounts.some((a) => a.id === pickedFrom)) return pickedFrom;
    return accounts.find((a) => a.id === policy?.accountId)?.id ?? accounts[0]?.id ?? "";
  }, [pickedFrom, accounts, policy?.accountId]);
  const from = accounts.find((a) => a.id === fromId);

  if (!hydrated) return <FormPageSkeleton fields={2} />;
  if (!policy && !result) return <PolicyNotFound title="Pay Outstanding" />;

  const base = `/insure/policies/${policyId}`;
  const plan = policy ? findPlan(policy.planId) : undefined;
  const back = { href: base, label: plan?.name ?? "Policy" };

  if (result) {
    return (
      <PaymentSuccessScreen
        title="Premiums paid"
        message={`You paid ${money(result.amount)} to ${PROVIDER}. Your policy is up to date.`}
        transactionId={result.trn}
        receiptRows={[
          ["Policy", `${plan?.name ?? ""} · ${policy?.number ?? ""}`],
          ["Premiums paid", String(result.months)],
          ["Fee", money(0)],
        ]}
        customActionCards={[{ id: "receipt", label: "View Receipt", icon: Receipt }]}
        showSaveBeneficiary={false}
        onPrimaryAction={() => router.push(base)}
        primaryActionLabel="Back to Policy"
      />
    );
  }
  if (failed) {
    return (
      <OutcomeFailure
        title="The payment didn’t go through"
        message="Nothing was taken from your account. Your premiums are still outstanding, so try again."
        onRetry={() => setFailed(false)}
        onLeave={() => router.push(base)}
        leaveLabel="Back to Policy"
      />
    );
  }
  if (!policy) return null;

  const owed = outstanding(policy);
  if (owed <= 0) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title="Pay Outstanding" backTo={back} />
        <TrueEmptyState
          icon={<CheckCircle2 size={22} strokeWidth={1.8} />}
          title="You have nothing outstanding"
          description="Every premium on this policy has been paid."
          action={
            <Button nativeButton={false} render={<Link href={base} />}>
              Back to Policy
            </Button>
          }
        />
      </div>
    );
  }

  const overBalance = Boolean(from) && owed > (from?.available ?? 0);

  function authorised() {
    if (!policy || !from) return;
    if (failRequests) {
      setFailed(true);
      return;
    }
    const trn = postPremiumEntry({ amount: owed, account: from, policy });
    setResult({ trn, amount: owed, months: policy.arrears.length });
    payArrears(policy.id, MOCK_TODAY);
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title="Pay Outstanding" backTo={back} />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <FromAccountSelector accounts={accounts} value={fromId} onChange={setPickedFrom} />
          {overBalance && <InsufficientFundsAlert />}
        </div>
        <ReviewSummary
          details={[
            { label: "Policy", value: `${plan?.name} · ${policy.number}` },
            { label: "Paid to", value: PROVIDER },
          ]}
          breakdown={[
            ...policy.arrears.map((a) => ({ label: dueLabel(a.due), value: money(a.amount), tabular: true })),
            { label: "Fee", value: money(0), tabular: true },
          ]}
          total={money(owed)}
        />
        <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">Paying now brings your policy up to date. Your next premium is still taken on its usual date.</p>
        <ProceedButton disabled={!from || overBalance} onClick={() => setAuthOpen(true)} label="Pay Now" />
      </div>

      <TransactionOtpModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => {
          setAuthOpen(false);
          authorised();
        }}
      />
    </div>
  );
}
