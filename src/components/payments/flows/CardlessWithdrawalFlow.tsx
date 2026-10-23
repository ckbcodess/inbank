"use client";

import { useState, useMemo, useEffect } from "react";
import { Smartphone } from "@/components/ui/icons";
import { Account } from "@/lib/mock-data";
import {
  FromAccountSelector,
  AmountInput,
  InsufficientFundsAlert,
  ProceedButton,
  CollapsedDetailsBadge,
  AccountVerificationStatus,
  NETWORKS,
  NetworkSelect,
  detectTelcoNetwork,
  operatorBadgeIcon,
  resolveAccountName,
  formatGhPhone,
} from "./shared";
import { OwnWalletPicker, REGISTERED_WALLET, useOwnDestination, type OwnWallet } from "./OwnWalletPicker";
import { PhoneInput } from "@/components/ui/phone-input";
import { isCompleteGhanaMobile } from "@/lib/phone";
import { maskMobile } from "@/lib/auth-shared";
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

/**
 * Generate an ATM cash-out code. The same shape as the other flows: from account, who it's for,
 * how much. For yourself you pick one of your own numbers (the registered one or any linked wallet,
 * as in Send to Wallet); for someone else you pick their network and enter their number (the network is
 * filled in from the number when it can be), and the name is looked up. No narration or category is asked.
 */
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

  // Yourself: any number that's yours, defaulting to the registered one.
  const own = useOwnDestination({
    isSelf,
    phone: state.recipientPhone,
    apply: (w) => {
      onChange("recipientPhone", w.phone);
      onChange("wNetwork", w.network);
      onChange("recipientName", `My ${w.network}`);
    },
  });
  const selfPhone = state.recipientPhone || REGISTERED_WALLET.phone;

  const isPhoneValid = isSelf || isCompleteGhanaMobile(state.recipientPhone || "");
  const isNetworkValid = isSelf || Boolean(state.wNetwork);
  const isDetailsEntered = isPhoneValid && isNetworkValid;

  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!isSelf && isDetailsEntered) {
      setResolving(true);
      const timer = setTimeout(() => setResolving(false), 250);
      return () => clearTimeout(timer);
    }
    setResolving(false);
  }, [isSelf, isDetailsEntered, state.recipientPhone, state.wNetwork]);

  // A number picked from the quick-pick strip arrives without a network: fill it in from the number when we can
  useEffect(() => {
    if (isSelf || state.wNetwork || !isPhoneValid) return;
    const detected = detectTelcoNetwork(state.recipientPhone);
    if (detected) onChange("wNetwork", detected.walletName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelf, isPhoneValid, state.recipientPhone, state.wNetwork]);

  const verifiedName = useMemo(
    () => (isSelf ? "" : resolveAccountName(state.recipientPhone, state.recipientName)),
    [isSelf, state.recipientPhone, state.recipientName]
  );

  const isVerified = isSelf || (isDetailsEntered && !resolving && Boolean(verifiedName));

  const numAmount = Number((state.amount || "").replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isValid = Boolean(state.fromId) && isVerified && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200 ease-out">
      <FromAccountSelector accounts={accounts} value={state.fromId} onChange={(id) => onChange("fromId", id)} />

      {/* Yourself: pick which of your numbers gets the code */}
      {isSelf && (
        <Field label="Send Code To">
          <OwnWalletPicker
            wallets={own.wallets}
            selectedPhone={selfPhone}
            accounts={accounts}
            onSelect={(w: OwnWallet) => own.pick(w)}
            removedNotice={own.removedNotice}
          />
        </Field>
      )}

      {/* Someone else: just their number. The name is looked up and shown, like every other payment field. */}
      {!isSelf && (
        <Field label="Recipient">
          {isVerified && isCollapsed ? (
            <CollapsedDetailsBadge
              title={verifiedName}
              subtitle={formatGhPhone(state.recipientPhone)}
              icon={operatorBadgeIcon(state.wNetwork || "") ?? <Smartphone size={18} className="text-primary" />}
              nameCheck={{ confirmed: true, by: state.wNetwork || undefined }}
              onChange={() => setCollapsed(false)}
            />
          ) : (
            <div className="flex flex-col gap-2 animate-in fade-in duration-150">
              <NetworkSelect
                value={state.wNetwork || ""}
                onChange={(val) => onChange("wNetwork", val)}
                options={NETWORKS}
              />
              <PhoneInput
                value={state.recipientPhone}
                onValueChange={(val) => {
                  onChange("recipientPhone", val);
                  const detected = detectTelcoNetwork(val);
                  if (detected && !state.wNetwork) onChange("wNetwork", detected.walletName);
                  const resolved = resolveAccountName(val, "");
                  if (resolved) onChange("recipientName", resolved);
                }}
                aria-label="Recipient mobile number"
              />
              <AccountVerificationStatus
                resolving={isDetailsEntered && resolving}
                name={isVerified ? verifiedName : null}
                resolvingMessage="Verifying..."
              />
            </div>
          )}
        </Field>
      )}

      {isVerified && (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          <div className="flex flex-col gap-2">
            <AmountInput
              value={state.amount}
              onChange={(val) => onChange("amount", val)}
              currency={fromAccount?.currency || "GHS"}
              label="Amount"
              onFocus={() => {
                if (!isSelf) setCollapsed(true);
              }}
              error={overBalance ? <InsufficientFundsAlert /> : undefined}
            />
            {/* Where the code goes, and what it's good for, in one line */}
            <p className="text-[12px] text-muted-foreground tabular">
              {isSelf
                ? `We'll text the code to ${maskMobile(selfPhone)}. It works at any GCB ATM.`
                : `We'll text the code to ${verifiedName}. It works at any GCB ATM.`}
            </p>
          </div>

          <ProceedButton disabled={!isValid} onClick={onProceed} label="Generate Code" />
        </div>
      )}
    </div>
  );
}
