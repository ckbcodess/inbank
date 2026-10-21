"use client";

/**
 * New business standing order — a payment to one supplier that repeats on a schedule (rent, a retainer, a lease).
 * Same shape as Pay a Supplier: where it comes from, who it goes to (the name is looked up from the account
 * number), how much and how often, then a review that says what runs and when, and a one-time code to start it.
 * It can be paused or cancelled from its own page at any time, with no more steps than it took to set up.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import {
  AccountVerificationStatus,
  AmountInput,
  BankSelect,
  FromAccountSelector,
  InsufficientFundsAlert,
  NarrationInput,
  ProceedButton,
  resolveAccountName,
} from "@/components/payments/flows/shared";
import { businessAccounts } from "@/lib/corporate/accounts";
import { formatDate, formatMoney, saveStandingInstruction, type InstructionFrequency } from "@/lib/mock-data";
import { FREQUENCY_OPTIONS, cadencePhrase, todayIso } from "@/lib/standing-display";

import { ReviewSummary } from "@/components/ui/review-summary";

type Step = "details" | "review" | "done";

const digits = (v: string) => v.replace(/[^0-9]/g, "");

export default function StandingOrderForm() {
  const accounts = useMemo(() => businessAccounts().filter((a) => a.status === "Active"), []);
  const tomorrow = useMemo(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), []);

  const [step, setStep] = useState<Step>("details");
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<InstructionFrequency>("Monthly");
  const [intervalDays, setIntervalDays] = useState("30");
  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");
  const [narration, setNarration] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const supplierName = bank && account.length >= 8 ? resolveAccountName(account) : "";
  const numAmount = Number(amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const days = Math.max(1, Number(intervalDays) || 1);

  const startError = startDate && startDate < todayIso() ? "The first payment can't be in the past." : null;
  const endError = endDate && endDate < startDate ? "The last payment can't be before the first." : null;
  const valid = Boolean(fromAccount) && Boolean(supplierName) && numAmount > 0 && !overBalance && Boolean(startDate) && !startError && !endError;

  const preview = { frequency, intervalDays: frequency === "Custom" ? days : undefined };

  function save() {
    if (!fromAccount) return;
    const created = saveStandingInstruction({
      beneficiary: narration ? `${supplierName} — ${narration}` : supplierName,
      accountId: fromAccount.id,
      amount: numAmount,
      currency: "GHS",
      frequency,
      intervalDays: frequency === "Custom" ? days : undefined,
      nextRun: startDate,
      startDate,
      endDate: endDate || undefined,
      status: "Active",
      shortName: name.trim() || undefined,
      transactionType: "To Bank",
      narration: narration || undefined,
    });
    setSavedId(created.id);
    setStep("done");
  }

  if (step === "done" && savedId) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 pt-6">
        <div className="flex flex-col items-start gap-3">
          <CheckCircle2 size={24} strokeWidth={1.8} className="text-success-text" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] font-medium tracking-[var(--ls-heading)] text-foreground">Standing order set up</h1>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              <span className="tabular">{formatMoney(numAmount, "GHS", true)}</span> will go to {supplierName}{" "}
              {cadencePhrase(preview).toLowerCase()}, starting {formatDate(startDate)}. You can pause or cancel it anytime.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button nativeButton={false} render={<Link href={`/business/payments/standing/${savedId}`} />}>
            View Standing Order
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="/business/payments/standing" />}>
            Back to Standing Orders
          </Button>
        </div>
      </div>
    );
  }

  if (step === "review" && fromAccount) {
    const rows: Array<[string, string]> = [
      ["From", fromAccount.name],
      ["To", supplierName],
      ["Supplier's bank", `${bank} · ${account}`],
      ["How often", cadencePhrase(preview)],
      ["First payment", formatDate(startDate)],
      ["Last payment", endDate ? formatDate(endDate) : "Until you cancel it"],
      ...(name.trim() ? ([["Name", name.trim()]] as Array<[string, string]>) : []),
      ...(narration ? ([["Narration", narration]] as Array<[string, string]>) : []),
    ];
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8">
        <PageHeader
          title="Review Standing Order"
          backTo={{ href: "/business/payments/standing/new", label: "Edit Standing Order", onClick: () => setStep("details") }}
        />
        <ReviewSummary
          details={rows.map(([label, value]) => ({ label, value }))}
          total={formatMoney(numAmount, "GHS", true)}
          totalLabel="Each payment"
        />
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Each payment goes out on its date without asking again, and you can pause or cancel the order from its page whenever you like.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setOtpOpen(true)}>Set Up Standing Order</Button>
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
            save();
          }}
          summary={
            <p className="text-[13.5px] text-foreground">
              Start a standing order of <span className="tabular">{formatMoney(numAmount, "GHS", true)}</span> to {supplierName} from {fromAccount.name},{" "}
              {cadencePhrase(preview).toLowerCase()}.
            </p>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8">
      <PageHeader title="New Standing Order" backTo={{ href: "/business/payments/standing", label: "Standing Orders" }} />

      {accounts.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">There is no active account to pay from. Contact your bank if this looks wrong.</p>
      ) : (
        <div className="flex flex-col gap-5">
          <FromAccountSelector accounts={accounts} value={fromId} onChange={setFromId} />

          <Field label="Supplier">
            <div className="flex flex-col gap-3">
              <BankSelect value={bank} onChange={setBank} />
              <Input
                inputMode="numeric"
                value={account}
                onChange={(e) => setAccount(digits(e.target.value))}
                placeholder="Supplier's account number"
                className="numorainput tabular"
              />
              <AccountVerificationStatus resolving={false} name={supplierName || null} />
            </div>
          </Field>

          {supplierName && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
              <AmountInput value={amount} onChange={setAmount} label="Amount" error={overBalance ? <InsufficientFundsAlert /> : undefined} />

              <Field label="How Often">
                <Select value={frequency} onValueChange={(v) => v && setFrequency(v as InstructionFrequency)}>
                  <SelectTrigger>
                    <span className="truncate text-[14px] text-foreground">
                      {FREQUENCY_OPTIONS.find((f) => f.id === frequency)?.label}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <SelectItem key={f.id} value={f.id} label={f.label}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {frequency === "Custom" && (
                <Field label="Number of Days Between Payments" htmlFor="interval">
                  <Input id="interval" inputMode="numeric" value={intervalDays} onChange={(e) => setIntervalDays(digits(e.target.value))} className="tabular" />
                </Field>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="First Payment" htmlFor="start" error={startError}>
                  <Input id="start" type="date" min={todayIso()} value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-invalid={Boolean(startError)} />
                </Field>
                <Field label="Last Payment" htmlFor="end" optional hint="Leave empty to keep it going until you cancel." error={endError}>
                  <Input id="end" type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-invalid={Boolean(endError)} />
                </Field>
              </div>

              <Field label="Name" htmlFor="name" optional hint="What you will call it, for example Office rent.">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Office rent" />
              </Field>

              <NarrationInput value={narration} onChange={setNarration} label="Narration" placeholder="Shown on each payment" />

              <ProceedButton disabled={!valid} onClick={() => setStep("review")} label="Review Standing Order" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
