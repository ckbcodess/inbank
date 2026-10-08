"use client";

import { useState, useMemo } from "react";
import { Account, formatMoney } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  FromAccountSelector,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  VerifiedAccountBadge,
  CollapsedDetailsBadge,
  TELCO_NETWORKS,
  getBundlesForNetwork,
  SchedulePaymentSection,
  ScheduleFrequency,
  detectTelcoNetwork,
  operatorBadgeIcon,
  normalizeNetworkName,
  resolveAccountName,
  formatGhPhone,
  NetworkSelect,
} from "./shared";
import { OwnWalletPicker, digitsOf, useOwnDestination } from "./OwnWalletPicker";
import { PhoneInput } from "@/components/ui/phone-input";
import { isCompleteGhanaMobile } from "@/lib/phone";

import { Field } from "@/components/ui/field";
export interface DataBundleFormState {
  fromId: string;
  wNetwork: string;
  aPhone: string;
  benName: string;
  bundleId: string;
  narration: string;
  category: string;
  saveBeneficiary?: boolean;
  beneficiaryNickname?: string;
  isScheduled?: boolean;
  scheduleDate?: string;
  scheduleFrequency?: ScheduleFrequency;
  scheduleEndDate?: string;
}

interface DataBundleFlowProps {
  accounts: Account[];
  state: DataBundleFormState;
  onChange: (key: keyof DataBundleFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
  /** "My own number": choose from the customer's own lines instead of typing one. */
  isSelf?: boolean;
}

export function DataBundleFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
  isSelf = false,
}: DataBundleFlowProps) {
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

  const bundles = useMemo(() => {
    return getBundlesForNetwork(state.wNetwork);
  }, [state.wNetwork]);

  // Never preselected: the bundle is what the customer pays for, so they choose it.
  const selectedBundle = useMemo(() => {
    return bundles.find((b) => b.id === state.bundleId);
  }, [bundles, state.bundleId]);

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.aPhone, state.benName);
  }, [state.aPhone, state.benName]);

  const numAmount = selectedBundle?.price ?? 0;
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
  // "My own number" is a dropdown with the registered line already chosen: nothing to collapse.
  const selfBlock = (
    <OwnWalletPicker
      variant="line"
      wallets={own.wallets}
      selectedPhone={state.aPhone}
      accounts={accounts}
      removedNotice={own.removedNotice}
      onSelect={own.pick}
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
      <Field label="Recipient Details">
        {isSelf ? (
          selfBlock
        ) : isPhoneValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `Data (${state.aPhone})`}
            subtitle={`${state.wNetwork ? normalizeNetworkName(state.wNetwork) : "Mobile Network"} · ${formatGhPhone(state.aPhone)}`}
            icon={operatorBadgeIcon(state.wNetwork || "")}
            nameCheck={{ confirmed: Boolean(verifiedName), by: state.wNetwork ? normalizeNetworkName(state.wNetwork) : undefined }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <NetworkSelect
              value={state.wNetwork ? normalizeNetworkName(state.wNetwork) : ""}
              onChange={(val) => {
                onChange("wNetwork", val);
                onChange("bundleId", "");
              }}
              options={TELCO_NETWORKS}
            />

            <PhoneInput
              value={state.aPhone}
              onValueChange={(val) => {
                onChange("aPhone", val);
                const detected = detectTelcoNetwork(val);
                if (detected && !state.wNetwork) {
                  onChange("wNetwork", detected.telcoName);
                  onChange("bundleId", "");
                }
                const resolved = resolveAccountName(val, "");
                if (resolved) {
                  onChange("benName", resolved);
                }
              }}
              aria-label="Phone number"
              className="h-13 rounded-2xl border-field-border bg-field px-4 text-[14px] focus-within:border-field-border-focus focus-within:ring-0"
            />

            {verifiedName && <VerifiedAccountBadge name={verifiedName} />}
          </div>
        )}
</Field>

      {/* Progressive Disclosure: Only reveal Bundle Selection & onwards after phone number & network are valid */}
      {isPhoneValid && isNetworkValid && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Bundle Selection */}
          <Field label="Internet">
            <Select
              value={selectedBundle?.id ?? ""}
              onValueChange={(val) => {
                if (val) {
                  onChange("bundleId", val);
                }
              }}
            >
              <SelectTrigger
                className={cn(
                  "h-13 min-h-[52px] w-full rounded-2xl border bg-card px-4 text-left shadow-none transition-colors",
                  overBalance
                    ? "border-destructive/70 focus:border-destructive focus:ring-1 focus:ring-destructive/30"
                    : "border-border/80"
                )}
              >
                {!selectedBundle ? (
                  <span className="text-[15px] text-muted-foreground font-normal">
                    Select internet bundle
                  </span>
                ) : (
                  <div className="flex items-center justify-between w-full min-w-0 pr-1.5">
                    <span className="text-[15px] font-normal text-foreground truncate">
                      {selectedBundle.name}
                    </span>
                    <span
                      className={cn(
                        "text-[15px] font-normal tabular shrink-0 ml-3",
                        overBalance ? "text-destructive" : "text-foreground"
                      )}
                    >
                      {formatMoney(selectedBundle.price, "GHS", true)}
                    </span>
                  </div>
                )}
              </SelectTrigger>
              <SelectContent>
                {bundles.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{b.name}</span>
                      <span className="tabular text-muted-foreground font-normal">
                        {formatMoney(b.price, "GHS", true)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {overBalance && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                <InsufficientFundsAlert />
              </div>
            )}
</Field>

          {selectedBundle && (
            <>
            {/* 4. Narration */}
            <NarrationInput
              value={state.narration}
              onChange={(val) => onChange("narration", val)}
              placeholder={selectedBundle?.name || "Internet bundle"}
            />

            {/* 5. Transaction Category */}
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
              label={selectedBundle ? `Buy Bundle (${formatMoney(numAmount, "GHS", true)})` : "Buy Bundle"}
            />
            </>
          )}
        </div>
      )}
    </div>
  );
}
