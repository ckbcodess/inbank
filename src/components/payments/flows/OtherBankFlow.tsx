"use client";

import { useMemo } from "react";
import { Account } from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  VerifiedAccountBadge,
  OTHER_BANKS,
  resolveAccountName,
} from "./shared";

export interface OtherBankFormState {
  fromId: string;
  bank: string;
  benAcct: string;
  benName: string;
  amount: string;
  narration: string;
  category: string;
}

interface OtherBankFlowProps {
  accounts: Account[];
  state: OtherBankFormState;
  onChange: (key: keyof OtherBankFormState, value: string) => void;
  onProceed: () => void;
}

export function OtherBankFlow({
  accounts,
  state,
  onChange,
  onProceed,
}: OtherBankFlowProps) {
  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.benAcct, state.benName);
  }, [state.benAcct, state.benName]);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isAcctValid = state.benAcct.replace(/\s/g, "").length >= 8;
  const isBankValid = Boolean(state.bank);
  const isValid = Boolean(state.fromId) && isBankValid && isAcctValid && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination Bank & Account Number */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-foreground">Destination Bank</label>
          <Select
            value={state.bank || OTHER_BANKS[0]}
            onValueChange={(val) => val && onChange("bank", val)}
          >
            <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
              <SelectValue placeholder="Select destination bank" />
            </SelectTrigger>
            <SelectContent>
              {OTHER_BANKS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-foreground">Account Number</label>
          <input
            type="text"
            inputMode="numeric"
            value={state.benAcct}
            onChange={(e) => {
              const val = e.target.value;
              onChange("benAcct", val);
              const resolved = resolveAccountName(val, "");
              if (resolved) {
                onChange("benName", resolved);
              }
            }}
            placeholder="Enter 10-13 digit account number"
            className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
          />
        </div>

        {verifiedName && <VerifiedAccountBadge name={verifiedName} />}
      </div>

      {/* 3. Amount */}
      <AmountInput
        value={state.amount}
        onChange={(val) => onChange("amount", val)}
      />

      {/* 4. Narration */}
      <NarrationInput
        value={state.narration}
        onChange={(val) => onChange("narration", val)}
      />

      {/* 5. Transaction Category (Optional) */}
      <CategorySelect
        value={state.category}
        onChange={(val) => onChange("category", val)}
      />

      {overBalance && (
        <InsufficientFundsAlert
          available={fromAccount?.available ?? 0}
          currency={fromAccount?.currency || "GHS"}
        />
      )}

      {/* 6. Proceed CTA */}
      <ProceedButton
        disabled={!isValid}
        onClick={onProceed}
      />
    </div>
  );
}
