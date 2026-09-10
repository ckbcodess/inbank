"use client";

import { useState, useMemo, useEffect } from "react";
import { Account } from "@/lib/mock-data";
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
  SchedulePaymentSection,
  ScheduleFrequency,
  resolveAccountName,
} from "./shared";

export interface OtherGcbFormState {
  fromId: string;
  benAcct: string;
  benName: string;
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

interface OtherGcbFlowProps {
  accounts: Account[];
  state: OtherGcbFormState;
  onChange: (key: keyof OtherGcbFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function OtherGcbFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: OtherGcbFlowProps) {
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

  const cleanAcct = state.benAcct.replace(/[\s-]/g, "");
  const isAcctValid = cleanAcct.length >= 8;

  // Resolving / Verification state
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (isAcctValid) {
      setResolving(true);
      const timer = setTimeout(() => {
        setResolving(false);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setResolving(false);
    }
  }, [cleanAcct, isAcctValid]);

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.benAcct, state.benName);
  }, [state.benAcct, state.benName]);

  const isVerified = isAcctValid && !resolving && Boolean(verifiedName);

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

      {/* 2. Destination (GCB Account) */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Beneficiary Details</label>
        {isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `GCB Account ${state.benAcct}`}
            subtitle={`GCB Bank PLC · ${state.benAcct}`}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
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

            {/* Resolving indicator */}
            {isAcctValid && resolving && (
              <ResolvingAccountBadge message="Verifying GCB account details..." />
            )}

            {/* Verified badge */}
            {isVerified && <VerifiedAccountBadge name={verifiedName} />}
          </div>
        )}
      </div>

      {/* Progressive Disclosure: Only reveal Amount & subsequent sections after verification */}
      {isVerified && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount */}
          <AmountInput
            value={state.amount}
            onChange={(val) => onChange("amount", val)}
            onFocus={() => {
              if (isVerified) setCollapsed(true);
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
            defaultCategory="Family & Friends"
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
      )}
    </div>
  );
}
