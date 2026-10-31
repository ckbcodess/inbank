"use client";

/**
 * Pieces shared by the Loans screens: the ledger line an advance posts when it is paid in or repaid, the "advance not
 * found" state, and the Dev Mode switches.
 */

import { useMemo } from "react";
import Link from "next/link";
import { FileText } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { TrueEmptyState } from "@/components/states/ListStates";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import { recordTransaction, type Account } from "@/lib/mock-data";
import { ADVANCE_PRODUCTS, totalRepaid, useLoans, useMyLoans, type Advance, type IncomeScenario } from "@/lib/loans";
import { MOCK_TODAY, useTreasuryAccounts } from "@/lib/treasury";

export const LOANS_HOME = "/loans";
/** The advance's own page: the customer's loans under it, what it is, and one button to apply. */
export const ADVANCE_PRODUCT_HREF = "/loans/products/salary-advance";
/** The apply flow. */
export const ADVANCE_HREF = "/loans/salary-advance";

/**
 * Posts one line to the ledger when an advance is paid in (credit) or repaid (debit), so it shows in Transactions with
 * a receipt. Borrowing and repaying aren't income or spending, so the line carries no spend category and Insights
 * leaves it out. Returns the transaction reference.
 */
export function postLoanEntry({
  direction,
  amount,
  account,
  advance,
  isPartial = false,
}: {
  direction: "credit" | "debit";
  amount: number;
  account: Account;
  advance: Advance;
  isPartial?: boolean;
}): string {
  const d = new Date();
  const trn = `TRN-${String(d.getTime()).slice(-8)}`;
  const name = ADVANCE_PRODUCTS[advance.kind].name;
  const description =
    direction === "credit"
      ? `${name} paid in`
      : isPartial
      ? `${name} installment paid`
      : `${name} repaid in full`;
  recordTransaction({
    id: trn,
    reference: trn,
    date: d.toISOString().slice(0, 10),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    valueDate: d.toISOString().slice(0, 10),
    description,
    counterparty: name,
    counterpartyAccount: advance.reference,
    accountId: account.id,
    currency: "GHS",
    amount,
    direction,
    kind: "single",
    state: "completed",
    paymentMethod: "loan",
    channel: "Internet Banking",
    profileKind: account.profileKind ?? "RETAIL",
  });
  return trn;
}

/** An advance that isn't there (another customer's, or reset from Dev Mode). Says so and goes back to Loans. */
export function AdvanceNotFound({ title = "Salary Advance" }: { title?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title={title} backTo={{ href: LOANS_HOME, label: "Loans" }} />
      <TrueEmptyState
        icon={<FileText size={22} strokeWidth={1.8} />}
        title="We couldn’t find this advance"
        description="Your other loans are still on your Loans page."
        action={
          <Button nativeButton={false} render={<Link href={LOANS_HOME} />}>
            Back to Loans
          </Button>
        }
      />
    </div>
  );
}

const CUSTOMER_STATES: { id: IncomeScenario; label: string }[] = [
  { id: "salary", label: "Salaried, has a Salary Account" },
  { id: "salary-no-account", label: "Salaried, ordinary account" },
  { id: "national-service", label: "National service personnel" },
  { id: "pension", label: "Pensioner" },
  { id: "none", label: "No income at GCB (not eligible)" },
];
const ADVANCE_STATES = [
  { id: "none", label: "None" },
  { id: "active", label: "Paid in, due next payday" },
  { id: "partial", label: "Partially repaid" },
  { id: "overdue", label: "Overdue" },
];
const REQUEST_STATES = [
  { id: "succeed", label: "Go through" },
  { id: "fail", label: "Fail" },
];
const WELCOME_STATES = [{ id: "again", label: "Show it again" }];
const CUSTOMER_KEYS = CUSTOMER_STATES.map((s) => s.id);
const CUSTOMER_LABELS = Object.fromEntries(CUSTOMER_STATES.map((s) => [s.id, s.label])) as Record<IncomeScenario, string>;

/** Which scenario the stored income amounts to, for the switcher's current value. */
function scenarioOf(income: ReturnType<typeof useMyLoans>["income"]): IncomeScenario {
  if (!income) return "none";
  if (income.kind === "salary") return income.salaryAccount ? "salary" : "salary-no-account";
  return income.kind;
}

/**
 * Dev Mode for Loans: who the customer is (what the bank sees credited to them), an advance they already hold, and
 * whether new requests fail.
 */
export function LoansDevTools({ extraGroups }: { extraGroups?: DevStateGroup[] } = {}) {
  const { ownerId, income, open } = useMyLoans();
  const seed = useLoans((s) => s.seed);
  const markWelcomed = useLoans((s) => s.markWelcomed);
  const failRequests = useLoans((s) => s.failRequests);
  const setFailRequests = useLoans((s) => s.setFailRequests);
  const accounts = useTreasuryAccounts();
  const accountId = income?.accountId ?? accounts[0]?.id ?? "";
  const scenario = scenarioOf(income);
  const advanceValue = !open
    ? "none"
    : totalRepaid(open) > 0
    ? "partial"
    : open.dueOn < MOCK_TODAY
    ? "overdue"
    : "active";

  const groups = useMemo<DevStateGroup[]>(
    () => [
      {
        label: "Advance",
        states: ADVANCE_STATES,
        value: advanceValue,
        onChange: (v) => seed(ownerId, accountId, scenario === "none" ? "salary" : scenario, v as "none" | "active" | "overdue" | "partial"),
      },
      {
        label: "New requests",
        states: REQUEST_STATES,
        value: failRequests ? "fail" : "succeed",
        onChange: (v) => setFailRequests(v === "fail"),
      },
      {
        label: "Welcome",
        states: WELCOME_STATES,
        value: "",
        onChange: () => markWelcomed(ownerId, false),
      },
      ...(extraGroups ?? []),
    ],
    [advanceValue, ownerId, accountId, scenario, failRequests, seed, setFailRequests, markWelcomed, extraGroups],
  );

  return (
    <StateSwitcher
      section="Loans"
      label="Customer"
      states={CUSTOMER_KEYS}
      value={scenario}
      onChange={(v) => seed(ownerId, accountId, v, "none")}
      labels={CUSTOMER_LABELS}
      groups={groups}
    />
  );
}
