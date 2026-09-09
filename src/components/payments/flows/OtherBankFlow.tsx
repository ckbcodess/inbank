"use client";

import { useState, useMemo } from "react";
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
  CollapsedDetailsBadge,
  OTHER_BANKS,
  PAYMENT_METHODS,
  SaveBeneficiaryCheckbox,
  SchedulePaymentSection,
  ScheduleFrequency,
  resolveAccountName,
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

  const selectedPaymentMethod = useMemo(() => {
    return PAYMENT_METHODS.find((m) => m.id === state.paymentMethod);
  }, [state.paymentMethod]);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isAcctValid = state.benAcct.replace(/\s/g, "").length >= 8;
  const isBankValid = Boolean(state.bank);
  const isDetailsValid = isBankValid && isAcctValid;
  const isMethodValid = Boolean(state.paymentMethod);
  const isValid = Boolean(state.fromId) && isDetailsValid && isMethodValid && numAmount > 0 && !overBalance;

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
        <label className="text-[14px] font-medium text-foreground">Beneficiary Details</label>
        {isDetailsValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `Account ${state.benAcct}`}
            subtitle={`${state.bank || "Other Bank"} · ${state.benAcct}`}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <Select
              value={state.bank || ""}
              onValueChange={(val) => val && onChange("bank", val)}
            >
              <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                <SelectValue placeholder="Select Bank" />
              </SelectTrigger>
              <SelectContent>
                {OTHER_BANKS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
              className="numorainput h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
            />

            {verifiedName && <VerifiedAccountBadge name={verifiedName} />}
          </div>
        )}
      </div>

      {/* 3. Payment Method */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Payment Method</label>
        <Select
          value={state.paymentMethod || ""}
          onValueChange={(val) => val && onChange("paymentMethod", val)}
        >
          <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
            {selectedPaymentMethod ? (
              <span className="truncate text-[15px] font-normal text-foreground">
                {selectedPaymentMethod.name}
              </span>
            ) : (
              <span className="truncate text-[15px] font-normal text-muted-foreground">
                Select payment method
              </span>
            )}
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.id} value={m.id} label={m.name}>
                <div className="flex items-center justify-between w-full gap-4 py-0.5">
                  <div className="flex flex-col text-left">
                    <span className="font-medium text-foreground">{m.name}</span>
                    <span className="text-[12px] text-muted-foreground font-normal">{m.description}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[13px] font-medium text-foreground tabular block">{m.feeText}</span>
                    <span className="text-[11.5px] text-muted-foreground font-normal">{m.speed}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 4. Amount */}
      <AmountInput
        value={state.amount}
        onChange={(val) => onChange("amount", val)}
        onFocus={() => {
          if (isDetailsValid) setCollapsed(true);
        }}
        error={
          overBalance ? (
            <InsufficientFundsAlert
              available={fromAccount?.available ?? 0}
              currency={fromAccount?.currency || "GHS"}
            />
          ) : undefined
        }
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

      {/* 6. Save Beneficiary */}
      <SaveBeneficiaryCheckbox
        checked={state.saveBeneficiary ?? false}
        onChange={(val) => onChange("saveBeneficiary", val)}
        nickname={state.beneficiaryNickname}
        onNicknameChange={(val) => onChange("beneficiaryNickname", val)}
      />

      {/* 7. Schedule Payment */}
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

      {/* 8. Proceed CTA */}
      <ProceedButton
        disabled={!isValid}
        onClick={onProceed}
      />
    </div>
  );
}
