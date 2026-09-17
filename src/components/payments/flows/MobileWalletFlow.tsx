"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  VerifiedAccountBadge,
  ResolvingAccountBadge,
  CollapsedDetailsBadge,
  NETWORKS,
  SchedulePaymentSection,
  ScheduleFrequency,
  detectTelcoNetwork,
  getTelcoLogo,
  resolveAccountName,
} from "./shared";
import { REGISTERED_PHONE } from "../useAuthorisation";

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

  const cleanPhone = state.wPhone.replace(/[\s-]/g, "");
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
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Beneficiary Details</label>
        {isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={isSelf ? (state.wName || "My Own Wallet (Self)") : (verifiedName || state.wName || `Wallet ${state.wPhone}`)}
            subtitle={`${state.wNetwork || "MTN Mobile Money"} · ${isSelf ? (state.wPhone || REGISTERED_PHONE) : state.wPhone}`}
            icon={
              getTelcoLogo(state.wNetwork) ? (
                <img
                  src={getTelcoLogo(state.wNetwork)!}
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
                <span className="tabular">{state.wPhone || REGISTERED_PHONE}</span>
                <span className="text-[12px] text-muted-foreground font-normal">Registered Mobile</span>
              </div>
            ) : (
              <>
                <Select
                  value={state.wNetwork || ""}
                  onValueChange={(val) => val && onChange("wNetwork", val)}
                >
                  <SelectTrigger className="h-[58px] min-h-[58px] py-0 px-3.5 w-full rounded-2xl border border-border/80 bg-card hover:bg-muted/20 text-left cursor-pointer transition-colors shadow-none flex items-center">
                    {state.wNetwork && getTelcoLogo(state.wNetwork) ? (
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/60 overflow-hidden border border-black/5 dark:border-white/10 p-0">
                          <img
                            src={getTelcoLogo(state.wNetwork)!}
                            alt={state.wNetwork}
                            className="size-full object-cover rounded-full"
                          />
                        </span>
                        <span className="text-[14.5px] font-medium text-foreground">{state.wNetwork}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Smartphone size={17} strokeWidth={1.8} />
                        </span>
                        <span className="text-[14px] text-muted-foreground font-normal">
                          Select Wallet Provider
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

                <input
                  type="tel"
                  inputMode="numeric"
                  value={state.wPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
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
                  placeholder="Enter mobile number (e.g. 024 123 4567)"
                  className="numorainput h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
                />
              </>
            )}

            {/* Resolving indicator */}
            {!isSelf && isDetailsEntered && resolving && (
              <ResolvingAccountBadge message="Verifying mobile wallet holder..." />
            )}

            {/* Verified badge */}
            {isVerified && !isSelf && <VerifiedAccountBadge name={verifiedName} />}
          </div>
        )}
      </div>

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
                <InsufficientFundsAlert
                  available={fromAccount?.available ?? 0}
                  currency={fromAccount?.currency || "GHS"}
                />
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
            defaultCategory="Family & Friends"
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
