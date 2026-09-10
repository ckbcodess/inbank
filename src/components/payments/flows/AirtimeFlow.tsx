"use client";

import { useState, useMemo } from "react";
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
  CollapsedDetailsBadge,
  TELCO_NETWORKS,
  SchedulePaymentSection,
  ScheduleFrequency,
  detectTelcoNetwork,
  getTelcoLogo,
  normalizeNetworkName,
  resolveAccountName,
} from "./shared";

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
}

export function AirtimeFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
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
  const isPhoneValid = state.aPhone.replace(/\s/g, "").length >= 9;
  const isNetworkValid = Boolean(state.wNetwork);
  const isValid = Boolean(state.fromId) && isNetworkValid && isPhoneValid && numAmount > 0 && !overBalance;

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
        {isPhoneValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `Phone ${state.aPhone}`}
            subtitle={`${state.wNetwork ? normalizeNetworkName(state.wNetwork) : "Mobile Network"} · ${state.aPhone}`}
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
            <Select
              value={state.wNetwork ? normalizeNetworkName(state.wNetwork) : ""}
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
                    <span className="text-[15px] font-medium text-foreground">{normalizeNetworkName(state.wNetwork)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Smartphone size={19} strokeWidth={1.8} />
                    </span>
                    <span className="text-[15px] text-muted-foreground font-normal">
                      Select Network
                    </span>
                  </div>
                )}
              </SelectTrigger>
              <SelectContent>
                {TELCO_NETWORKS.map((n) => {
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
              value={state.aPhone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
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
              placeholder="Enter phone number (e.g. 024 123 4567)"
              className="numorainput h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
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
