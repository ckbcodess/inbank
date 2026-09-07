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

export interface ProxyPayFormState {
  fromId: string;
  pxId: string;
  benName: string;
  amount: string;
  narration: string;
  category: string;
}

interface ProxyPayFlowProps {
  accounts: Account[];
  state: ProxyPayFormState;
  onChange: (key: keyof ProxyPayFormState, value: string) => void;
  onProceed: () => void;
}

export function ProxyPayFlow({
  accounts,
  state,
  onChange,
  onProceed,
}: ProxyPayFlowProps) {
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.pxId, state.benName || (state.pxId.startsWith("@") ? `${state.pxId.replace("@", "").toUpperCase()} Alias` : ""));
  }, [state.pxId, state.benName]);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isPxValid = state.pxId.trim().length >= 4;
  const isValid = Boolean(state.fromId) && isPxValid && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination: Proxy ID */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Proxy ID (Phone, @Alias, or Ghana Card)</label>
        {isPxValid && detailsCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.pxId}
            subtitle={`Proxy Recipient · ${state.pxId}`}
            onChange={() => setDetailsCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={state.pxId}
              onChange={(e) => {
                const val = e.target.value;
                onChange("pxId", val);
                const resolved = resolveAccountName(val, "");
                if (resolved) {
                  onChange("benName", resolved);
                }
              }}
              placeholder="e.g. @kwame.b or 0244123456"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
            />
            {verifiedName && <VerifiedAccountBadge name={verifiedName} />}
          </div>
        )}
      </div>

      {/* 3. Amount */}
      <AmountInput
        value={state.amount}
        onChange={(val) => onChange("amount", val)}
        onFocus={() => {
          if (isPxValid) setDetailsCollapsed(true);
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
