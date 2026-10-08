"use client";

/**
 * Pieces shared by the Term Deposit screens: the ledger entry a deposit posts, the failure screen, the
 * maturity instruction picker and the Dev Mode switches.
 */

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { recordTransaction, type Account } from "@/lib/mock-data";
import { DEPOSIT_INSTRUCTIONS, type DepositInstruction } from "@/lib/term-deposits";

export const DEPOSITS_HOME = "/invest/term-deposits";

/**
 * Posts one line to the customer's ledger the moment a deposit is opened (money out) or redeemed (money in), so it
 * shows in Transactions and View Receipt works. It carries no spend category: moving money into a term deposit is
 * saving, not spending. Returns the transaction reference.
 */
export function postDepositEntry({
  direction,
  amount,
  account,
  reference,
  description,
}: {
  direction: "debit" | "credit";
  amount: number;
  account: Account;
  /** The deposit's reference, shown as the other side of the transaction. */
  reference: string;
  description: string;
}): string {
  const d = new Date();
  const trn = `TRN-${String(d.getTime()).slice(-8)}`;
  recordTransaction({
    id: trn,
    reference: trn,
    date: d.toISOString().slice(0, 10),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    valueDate: d.toISOString().slice(0, 10),
    description,
    counterparty: "Term Deposit",
    counterpartyAccount: reference,
    accountId: account.id,
    currency: "GHS",
    amount,
    direction,
    kind: "single",
    state: "completed",
    paymentMethod: "term-deposit",
    channel: "Internet Banking",
    profileKind: account.profileKind ?? "RETAIL",
  });
  return trn;
}

/**
 * The request didn't go through. Says so plainly, says nothing happened to the money, and gives the way back: try
 * again, or leave. Amber, not red: it needs attention, it isn't a verdict.
 */
export function OutcomeFailure({
  title,
  message,
  onRetry,
  onLeave,
  leaveLabel,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  onLeave: () => void;
  leaveLabel: string;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-[460px] flex-col items-center justify-center gap-6 px-4 py-10 text-center animate-in fade-in duration-200">
      <span className="flex size-16 items-center justify-center rounded-full bg-warning/15 text-warning-text">
        <AlertCircle size={28} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-medium leading-[30px] tracking-[-0.02em] text-foreground">{title}</h1>
        <p className="text-[15px] leading-[23px] text-muted-foreground">{message}</p>
      </div>
      <div className="flex w-full items-center gap-3">
        <Button type="button" variant="outline" className="h-12 flex-1 rounded-xl text-[14px]" onClick={onLeave}>
          {leaveLabel}
        </Button>
        <Button type="button" className="h-12 flex-1 rounded-xl text-[14px]" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

/** What happens at maturity, described right where it's chosen. */
export function DepositInstructionField({
  value,
  onChange,
  label = "When It Matures",
}: {
  value: DepositInstruction;
  onChange: (next: DepositInstruction) => void;
  label?: string;
}) {
  const current = DEPOSIT_INSTRUCTIONS.find((i) => i.id === value);
  return (
    <Field label={label} hint={current?.detail}>
      <Select value={value} onValueChange={(v) => v && onChange(v as DepositInstruction)}>
        <SelectTrigger>
          <span className="truncate text-[14px] text-foreground">{current?.label}</span>
        </SelectTrigger>
        <SelectContent>
          {DEPOSIT_INSTRUCTIONS.map((i) => (
            <SelectItem key={i.id} value={i.id} label={i.label}>
              <div className="flex flex-col py-0.5 text-left">
                <span className="text-foreground">{i.label}</span>
                <span className="max-w-[22rem] whitespace-normal text-[12px] font-normal text-muted-foreground">{i.detail}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
