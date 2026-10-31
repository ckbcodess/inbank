"use client";

/**
 * Advance → Repay Now (Figma "Repay Salary Advance"). Clears the advance in full or in bits:
 * the amount, interest for the days it was out, and any late charge.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { ReviewSummary } from "@/components/ui/review-summary";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { AmountInput, FromAccountSelector, InsufficientFundsAlert, ProceedButton } from "@/components/payments/flows/shared";
import { OutcomeFailure } from "@/components/invest/term-deposit-parts";
import { AdvanceNotFound, postLoanEntry } from "@/components/loans/parts";
import { formatMoney } from "@/lib/mock-data";
import { daysBetween, MOCK_TODAY, useTreasuryAccounts } from "@/lib/treasury";
import {
  ADVANCE_PRODUCTS,
  interestBy,
  lateChargeBy,
  MIN_PARTIAL_REPAYMENT,
  owedBy,
  totalRepaid,
  useLoans,
  useLoansHydrated,
  useMyLoans,
} from "@/lib/loans";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { roundMoney } from "@/lib/money";

const money = (n: number) => formatMoney(n, "GHS", true);
const asNumber = (v: string) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;

type RepayMode = "full" | "part";

const REPAY_OPTIONS = [
  { value: "full" as const, label: "In Full" },
  { value: "part" as const, label: "In Bits" },
];

export function RepayAdvanceFlow({ advanceId }: { advanceId: string }) {
  const router = useRouter();
  const hydrated = useLoansHydrated();
  const { advances, income } = useMyLoans();
  const repay = useLoans((s) => s.repay);
  const failRequests = useLoans((s) => s.failRequests);
  const accounts = useTreasuryAccounts();
  const [pickedFrom, setPickedFrom] = useState("");
  const [mode, setMode] = useState<RepayMode>("full");
  const [partAmount, setPartAmount] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [result, setResult] = useState<{ trn: string; amount: number; repaidInFull: boolean } | null>(null);
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
        title={result.repaidInFull ? "Advance repaid" : "Payment received"}
        message={
          result.repaidInFull
            ? `You repaid ${money(result.amount)}. Nothing more is owed, and your next credit arrives in full.`
            : `You paid ${money(result.amount)} towards your advance.`
        }
        transactionId={result.trn}
        receiptRows={[
          ["Advance", `${name} · ${advance.reference}`],
          ["Fee", money(0)],
        ]}
        customActionCards={[{ id: "receipt", label: "View Receipt", icon: Receipt }]}
        showSaveBeneficiary={false}
        onPrimaryAction={() => router.push(result.repaidInFull ? "/loans" : base)}
        primaryActionLabel={result.repaidInFull ? "Back to Loans" : "Back to Advance"}
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
  const alreadyRepaid = totalRepaid(advance);
  const days = Math.max(daysBetween(advance.disbursedOn ?? MOCK_TODAY, MOCK_TODAY), 1);

  const partNum = asNumber(partAmount);
  const isPart = mode === "part";
  const payAmount = isPart ? partNum : total;

  let amountError: string | null = null;
  if (isPart) {
    if (partAmount && partNum < MIN_PARTIAL_REPAYMENT) {
      amountError = `Minimum ${money(MIN_PARTIAL_REPAYMENT)}`;
    } else if (partNum > total) {
      amountError = `Maximum ${money(total)}`;
    }
  }

  const isValidAmount = isPart ? partNum >= MIN_PARTIAL_REPAYMENT && partNum <= total : total > 0;
  const overBalance = Boolean(from) && payAmount > (from?.available ?? 0);
  const remainingAfter = Math.max(0, roundMoney(total - payAmount));

  function authorised() {
    if (!advance || !from || !isValidAmount) return;
    if (failRequests) {
      setFailed(true);
      return;
    }
    const trn = postLoanEntry({
      direction: "debit",
      amount: payAmount,
      account: from,
      advance,
      isPartial: payAmount < total,
    });
    const res = repay(advance.id, payAmount, MOCK_TODAY, from.id);
    setResult({ trn, amount: payAmount, repaidInFull: res.repaidInFull });
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title="Repay Now" backTo={{ href: base, label: name }} />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <FromAccountSelector accounts={accounts} value={fromId} onChange={setPickedFrom} />
          {overBalance && <InsufficientFundsAlert />}
        </div>

        <SegmentedControl<RepayMode>
          aria-label="Repayment"
          options={REPAY_OPTIONS}
          value={mode}
          onChange={(m) => {
            setMode(m);
            if (m === "full") setPartAmount("");
          }}
          fullWidth
        />

        {isPart && (
          <AmountInput
            value={partAmount}
            onChange={setPartAmount}
            currency="GHS"
            label="Amount"
            error={amountError}
          />
        )}

        <ReviewSummary
          details={[{ label: "Advance", value: `${name} · ${advance.reference}` }]}
          breakdown={[
            { label: "Amount advanced", value: money(advance.amount), tabular: true },
            ...(alreadyRepaid > 0 ? [{ label: "Paid so far", value: `-${money(alreadyRepaid)}`, tabular: true }] : []),
            { label: days === 1 ? "Interest for 1 day" : `Interest for ${days} days`, value: money(interest), tabular: true },
            ...(late > 0 ? [{ label: "Late charges", value: money(late), tabular: true }] : []),
            ...(isPart && remainingAfter > 0 ? [{ label: "Remaining", value: money(remainingAfter), tabular: true }] : []),
            { label: "Fee", value: money(0), tabular: true },
          ]}
          total={money(payAmount)}
        />

        {!isPart && <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">Your next credit arrives in full.</p>}

        <ProceedButton
          disabled={!from || overBalance || !isValidAmount}
          onClick={() => setAuthOpen(true)}
          label="Repay Now"
        />
      </div>

      <TransactionOtpModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        amount={money(payAmount)}
        summary={`${name} · ${advance.reference}`}
        onSuccess={() => {
          setAuthOpen(false);
          authorised();
        }}
      />
    </div>
  );
}
