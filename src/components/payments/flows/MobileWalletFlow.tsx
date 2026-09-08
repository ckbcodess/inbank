"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  SaveBeneficiaryCheckbox,
  SchedulePaymentSection,
  ScheduleFrequency,
  detectTelcoNetwork,
  resolveAccountName,
} from "./shared";
import { REGISTERED_PHONE } from "../useAuthorisation";

export interface MobileWalletFormState {
  fromId: string;
  wNetwork: string;
  wPhone: string;
  wName: string;
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

interface MobileWalletFlowProps {
  accounts: Account[];
  walletCategory: "self" | "other";
  state: MobileWalletFormState;
  onChange: (key: keyof MobileWalletFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function MobileWalletFlow({
  accounts,
  walletCategory,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: MobileWalletFlowProps) {
  const isSelf = walletCategory === "self";
  const [internalCollapsed, setInternalCollapsed] = useState(
    detailsCollapsed !== undefined ? detailsCollapsed : isSelf
  );
  const isCollapsed = detailsCollapsed !== undefined ? detailsCollapsed : internalCollapsed;

  const setCollapsed = useCallback((val: boolean) => {
    setInternalCollapsed(val);
    onToggleCollapsed?.(val);
  }, [onToggleCollapsed]);

  useEffect(() => {
    if (walletCategory === "self") {
      setCollapsed(true);
    }
  }, [walletCategory, setCollapsed]);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const verifiedName = useMemo(() => {
    if (isSelf) return "Own Wallet (Verified)";
    return resolveAccountName(state.wPhone, state.wName);
  }, [isSelf, state.wPhone, state.wName]);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isPhoneValid = isSelf || state.wPhone.replace(/\s/g, "").length >= 9;
  const isNetworkValid = isSelf || Boolean(state.wNetwork);
  const isValid = Boolean(state.fromId) && isNetworkValid && isPhoneValid && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination (Mobile Wallet) */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Beneficiary Details</label>
        {isPhoneValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={isSelf ? (state.wName || "My Own Wallet (Self)") : (verifiedName || state.wName || `Wallet ${state.wPhone}`)}
            subtitle={`${state.wNetwork || "MTN Mobile Money"} · ${isSelf ? (state.wPhone || REGISTERED_PHONE) : state.wPhone}`}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {isSelf ? (
              <div className="flex h-13 items-center justify-between rounded-2xl border border-border/80 bg-muted/30 px-4 text-[15px] font-medium text-foreground">
                <span className="tabular">{state.wPhone || REGISTERED_PHONE}</span>
                <span className="text-[12px] text-muted-foreground font-normal">Registered Mobile</span>
              </div>
            ) : (
              <>
                <Select
                  value={state.wNetwork || ""}
                  onValueChange={(val) => val && onChange("wNetwork", val)}
                >
                  <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                    <SelectValue placeholder="Select Wallet Provider" />
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
                  value={state.wPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange("wPhone", val);
                    const detected = detectTelcoNetwork(val);
                    if (detected && !state.wNetwork) {
                      onChange("wNetwork", detected.walletName);
                    }
                    const resolved = resolveAccountName(val, "");
                    if (resolved) {
                      onChange("wName", resolved);
                    }
                    const clean = val.replace(/[\s-]/g, "");
                    if (clean.length === 10) {
                      setCollapsed(true);
                    }
                  }}
                  placeholder="Enter mobile number (e.g. 024 123 4567)"
                  className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
                />
              </>
            )}

            {verifiedName && <VerifiedAccountBadge name={verifiedName} />}
          </div>
        )}
      </div>

      {/* 3. Amount */}
      <AmountInput
        value={state.amount}
        onChange={(val) => onChange("amount", val)}
        onFocus={() => {
          if (isPhoneValid && isNetworkValid) setCollapsed(true);
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

      {/* 6. Save Beneficiary (for other wallets) */}
      {!isSelf && (
        <SaveBeneficiaryCheckbox
          checked={state.saveBeneficiary ?? false}
          onChange={(val) => onChange("saveBeneficiary", val)}
          nickname={state.beneficiaryNickname}
          onNicknameChange={(val) => onChange("beneficiaryNickname", val)}
        />
      )}

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
