"use client";

import { useState, useMemo, useEffect } from "react";
import { Account } from "@/lib/mock-data";
import {
} from "@/components/ui/select";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  VerifiedAccountBadge,
  ResolvingAccountBadge,
  CollapsedDetailsBadge,
  OTHER_BANKS,
  SchedulePaymentSection,
  ScheduleFrequency,
  resolveAccountName,
  BankSelect,
  PaymentMethodSelect,
} from "./shared";

export interface OtherBankFormState {
  fromId: string;
  bank: string;
  benAcct: string;
  benName: string;
  paymentMethod?: string;
  amount: string;
  narration: string;
  category: string;
  saveBeneficiary?: boolean;
  beneficiaryNickname?: string;
  isScheduled?: boolean;
  scheduleDate?: string;
  scheduleFrequency?: ScheduleFrequency;
  scheduleEndDate?: string;
}

interface OtherBankFlowProps {
  accounts: Account[];
  state: OtherBankFormState;
  onChange: (key: keyof OtherBankFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function OtherBankFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: OtherBankFlowProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(detailsCollapsed ?? false);
  const isCollapsed = detailsCollapsed !== undefined ? detailsCollapsed : internalCollapsed;

  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onToggleCollapsed?.(val);
  };

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.benAcct, state.benName);
  }, [state.benAcct, state.benName]);

  const cleanAcct = state.benAcct.replace(/[\s-]/g, "");
  const isAcctValid = cleanAcct.length >= 8;
  const isBankValid = Boolean(state.bank);
  const isDetailsValid = isBankValid && isAcctValid;

  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (isDetailsValid) {
      setResolving(true);
      const timer = setTimeout(() => {
        setResolving(false);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setResolving(false);
    }
  }, [isDetailsValid, state.bank, state.benAcct]);

  const isVerified = isDetailsValid && !resolving && Boolean(verifiedName);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isValid = Boolean(state.fromId) && isVerified && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination Bank & Account Number */}
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-foreground">Beneficiary details</label>
        {isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `Account ${state.benAcct}`}
            subtitle={`${state.bank || "Other Bank"} · ${state.benAcct}`}
            nameCheck={{ confirmed: Boolean(verifiedName), by: state.bank || undefined }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <BankSelect value={state.bank || ""} onChange={(val) => onChange("bank", val)} options={OTHER_BANKS} />

            <input
              type="text"
              inputMode="numeric"
              value={state.benAcct}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                onChange("benAcct", val);
                const resolved = resolveAccountName(val, "");
                if (resolved) {
                  onChange("benName", resolved);
                }
              }}
              placeholder="Enter account number"
              className="numorainput h-13 w-full rounded-2xl border border-field-border bg-field px-4 text-[15px] text-foreground outline-none focus:border-field-border-focus focus:ring-0 transition tabular"
            />

            {/* Resolving indicator */}
            {isDetailsValid && resolving && (
              <ResolvingAccountBadge message={`Verifying account with ${state.bank}...`} />
            )}

            {/* Verified badge */}
            {isVerified && <VerifiedAccountBadge name={verifiedName} />}
          </div>
        )}
      </div>

      {/* Progressive Disclosure: Only reveal Payment Method, Amount & onwards after details are verified */}
      {isVerified && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Payment Method */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">Payment method</label>
            <PaymentMethodSelect value={state.paymentMethod || "gip"} onChange={(val) => onChange("paymentMethod", val)} />
          </div>

          {/* 4. Amount */}
          <AmountInput
            value={state.amount}
            onChange={(val) => onChange("amount", val)}
            onFocus={() => {
              if (isVerified) setCollapsed(true);
            }}
            error={
              overBalance ? (
                <InsufficientFundsAlert />
              ) : undefined
            }
          />

          {/* 5. Narration */}
          <NarrationInput
            value={state.narration}
            onChange={(val) => onChange("narration", val)}
          />

          {/* 6. Transaction Category (Optional) */}
          <CategorySelect
            value={state.category}
            onChange={(val) => onChange("category", val)}
          />

          {/* 8. Schedule Payment */}
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

          {/* 9. Proceed CTA */}
          <ProceedButton
            disabled={!isValid}
            onClick={onProceed}
          />
        </div>
      )}
    </div>
  );
}
