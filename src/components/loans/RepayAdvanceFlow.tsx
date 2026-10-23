"use client";

/**
 * Advance → Repay Now (Figma "Repay Salary Advance"). Clears the advance in full: the amount, interest for the days it
 * was out, and any late charge, each on its own line so the total explains itself. Figma shows the amount in a field;
 * it isn't editable here, because part-paying would still leave the rest to come out of the next salary with interest.
 * Then the one-time code, the outcome, and a receipt.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { ReviewSummary } from "@/components/ui/review-summary";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { FromAccountSelector, InsufficientFundsAlert, ProceedButton } from "@/components/payments/flows/shared";
import { AuthSummary } from "@/components/invest/parts";
import { OutcomeFailure } from "@/components/invest/term-deposit-parts";
import { AdvanceNotFound, postLoanEntry } from "@/components/loans/parts";
import { formatMoney } from "@/lib/mock-data";
import { daysBetween, MOCK_TODAY, useTreasuryAccounts } from "@/lib/treasury";
import { ADVANCE_PRODUCTS, interestBy, lateChargeBy, owedBy, useLoans, useLoansHydrated, useMyLoans } from "@/lib/loans";

const money = (n: number) => formatMoney(n, "GHS", true);

export function RepayAdvanceFlow({ advanceId }: { advanceId: string }) {
  const router = useRouter();
  const hydrated = useLoansHydrated();
  const { advances, income } = useMyLoans();
  const repay = useLoans((s) => s.repay);
  const failRequests = useLoans((s) => s.failRequests);
  const accounts = useTreasuryAccounts();
  const [pickedFrom, setPickedFrom] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [result, setResult] = useState<{ trn: string; amount: number } | null>(null);
  const [failed, setFailed] = useState(false);

  const advance = advances.find((a) => a.id === advanceId);
  const fromId = useMemo(() => {
    if (pickedFrom && accounts.some((a) => a.id === pickedFrom)) return pickedFrom;
    return accounts.find((a) => a.id === income?.accountId)?.id ?? accounts[0]?.id ?? "";
  }, [pickedFrom, accounts, income?.accountId]);
  const from = accounts.find((a) => a.id === fromId);

  if (!hydrated) return <FormPageSkeleton fields={2} />;
  if (!advance) return <AdvanceNotFound title="Repay Now" />;

  const base = `/loans/${advance.id}`;
  const name = ADVANCE_PRODUCTS[advance.kind].name;

  if (result) {
    return (
      <PaymentSuccessScreen
        title="Advance repaid"
        message={`You repaid ${money(result.amount)}. Nothing more is owed, and your next credit arrives in full.`}
        transactionId={result.trn}
        receiptRows={[
          ["Advance", `${name} · ${advance.reference}`],
          ["Fee", money(0)],
        ]}
        customActionCards={[{ id: "receipt", label: "View Receipt", icon: Receipt }]}
        showSaveBeneficiary={false}
        onPrimaryAction={() => router.push("/loans")}
        primaryActionLabel="Back to Loans"
      />
    );
  }
  if (failed) {
    return (
      <OutcomeFailure
        title="The repayment didn’t go through"
        message="Nothing was taken from your account. Your advance is still open, so try again."
        onRetry={() => setFailed(false)}
        onLeave={() => router.push(base)}
        leaveLabel="Back to Advance"
      />
    );
  }
  if (advance.status !== "active") return <AdvanceNotFound title="Repay Now" />;

  const interest = interestBy(advance);
  const late = lateChargeBy(advance);
  const total = owedBy(advance);
  const days = Math.max(daysBetween(advance.disbursedOn ?? MOCK_TODAY, MOCK_TODAY), 1);
  const overBalance = Boolean(from) && total > (from?.available ?? 0);

  function authorised() {
    if (!advance || !from) return;
    if (failRequests) {
      setFailed(true);
      return;
    }
    const trn = postLoanEntry({ direction: "debit", amount: total, account: from, advance });
    setResult({ trn, amount: total });
    repay(advance.id, total, MOCK_TODAY);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Repay Now" backTo={{ href: base, label: name }} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5">
        <div className="flex flex-col gap-2">
          <FromAccountSelector accounts={accounts} value={fromId} onChange={setPickedFrom} />
          {overBalance && <InsufficientFundsAlert />}
        </div>
        <ReviewSummary
          details={[{ label: "Advance", value: `${name} · ${advance.reference}` }]}
          breakdown={[
            { label: "Amount advanced", value: money(advance.amount), tabular: true },
            { label: days === 1 ? "Interest for 1 day" : `Interest for ${days} days`, value: money(interest), tabular: true },
            ...(late > 0 ? [{ label: "Late charges", value: money(late), tabular: true }] : []),
            { label: "Fee", value: money(0), tabular: true },
          ]}
          total={money(total)}
        />
        <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">This clears the advance. Your next credit arrives in full.</p>
        <ProceedButton disabled={!from || overBalance} onClick={() => setAuthOpen(true)} label="Repay Now" />
      </div>

      <TransactionOtpModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => {
          setAuthOpen(false);
          authorised();
        }}
        summary={
          <AuthSummary
            headline={`Repay your ${name}`}
            amount={money(total)}
            rows={[
              ["Reference", advance.reference],
              ["From", from ? `${from.name} · ${from.number}` : ""],
            ]}
          />
        }
      />
    </div>
  );
}
