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
  scheduleReady,
  ScheduleFrequency,
  resolveAccountName,
} from "./shared";

import { Field } from "@/components/ui/field";
export interface OtherGcbFormState {
  fromId: string;
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
  scheduleTiming?: "now" | "later";
  scheduleTime?: string;
  scheduleEndDate?: string;
}

interface OtherGcbFlowProps {
  accounts: Account[];
  state: OtherGcbFormState;
  onChange: (key: keyof OtherGcbFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function OtherGcbFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: OtherGcbFlowProps) {
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

  const cleanAcct = state.benAcct.replace(/[\s-]/g, "");
  // Numbers run from 10 digits (a GCB account) to 13 (a virtual account). The Search appears at 10 and the
  // person runs it themselves; typing never looks the number up on its own.
  const canSearch = cleanAcct.length >= 10;
  // A saved recipient is already known to the bank, so picking one verifies without a search.
  // Editing the number afterwards stops it matching, and the search applies again.
  const [pickedAcct, setPickedAcct] = useState("");
  // The number the person last searched for. Editing it afterwards stops it matching.
  const [checkedAcct, setCheckedAcct] = useState("");
  // A number that was searched and matched no account. Editing it afterwards clears the message.
  const [notFoundAcct, setNotFoundAcct] = useState("");
  const isAcctValid = (canSearch && cleanAcct === checkedAcct) || (pickedAcct !== "" && cleanAcct === pickedAcct);
  // Virtual accounts have 10 digits and GCB accounts 13. Other lengths can be searched but never match.
  const isKnownAcctLength = (len: number) => len === 10 || len === 13;

  // Searching state: a short "Verifying..." beat, then the name resolves or the number is reported as not found.
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searching) return;
    const timer = setTimeout(() => {
      if (isKnownAcctLength(cleanAcct.length)) {
        setCheckedAcct(cleanAcct);
        setNotFoundAcct("");
        onChange("benName", resolveAccountName(cleanAcct));
      } else {
        setNotFoundAcct(cleanAcct);
      }
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
    // onChange is recreated on each parent render; the timer should only restart when the search starts or the number changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, cleanAcct]);

  const resolving = searching;

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.benAcct, state.benName);
  }, [state.benAcct, state.benName]);

  const isVerified = isAcctValid && !resolving && Boolean(verifiedName);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isValid = scheduleReady(state) && Boolean(state.fromId) && isVerified && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination (GCB Account) */}
      <Field
        label="Beneficiary Details"
        action={!(isVerified && isCollapsed) && <SavedRecipientLink value={state.benAcct} onPicked={(item) => setPickedAcct(item.acct.replace(/[\s-]/g, ""))} />}
        error={notFoundAcct !== "" && notFoundAcct === cleanAcct && `No account has ${cleanAcct.length} digits. Check the number.`}
      >
        {isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `GCB Account ${state.benAcct}`}
            subtitle={`GCB Bank PLC · ${state.benAcct}`}
            provider="GCB Bank"
            nameCheck={{ confirmed: Boolean(verifiedName), by: "GCB" }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          // The name resolves inside the field, as every lookup does. A 13-digit number looks itself up.
          <LookupInput
            value={state.benAcct}
            onChange={(raw) => {
              const val = raw.replace(/[^0-9]/g, "").slice(0, 13);
              onChange("benAcct", val);
            }}
            placeholder="Enter account number"
            canVerify={canSearch}
            verified={isVerified}
            resolving={resolving}
            verifiedName={verifiedName}
            onVerify={() => {
              if (canSearch && !isVerified) setSearching(true);
            }}
          />
        )}
      </Field>

      {/* Progressive Disclosure: Only reveal Amount & subsequent sections after verification */}
      {isVerified && (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount */}
          <AmountInput
            value={state.amount}
            onChange={(val) => onChange("amount", val)}
            onFocus={() => {
              if (isVerified) setCollapsed(true);
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
              startDate: state.scheduleDate || new Date().toISOString().split("T")[0],
              frequency: state.scheduleFrequency || "once",
              timing: state.scheduleTiming || "now",
              startTime: state.scheduleTime,
              endDate: state.scheduleEndDate || "",
            }}
            onChange={(updates) => {
              if (updates.enabled !== undefined) onChange("isScheduled", updates.enabled);
              if (updates.startDate !== undefined) onChange("scheduleDate", updates.startDate);
              if (updates.frequency !== undefined) onChange("scheduleFrequency", updates.frequency);
              if (updates.timing !== undefined) onChange("scheduleTiming", updates.timing);
              if (updates.startTime !== undefined) onChange("scheduleTime", updates.startTime);
              if (updates.endDate !== undefined) onChange("scheduleEndDate", updates.endDate);
            }}
          />

          {/* 8. Proceed CTA */}
          <ProceedButton
            disabled={!isValid}
            onClick={onProceed}
          />
        </div>
      )}
    </div>
  );
}
