"use client";

import { useState, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Account, BILLERS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
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
  SchedulePaymentSection,
  ScheduleFrequency,
  resolveAccountName,
} from "./shared";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

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
  billCategory?: string;
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

  const filteredBillers = useMemo(() => {
    if (!state.billCategory) return BILLERS;
    const list = BILLERS.filter(
      (b) =>
        b.category === state.billCategory ||
        b.category.toLowerCase().includes(state.billCategory!.toLowerCase())
    );
    return list.length > 0 ? list : BILLERS;
  }, [state.billCategory]);

  const selectedBiller = useMemo(() => {
    return filteredBillers.find((b) => b.id === state.billerId) ?? filteredBillers[0];
  }, [filteredBillers, state.billerId]);

  const currentRef = useMemo(() => {
    if (state.subType === "ecg") return state.ecgMeter;
    if (state.subType === "ghanagov") return state.govRef;
    return state.billRef;
  }, [state.subType, state.ecgMeter, state.govRef, state.billRef]);

  const canVerify = useMemo(() => {
    if (state.subType === "ghanagov" && !state.govService) return false;
    if (state.subType === "bill" && !state.billerId && !selectedBiller?.id) return false;
    return currentRef.trim().length >= 4;
  }, [state.subType, state.govService, state.billerId, selectedBiller?.id, currentRef]);

  const [verifiedRef, setVerifiedRef] = useState<string | null>(() => {
    if (state.benName && currentRef.trim().length >= 4) {
      return currentRef.trim();
    }
    return null;
  });

  const [verifiedName, setVerifiedName] = useState<string>(() => {
    if (state.benName && currentRef.trim().length >= 4) {
      return state.benName;
    }
    return "";
  });

  const [isVerifying, setIsVerifying] = useState(false);

  // Synchronize if beneficiary was pre-selected from external avatar/preset
  useEffect(() => {
    if (state.benName && currentRef.trim().length >= 4 && verifiedRef !== currentRef.trim()) {
      setVerifiedRef(currentRef.trim());
      setVerifiedName(state.benName);
    }
  }, [state.benName, currentRef, verifiedRef]);

  const isVerified = Boolean(
    verifiedRef &&
    verifiedRef === currentRef.trim() &&
    verifiedName
  );

  const handleVerify = () => {
    if (!canVerify || isVerifying) return;
    setIsVerifying(true);
    const ref = currentRef.trim();
    const resolved = resolveAccountName(ref, state.benName || "");
    const finalName = resolved || "Verified Account Holder";

    setTimeout(() => {
      setVerifiedRef(ref);
      setVerifiedName(finalName);
      onChange("benName", finalName);
      setIsVerifying(false);
    }, 250);
  };

  const renderVerifyButton = () => (
    <button
      type="button"
      onClick={handleVerify}
      disabled={!canVerify || isVerifying}
      className={cn(
        "absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 text-[12.5px] font-medium transition-all rounded-lg select-none",
        canVerify
          ? "text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95 cursor-pointer"
          : "text-muted-foreground/35 cursor-not-allowed pointer-events-none"
      )}
    >
      {isVerifying ? (
        <>
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground text-[12px]">Verifying...</span>
        </>
      ) : isVerified ? (
        <span className="text-success-text text-[12px] font-medium">Verified</span>
      ) : (
        "Verify"
      )}
    </button>
  );

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);

  const isDestinationValid = useMemo(() => {
    if (state.subType === "ecg") return state.ecgMeter.trim().length >= 4;
    if (state.subType === "ghanagov") return Boolean(state.govService) && state.govRef.trim().length >= 4;
    return Boolean(state.billerId || selectedBiller?.id) && state.billRef.trim().length >= 4;
  }, [state.subType, state.ecgMeter, state.govService, state.govRef, state.billerId, selectedBiller?.id, state.billRef]);

  const isValid = Boolean(state.fromId) && isDestinationValid && isVerified && Boolean(verifiedName) && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Biller & Reference / Account */}
      <Field label="Beneficiary Details">
        {isDestinationValid && isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || "Biller Account"}
            subtitle={
              state.subType === "ecg"
                ? `Electricity Company of Ghana (ECG) · ${state.ecgMeter}`
                : state.subType === "ghanagov"
                ? `${state.govService || "Ghana.gov"} · Ref ${state.govRef}`
                : `${selectedBiller?.name || "Biller"} · ${state.billRef}`
            }
            nameCheck={{ confirmed: Boolean(verifiedName), by: state.subType === "ecg" ? "ECG" : state.subType === "ghanagov" ? "Ghana.gov" : selectedBiller?.name }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {state.subType === "ecg" ? (
              <>
                <div className="flex h-13 items-center rounded-2xl border border-border/80 bg-muted/30 px-4 text-[15px] font-medium text-foreground">
                  Electricity Company of Ghana (ECG)
                </div>

                <div className="relative">
                  <Input
                    type="text"
                    value={state.ecgMeter}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange("ecgMeter", val);
                      if (verifiedRef && verifiedRef !== val.trim()) {
                        setVerifiedRef(null);
                        setVerifiedName("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canVerify && !isVerifying) {
                        e.preventDefault();
                        handleVerify();
                      }
                    }}
                    placeholder="Enter meter number"
                    className="tabular pr-20"
                  />
                  {renderVerifyButton()}
                </div>
              </>
            ) : state.subType === "ghanagov" ? (
              <>
                <Select
                  value={state.govService || ""}
                  onValueChange={(val) => {
                    if (val) {
                      onChange("govService", val);
                      setVerifiedRef(null);
                      setVerifiedName("");
                    }
                  }}
                >
                  <SelectTrigger>
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

                <div className="relative">
                  <Input
                    type="text"
                    value={state.govRef}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange("govRef", val);
                      if (verifiedRef && verifiedRef !== val.trim()) {
                        setVerifiedRef(null);
                        setVerifiedName("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canVerify && !isVerifying) {
                        e.preventDefault();
                        handleVerify();
                      }
                    }}
                    placeholder="Enter PRN or invoice number"
                    className="tabular pr-20"
                  />
                  {renderVerifyButton()}
                </div>
              </>
            ) : (
              <>
                <Select
                  value={state.billerId || selectedBiller?.id || ""}
                  onValueChange={(val) => {
                    if (val) {
                      onChange("billerId", val);
                      setVerifiedRef(null);
                      setVerifiedName("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select biller" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBillers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Input
                    type="text"
                    value={state.billRef}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange("billRef", val);
                      if (verifiedRef && verifiedRef !== val.trim()) {
                        setVerifiedRef(null);
                        setVerifiedName("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canVerify && !isVerifying) {
                        e.preventDefault();
                        handleVerify();
                      }
                    }}
                    placeholder={selectedBiller ? `Enter ${selectedBiller.reference.toLowerCase()}` : "Enter account or reference number"}
                    className="tabular pr-20"
                  />
                  {renderVerifyButton()}
                </div>
              </>
            )}

            {isVerified && verifiedName && (
              <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-muted/30 p-3.5 mt-1 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] text-muted-foreground">Customer Name</span>
                  <span className="text-[13.5px] font-medium text-foreground">{verifiedName}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] text-muted-foreground">
                    {state.subType === "ecg" ? "Meter Number" : state.subType === "ghanagov" ? "PRN / Reference" : "Account / Reference"}
                  </span>
                  <span className="text-[13px] font-mono text-foreground">
                    {state.subType === "ecg" ? state.ecgMeter : state.subType === "ghanagov" ? state.govRef : state.billRef}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] text-muted-foreground">Provider</span>
                  <span className="text-[13px] text-foreground font-medium">
                    {state.subType === "ecg" ? "Electricity Company of Ghana (ECG)" : state.subType === "ghanagov" ? (state.govService || "Ghana.gov") : (selectedBiller?.name || "Biller")}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Field>

      {/* Progressive Disclosure: Only reveal Amount & onwards after destination details are entered & verified */}
      {isDestinationValid && isVerified && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount */}
          <AmountInput
            value={state.amount}
            onChange={(val) => onChange("amount", val)}
            onFocus={() => {
              if (isDestinationValid && isVerified) setCollapsed(true);
            }}
            error={
              overBalance ? (
                <InsufficientFundsAlert />
              ) : undefined
            }
          />

          {/* 4. Narration */}
          <NarrationInput
            value={state.narration}
            onChange={(val) => onChange("narration", val)}
            placeholder="Bill payment"
          />

          {/* 5. Transaction Category */}
          <CategorySelect
            value={state.category}
            onChange={(val) => onChange("category", val)}
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
            label="Proceed"
          />
        </div>
      )}
    </div>
  );
}
