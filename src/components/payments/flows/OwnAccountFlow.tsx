"use client";

import { useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
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
  CollapsedDetailsBadge,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  SchedulePaymentSection,
  ScheduleFrequency,
} from "./shared";

export interface OwnAccountFormState {
  fromId: string;
  toOwnAccountId: string;
  amount: string;
  narration: string;
  category: string;
  isScheduled?: boolean;
  scheduleDate?: string;
  scheduleFrequency?: ScheduleFrequency;
  scheduleEndDate?: string;
}

interface OwnAccountFlowProps {
  accounts: Account[];
  state: OwnAccountFormState;
  onChange: (key: keyof OwnAccountFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function OwnAccountFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: OwnAccountFlowProps) {
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

  const toAccount = useMemo(
    () => accounts.find((a) => a.id === state.toOwnAccountId),
    [accounts, state.toOwnAccountId]
  );

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isDetailsValid =
    Boolean(state.toOwnAccountId) &&
    state.toOwnAccountId !== state.fromId &&
    Boolean(toAccount);

  const isValid =
    Boolean(state.fromId) &&
    isDetailsValid &&
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
            setCollapsed(false);
          }
        }}
      />

      {/* 2. To Account */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">To Account</label>
        {isDetailsValid && isCollapsed && toAccount ? (
          <CollapsedDetailsBadge
            title={toAccount.name}
            subtitle={`Account ••${toAccount.number.slice(-4)} · ${formatMoney(toAccount.available, toAccount.currency, true)}`}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <Select
            value={state.toOwnAccountId}
            onValueChange={(val) => val && onChange("toOwnAccountId", val)}
          >
            <SelectTrigger className="min-h-[68px] h-auto py-3 px-4 w-full rounded-2xl border border-border/80 bg-card hover:bg-muted/20 text-left cursor-pointer transition-colors shadow-none flex items-center">
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
        )}
        {Boolean(state.toOwnAccountId && state.toOwnAccountId === state.fromId) && (
          <div className="flex items-center gap-2 text-[12.5px] text-destructive animate-in fade-in duration-150">
            <AlertCircle size={14} className="shrink-0" />
            <span>Destination account cannot be the same as source account.</span>
          </div>
        )}
      </div>

      {/* Progressive Disclosure: Only reveal Amount & subsequent sections after destination account is selected */}
      {isDetailsValid && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount */}
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
            defaultCategory="Savings"
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
      )}
    </div>
  );
}
