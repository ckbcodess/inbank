"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Account, formatMoney } from "@/lib/mock-data";
import {
  AmountInput,
  FromAccountSelector,
  AccountSelectTriggerContent,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
} from "./shared";

export interface OwnAccountFormState {
  fromId: string;
  toOwnAccountId: string;
  amount: string;
  narration: string;
  category: string;
}

interface OwnAccountFlowProps {
  accounts: Account[];
  state: OwnAccountFormState;
  onChange: (key: keyof OwnAccountFormState, value: string) => void;
  onProceed: () => void;
}

export function OwnAccountFlow({
  accounts,
  state,
  onChange,
  onProceed,
}: OwnAccountFlowProps) {
  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const toAccount = useMemo(
    () => accounts.find((a) => a.id === state.toOwnAccountId),
    [accounts, state.toOwnAccountId]
  );

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isValid =
    Boolean(state.fromId) &&
    Boolean(state.toOwnAccountId) &&
    state.fromId !== state.toOwnAccountId &&
    numAmount > 0 &&
    !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(val) => {
          onChange("fromId", val);
          if (state.toOwnAccountId === val) {
            onChange("toOwnAccountId", "");
          }
        }}
      />

      {/* 2. To Account */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">To Account</label>
        <Select
          value={state.toOwnAccountId}
          onValueChange={(val) => val && onChange("toOwnAccountId", val)}
        >
          <SelectTrigger className="h-[68px] min-h-[68px] px-4 w-full rounded-2xl border border-border/80 bg-card hover:bg-muted/20 text-left cursor-pointer transition-colors shadow-none flex items-center">
            <AccountSelectTriggerContent
              account={toAccount}
              placeholder="Select destination account"
            />
          </SelectTrigger>
          <SelectContent>
            {accounts
              .filter((a) => a.id !== state.fromId)
              .map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{a.name} ({a.number})</span>
                    <span className="font-medium text-muted-foreground tabular">
                      {formatMoney(a.available, a.currency, true)}
                    </span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
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
