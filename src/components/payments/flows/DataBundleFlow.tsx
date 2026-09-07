"use client";

import { useState, useMemo } from "react";
import { Account, formatMoney } from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FromAccountSelector,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  VerifiedAccountBadge,
  CollapsedDetailsBadge,
  NETWORKS,
  BUNDLES_BY_NETWORK,
  SaveBeneficiaryCheckbox,
  SchedulePaymentSection,
  ScheduleFrequency,
  detectNetwork,
  resolveAccountName,
} from "./shared";

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
}

export function DataBundleFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
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
    return BUNDLES_BY_NETWORK[state.wNetwork] ?? BUNDLES_BY_NETWORK["MTN Mobile Money"] ?? [];
  }, [state.wNetwork]);

  const selectedBundle = useMemo(() => {
    return bundles.find((b) => b.id === state.bundleId) ?? bundles[0];
  }, [bundles, state.bundleId]);

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.aPhone, state.benName);
  }, [state.aPhone, state.benName]);

  const numAmount = selectedBundle?.price ?? 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isPhoneValid = state.aPhone.replace(/\s/g, "").length >= 9;
  const isValid = Boolean(state.fromId) && isPhoneValid && numAmount > 0 && !overBalance;

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
        <label className="text-[14px] font-medium text-foreground">Beneficiary Details</label>
        {isPhoneValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || state.benName || `Data (${state.aPhone})`}
            subtitle={`${state.wNetwork || "Mobile Network"} · ${state.aPhone}`}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <Select
              value={state.wNetwork || ""}
              onValueChange={(val) => {
                if (val) {
                  onChange("wNetwork", val);
                  const newBundles = BUNDLES_BY_NETWORK[val];
                  if (newBundles && newBundles.length > 0) {
                    onChange("bundleId", newBundles[0].id);
                  }
                }
              }}
            >
              <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                <SelectValue placeholder="Select Network" />
              </SelectTrigger>
              <SelectContent>
                {NETWORKS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              type="tel"
              inputMode="numeric"
              value={state.aPhone}
              onChange={(e) => {
                const val = e.target.value;
                onChange("aPhone", val);
                const detected = detectNetwork(val);
                if (detected) {
                  onChange("wNetwork", detected);
                }
                const resolved = resolveAccountName(val, "");
                if (resolved) {
                  onChange("benName", resolved);
                }
              }}
              placeholder="Enter phone number"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
            />

            {verifiedName && <VerifiedAccountBadge name={verifiedName} />}
          </div>
        )}
      </div>

      {/* 3. Bundle Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Data Bundle</label>
        <Select
          value={selectedBundle?.id || bundles[0]?.id}
          onValueChange={(val) => {
            if (val) {
              onChange("bundleId", val);
              if (isPhoneValid) setCollapsed(true);
            }
          }}
          onOpenChange={(open) => {
            if (open && isPhoneValid) setCollapsed(true);
          }}
        >
          <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-left shadow-none">
            {!selectedBundle ? (
              <span className="text-[15px] text-muted-foreground font-normal">
                Select data bundle
              </span>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="text-[15px] font-medium text-foreground">
                    {selectedBundle.name}
                  </span>
                  <span className="text-[13px] text-muted-foreground">{selectedBundle.val}</span>
                </div>
                <span className="text-[15px] font-medium text-foreground tabular">
                  {formatMoney(selectedBundle.price, "GHS", true)}
                </span>
              </div>
            )}
          </SelectTrigger>
          <SelectContent>
            {bundles.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} ({b.val}) · {formatMoney(b.price, "GHS", true)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 4. Narration */}
      <NarrationInput
        value={state.narration}
        onChange={(val) => onChange("narration", val)}
        placeholder={selectedBundle?.name || "Data bundle"}
      />

      {/* 5. Transaction Category (Optional) */}
      <CategorySelect
        value={state.category}
        onChange={(val) => onChange("category", val)}
      />

      {/* 6. Save Beneficiary */}
      <SaveBeneficiaryCheckbox
        checked={state.saveBeneficiary ?? false}
        onChange={(val) => onChange("saveBeneficiary", val)}
        nickname={state.beneficiaryNickname}
        onNicknameChange={(val) => onChange("beneficiaryNickname", val)}
        label="Save as beneficiary for future data purchases"
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

      {overBalance && (
        <InsufficientFundsAlert
          available={fromAccount?.available ?? 0}
          currency={fromAccount?.currency || "GHS"}
        />
      )}

      {/* 6. Proceed CTA */}
      <ProceedButton
        disabled={!isValid}
        onClick={onProceed}
        label={selectedBundle ? `Buy Bundle (${formatMoney(numAmount, "GHS", true)})` : "Buy Bundle"}
      />
    </div>
  );
}
