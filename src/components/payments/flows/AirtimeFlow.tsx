"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
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
  VerifiedAccountBadge,
  CollapsedDetailsBadge,
  TELCO_NETWORKS,
  SchedulePaymentSection,
  ScheduleFrequency,
  detectTelcoNetwork,
  getTelcoLogo,
  normalizeNetworkName,
  resolveAccountName,
  formatGhPhone,
  NetworkSelect,
} from "./shared";
import { OwnWalletPicker, digitsOf, useOwnDestination } from "./OwnWalletPicker";
import { PhoneInput } from "@/components/ui/phone-input";
import { isCompleteGhanaMobile } from "@/lib/phone";

export interface AirtimeFormState {
  fromId: string;
  wNetwork: string;
  aPhone: string;
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

interface AirtimeFlowProps {
  accounts: Account[];
  state: AirtimeFormState;
  onChange: (key: keyof AirtimeFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
  /** "My own number": choose from the customer's own lines instead of typing one. */
  isSelf?: boolean;
}

export function AirtimeFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
  isSelf = false,
}: AirtimeFlowProps) {
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

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.aPhone, state.benName);
  }, [state.aPhone, state.benName]);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isPhoneValid = isCompleteGhanaMobile(state.aPhone);
  const isNetworkValid = Boolean(state.wNetwork);
  const isValid = Boolean(state.fromId) && isNetworkValid && isPhoneValid && numAmount > 0 && !overBalance;


  // "My own number": every line that's yours — registered plus linked wallets' numbers.
  const own = useOwnDestination({
    isSelf,
    phone: state.aPhone,
    apply: (w) => {
      onChange("aPhone", digitsOf(w.phone));
      onChange("wNetwork", normalizeNetworkName(w.network));
      onChange("benName", "My number");
    },
  });
  const selfBlock =
    isPhoneValid && isCollapsed && !own.choosing ? (
      <CollapsedDetailsBadge
        title="My number"
        subtitle={`${normalizeNetworkName(state.wNetwork)} · ${formatGhPhone(state.aPhone)} · ${own.selected?.tag ?? "Registered"}`}
        icon={
          getTelcoLogo(state.wNetwork) ? (
            <Image src={getTelcoLogo(state.wNetwork)!} alt="" width={40} height={40} className="size-full rounded-full object-cover" />
          ) : undefined
        }
        onChange={() => setCollapsed(false)}
      />
    ) : (
      <OwnWalletPicker
        variant="line"
        wallets={own.wallets}
        selectedPhone={state.aPhone}
        accounts={accounts}
        removedNotice={own.removedNotice}
        onSelect={(w) => {
          own.pick(w);
          setCollapsed(true);
        }}
      />
    );
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination: Network & Phone Number */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Recipient Details</label>
        {isSelf ? (
          selfBlock
        ) : isPhoneValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `Phone ${state.aPhone}`}
            subtitle={`${state.wNetwork ? normalizeNetworkName(state.wNetwork) : "Mobile Network"} · ${formatGhPhone(state.aPhone)}`}
            icon={
              getTelcoLogo(state.wNetwork) ? (
                <Image
                  src={getTelcoLogo(state.wNetwork)!}
                  alt={state.wNetwork || ""}
                  width={40}
                  height={40}
                  className="size-full object-cover rounded-full"
                />
              ) : undefined
            }
            nameCheck={{ confirmed: Boolean(verifiedName), by: state.wNetwork ? normalizeNetworkName(state.wNetwork) : undefined }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <NetworkSelect
              value={state.wNetwork ? normalizeNetworkName(state.wNetwork) : ""}
              onChange={(val) => onChange("wNetwork", val)}
              options={TELCO_NETWORKS}
            />

            <PhoneInput
              value={state.aPhone}
              onValueChange={(val) => {
                onChange("aPhone", val);
                const detected = detectTelcoNetwork(val);
                if (detected && !state.wNetwork) {
                  onChange("wNetwork", detected.telcoName);
                }
                const resolved = resolveAccountName(val, "");
                if (resolved) {
                  onChange("benName", resolved);
                }
              }}
              aria-label="Phone number"
              className="h-13 rounded-2xl border-border/80 bg-card px-4 text-[15px] focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 dark:border-border/80 dark:bg-card dark:focus-within:bg-card"
            />

            {verifiedName && <VerifiedAccountBadge name={verifiedName} />}
          </div>
        )}
      </div>

      {/* Progressive Disclosure: Only reveal Amount & onwards after phone number & network are valid */}
      {isPhoneValid && isNetworkValid && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount */}
          <AmountInput
            value={state.amount}
            onChange={(val) => onChange("amount", val)}
            onFocus={() => {
              if (isPhoneValid && isNetworkValid) setCollapsed(true);
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
            placeholder="Airtime recharge"
          />

          {/* 5. Transaction Category */}
          <CategorySelect
            value={state.category}
            onChange={(val) => onChange("category", val)}
            defaultCategory="Data"
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
