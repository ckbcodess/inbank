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
  TELCO_NETWORKS,
  SaveBeneficiaryCheckbox,
  SchedulePaymentSection,
  ScheduleFrequency,
  detectTelcoNetwork,
  normalizeNetworkName,
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
  saveBeneficiary?: boolean;
  beneficiaryNickname?: string;
  isScheduled?: boolean;
  scheduleDate?: string;
  scheduleFrequency?: ScheduleFrequency;
  scheduleEndDate?: string;
}

interface AirtimeFlowProps {
  accounts: Account[];
  state: AirtimeFormState;
  onChange: (key: keyof AirtimeFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
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

      {/* 2. Destination: Phone Number & Network */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Recipient Details</label>
        {isPhoneValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `Phone ${state.aPhone}`}
            subtitle={`${state.wNetwork ? normalizeNetworkName(state.wNetwork) : "Mobile Network"} · ${state.aPhone}`}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="tel"
              inputMode="numeric"
              value={state.aPhone}
              onChange={(e) => {
                const val = e.target.value;
                onChange("aPhone", val);
                const detected = detectTelcoNetwork(val);
                if (detected) {
                  onChange("wNetwork", detected.telcoName);
                }
                const resolved = resolveAccountName(val, "");
                if (resolved) {
                  onChange("benName", resolved);
                }
                const clean = val.replace(/[\s-]/g, "");
                if (clean.length === 10) {
                  setCollapsed(true);
                }
              }}
              placeholder="Enter phone number (e.g. 024 123 4567)"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
            />

            <Select
              value={state.wNetwork ? normalizeNetworkName(state.wNetwork) : ""}
              onValueChange={(val) => val && onChange("wNetwork", val)}
            >
              <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                <SelectValue placeholder="Select Network" />
              </SelectTrigger>
              <SelectContent>
                {TELCO_NETWORKS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

      {/* 6. Save Beneficiary */}
      <SaveBeneficiaryCheckbox
        checked={state.saveBeneficiary ?? false}
        onChange={(val) => onChange("saveBeneficiary", val)}
        nickname={state.beneficiaryNickname}
        onNicknameChange={(val) => onChange("beneficiaryNickname", val)}
        label="Save as beneficiary for future top-ups"
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
