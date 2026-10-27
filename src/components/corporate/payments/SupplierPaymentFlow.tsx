"use client";

/**
 * Pay a Supplier — the business payment a maker prepares, or a sole proprietor sends directly.
 * A maker prepares a payment and submits it for approval; a sole proprietor's payment goes straight out after the code.
 * One bank transfer to one supplier, in four quiet steps: where it comes from, who it goes to (the name is looked
 * up from the account number, never typed), how much and what for, then a review that says plainly what leaves
 * the account, what it costs and whether an approver sees it first.
 *
 * Reuses the shared field widgets (`flows/shared`) and the shared one-time-code gate (`TransactionOtpModal`); the
 * screen, the copy and every link are business's own. Suppliers are not a saved list yet (see WORKING_LOG): the
 * form offers the ones this company paid recently and takes a new one by bank and account number.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import {
  AccountVerificationStatus,
  AmountInput,
  BANKS,
  BankSelect,
  CollapsedDetailsBadge,
  FromAccountSelector,
  InsufficientFundsAlert,
  NarrationInput,
  PAYMENT_METHODS,
  PaymentMethodSelect,
  ProceedButton,
  resolveAccountName,
} from "@/components/payments/flows/shared";
import { businessAccounts, businessTransactions } from "@/lib/corporate/accounts";
import { sendSupplierPayment, submitSupplierPayment } from "@/lib/corporate/payments";
import { paysWithoutApproval } from "@/lib/corporate/roles";
import { findTransaction, formatMoney } from "@/lib/mock-data";
import { roundMoney } from "@/lib/money";
import { useSession } from "@/lib/session-store";

import { ReviewSummary } from "@/components/ui/review-summary";

type Step = "details" | "review" | "submitted";

/** "Absa Bank Ghana" on a ledger line is "Absa Bank Ghana Limited" in the bank list. */
function bankFromLedger(name: string | undefined): string {
  if (!name) return "";
  const first = name.toLowerCase().split(" ")[0];
  return BANKS.find((b) => b.toLowerCase().startsWith(first)) ?? "";
}

function digits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

interface RecentSupplier {
  name: string;
  bank: string;
  account: string;
}

/** Who this company has paid lately, newest first, one row per account. Derived from the ledger, not a new list to keep. */
function recentSuppliers(): RecentSupplier[] {
  const seen = new Set<string>();
  const out: RecentSupplier[] = [];
  for (const t of businessTransactions()) {
    if (t.direction !== "debit" || t.kind !== "single" || !t.counterpartyAccount) continue;
    const key = digits(t.counterpartyAccount);
    if (seen.has(key)) continue;
    const bank = bankFromLedger(t.counterpartyBank);
    if (!bank) continue;
    seen.add(key);
    out.push({ name: t.counterparty, bank, account: key });
    if (out.length === 4) break;
  }
  return out;
}

