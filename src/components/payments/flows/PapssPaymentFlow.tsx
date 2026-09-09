"use client";

import { useState, useMemo } from "react";
import { Account, formatMoney } from "@/lib/mock-data";
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
  CollapsedDetailsBadge,
  SaveBeneficiaryCheckbox,
  SchedulePaymentSection,
  ScheduleFrequency,
  RATES,
} from "./shared";

const PAPSS_COUNTRIES = [
  { name: "Nigeria", currency: "NGN" },
  { name: "Kenya", currency: "KES" },
  { name: "South Africa", currency: "ZAR" },
  { name: "Côte d'Ivoire", currency: "XOF" },
  { name: "Egypt", currency: "EGP" },
  { name: "Rwanda", currency: "RWF" },
  { name: "Zambia", currency: "ZMW" },
];

export interface PapssPaymentFormState {
  fromId: string;
  wCountry: string;
  wCurrency: string;
  wBank: string;
  wIban: string;
  wBenName: string;
  wForeign: string;
  wPurpose: string;
  category: string;
  saveBeneficiary?: boolean;
  beneficiaryNickname?: string;
  isScheduled?: boolean;
  scheduleDate?: string;
  scheduleFrequency?: ScheduleFrequency;
  scheduleEndDate?: string;
}

interface PapssPaymentFlowProps {
  accounts: Account[];
  state: PapssPaymentFormState;
  onChange: (key: keyof PapssPaymentFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function PapssPaymentFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: PapssPaymentFlowProps) {
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

  const rate = RATES[state.wCurrency] ?? 0.0098;
  const numForeign = Number(state.wForeign.replace(/[^0-9.]/g, "")) || 0;
  const ghsEquivalent = Math.round(numForeign * rate * 100) / 100;
  const fee = 25.0; // PAPSS standard fee
  const totalGhs = ghsEquivalent + fee;
  const overBalance = totalGhs > (fromAccount?.available ?? 0);

  const isDestinationValid =
    state.wBenName.trim().length >= 3 &&
    state.wIban.trim().length >= 6 &&
    Boolean(state.wBank);

  const isValid =
    Boolean(state.fromId) && isDestinationValid && numForeign > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Recipient & Destination Details */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">PAPSS Beneficiary Details</label>
        {isDestinationValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={state.wBenName}
            subtitle={`${state.wBank || "Bank"} · ${state.wIban} (${state.wCountry || "Africa"})`}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={state.wCountry || "Nigeria"}
                onValueChange={(val) => {
                  const found = PAPSS_COUNTRIES.find((c) => c.name === val);
                  if (found) {
                    onChange("wCountry", found.name);
                    onChange("wCurrency", found.currency);
                  }
                }}
              >
                <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                  <SelectValue placeholder="Select African country" />
                </SelectTrigger>
                <SelectContent>
                  {PAPSS_COUNTRIES.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name} ({c.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <input
                type="text"
                value={state.wBank}
                onChange={(e) => onChange("wBank", e.target.value)}
                placeholder="Enter recipient bank"
                className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
              />
            </div>

            <input
              type="text"
              value={state.wBenName}
              onChange={(e) => onChange("wBenName", e.target.value)}
              placeholder="Enter legal name of recipient"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
            />

            <input
              type="text"
              value={state.wIban}
              onChange={(e) => onChange("wIban", e.target.value)}
              placeholder="Enter account number or IBAN"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
            />
          </div>
        )}
      </div>

      {/* 3. Amount in Foreign Currency */}
      <div className="flex flex-col gap-2">
        <AmountInput
          value={state.wForeign}
          onChange={(val) => onChange("wForeign", val)}
          currency={state.wCurrency || "NGN"}
          label={`Amount (${state.wCurrency || "NGN"})`}
          onFocus={() => {
            if (isDestinationValid) setCollapsed(true);
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
        {numForeign > 0 && (
          <div className="flex items-center justify-between px-2 text-[13px] text-muted-foreground">
            <span>Approx. GHS Equivalent:</span>
            <span className="font-semibold text-foreground tabular">
              {formatMoney(ghsEquivalent, "GHS", true)} (at 1 {state.wCurrency} = GHS {rate})
            </span>
          </div>
        )}
      </div>

      {/* 4. Narration / Purpose of Payment */}
      <NarrationInput
        value={state.wPurpose}
        onChange={(val) => onChange("wPurpose", val)}
        label="Purpose of Payment"
        placeholder="e.g. Trade settlement, family remittance"
      />

      {/* 5. Transaction Category */}
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
        label="Review Transfer"
      />
    </div>
  );
}
