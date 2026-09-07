"use client";

import { useState, useMemo } from "react";
import { Account, BILLERS } from "@/lib/mock-data";
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
  SaveBeneficiaryCheckbox,
  SchedulePaymentSection,
  ScheduleFrequency,
} from "./shared";

const GHANA_GOV_SERVICES = [
  "GRA — Domestic Tax",
  "GRA — Customs & Ports",
  "Passport Office",
  "DVLA — License & Road Worthy",
  "Registrar General's Dept (RGD)",
  "Lands Commission",
  "Ghana Police Service — Traffic Fines",
];

export interface BillsPaymentFormState {
  fromId: string;
  subType: "bill" | "ecg" | "ghanagov";
  billerId: string;
  billRef: string;
  ecgMeter: string;
  govService: string;
  govRef: string;
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

interface BillsPaymentFlowProps {
  accounts: Account[];
  state: BillsPaymentFormState;
  onChange: (key: keyof BillsPaymentFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function BillsPaymentFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: BillsPaymentFlowProps) {
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

  const selectedBiller = useMemo(() => {
    return BILLERS.find((b) => b.id === state.billerId) ?? BILLERS[0];
  }, [state.billerId]);

  const verifiedName = useMemo(() => {
    if (state.subType === "ecg") {
      if (state.ecgMeter.trim().length >= 5) {
        return `ECG Prepaid · Meter ${state.ecgMeter.trim()}`;
      }
      return "";
    }
    if (state.subType === "ghanagov") {
      if (state.govRef.trim().length >= 4) {
        return `${state.govService || "Ghana.gov"} · Ref ${state.govRef.trim()}`;
      }
      return "";
    }
    if (state.billRef.trim().length >= 4) {
      return `${selectedBiller?.name || "Biller"} · ${state.billRef.trim()}`;
    }
    return "";
  }, [state.subType, state.ecgMeter, state.govService, state.govRef, state.billRef, selectedBiller?.name]);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);

  const isDestinationValid = useMemo(() => {
    if (state.subType === "ecg") return state.ecgMeter.trim().length >= 5;
    if (state.subType === "ghanagov") return Boolean(state.govService) && state.govRef.trim().length >= 4;
    return Boolean(state.billerId) && state.billRef.trim().length >= 4;
  }, [state.subType, state.ecgMeter, state.govService, state.govRef, state.billerId, state.billRef]);

  const isValid = Boolean(state.fromId) && isDestinationValid && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Biller & Reference / Account */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Beneficiary Details</label>
        {isDestinationValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={
              verifiedName ||
              state.benName ||
              (state.subType === "ecg"
                ? `Meter ${state.ecgMeter}`
                : state.subType === "ghanagov"
                ? state.govService || "Ghana.gov Service"
                : selectedBiller?.name || "Biller Account")
            }
            subtitle={
              state.subType === "ecg"
                ? `Electricity Company of Ghana (ECG) · ${state.ecgMeter}`
                : state.subType === "ghanagov"
                ? `${state.govService || "Ghana.gov"} · Ref ${state.govRef}`
                : `${selectedBiller?.name || "Biller"} · ${state.billRef}`
            }
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {state.subType === "ecg" ? (
              <>
                <div className="flex h-13 items-center rounded-2xl border border-border/80 bg-muted/30 px-4 text-[15px] font-medium text-foreground">
                  Electricity Company of Ghana (ECG)
                </div>

                <input
                  type="text"
                  value={state.ecgMeter}
                  onChange={(e) => onChange("ecgMeter", e.target.value)}
                  placeholder="Enter meter number"
                  className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
                />
              </>
            ) : state.subType === "ghanagov" ? (
              <>
                <Select
                  value={state.govService || ""}
                  onValueChange={(val) => val && onChange("govService", val)}
                >
                  <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                    <SelectValue placeholder="Select government agency" />
                  </SelectTrigger>
                  <SelectContent>
                    {GHANA_GOV_SERVICES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <input
                  type="text"
                  value={state.govRef}
                  onChange={(e) => onChange("govRef", e.target.value)}
                  placeholder="Enter PRN or invoice number"
                  className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
                />
              </>
            ) : (
              <>
                <Select
                  value={state.billerId || ""}
                  onValueChange={(val) => val && onChange("billerId", val)}
                >
                  <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                    <SelectValue placeholder="Select Biller" />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLERS.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <input
                  type="text"
                  value={state.billRef}
                  onChange={(e) => onChange("billRef", e.target.value)}
                  placeholder={selectedBiller ? `Enter ${selectedBiller.reference.toLowerCase()}` : "Enter account or reference number"}
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
          if (isDestinationValid) setCollapsed(true);
        }}
      />

      {/* 4. Narration */}
      <NarrationInput
        value={state.narration}
        onChange={(val) => onChange("narration", val)}
        placeholder="Bill payment"
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
        label="Save this biller as a beneficiary"
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