export default function SupplierPaymentFlow() {
  const search = useSearchParams();
  const actor = useSession((s) => s.actor);
  const direct = actor ? paysWithoutApproval(actor.role) : false;

  const accounts = useMemo(() => businessAccounts().filter((a) => a.status === "Active"), []);
  const suppliers = useMemo(() => recentSuppliers(), []);

  // `?duplicate=` opens on a copy of an earlier payment; `?from=` on the account it was started from.
  const copy = useMemo(() => {
    const id = search.get("duplicate");
    return id ? findTransaction(id) : undefined;
  }, [search]);
  const fromParam = search.get("from");

  const [step, setStep] = useState<Step>("details");
  const [fromId, setFromId] = useState(
    () => (copy && accounts.some((a) => a.id === copy.accountId) ? copy.accountId : accounts.find((a) => a.id === fromParam)?.id ?? accounts[0]?.id ?? ""),
  );
  const [bank, setBank] = useState(() => bankFromLedger(copy?.counterpartyBank));
  const [account, setAccount] = useState(() => digits(copy?.counterpartyAccount ?? ""));
  const [knownName, setKnownName] = useState(copy?.counterparty ?? "");
  const [amount, setAmount] = useState(copy ? String(copy.amount) : "");
  const [method, setMethod] = useState("gip");
  const [reference, setReference] = useState(copy?.description ?? "");
  const [collapsed, setCollapsed] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [submitted, setSubmitted] = useState<{ transactionId: string; reference: string } | null>(null);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const supplierName = bank && account.length >= 8 ? resolveAccountName(account, knownName) : "";
  const verified = Boolean(supplierName);
  const numAmount = Number(amount.replace(/[^0-9.]/g, "")) || 0;
  const methodOption = PAYMENT_METHODS.find((m) => m.id === method) ?? PAYMENT_METHODS[0];
  const fee = methodOption.fee;
  const total = roundMoney(numAmount + fee);
  const overBalance = total > (fromAccount?.available ?? 0);
  const valid = Boolean(fromAccount) && verified && numAmount > 0 && !overBalance;

  function pick(supplier: RecentSupplier) {
    setBank(supplier.bank);
    setAccount(supplier.account);
    setKnownName(supplier.name);
    setCollapsed(false);
  }

  function summaryRows(): Array<[string, string]> {
    return [
      ["From", fromAccount ? `${fromAccount.name} (•••• ${fromAccount.number.replace(/\s/g, "").slice(-4)})` : ""],
      ["To", supplierName],
      ["Supplier's bank", `${bank} · ${account}`],
      ["Sent by", `${methodOption.name} · ${methodOption.speed.toLowerCase()}`],
      ...(reference ? ([["Invoice or reference", reference]] as Array<[string, string]>) : []),
    ];
  }

  function confirm() {
    if (!fromAccount) return;
    const request = {
      fromAccountId: fromAccount.id,
      supplierName,
      supplierBank: bank,
      supplierAccount: account,
      amount: numAmount,
      fee,
      method,
      reference,
    };
    if (direct) {
      const { transaction } = sendSupplierPayment(request);
      setSubmitted({ transactionId: transaction.id, reference: transaction.reference });
    } else {
      const { transaction } = submitSupplierPayment(request, actor?.name ?? "A maker");
      setSubmitted({ transactionId: transaction.id, reference: transaction.reference });
    }
    setStep("submitted");
  }

  if (step === "submitted" && submitted && fromAccount) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 pt-6">
        <div className="flex flex-col items-start gap-3">
          <CheckCircle2 size={24} className="text-success-text" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] font-medium tracking-[var(--ls-heading)] text-foreground">
              {direct ? "Payment on its way" : "Submitted for approval"}
            </h1>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              {direct ? (
                <>
                  <span className="tabular">{formatMoney(numAmount, "GHS", true)}</span> to {supplierName} has left{" "}
                  {fromAccount.name}. You will see it settle in Transactions.
                </>
              ) : (
                <>
                  <span className="tabular">{formatMoney(numAmount, "GHS", true)}</span> to {supplierName} is with an approver. Nothing leaves{" "}
                  {fromAccount.name} until it is approved. You will see the result in Transactions.
                </>
              )}
            </p>
            <p className="tabular text-[12px] text-muted-foreground">Reference {submitted.reference}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button nativeButton={false} render={<Link href={`/business/transactions/${submitted.transactionId}?from=success`} />}>
            View Payment
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(null);
              setBank("");
              setAccount("");
              setKnownName("");
              setAmount("");
              setReference("");
              setCollapsed(false);
              setStep("details");
            }}
          >
            Pay Another Supplier
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="/business/payments" />}>
            Back to Send &amp; Pay
          </Button>
        </div>
      </div>
    );
  }

  if (step === "review" && fromAccount) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8">
        <PageHeader
          title="Review Payment"
          backTo={{ href: "/business/payments/supplier", label: "Edit Payment", onClick: () => setStep("details") }}
        />

        <ReviewSummary
          details={summaryRows().map(([label, value]) => ({ label, value }))}
          breakdown={[
            { label: "Amount", value: formatMoney(numAmount, "GHS", true), tabular: true },
            { label: "Fee", value: formatMoney(fee, "GHS", true), tabular: true },
          ]}
          total={formatMoney(total, "GHS", true)}
          totalLabel={direct ? "Total Debit" : "Total Once Approved"}
        />

        {!direct && (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            This goes to an approver first. {fromAccount.mandate ? `The account's mandate is ${fromAccount.mandate.toLowerCase()}. ` : ""}
            Nothing is sent, and nothing is debited, until it is approved, and you can follow it in Transactions.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setOtpOpen(true)}>{direct ? "Pay Supplier" : "Submit for Approval"}</Button>
          <Button variant="ghost" onClick={() => setStep("details")}>
            Edit
          </Button>
        </div>

        <TransactionOtpModal
          open={otpOpen}
          onOpenChange={setOtpOpen}
          title="Confirm With Your Code"
          onSuccess={() => {
            setOtpOpen(false);
            confirm();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8">
      <PageHeader title="Pay a Supplier" backTo={{ href: "/business/payments", label: "Send & Pay" }} />

      {accounts.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">There is no active account to pay from. Contact your bank if this looks wrong.</p>
      ) : (
        <div className="flex flex-col gap-5">
          <FromAccountSelector accounts={accounts} value={fromId} onChange={setFromId} />

          <Field label="Supplier">
            {verified && collapsed ? (
              <CollapsedDetailsBadge
                title={supplierName}
                subtitle={`${bank} · ${account}`}
                nameCheck={{ confirmed: true, by: bank }}
                onChange={() => setCollapsed(false)}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {suppliers.length > 0 && !verified && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] text-muted-foreground">Paid recently</span>
                    <ul className="flex flex-col">
                      {suppliers.map((s) => (
                        <li key={s.account}>
                          <button
                            type="button"
                            onClick={() => pick(s)}
                            className="-mx-2 flex w-[calc(100%+16px)] cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
                          >
                            <span className="truncate text-[14px] text-foreground">{s.name}</span>
                            <span className="shrink-0 text-[12px] text-muted-foreground">{s.bank}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <BankSelect value={bank} onChange={setBank} />
                <Input
                  inputMode="numeric"
                  value={account}
                  onChange={(e) => {
                    setAccount(digits(e.target.value));
                    setKnownName("");
                  }}
                  placeholder="Supplier's account number"
                  className="numorainput tabular"
                />
                <AccountVerificationStatus resolving={false} name={verified ? supplierName : null} />
              </div>
            )}
          </Field>

          {verified && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
              <AmountInput
                value={amount}
                onChange={setAmount}
                label="Amount"
                onFocus={() => setCollapsed(true)}
                error={overBalance ? <InsufficientFundsAlert /> : undefined}
              />

              <Field label="How It's Sent">
                <PaymentMethodSelect value={method} onChange={setMethod} />
              </Field>

              <NarrationInput
                value={reference}
                onChange={setReference}
                label="Invoice or Reference"
                placeholder="For example, Invoice 4471"
              />

              <ProceedButton disabled={!valid} onClick={() => setStep("review")} label="Review Payment" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
