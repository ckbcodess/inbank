"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Account } from "@/lib/mock-data";
import {
} from "@/components/ui/select";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  AccountVerificationStatus,
  VerifiedAccountBadge,
  ResolvingAccountBadge,
  CollapsedDetailsBadge,
  NETWORKS,
  SchedulePaymentSection,
  ScheduleFrequency,
  detectTelcoNetwork,
  operatorBadgeIcon,
  resolveAccountName,
  formatGhPhone,
  NetworkSelect,
} from "./shared";
import { OwnWalletPicker, REGISTERED_WALLET, useOwnDestination, WalletTag, type OwnWallet } from "./OwnWalletPicker";
import { PhoneInput } from "@/components/ui/phone-input";
import { isCompleteGhanaMobile } from "@/lib/phone";

import { Field } from "@/components/ui/field";
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

  // Sending to yourself: any wallet that's yours, not just the registered number.
  const own = useOwnDestination({
    isSelf,
    phone: state.wPhone,
    apply: (w) => {
      onChange("wPhone", w.phone);
      onChange("wNetwork", w.network);
      onChange("wName", `My ${w.network}`);
    },
  });
  const ownPhone = state.wPhone || REGISTERED_WALLET.phone;
  const pickOwnWallet = (w: OwnWallet) => own.pick(w);

  const isPhoneValid = isSelf || isCompleteGhanaMobile(state.wPhone);
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
  }, [isSelf, isDetailsEntered, state.wPhone, state.wNetwork]);

  const verifiedName = useMemo(() => {
    if (isSelf) return "Own Wallet (Verified)";
    return resolveAccountName(state.wPhone, state.wName);
  }, [isSelf, state.wPhone, state.wName]);

  const isVerified = isSelf || (isDetailsEntered && !resolving && Boolean(verifiedName));

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isValid = Boolean(state.fromId) && isVerified && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination (Mobile Wallet) */}
      <Field label="Beneficiary Details">
        {!isSelf && isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={isSelf ? `My ${state.wNetwork || REGISTERED_WALLET.network}` : (verifiedName || state.wName || `Wallet ${state.wPhone}`)}
            subtitle={
              isSelf
                ? (
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{formatGhPhone(ownPhone)}</span>
                      <WalletTag tag={own.selected?.tag ?? "Registered"} />
                    </span>
                  )
                : `${state.wNetwork || "MTN Mobile Money"} · ${formatGhPhone(state.wPhone)}`
            }
            icon={operatorBadgeIcon(state.wNetwork || "")}
            nameCheck={isSelf ? undefined : { confirmed: Boolean(verifiedName), by: state.wNetwork || undefined }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {isSelf ? (
              <OwnWalletPicker
                wallets={own.wallets}
                selectedPhone={ownPhone}
                accounts={accounts}
                onSelect={pickOwnWallet}
                removedNotice={own.removedNotice}
              />
            ) : (
              <>
                <NetworkSelect
                  value={state.wNetwork || ""}
                  onChange={(val) => onChange("wNetwork", val)}
                  options={NETWORKS}
                />

                <PhoneInput
                  value={state.wPhone}
                  onValueChange={(val) => {
                    onChange("wPhone", val);
                    const detected = detectTelcoNetwork(val);
                    if (detected && !state.wNetwork) {
                      onChange("wNetwork", detected.walletName);
                    }
                    const resolved = resolveAccountName(val, "");
                    if (resolved) {
                      onChange("wName", resolved);
                    }
                  }}
                  aria-label="Mobile number"
                />
              </>
            )}

            {/* Verification Status */}
            <AccountVerificationStatus
              resolving={!isSelf && isDetailsEntered && resolving}
              name={isVerified && !isSelf ? verifiedName : null}
              resolvingMessage="Verifying..."
            />
          </div>
        )}
</Field>

      {/* Progressive Disclosure: Only reveal Amount & subsequent sections after verification */}
      {isVerified && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
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
          />
        </div>
      )}
    </div>
  );
}
