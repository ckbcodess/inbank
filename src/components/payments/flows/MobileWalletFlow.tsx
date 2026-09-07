"use client";

import { useMemo } from "react";
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
  NETWORKS,
  detectNetwork,
  resolveAccountName,
} from "./shared";

const REGISTERED_PHONE = "024 412 3456";

export interface MobileWalletFormState {
  fromId: string;
  wNetwork: string;
  wPhone: string;
  wName: string;
  amount: string;
  narration: string;
  category: string;
}

interface MobileWalletFlowProps {
  accounts: Account[];
  walletCategory: "self" | "other";
  state: MobileWalletFormState;
  onChange: (key: keyof MobileWalletFormState, value: string) => void;
  onProceed: () => void;
}

export function MobileWalletFlow({
  accounts,
  walletCategory,
  state,
  onChange,
  onProceed,
}: MobileWalletFlowProps) {
  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const isSelf = walletCategory === "self";

  const verifiedName = useMemo(() => {
    if (isSelf) return "Own Wallet (Verified)";
    return resolveAccountName(state.wPhone, state.wName);
  }, [isSelf, state.wPhone, state.wName]);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isPhoneValid = isSelf || state.wPhone.replace(/\s/g, "").length >= 9;
  const isValid = Boolean(state.fromId) && isPhoneValid && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination (Mobile Wallet) */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-foreground">Mobile Network</label>
          <Select
            value={state.wNetwork || "MTN Mobile Money"}
            onValueChange={(val) => val && onChange("wNetwork", val)}
          >
            <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              {NETWORKS.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-foreground">
            {isSelf ? "My Registered Phone" : "Recipient Phone Number"}
          </label>
          {isSelf ? (
            <div className="flex h-13 items-center justify-between rounded-2xl border border-border/80 bg-muted/30 px-4 text-[15px] font-medium text-foreground">
              <span className="tabular">{REGISTERED_PHONE}</span>
              <span className="text-[12px] text-primary font-normal">Registered Mobile</span>
            </div>
          ) : (
            <input
              type="tel"
              inputMode="numeric"
              value={state.wPhone}
              onChange={(e) => {
                const val = e.target.value;
                onChange("wPhone", val);
                const detected = detectNetwork(val);
                if (detected) {
                  onChange("wNetwork", detected);
                }
                const resolved = resolveAccountName(val, "");
                if (resolved) {
                  onChange("wName", resolved);
                }
              }}
              placeholder="e.g. 024 412 3456"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
            />
          )}
        </div>

        {verifiedName && <VerifiedAccountBadge name={verifiedName} />}
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
