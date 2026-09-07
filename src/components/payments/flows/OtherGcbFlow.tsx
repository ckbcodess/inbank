"use client";

import { useState, useMemo } from "react";
import { Account } from "@/lib/mock-data";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  VerifiedAccountBadge,
  CollapsedDetailsBadge,
  resolveAccountName,
} from "./shared";

export interface OtherGcbFormState {
  fromId: string;
  benAcct: string;
  benName: string;
  amount: string;
  narration: string;
  category: string;
}

interface OtherGcbFlowProps {
  accounts: Account[];
  state: OtherGcbFormState;
  onChange: (key: keyof OtherGcbFormState, value: string) => void;
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

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.benAcct, state.benName);
  }, [state.benAcct, state.benName]);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isAcctValid = state.benAcct.replace(/\s/g, "").length >= 8;
  const isValid = Boolean(state.fromId) && isAcctValid && numAmount > 0 && !overBalance;

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
        <label className="text-[14px] font-medium text-foreground">Recipient Details</label>
        {isAcctValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `GCB Account ${state.benAcct}`}
            subtitle={`GCB Bank PLC · ${state.benAcct}`}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-foreground">Destination Bank</label>
              <div className="flex h-13 items-center rounded-2xl border border-border/80 bg-muted/30 px-4 text-[15px] font-medium text-foreground">
                GCB Bank PLC
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-foreground">GCB Account Number</label>
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
                placeholder="Enter 10-13 digit GCB account number"
                className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
              />
            </div>

            {verifiedName && <VerifiedAccountBadge name={verifiedName} />}
          </div>
        )}
      </div>

      {/* 3. Amount */}
      <AmountInput
        value={state.amount}
        onChange={(val) => onChange("amount", val)}
        onFocus={() => {
          if (isAcctValid) setCollapsed(true);
        }}
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
