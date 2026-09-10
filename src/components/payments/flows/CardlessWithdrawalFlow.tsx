"use client";

import { useState, useMemo, useEffect } from "react";
import { Account } from "@/lib/mock-data";
import { Smartphone } from "lucide-react";
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
  InsufficientFundsAlert,
  ProceedButton,
  CollapsedDetailsBadge,
  VerifiedAccountBadge,
  ResolvingAccountBadge,
  NETWORKS,
  detectTelcoNetwork,
  getTelcoLogo,
  resolveAccountName,
} from "./shared";
import { REGISTERED_PHONE } from "../useAuthorisation";

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

  useEffect(() => {
    if (isSelf) {
      setCollapsed(true);
    }
  }, [isSelf]);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const cleanPhone = (state.recipientPhone || "").replace(/[^0-9]/g, "");
  const isPhoneValid = isSelf || cleanPhone.length >= 9;
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
        <label className="text-[14px] font-medium text-foreground">Beneficiary Details</label>

        {isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={isSelf ? "Myself (Cardless Code)" : (verifiedName || state.recipientName || `Recipient ${state.recipientPhone}`)}
            subtitle={
              isSelf
                ? `Self Cash Withdrawal · ${REGISTERED_PHONE}`
                : `${state.wNetwork || "MTN Mobile Money"} · ${state.recipientPhone}`
            }
            icon={
              !isSelf && getTelcoLogo(state.wNetwork || "") ? (
                <img
                  src={getTelcoLogo(state.wNetwork || "")!}
                  alt={state.wNetwork || ""}
                  className="size-full object-cover rounded-full"
                />
              ) : undefined
            }
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
                <Select
                  value={state.wNetwork || ""}
                  onValueChange={(val) => val && onChange("wNetwork", val)}
                >
                  <SelectTrigger className="min-h-[68px] h-auto py-3 px-4 w-full rounded-2xl border border-border/80 bg-card hover:bg-muted/20 text-left cursor-pointer transition-colors shadow-none flex items-center">
                    {state.wNetwork && getTelcoLogo(state.wNetwork) ? (
                      <div className="flex items-center gap-3.5">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/60 overflow-hidden border border-black/5 dark:border-white/10 p-0">
                          <img
                            src={getTelcoLogo(state.wNetwork)!}
                            alt={state.wNetwork}
                            className="size-full object-cover rounded-full"
                          />
                        </span>
                        <span className="text-[15px] font-medium text-foreground">{state.wNetwork}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3.5">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Smartphone size={19} strokeWidth={1.8} />
                        </span>
                        <span className="text-[15px] text-muted-foreground font-normal">
                          Select Mobile Network
                        </span>
                      </div>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORKS.map((n) => {
                      const logo = getTelcoLogo(n);
                      return (
                        <SelectItem key={n} value={n}>
                          <div className="flex items-center gap-3">
                            {logo && (
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/60 overflow-hidden p-0">
                                <img
                                  src={logo}
                                  alt={n}
                                  className="size-full object-cover rounded-full"
                                />
                              </span>
                            )}
                            <span>{n}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Phone Number Input with Auto-Network Detection & Verification */}
                <div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={state.recipientPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
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
                    placeholder="Enter phone number (e.g. 024 123 4567)"
                    className="numorainput h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular placeholder:text-muted-foreground/50"
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
            <InsufficientFundsAlert
              available={fromAccount?.available ?? 0}
              currency={fromAccount?.currency || "GHS"}
            />
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
