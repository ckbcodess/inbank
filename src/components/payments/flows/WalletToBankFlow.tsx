"use client";

import { useMemo, useEffect } from "react";
import { Account } from "@/lib/mock-data";
import {
  AmountInput,
  NarrationInput,
  CategorySelect,
  ProceedButton,
  FromAccountSelector,
  SchedulePaymentSection,
  ScheduleFrequency,
} from "./shared";
import { Field } from "@/components/ui/field";
import { OwnWalletPicker, useOwnWallets, digitsOf, type OwnWallet } from "./OwnWalletPicker";

export interface WalletToBankFormState {
  toAccountId: string;
  phone: string;
  network: string;
  amount: string;
  narration: string;
  category: string;
  isScheduled?: boolean;
  scheduleDate?: string;
  scheduleFrequency?: ScheduleFrequency;
  scheduleEndDate?: string;
}

interface WalletToBankFlowProps {
  accounts: Account[];
  state: WalletToBankFormState;
  onChange: (key: keyof WalletToBankFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function WalletToBankFlow({
  accounts,
  state,
  onChange,
  onProceed,
}: WalletToBankFlowProps) {
  const wallets = useOwnWallets();
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === state.toAccountId) ?? accounts[0],
    [accounts, state.toAccountId]
  );

  const selectedWallet = useMemo(
    () => wallets.find((w) => digitsOf(w.phone) === digitsOf(state.phone)) ?? wallets[0],
    [wallets, state.phone]
  );

  // Set default wallet details if empty
  useEffect(() => {
    if (!state.phone && selectedWallet) {
      onChange("phone", selectedWallet.phone);
      onChange("network", selectedWallet.network);
    }
  }, [state.phone, selectedWallet, onChange]);

  const handleSelectWallet = (w: OwnWallet) => {
    onChange("phone", w.phone);
    onChange("network", w.network);
  };

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const isPhoneValid = (state.phone || selectedWallet?.phone || "").replace(/[^0-9]/g, "").length >= 9;
  const isValid = Boolean(selectedAccount) && isPhoneValid && numAmount > 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. Destination Bank Account */}
      <FromAccountSelector
        label="Destination Bank Account"
        accounts={accounts}
        value={state.toAccountId || selectedAccount?.id || ""}
        onChange={(id) => onChange("toAccountId", id)}
      />

      {/* 2. Source Mobile Wallet Details — strictly tied to user's account */}
      <Field label="Source Mobile Wallet">
        <OwnWalletPicker
          wallets={wallets}
          selectedPhone={state.phone || selectedWallet?.phone || ""}
          accounts={accounts}
          onSelect={handleSelectWallet}
        />
      </Field>

      {/* 3. Amount */}
      <AmountInput
        value={state.amount}
        onChange={(val) => onChange("amount", val)}
        currency="GHS"
        label="Amount to Transfer"
      />

      {/* 4. Narration (Optional) */}
      <NarrationInput
        value={state.narration}
        onChange={(val) => onChange("narration", val)}
      />

      {/* 5. Transaction Category (Optional) */}
      <CategorySelect
        value={state.category}
        onChange={(val) => onChange("category", val)}
      />

      {/* 6. Schedule Payment */}
      <SchedulePaymentSection
        state={{
          enabled: state.isScheduled ?? false,
          startDate: state.scheduleDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
          frequency: state.scheduleFrequency || "once",
          endDate: state.scheduleEndDate || "",
        }}
        onChange={(updates) => {
          if (updates.enabled !== undefined) onChange("isScheduled", updates.enabled);
          if (updates.startDate !== undefined) onChange("scheduleDate", updates.startDate);
          if (updates.frequency !== undefined) onChange("scheduleFrequency", updates.frequency);
          if (updates.endDate !== undefined) onChange("scheduleEndDate", updates.endDate);
        }}
      />

      {/* 7. Proceed CTA */}
      <ProceedButton
        disabled={!isValid}
        onClick={onProceed}
      />
    </div>
  );
}
