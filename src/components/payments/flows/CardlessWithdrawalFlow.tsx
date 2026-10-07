"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { Account } from "@/lib/mock-data";
import {
} from "@/components/ui/select";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  InsufficientFundsAlert,
  ProceedButton,
  CollapsedDetailsBadge,
  VerifiedAccountBadge,
  ResolvingAccountBadge,
  NETWORKS,
  detectTelcoNetwork,
  operatorBadgeIcon,
  resolveAccountName,
  formatGhPhone,
  NetworkSelect,
} from "./shared";
import { REGISTERED_PHONE } from "../useAuthorisation";
import { PhoneInput } from "@/components/ui/phone-input";
import { isCompleteGhanaMobile } from "@/lib/phone";

export interface CardlessFormState {
  fromId: string;
  withdrawalType: "self" | "third-party";
  wNetwork?: string;
  recipientPhone: string;
  recipientName: string;
  amount: string;
  narration: string;
  saveBeneficiary?: boolean;
  beneficiaryNickname?: string;
}

interface CardlessWithdrawalFlowProps {
  accounts: Account[];
  state: CardlessFormState;
  onChange: (key: keyof CardlessFormState, value: string | boolean | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function CardlessWithdrawalFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: CardlessWithdrawalFlowProps) {
  const isSelf = state.withdrawalType === "self";
  const [internalCollapsed, setInternalCollapsed] = useState(
    detailsCollapsed !== undefined ? detailsCollapsed : isSelf
  );
  const isCollapsed = detailsCollapsed !== undefined ? detailsCollapsed : internalCollapsed;

  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onToggleCollapsed?.(val);
  };

  // Withdrawing for yourself needs no recipient details, so that section
  // collapses when "self" is chosen. The parent's callback is read through a
  // ref so a new function each render doesn't re-run this.
  const onToggleRef = useRef(onToggleCollapsed);
  useLayoutEffect(() => {
    onToggleRef.current = onToggleCollapsed;
  });
  useEffect(() => {
    if (isSelf) {
      setInternalCollapsed(true);
      onToggleRef.current?.(true);
    }
  }, [isSelf]);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const isPhoneValid = isSelf || isCompleteGhanaMobile(state.recipientPhone || "");
  const isNetworkValid = isSelf || Boolean(state.wNetwork);
  const isDetailsEntered = isPhoneValid && isNetworkValid;

  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!isSelf && isDetailsEntered) {
      setResolving(true);
      const timer = setTimeout(() => {
        setResolving(false);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setResolving(false);
    }
  }, [isSelf, isDetailsEntered, state.recipientPhone, state.wNetwork]);

  const verifiedName = useMemo(() => {
    if (isSelf) return "Myself (Self Withdrawal)";
    return resolveAccountName(state.recipientPhone, state.recipientName);
  }, [isSelf, state.recipientPhone, state.recipientName]);

  const isVerified = isSelf || (isDetailsEntered && !resolving && Boolean(verifiedName));

  const numAmount = Number((state.amount || "").replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isValid = Boolean(state.fromId) && isVerified && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account Selector */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Beneficiary / Network & Phone Details */}
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-foreground">Beneficiary Details</label>

        {isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={isSelf ? "Myself (Cardless Code)" : (verifiedName || state.recipientName || `Recipient ${state.recipientPhone}`)}
            subtitle={
              isSelf
                ? `Self Cash Withdrawal · ${formatGhPhone(REGISTERED_PHONE)}`
                : `${state.wNetwork || "MTN Mobile Money"} · ${formatGhPhone(state.recipientPhone)}`
            }
            icon={!isSelf ? operatorBadgeIcon(state.wNetwork || "") : undefined}
            nameCheck={isSelf ? undefined : { confirmed: Boolean(verifiedName), by: state.wNetwork || undefined }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {isSelf ? (
              <div className="flex h-13 items-center justify-between rounded-2xl border border-border/80 bg-muted/30 px-4 text-[15px] font-medium text-foreground">
                <span className="tabular">{REGISTERED_PHONE}</span>
                <span className="text-[12px] text-muted-foreground font-normal">Registered Mobile</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Mobile Network Selector */}
                <NetworkSelect
                  value={state.wNetwork || ""}
                  onChange={(val) => onChange("wNetwork", val)}
                  options={NETWORKS}
                />

                {/* Phone Number Input with Auto-Network Detection & Verification */}
                <div>
                  <PhoneInput
                    value={state.recipientPhone}
                    onValueChange={(val) => {
                      onChange("recipientPhone", val);
                      const detected = detectTelcoNetwork(val);
                      if (detected && !state.wNetwork) {
                        onChange("wNetwork", detected.walletName);
                      }
                      const resolved = resolveAccountName(val, "");
                      if (resolved) {
                        onChange("recipientName", resolved);
                      }
                    }}
                    aria-label="Phone number"
                    className="h-13 rounded-2xl border-field-border bg-field px-4 text-[15px] focus-within:border-field-border-focus focus-within:ring-0"
                  />
                </div>

                {/* Resolving indicator */}
                {isDetailsEntered && resolving && (
                  <ResolvingAccountBadge message="Verifying recipient phone number..." />
                )}

                {/* Verified badge */}
                {isVerified && (
                  <VerifiedAccountBadge name={verifiedName} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progressive Disclosure: Only reveal Amount & Narration after Verification */}
      {isVerified && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount Input */}
          <AmountInput
            value={state.amount}
            onChange={(val) => onChange("amount", val)}
            currency={fromAccount?.currency || "GHS"}
            label="Withdrawal Amount"
            onFocus={() => {
              if (isVerified) setCollapsed(true);
            }}
            hasError={overBalance}
          />

          {overBalance && (
            <InsufficientFundsAlert />
          )}

          {/* 4. Narration Input */}
          <NarrationInput
            value={state.narration}
            onChange={(val) => onChange("narration", val)}
            placeholder="Reason for cardless withdrawal (optional)"
          />

          {/* 5. Proceed Button */}
          <ProceedButton disabled={!isValid} onClick={onProceed} label="Generate Withdrawal Token" />
        </div>
      )}
    </div>
  );
}
