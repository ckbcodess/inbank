"use client";

import { SavedRecipientLink } from "./SavedRecipients";
import { useState, useMemo, useEffect } from "react";
import { Account } from "@/lib/mock-data";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  LookupInput,
  CollapsedDetailsBadge,
  SchedulePaymentSection,
  ScheduleFrequency,
  resolveAccountName,
} from "./shared";

import { Field } from "@/components/ui/field";
export interface ProxyPayFormState {
  fromId: string;
  pxId: string;
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

interface ProxyPayFlowProps {
  accounts: Account[];
  state: ProxyPayFormState;
  onChange: (key: keyof ProxyPayFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function ProxyPayFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: ProxyPayFlowProps) {
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

  // As with other banks: the Search appears once the ID is complete, and the name resolves when it's pressed.
  const isPxValid = state.pxId.trim().length >= 4;
  const [resolving, setResolving] = useState(false);
  const [verifiedKey, setVerifiedKey] = useState<string | null>(() =>
    state.benName && isPxValid ? state.pxId : null
  );

  // A saved recipient picked from outside arrives with its name already resolved
  useEffect(() => {
    if (state.benName && isPxValid && verifiedKey !== state.pxId) setVerifiedKey(state.pxId);
  }, [state.benName, state.pxId, isPxValid, verifiedKey]);

  const handleVerify = () => {
    if (!isPxValid || resolving) return;
    setResolving(true);
    setTimeout(() => {
      const resolved = resolveAccountName(state.pxId, "");
      if (resolved) onChange("benName", resolved);
      setVerifiedKey(state.pxId);
      setResolving(false);
    }, 250);
  };

  const verifiedName = useMemo(() => resolveAccountName(state.pxId, state.benName), [state.pxId, state.benName]);

  const isVerified = isPxValid && !resolving && verifiedKey === state.pxId && Boolean(verifiedName);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isValid = Boolean(state.fromId) && isVerified && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination: Proxy ID */}
      <Field label="Beneficiary Details" action={!(isPxValid && isCollapsed) && <SavedRecipientLink value={state.pxId} />}>
        {isPxValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || state.pxId}
            subtitle={`Proxy Recipient · ${state.pxId}`}
            nameCheck={{ confirmed: Boolean(verifiedName), by: "the proxy directory" }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          // The name resolves inside the field, as every lookup does. Editing the ID clears the old name.
          <LookupInput
            value={state.pxId}
            inputMode="text"
            onChange={(raw) => {
              onChange("pxId", raw.trim());
              if (state.benName) onChange("benName", "");
            }}
            placeholder="Enter Proxy ID"
            canVerify={isPxValid}
            verified={isVerified}
            resolving={resolving}
            verifiedName={verifiedName}
            onVerify={handleVerify}
          />
        )}
      </Field>

      {/* Progressive Disclosure: Only reveal Amount & subsequent form fields after Proxy ID is entered */}
      {isPxValid && (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount */}
          <AmountInput
            value={state.amount}
            onChange={(val) => onChange("amount", val)}
            onFocus={() => {
              if (isPxValid) setCollapsed(true);
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
          />

          {/* 5. Transaction Category (Optional) */}
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
        </div>
      )}

      {/* 8. Proceed CTA */}
      <ProceedButton
        disabled={!isValid}
        onClick={onProceed}
      />
    </div>
  );
}
