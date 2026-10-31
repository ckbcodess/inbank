"use client";

/**
 * Loans → Salary Advance (or National Service Advance, or Pensioner Advance: the same flow, named for the customer's
 * income). From the Figma's "Request Salary Advance", "Proactive Flow" and "Migrate Account Class" rows:
 *
 *   amount → review → one-time code → paid in at once (only customers who qualify can ask, so nothing waits for approval)
 *
 *  - What it costs is shown as soon as the amount is valid: the fees taken up front, what lands in the account, and
 *    what comes out of the next salary, so nothing on the review is a surprise.
 *  - A customer whose salary goes into an ordinary account is told on the form, not after Submit, that taking the
 *    advance switches it to a Salary Account, with what that costs. Agreeing is part of the one checkbox.
 *  - Figma shows an error dialog for someone who already has an advance; here the page says so in place, with the way
 *    to their advance. Someone who doesn't qualify gets the reason and what would change it.
 *  - Figma authorises with a PIN; here it is the one-time code every payment uses.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HandCoins } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { TermsAgreement, TermsHint } from "@/components/ui/terms-agreement";
import { advanceTerms } from "@/lib/terms";
import { InlineError } from "@/components/ui/inline-error";
import { ReviewSummary } from "@/components/ui/review-summary";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { AmountInput, FromAccountSelector, ProceedButton } from "@/components/payments/flows/shared";
import { OutcomeFailure } from "@/components/invest/term-deposit-parts";
import { LOANS_HOME, LoansDevTools, postLoanEntry } from "@/components/loans/parts";
import { ACCOUNTS, formatDate, formatMoney } from "@/lib/mock-data";
import { MOCK_TODAY, useTreasuryAccounts } from "@/lib/treasury";
import {
  advanceFees,
  dailyInterest,
  FACILITY_FEE_RATE,
  LATE_CHARGE_RATE,
  MIN_ADVANCE,
  MONTHLY_RATE,
  nextPayday,
  pct,
  PROCESSING_FEE_RATE,
  repaidOnDue,
  SALARY_ACCOUNT_FEATURES,
  SALARY_ACCOUNT_FEE,
  useLoans,
  useLoansHydrated,
  useMyLoans,
  type Advance,
} from "@/lib/loans";

const asNumber = (v: string) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
const money = (n: number) => formatMoney(n, "GHS", true);
const reveal = "flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200";

function Rows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="flex flex-col gap-2 px-1 text-[14px]">
      {rows.map(([label, value], i) => (
        <div key={`${i}-${label}`} className="flex items-baseline justify-between gap-5">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="tabular text-right text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AdvanceFlow() {
  const router = useRouter();
  const hydrated = useLoansHydrated();
  const { ownerId, income, open, limit, product } = useMyLoans();
  const request = useLoans((s) => s.request);
  const failRequests = useLoans((s) => s.failRequests);
  const accounts = useTreasuryAccounts();

  const [screen, setScreen] = useState<"form" | "review" | "success" | "failed">("form");
  const [pickedTo, setPickedTo] = useState("");
  const [amount, setAmount] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [made, setMade] = useState<Advance | null>(null);

  const toId = useMemo(() => {
    if (pickedTo && accounts.some((a) => a.id === pickedTo)) return pickedTo;
    return accounts.find((a) => a.id === income?.accountId)?.id ?? accounts[0]?.id ?? "";
  }, [pickedTo, accounts, income?.accountId]);
  const to = accounts.find((a) => a.id === toId);
  const back = { href: LOANS_HOME, label: "Loans" };
  const title = product?.name ?? "Salary Advance";

  if (!hydrated) return <FormPageSkeleton fields={2} />;

  /* ── Outcomes come first: a request just made is "open" too ─────────── */
  if (screen === "success" && made) {
    const fees = advanceFees(made.amount);
    return (
      <PaymentSuccessScreen
        title="Advance paid in"
        message={`${money(fees.received)} is in ${to?.name ?? "your account"}.`}
        receiptRows={[
          ["Reference", made.reference],
          ["Advance", money(made.amount)],
          ["Fees", money(fees.fees)],
          ["Repayment date", formatDate(made.dueOn)],
        ]}
        showSaveBeneficiary={false}
        customActionCards={[]}
        onPrimaryAction={() => router.push(`/loans/${made.id}`)}
        primaryActionLabel="View Advance"
        onSecondaryAction={() => router.push(LOANS_HOME)}
        secondaryActionLabel="Back to Loans"
      />
    );
  }
  if (screen === "failed") {
    return (
      <OutcomeFailure
        title="Your request wasn’t sent"
        message="Nothing was requested and nothing will be taken from your salary. Try again."
        onRetry={() => setScreen("review")}
        onLeave={() => router.push(LOANS_HOME)}
        leaveLabel="Back to Loans"
      />
    );
  }

  /* ── Can't take one ─────────────────────────────────────────────────── */
  if (!income || !product) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title={title} backTo={back} />
        <LoansDevTools />
        <TrueEmptyState
          icon={<HandCoins size={22} strokeWidth={1.8} />}
          title="Advances are for customers paid into GCB"
          description="You can take up to 80% of your salary, national service allowance or pension once it’s paid into a GCB account."
          action={
            <Button nativeButton={false} render={<Link href={LOANS_HOME} />}>
              Back to Loans
            </Button>
          }
        />
      </div>
    );
  }
  if (open) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title={title} backTo={back} />
        <LoansDevTools />
        <TrueEmptyState
          icon={<HandCoins size={22} strokeWidth={1.8} />}
          title="You already have an advance"
          description={`Repay it to take another. It’s due on ${formatDate(open.dueOn)}.`}
          action={
            <Button nativeButton={false} render={<Link href={`/loans/${open.id}`} />}>
              View Advance
            </Button>
          }
        />
      </div>
    );
  }
  if (accounts.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title={title} backTo={back} />
        <TrueEmptyState title="You need an account to receive the advance" description="It’s paid in cedis into an active current or savings account." />
      </div>
    );
  }

  /* ── The numbers ─────────────────────────────────────────────────────── */
  const num = asNumber(amount);
  const dueOn = nextPayday(income.kind);
  const tooSmall = num > 0 && num < MIN_ADVANCE;
  const tooBig = num > limit;
  const valid = num >= MIN_ADVANCE && !tooBig && Boolean(to);
  const fees = advanceFees(num);
  const repay = repaidOnDue(num, MOCK_TODAY, dueOn);
  const incomeAccount = accounts.find((a) => a.id === income.accountId);
  const needsSwitch = !income.salaryAccount;

  function authorised() {
    if (!to || !income) return;
    if (failRequests) {
      setScreen("failed");
      return;
    }
    const advance = request({ ownerId, kind: income.kind, amount: num, accountId: to.id }, needsSwitch);
    const account = ACCOUNTS.find((a) => a.id === to.id);
    if (account) postLoanEntry({ direction: "credit", amount: advanceFees(advance.amount).received, account, advance });
    setMade(advance);
    setScreen("success");
  }

  /* ── Review ─────────────────────────────────────────────────────────── */
  if (screen === "review" && valid) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title="Review and Confirm" backTo={{ ...back, label: title, onClick: () => setScreen("form") }} />
        <div className="flex flex-col gap-5">
          <ReviewSummary
            details={[
              { label: "Paid into", value: to ? `${to.name} · ${to.number}` : "" },
              { label: "Advance", value: title },
              { label: "Repayment date", value: formatDate(dueOn), tabular: true },
              { label: `Interest (${pct(MONTHLY_RATE)} a month)`, value: `${money(dailyInterest(num))} a day`, tabular: true },
              { label: "Repaid on that date", value: money(repay.total), tabular: true },
              { label: "If it’s late", value: `${pct(LATE_CHARGE_RATE)} of the advance a month`, tabular: true },
              ...(needsSwitch && incomeAccount
                ? [{ label: "Account change", value: `${incomeAccount.name} becomes a Salary Account · ${money(SALARY_ACCOUNT_FEE)} a month` }]
                : []),
            ]}
            breakdown={[
              { label: "Amount requested", value: money(num), tabular: true },
              { label: `Processing fee (${pct(PROCESSING_FEE_RATE)})`, value: `−${money(fees.processing)}`, tabular: true },
              { label: `Facility fee (${pct(FACILITY_FEE_RATE)})`, value: `−${money(fees.facility)}`, tabular: true },
            ]}
            total={money(fees.received)}
            totalLabel="You receive"
          />
          <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
            {product.repaySentence(formatDate(dueOn), money(repay.total), money(num), money(repay.interest), repay.days)}
          </p>
          <TermsAgreement checked={accepted} onCheckedChange={setAccepted} subject={`the ${title}`} terms={advanceTerms(needsSwitch)} also={needsSwitch ? "and to switching my account to a Salary Account" : undefined} />
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
          onSuccess={() => {
            setAuthOpen(false);
            authorised();
          }}
        />
      </div>
    );
  }

  /* ── Form ───────────────────────────────────────────────────────────── */
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title={title} backTo={back} />
      <LoansDevTools />
      <div className="flex flex-col gap-5 animate-in fade-in duration-200">
        <div className="flex flex-col gap-2">
          <FromAccountSelector accounts={accounts} value={toId} onChange={setPickedTo} label="Pay Into" />
        </div>

        <div className="flex items-baseline justify-between gap-4 px-1">
          <span className="flex flex-col">
            <span className="text-[14px] text-foreground">You can take up to</span>
            <span className="text-[12px] text-muted-foreground">{product.limitNote}</span>
          </span>
          <span className="tabular text-[18px] tracking-[var(--ls-tight)] text-foreground">{money(limit)}</span>
        </div>

        <div className="flex flex-col gap-2">
          <AmountInput
            value={amount}
            onChange={setAmount}
            label="Amount"
            hasError={tooSmall || tooBig}
            error={
              tooBig ? (
                <InlineError message={`You can take up to ${money(limit)}.`} className="text-left" />
              ) : tooSmall ? (
                <InlineError message={`The minimum is ${money(MIN_ADVANCE)}.`} className="text-left" />
              ) : undefined
            }
          />
          <p className="px-1 text-[12px] text-muted-foreground">{`From ${money(MIN_ADVANCE)} to ${money(limit)}.`}</p>
        </div>

        {valid && (
          <div className={reveal}>
            <Rows
              rows={[
                ["Fees, taken up front", money(fees.fees)],
                ["You receive", money(fees.received)],
                [`Repaid on ${formatDate(dueOn)}`, money(repay.total)],
                ["Interest", `${money(dailyInterest(num))} a day`],
              ]}
            />

            {needsSwitch && incomeAccount && (
              <section className="flex flex-col gap-2 px-1">
                <h2 className="text-[15px] font-medium text-foreground">This switches your account to a Salary Account</h2>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {product.switchSentence(incomeAccount.name, incomeAccount.number, money(SALARY_ACCOUNT_FEE))}
                </p>
                <button
                  type="button"
                  onClick={() => setShowFeatures((v) => !v)}
                  className="w-fit cursor-pointer text-[13px] text-foreground underline underline-offset-2"
                  aria-expanded={showFeatures}
                >
                  {showFeatures ? "Hide what a Salary Account includes" : "What a Salary Account includes"}
                </button>
                {showFeatures && (
                  <ul className="flex flex-col gap-2 pt-1 animate-in fade-in duration-200">
                    {SALARY_ACCOUNT_FEATURES.map((f) => (
                      <li key={f} className="text-[13px] text-muted-foreground">
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

          </div>
        )}

        <ProceedButton disabled={!valid} onClick={() => setScreen("review")} />
      </div>
    </div>
  );
}
