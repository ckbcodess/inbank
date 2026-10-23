"use client";

/**
 * Pieces shared by the Loans screens: the ledger line an advance posts when it is paid in or repaid, the "advance not
 * found" state, and the Dev Mode switches.
 */

import { useMemo } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { TrueEmptyState } from "@/components/states/ListStates";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import { ACCOUNTS, recordTransaction, type Account } from "@/lib/mock-data";
import { advanceFees, ADVANCE_PRODUCTS, useLoans, useMyLoans, type Advance, type IncomeScenario } from "@/lib/loans";
import { MOCK_TODAY, useTreasuryAccounts } from "@/lib/treasury";

export const LOANS_HOME = "/loans";
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
}: {
  direction: "credit" | "debit";
  amount: number;
  account: Account;
  advance: Advance;
}): string {
  const d = new Date();
  const trn = `TRN-${String(d.getTime()).slice(-8)}`;
  const name = ADVANCE_PRODUCTS[advance.kind].name;
  recordTransaction({
    id: trn,
    reference: trn,
    date: d.toISOString().slice(0, 10),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    valueDate: d.toISOString().slice(0, 10),
    description: direction === "credit" ? `${name} paid in` : `${name} repaid`,
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
    <div className="flex flex-col gap-6">
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
  { id: "pending", label: "Waiting for approval" },
  { id: "active", label: "Paid in, due next payday" },
  { id: "overdue", label: "Overdue" },
];
const DECISION_STATES = [
  { id: "approve", label: "Approve the pending request" },
  { id: "decline", label: "Decline the pending request" },
];
const REQUEST_STATES = [
  { id: "succeed", label: "Go through" },
  { id: "fail", label: "Fail" },
];
const CUSTOMER_KEYS = CUSTOMER_STATES.map((s) => s.id);
const CUSTOMER_LABELS = Object.fromEntries(CUSTOMER_STATES.map((s) => [s.id, s.label])) as Record<IncomeScenario, string>;

/** Which scenario the stored income amounts to, for the switcher's current value. */
function scenarioOf(income: ReturnType<typeof useMyLoans>["income"]): IncomeScenario {
  if (!income) return "none";
  if (income.kind === "salary") return income.salaryAccount ? "salary" : "salary-no-account";
  return income.kind;
}

/**
 * Dev Mode for Loans: who the customer is (what the bank sees credited to them), an advance they already hold, the
 * bank's decision on a pending request (approving pays it in), and whether new requests fail.
 */
export function LoansDevTools() {
  const { ownerId, income, open, advances } = useMyLoans();
  const seed = useLoans((s) => s.seed);
  const decide = useLoans((s) => s.decide);
  const failRequests = useLoans((s) => s.failRequests);
  const setFailRequests = useLoans((s) => s.setFailRequests);
  const accounts = useTreasuryAccounts();
  const accountId = income?.accountId ?? accounts[0]?.id ?? "";
  const scenario = scenarioOf(income);
  const pending = advances.find((a) => a.status === "pending");
  const advanceValue = !open ? "none" : open.status === "pending" ? "pending" : open.dueOn < MOCK_TODAY ? "overdue" : "active";

  const groups = useMemo<DevStateGroup[]>(
    () => [
      {
        label: "Advance",
        states: ADVANCE_STATES,
        value: advanceValue,
        onChange: (v) => seed(ownerId, accountId, scenario === "none" ? "salary" : scenario, v as "none" | "active" | "overdue" | "pending"),
      },
      {
        label: "Bank decision",
        states: DECISION_STATES,
        value: "",
        onChange: (v) => {
          if (!pending) {
            toast("There’s no request waiting for a decision.", { id: "loans-decide" });
            return;
          }
          decide(ownerId, v === "approve");
          if (v === "approve") {
            const account = ACCOUNTS.find((a) => a.id === pending.accountId);
            if (account) postLoanEntry({ direction: "credit", amount: advanceFees(pending.amount).received, account, advance: pending });
          }
          toast.success(v === "approve" ? "Approved and paid in." : "Declined.", { id: "loans-decide" });
        },
      },
      {
        label: "New requests",
        states: REQUEST_STATES,
        value: failRequests ? "fail" : "succeed",
        onChange: (v) => setFailRequests(v === "fail"),
      },
    ],
    [advanceValue, ownerId, accountId, scenario, pending, failRequests, seed, decide, setFailRequests],
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
