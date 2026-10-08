"use client";

import { useState, useMemo, useEffect } from "react";
import { Smartphone } from "lucide-react";
import { Account } from "@/lib/mock-data";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  CollapsedDetailsBadge,
  AccountVerificationStatus,
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
import { Field } from "@/components/ui/field";

export interface CardlessFormState {
  fromId: string;
  withdrawalType: "self" | "third-party";
  wNetwork?: string;
  recipientPhone: string;
  recipientName: string;
  amount: string;
  narration: string;
  category?: string;
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
      <Field label="Beneficiary Details">
        {isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={isSelf ? "Myself (Cardless Code)" : (verifiedName || state.recipientName || `Recipient ${state.recipientPhone}`)}
            subtitle={
              isSelf
                ? `Self Cash Withdrawal · ${formatGhPhone(REGISTERED_PHONE)}`
                : `${state.wNetwork || "MTN Mobile Money"} · ${formatGhPhone(state.recipientPhone)}`
            }
            icon={isSelf ? <Smartphone size={18} className="text-primary" /> : operatorBadgeIcon(state.wNetwork || "")}
            nameCheck={isSelf ? { confirmed: true } : { confirmed: Boolean(verifiedName), by: state.wNetwork || undefined }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {isSelf ? (
              <div className="flex h-13 items-center justify-between rounded-2xl border border-border/80 bg-muted/20 px-4 text-[14px] font-medium text-foreground">
                <div className="flex items-center gap-2.5">
                  <Smartphone size={18} className="text-muted-foreground" />
                  <span className="tabular">{formatGhPhone(REGISTERED_PHONE)}</span>
                </div>
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
                  />
                </div>

                {/* Verification Status */}
                <AccountVerificationStatus
                  resolving={isDetailsEntered && resolving}
                  name={isVerified ? verifiedName : null}
                  resolvingMessage="Verifying..."
                />
              </div>
            )}
          </div>
        )}
      </Field>

      {/* Progressive Disclosure: Only reveal Amount, Narration & Category after Verification */}
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
            error={overBalance ? <InsufficientFundsAlert /> : undefined}
          />

          {/* 4. Narration Input */}
          <NarrationInput
            value={state.narration}
            onChange={(val) => onChange("narration", val)}
            placeholder="Reason for cardless withdrawal (optional)"
          />

          {/* 5. Transaction Category (Optional) */}
          <CategorySelect
            value={state.category || ""}
            onChange={(val) => onChange("category", val)}
          />

          {/* 6. Proceed Button */}
          <ProceedButton
            disabled={!isValid}
            onClick={onProceed}
            label="Generate Withdrawal Token"
          />
        </div>
      )}
    </div>
  );
}
