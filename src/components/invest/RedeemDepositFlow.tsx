"use client";

/**
 * Invest → Term Deposit → take money out early: part of it (`partial`) or all of it, closing the deposit (`close`).
 *
 * Figma draws two near-identical flows; this is one, with the amount asked only when it is part. Taking money out early
 * shows what it costs and the exact amount paid today before the one-time code, as plain facts, and costs no more
 * effort than opening the deposit did.
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Receipt, XCircle } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { InlineError } from "@/components/ui/inline-error";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import { Button } from "@/components/ui/button";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { AmountInput, FromAccountSelector, ProceedButton } from "@/components/payments/flows/shared";
import { AuthSummary, INVEST_HOME } from "@/components/invest/parts";
import { DEPOSITS_HOME, OutcomeFailure, postDepositEntry } from "@/components/invest/term-deposit-parts";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import { useTreasuryAccounts } from "@/lib/treasury";
import { earlyRedemption, useDeposit, useTermDeposits } from "@/lib/term-deposits";
import Link from "next/link";

const asNumber = (v: string) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
const money = (n: number) => formatMoney(n, "GHS", true);

export function RedeemDepositFlow({ mode }: { mode: "partial" | "close" }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrated, deposit: d } = useDeposit(id);
  const redeem = useTermDeposits((s) => s.redeem);
  const failRequests = useTermDeposits((s) => s.failRequests);
  const accounts = useTreasuryAccounts();
  const { defaultId } = useCustomerAccounts();

  const [screen, setScreen] = useState<"form" | "success" | "failed">("form");
  const [pickedTo, setPickedTo] = useState("");
  const [amount, setAmount] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [paid, setPaid] = useState<{ trn: string; amount: number; closed: boolean; toName: string } | null>(null);

  const whole = mode === "close";
  const title = whole ? "Close the Deposit" : "Redeem Part of the Deposit";
  const back = { href: d ? `${DEPOSITS_HOME}/${d.id}` : INVEST_HOME, label: d ? `${d.tenureDays}-day deposit` : "Invest" };

  if (!hydrated) return <FormPageSkeleton fields={2} />;
  if (!d || d.status !== "active") {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={title} backTo={{ href: INVEST_HOME, label: "Invest" }} />
        <TrueEmptyState
          icon={<XCircle size={22} strokeWidth={1.8} />}
          title="We couldn’t find this deposit"
          description="It may have been closed. Your other deposits are still on your Invest page."
          action={
            <Button nativeButton={false} render={<Link href={INVEST_HOME} />}>
              Back to Invest
            </Button>
          }
        />
      </div>
    );
  }

  const toId =
    pickedTo && accounts.some((a) => a.id === pickedTo)
      ? pickedTo
      : [d.fromAccountId, defaultId].find((a) => a && accounts.some((x) => x.id === a)) ?? accounts[0]?.id ?? "";
  const to = accounts.find((a) => a.id === toId);

  const num = asNumber(amount);
  const take = whole ? d.principal : num;
  const wholeByAccident = !whole && num >= d.principal;
  const valid = Boolean(to) && take > 0 && !wholeByAccident;
  const cost = earlyRedemption(d, valid ? take : 0);

  function authorised() {
    if (!to || !d) return;
    if (failRequests) {
      setScreen("failed");
      return;
    }
    const closes = take >= d.principal;
    redeem(d.id, take);
    const trn = postDepositEntry({
      direction: "credit",
      amount: take,
      account: to,
      reference: d.reference,
      description: closes ? "Term deposit closed" : "Term deposit redemption",
    });
    setPaid({ trn, amount: take, closed: closes, toName: to.name });
    setScreen("success");
  }

  if (screen === "success" && paid) {
    return (
      <PaymentSuccessScreen
        title={paid.closed ? "Term deposit closed" : "Redemption complete"}
        message={`${money(paid.amount)} has been paid into ${paid.toName}.`}
        transactionId={paid.trn}
        customActionCards={[{ id: "receipt", label: "View Receipt", icon: Receipt }]}
        showSaveBeneficiary={false}
        onPrimaryAction={() => router.push(INVEST_HOME)}
        primaryActionLabel="Back to Invest"
      />
    );
  }
  if (screen === "failed") {
    return (
      <OutcomeFailure
        title="Your redemption didn’t go through"
        message="Your deposit hasn’t changed, and nothing was paid out. Check the details and try again."
        onRetry={() => setScreen("form")}
        onLeave={() => router.push(INVEST_HOME)}
        leaveLabel="Back to Invest"
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} backTo={back} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6 animate-in fade-in duration-200">
        <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
          {whole
            ? `You’re taking all ${money(d.principal)} out of this deposit and closing it. It would have matured on ${formatDate(d.maturity)}.`
            : `Take some of your ${money(d.principal)} out early. The rest keeps earning until ${formatDate(d.maturity)}.`}
        </p>

        <FromAccountSelector accounts={accounts} value={toId} onChange={setPickedTo} label="To Account" />

        {!whole && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <AmountInput
              value={amount}
              onChange={setAmount}
              label="Amount to Redeem"
              hasError={wholeByAccident}
              error={wholeByAccident ? <InlineError message="That’s the whole deposit. Choose Close the Deposit to take it all out." className="text-left" /> : undefined}
            />
            <p className="px-1 text-[12px] text-muted-foreground">{`Less than the ${money(d.principal)} in the deposit.`}</p>
          </div>
        )}

        {valid && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <section className="flex flex-col gap-1.5 px-1">
              <span className="text-[13px] text-muted-foreground">You receive today</span>
              <span className="tabular text-[40px] leading-none tracking-[-0.02em] text-foreground">{money(cost.receive)}</span>
            </section>
            <dl className="flex flex-col gap-3 px-1 text-[14px]">
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-muted-foreground">Interest you give up</dt>
                <dd className="tabular text-right text-foreground">{money(cost.interestGivenUp)}</dd>
              </div>
              {!whole && (
                <div className="flex items-baseline justify-between gap-6">
                  <dt className="text-muted-foreground">Stays in the deposit</dt>
                  <dd className="tabular text-right text-foreground">{money(cost.remaining)}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <div>
          <ProceedButton disabled={!valid} onClick={() => setAuthOpen(true)} />
          {valid && <p className="px-1 pt-3 text-center text-[12px] text-muted-foreground">Once it’s paid out, this can’t be undone.</p>}
        </div>
      </div>

      <TransactionOtpModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={authorised}
        summary={
          <AuthSummary
            headline={whole ? "Close your term deposit" : "Redeem part of your term deposit"}
            amount={money(cost.receive)}
            rows={[
              ["To", to ? `${to.name} · ${to.number}` : ""],
              ["Interest you give up", money(cost.interestGivenUp)],
            ]}
          />
        }
      />
    </div>
  );
}
