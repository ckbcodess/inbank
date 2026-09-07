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
  NETWORKS,
  detectNetwork,
  resolveAccountName,
} from "./shared";

export interface AirtimeFormState {
  fromId: string;
  wNetwork: string;
  aPhone: string;
  benName: string;
  amount: string;
  narration: string;
  category: string;
}

interface AirtimeFlowProps {
  accounts: Account[];
  state: AirtimeFormState;
  onChange: (key: keyof AirtimeFormState, value: string) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function AirtimeFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: AirtimeFlowProps) {
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
    return resolveAccountName(state.aPhone, state.benName);
  }, [state.aPhone, state.benName]);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isPhoneValid = state.aPhone.replace(/\s/g, "").length >= 9;
  const isValid = Boolean(state.fromId) && isPhoneValid && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination: Network & Phone Number */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Beneficiary Details</label>
        {isPhoneValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `Phone ${state.aPhone}`}
            subtitle={`${state.wNetwork || "Mobile Network"} · ${state.aPhone}`}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <Select
              value={state.wNetwork || ""}
              onValueChange={(val) => val && onChange("wNetwork", val)}
            >
              <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                <SelectValue placeholder="Select Network" />
              </SelectTrigger>
              <SelectContent>
                {NETWORKS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              type="tel"
              inputMode="numeric"
              value={state.aPhone}
              onChange={(e) => {
                const val = e.target.value;
                onChange("aPhone", val);
                const detected = detectNetwork(val);
                if (detected) {
                  onChange("wNetwork", detected);
                }
                const resolved = resolveAccountName(val, "");
                if (resolved) {
                  onChange("benName", resolved);
                }
              }}
              placeholder="Enter phone number"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
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
          if (isPhoneValid) setCollapsed(true);
        }}
      />

      {/* 4. Narration */}
      <NarrationInput
        value={state.narration}
        onChange={(val) => onChange("narration", val)}
        placeholder="Airtime recharge"
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
        label="Proceed"
      />
    </div>
  );
}
