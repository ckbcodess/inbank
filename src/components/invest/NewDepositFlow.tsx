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
import { Receipt } from "lucide-react";
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
import { AccountRequired, AuthSummary, FactsPanel, INVEST_HOME } from "@/components/invest/parts";
import { CreateProfileFlow } from "@/components/invest/CreateProfileFlow";
import { DEPOSITS_HOME, DepositInstructionField, OutcomeFailure, postDepositEntry } from "@/components/invest/term-deposit-parts";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { sumMoney } from "@/lib/money";
import { useSession } from "@/lib/session-store";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import { addDays, MOCK_TODAY, useMyTreasury, useTreasuryAccounts } from "@/lib/treasury";
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
  const { csd } = useMyTreasury();
  const ownerId = useSession((s) => s.actor?.id) ?? "guest";
  const openDeposit = useTermDeposits((s) => s.open);
  const failRequests = useTermDeposits((s) => s.failRequests);
  const accounts = useTreasuryAccounts();
  const { defaultId } = useCustomerAccounts();

  const [screen, setScreen] = useState<"form" | "review" | "success" | "failed">("form");
  const [pickedFrom, setPickedFrom] = useState("");
  const [tenure, setTenure] = useState<number | null>(TENURES.some((t) => t.days === chosenDays) ? chosenDays : null);
  // Set once the customer has just created their securities account here, so its confirmation stays on screen.
  const [profileStarted, setProfileStarted] = useState(false);
  const initialAmount = params.get("amount") || "";
  const [amount, setAmount] = useState(initialAmount);
  const [instruction, setInstruction] = useState<DepositInstruction>("close");
  const [authOpen, setAuthOpen] = useState(false);
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

  // No securities account yet: set it up right here, then carry on with this deposit when it is ready.
  if (!csd || profileStarted) {
    return (
      <CreateProfileFlow
        intent={{
          href: chosenDays ? `${DEPOSITS_HOME}/new?days=${chosenDays}` : `${DEPOSITS_HOME}/new`,
          label: chosenDays ? `${chosenDays}-day term deposit` : "term deposit",
        }}
        onCreated={() => setProfileStarted(true)}
      />
    );
  }
  if (csd.status !== "active") return <AccountRequired status={csd.status} title="New Term Deposit" backTo={back} />;

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-8">
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
      <div className="flex flex-col gap-8">
        <PageHeader title="Review and Confirm" backTo={{ href: back.href, label: "New Term Deposit", onClick: () => setScreen("form") }} />
        <div className="mx-auto flex w-full max-w-[600px] flex-col gap-8">
          <section className="flex flex-col gap-1.5 px-1">
            <span className="text-[13px] text-muted-foreground">You deposit</span>
            <span className="tabular text-[40px] leading-none tracking-[-0.02em] text-foreground">{money(num)}</span>
            <span className="tabular text-[14px] text-muted-foreground">
              {instruction === "rollover"
                ? `and receive ${money(interest)} in interest on ${formatDate(maturity)}`
                : `and get ${money(atMaturity)} back on ${formatDate(maturity)}`}
            </span>
          </section>
          <FactsPanel
            rows={[
              ["From", from ? `${from.name} · ${from.number}` : ""],
              ["Deposit period", `${tenure} days`],
              ["Interest rate", `${rate}%`],
              ["Interest earned", money(interest)],
              ["Matures", formatDate(maturity)],
              ["When it matures", depositInstructionLabel(instruction)],
            ]}
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="h-13 flex-1 rounded-2xl text-[15px]" onClick={() => setScreen("form")}>
              Back to Edit
            </Button>
            <Button type="button" className="h-13 flex-1 rounded-2xl text-[16px]" onClick={() => setAuthOpen(true)}>
              Confirm
            </Button>
          </div>
        </div>
        <TransactionOtpModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          onSuccess={authorised}
          summary={
            <AuthSummary
              headline={`Open a ${tenure}-day term deposit`}
              amount={money(num)}
              rows={[
                ["From", from ? `${from.name} · ${from.number}` : ""],
                ["Matures", formatDate(maturity)],
              ]}
            />
          }
        />
      </div>
    );
  }

  /* ── Form ────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="New Term Deposit" backTo={back} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6 animate-in fade-in duration-200">
        <div className="flex flex-col gap-2">
          <FromAccountSelector accounts={accounts} value={fromId} onChange={setPickedFrom} />
          <p className="px-1 text-[12px] text-muted-foreground">This account is debited now, and credited at maturity.</p>
        </div>

        <Field label="Deposit Period">
          <div role="radiogroup" aria-label="Deposit period" className="flex flex-col gap-3">
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
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <DepositInstructionField value={instruction} onChange={setInstruction} />
            <dl className="flex flex-col gap-3 px-1 text-[14px]">
              {(
                [
                  ["Interest rate", `${rate}%`],
                  ["You’ll receive", money(instruction === "rollover" ? interest : atMaturity)],
                  ["Maturity date", formatDate(maturity)],
                ] as Array<[string, string]>
              ).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-6">
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
