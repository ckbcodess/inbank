"use client";

/**
 * Invest → Term Deposit → open one.
 *
 * Blocks appear one at a time: account → how long → how much → what happens at maturity and what it comes to →
 * review → one-time code → outcome. Figma has a "Calculate" button between the amount and the result; here the result
 * is simply there as soon as the amount is valid, and the customer's code goes through the same gate as every payment.
 */

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Receipt } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { OptionTile } from "@/components/ui/option-tile";
import { Field } from "@/components/ui/field";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { AmountInput, FromAccountSelector, InsufficientFundsAlert, ProceedButton } from "@/components/payments/flows/shared";
import { ReviewSummary } from "@/components/ui/review-summary";
import { INVEST_HOME } from "@/components/invest/parts";
import { DepositInstructionField, OutcomeFailure, postDepositEntry } from "@/components/invest/term-deposit-parts";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { sumMoney } from "@/lib/money";
import { TermsAgreement, TermsHint } from "@/components/ui/terms-agreement";
import { depositTerms } from "@/lib/terms";
import { useSession } from "@/lib/session-store";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import { addDays, MOCK_TODAY, useTreasuryAccounts } from "@/lib/treasury";
import {
  depositInstructionLabel,
  interestFor,
  MIN_DEPOSIT,
  rateFor,
  TENURES,
  useMyDeposits,
  useTermDeposits,
  type DepositInstruction,
} from "@/lib/term-deposits";

const asNumber = (v: string) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
const money = (n: number) => formatMoney(n, "GHS", true);

