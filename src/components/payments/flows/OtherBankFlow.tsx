"use client";

import { SavedRecipientLink } from "./SavedRecipients";
import { useState, useMemo, useEffect } from "react";
import { Account } from "@/lib/mock-data";
import { Search } from "@/components/ui/icons";
import { AppLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  AccountVerificationStatus,
  CollapsedDetailsBadge,
  OTHER_BANKS,
  SchedulePaymentSection,
  ScheduleFrequency,
  resolveAccountName,
  BankSelect,
  PaymentMethodSelect,
} from "./shared";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
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

  // Other banks can't be checked as the person types, so the name is looked up when they press Verify.
  const [verifiedKey, setVerifiedKey] = useState<string | null>(() =>
    state.benName && state.bank && cleanAcct.length >= 8 ? `${state.bank}|${cleanAcct}` : null
  );
  const [resolving, setResolving] = useState(false);
  const currentKey = `${state.bank}|${cleanAcct}`;

  // A saved recipient picked from outside arrives with its name already resolved
  useEffect(() => {
    if (state.benName && isDetailsValid && verifiedKey !== currentKey) setVerifiedKey(currentKey);
  }, [state.benName, isDetailsValid, verifiedKey, currentKey]);

  const handleVerify = () => {
    if (!isDetailsValid || resolving) return;
    setResolving(true);
    setTimeout(() => {
      const resolved = resolveAccountName(state.benAcct, state.benName);
      if (resolved) onChange("benName", resolved);
      setVerifiedKey(currentKey);
      setResolving(false);
    }, 250);
  };

  const isVerified = isDetailsValid && !resolving && verifiedKey === currentKey && Boolean(verifiedName);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isValid = Boolean(state.fromId) && isVerified && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination Bank & Account Number */}
      <Field label="Beneficiary Details" action={!(isVerified && isCollapsed) && <SavedRecipientLink provider={state.bank} value={state.benAcct} />}>
        {isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `Account ${state.benAcct}`}
            subtitle={`${state.bank || "Other Bank"} · ${state.benAcct}`}
            provider={state.bank || undefined}
            nameCheck={{ confirmed: Boolean(verifiedName), by: state.bank || undefined }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <BankSelect value={state.bank || ""} onChange={(val) => onChange("bank", val)} options={OTHER_BANKS} />

            {isBankValid && (
              <div className="relative flex items-center animate-in fade-in duration-200 ease-out">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={state.benAcct}
                  onChange={(e) => {
                    onChange("benAcct", e.target.value.replace(/[^0-9]/g, ""));
                    if (state.benName) onChange("benName", "");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isDetailsValid && !isVerified) {
                      e.preventDefault();
                      handleVerify();
                    }
                  }}
                  placeholder="Enter account number"
                  className="numorainput tabular pr-24"
                />
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={!isDetailsValid || resolving}
                  className={cn(
                    "absolute right-2 top-1/2 flex -translate-y-1/2 select-none items-center gap-2 rounded-lg px-2 py-1 text-[12px] font-medium transition-all",
                    isDetailsValid
                      ? "cursor-pointer text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      : "pointer-events-none cursor-not-allowed text-muted-foreground/35"
                  )}
                >
                  {resolving ? (
                    <>
                      <AppLoader size={12} className="text-muted-foreground" />
                      <span className="text-[12px] text-muted-foreground">Verifying...</span>
                    </>
                  ) : isVerified ? (
                    <span className="text-[12px] font-medium text-success-text">Verified</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Search size={13} />
                      <span>Verify</span>
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Verification Status */}
            <AccountVerificationStatus
              resolving={false}
              name={isVerified ? verifiedName : null}
            />
          </div>
        )}
</Field>

      {/* Progressive Disclosure: Only reveal Payment Method, Amount & onwards after details are verified */}
      {isVerified && (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Payment Method */}
          <Field label="Payment Method">
            <PaymentMethodSelect value={state.paymentMethod || "gip"} onChange={(val) => onChange("paymentMethod", val)} />
</Field>

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
