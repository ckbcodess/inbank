"use client";

import { useState, useMemo } from "react";
import { Smartphone } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  VerifiedAccountBadge,
  CollapsedDetailsBadge,
  BANKS,
  SaveBeneficiaryCheckbox,
  SchedulePaymentSection,
  ScheduleFrequency,
  resolveAccountName,
} from "./shared";

export interface WalletToBankFormState {
  bank: string;
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

interface WalletToBankFlowProps {
  state: WalletToBankFormState;
  onChange: (key: keyof WalletToBankFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function WalletToBankFlow({
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: WalletToBankFlowProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(detailsCollapsed ?? false);
  const isCollapsed = detailsCollapsed !== undefined ? detailsCollapsed : internalCollapsed;

  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onToggleCollapsed?.(val);
  };
  const walletBalance = 1450.0; // Registered wallet available limit

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.benAcct, state.benName);
  }, [state.benAcct, state.benName]);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > walletBalance;
  const isAcctValid = state.benAcct.replace(/\s/g, "").length >= 8;
  const isDetailsValid = Boolean(state.bank) && isAcctValid;
  const isValid = isDetailsValid && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. Source Mobile Wallet */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Source Mobile Wallet</label>
        <div className="flex items-center justify-between h-[68px] min-h-[68px] px-4 w-full rounded-2xl border border-border/80 bg-card gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
              <Smartphone size={19} strokeWidth={1.8} />
            </span>
            <div className="flex flex-col min-w-0 text-left gap-0.5">
              <span className="text-[15px] text-foreground font-medium tracking-[-0.01em] truncate leading-tight">
                MTN Mobile Money
              </span>
              <span className="text-[13px] text-muted-foreground font-normal truncate tabular leading-tight">
                024 412 3456
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[15px] text-foreground font-medium tabular tracking-tight">
              GHS 1,450.00
            </span>
          </div>
        </div>
      </div>

      {/* 2. Destination Bank Account */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Beneficiary Details</label>
        {isDetailsValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `Account ${state.benAcct}`}
            subtitle={`${state.bank || "Bank"} · ${state.benAcct}`}
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
                {BANKS.map((b) => (
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
                const val = e.target.value;
                onChange("benAcct", val);
                const resolved = resolveAccountName(val, "");
                if (resolved) {
                  onChange("benName", resolved);
                }
              }}
              placeholder="Enter account number"
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
          if (isDetailsValid) setCollapsed(true);
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

      {overBalance && (
        <InsufficientFundsAlert
          available={walletBalance}
          currency="GHS"
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