export function NewDepositFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const chosenDays = Number(params.get("days")) || null;
  const { hydrated } = useMyDeposits();
  const ownerId = useSession((s) => s.actor?.id) ?? "guest";
  const openDeposit = useTermDeposits((s) => s.open);
  const failRequests = useTermDeposits((s) => s.failRequests);
  const accounts = useTreasuryAccounts();
  const { defaultId } = useCustomerAccounts();

  const [screen, setScreen] = useState<"form" | "review" | "success" | "failed">("form");
  const [pickedFrom, setPickedFrom] = useState("");
  const [tenure, setTenure] = useState<number | null>(TENURES.some((t) => t.days === chosenDays) ? chosenDays : null);
  const initialAmount = params.get("amount") || "";
  const [amount, setAmount] = useState(initialAmount);
  const [instruction, setInstruction] = useState<DepositInstruction>("close");
  const [authOpen, setAuthOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [result, setResult] = useState<{ trn: string; maturity: string } | null>(null);

  const fromId = useMemo(() => {
    if (pickedFrom && accounts.some((a) => a.id === pickedFrom)) return pickedFrom;
    return accounts.find((a) => a.id === defaultId)?.id ?? accounts[0]?.id ?? "";
  }, [pickedFrom, accounts, defaultId]);
  const from = accounts.find((a) => a.id === fromId);

  const back = { href: INVEST_HOME, label: "Invest" };

  function reset() {
    setScreen("form");
    setTenure(null);
    setAmount("");
    setInstruction("close");
    setResult(null);
  }

  if (!hydrated) return <FormPageSkeleton fields={3} />;

  if (accounts.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title="New Term Deposit" backTo={back} />
        <TrueEmptyState
          title="You don’t have an account to deposit from"
          description="A term deposit is paid for in cedis from an active current or savings account."
        />
      </div>
    );
  }

  const num = asNumber(amount);
  const rate = tenure ? rateFor(tenure) : 0;
  const interest = tenure ? interestFor(num, rate, tenure) : 0;
  const maturity = tenure ? addDays(MOCK_TODAY, tenure) : "";
  const tooSmall = num > 0 && num < MIN_DEPOSIT;
  const overBalance = Boolean(from) && num > (from?.available ?? 0);
  const valid = Boolean(from && tenure) && num >= MIN_DEPOSIT && !overBalance;
  const atMaturity = instruction === "rollover" ? interest : sumMoney([num, interest]);

  function authorised() {
    if (!from || !tenure) return;
    if (failRequests) {
      setScreen("failed");
      return;
    }
    const deposit = openDeposit({ ownerId, principal: num, tenureDays: tenure, instruction, fromAccountId: from.id });
    const trn = postDepositEntry({
      direction: "debit",
      amount: num,
      account: from,
      reference: deposit.reference,
      description: `Term deposit · ${tenure} days`,
    });
    setResult({ trn, maturity: deposit.maturity });
    setScreen("success");
  }

  /* ── Outcomes ────────────────────────────────────────────────────────── */
  if (screen === "success" && result) {
    return (
      <PaymentSuccessScreen
        title="Term deposit created"
        message={`Your ${money(num)} term deposit is open. It matures on ${formatDate(result.maturity)}.`}
        transactionId={result.trn}
        customActionCards={[{ id: "receipt", label: "View Receipt", icon: Receipt }]}
        showSaveBeneficiary={false}
        onPrimaryAction={() => router.push(INVEST_HOME)}
        primaryActionLabel="Back to Invest"
        onSecondaryAction={reset}
        secondaryActionLabel="Open another"
      />
    );
  }
  if (screen === "failed") {
    return (
      <OutcomeFailure
        title="Your term deposit wasn’t created"
        message="Nothing was taken from your account. Check the details and try again."
        onRetry={() => setScreen("review")}
        onLeave={() => router.push(INVEST_HOME)}
        leaveLabel="Back to Invest"
      />
    );
  }

  /* ── Review ──────────────────────────────────────────────────────────── */
  if (screen === "review" && tenure) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title="Review and Confirm" backTo={{ href: back.href, label: "New Term Deposit", onClick: () => setScreen("form") }} />
        <div className="flex flex-col gap-6">
          <ReviewSummary
            details={[
              ["From", from ? `${from.name} · ${from.number}` : ""],
              ["Deposit period", `${tenure} days`],
              ["Interest rate", `${rate}%`],
              ["Interest earned", money(interest)],
              ...(instruction === "rollover" ? [] : [["You get back at maturity", money(atMaturity)]]),
              ["Matures", formatDate(maturity)],
              ["When it matures", depositInstructionLabel(instruction)],
            ].map(([label, value]) => ({ label, value }))}
            total={money(num)}
            totalLabel="You deposit"
          />
          <TermsAgreement checked={accepted} onCheckedChange={setAccepted} subject="term deposits" terms={depositTerms(tenure)} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 flex-1 text-[15px]" onClick={() => setScreen("form")}>
              Back to Edit
            </Button>
            <Button type="button" className="h-11 flex-1 text-[16px]" disabled={!accepted} onClick={() => setAuthOpen(true)}>
              Confirm
            </Button>
          </div>
          <TermsHint agreed={accepted} />
        </div>
        <TransactionOtpModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          onSuccess={authorised}
        />
      </div>
    );
  }

  /* ── Form ────────────────────────────────────────────────────────────── */
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title="New Term Deposit" backTo={back} />
      <div className="flex flex-col gap-5 animate-in fade-in duration-200">
        <div className="flex flex-col gap-2">
          <FromAccountSelector accounts={accounts} value={fromId} onChange={setPickedFrom} />
          <p className="px-1 text-[12px] text-muted-foreground">This account is debited now, and credited at maturity.</p>
        </div>

        <Field label="Deposit Period">
          <div role="radiogroup" aria-label="Deposit period" className="flex flex-col gap-2">
            {TENURES.map((t) => (
              <OptionTile
                key={t.days}
                title={`${t.days} days`}
                detail={`Matures ${formatDate(addDays(MOCK_TODAY, t.days))}`}
                value={`${t.rate}%`}
                selected={tenure === t.days}
                onSelect={() => setTenure(t.days)}
              />
            ))}
          </div>
        </Field>

        {tenure && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <AmountInput
              value={amount}
              onChange={setAmount}
              label="Amount"
              hasError={tooSmall || overBalance}
              error={
                overBalance ? (
                  <InsufficientFundsAlert />
                ) : tooSmall ? (
                  <InlineError message={`The minimum is ${money(MIN_DEPOSIT)}.`} className="text-left" />
                ) : undefined
              }
            />
            <p className="px-1 text-[12px] text-muted-foreground">{`Minimum ${money(MIN_DEPOSIT)}.`}</p>
          </div>
        )}

        {tenure && valid && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200">
            <DepositInstructionField value={instruction} onChange={setInstruction} />
            <dl className="flex flex-col gap-2 px-1 text-[14px]">
              {(
                [
                  ["Interest rate", `${rate}%`],
                  ["You’ll receive", money(instruction === "rollover" ? interest : atMaturity)],
                  ["Maturity date", formatDate(maturity)],
                ] as Array<[string, string]>
              ).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular text-right text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <ProceedButton disabled={!valid} onClick={() => setScreen("review")} />
      </div>
    </div>
  );
}
