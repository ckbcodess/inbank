"use client";

import { useState, useMemo } from "react";
import { Account, formatMoney } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
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
  getTelcoLogo,
  normalizeNetworkName,
  resolveAccountName,
} from "./shared";
import { PhoneInput } from "@/components/ui/phone-input";
import { isCompleteGhanaMobile } from "@/lib/phone";

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
    return getBundlesForNetwork(state.wNetwork);
  }, [state.wNetwork]);

  const selectedBundle = useMemo(() => {
    return bundles.find((b) => b.id === state.bundleId) ?? bundles[0];
  }, [bundles, state.bundleId]);

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.aPhone, state.benName);
  }, [state.aPhone, state.benName]);

  const numAmount = selectedBundle?.price ?? 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isPhoneValid = isCompleteGhanaMobile(state.aPhone);
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
            title={verifiedName || state.benName || `Data (${state.aPhone})`}
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
              onValueChange={(val) => {
                if (val) {
                  onChange("wNetwork", val);
                  const newBundles = getBundlesForNetwork(val);
                  if (newBundles && newBundles.length > 0) {
                    onChange("bundleId", newBundles[0].id);
                  }
                }
              }}
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
                    <span className="text-[14.5px] font-medium text-foreground">{normalizeNetworkName(state.wNetwork)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Smartphone size={17} strokeWidth={1.8} />
                    </span>
                    <span className="text-[14px] text-muted-foreground font-normal">
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

            <PhoneInput
              value={state.aPhone}
              onValueChange={(val) => {
                onChange("aPhone", val);
                const detected = detectTelcoNetwork(val);
                if (detected && !state.wNetwork) {
                  const newNet = detected.telcoName;
                  onChange("wNetwork", newNet);
                  const newBundles = getBundlesForNetwork(newNet);
                  if (newBundles && newBundles.length > 0) {
                    onChange("bundleId", newBundles[0].id);
                  }
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

      {/* Progressive Disclosure: Only reveal Bundle Selection & onwards after phone number & network are valid */}
      {isPhoneValid && isNetworkValid && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Bundle Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-foreground">Data Bundle</label>
            <Select
              value={selectedBundle?.id || bundles[0]?.id}
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
                    Select data bundle
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
                <InsufficientFundsAlert
                  available={fromAccount?.available ?? 0}
                  currency={fromAccount?.currency || "GHS"}
                />
              </div>
            )}
          </div>

          {/* 4. Narration */}
          <NarrationInput
            value={state.narration}
            onChange={(val) => onChange("narration", val)}
            placeholder={selectedBundle?.name || "Data bundle"}
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
            label={selectedBundle ? `Buy Bundle (${formatMoney(numAmount, "GHS", true)})` : "Buy Bundle"}
          />
        </div>
      )}
    </div>
  );
}
