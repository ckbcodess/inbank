"use client";

/**
 * Broadband, on the Internet rail ("Broadband" next to "Send to My Number" and "Send to Other Numbers").
 *
 * The customer is paying for a connection at a home or office, not topping up a phone, so the destination is the
 * provider's broadband account, not a mobile number. The order follows the constitution: the account resolves to a name
 * before any package or price is shown, and nothing is preselected (a provider and a package are both the customer's
 * choice). Packages are in `getBroadbandPackages` (shared.tsx), with where each plan comes from.
 */

import { useEffect, useMemo, useState } from "react";
import { Account, formatMoney } from "@/lib/mock-data";
import { OptionTile } from "@/components/ui/option-tile";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  FromAccountSelector,
  InsufficientFundsAlert,
  ProceedButton,
  VerifiedAccountBadge,
  ResolvingAccountBadge,
  CollapsedDetailsBadge,
  SchedulePaymentSection,
  ScheduleFrequency,
  NetworkSelect,
  operatorBadgeIcon,
  normalizeNetworkName,
  resolveAccountName,
  BROADBAND_NETWORKS,
  getBroadbandPackages,
} from "./shared";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
export interface BroadbandFormState {
  fromId: string;
  wNetwork: string;
  aPhone: string;
  benName: string;
  bundleId: string;
  isScheduled?: boolean;
  scheduleDate?: string;
  scheduleFrequency?: ScheduleFrequency;
  scheduleEndDate?: string;
}

interface BroadbandFlowProps {
  accounts: Account[];
  state: BroadbandFormState;
  onChange: (key: keyof BroadbandFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function BroadbandFlow({ accounts, state, onChange, onProceed, detailsCollapsed, onToggleCollapsed }: BroadbandFlowProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(detailsCollapsed ?? false);
  const isCollapsed = detailsCollapsed !== undefined ? detailsCollapsed : internalCollapsed;
  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onToggleCollapsed?.(val);
  };

  const fromAccount = useMemo(() => accounts.find((a) => a.id === state.fromId) ?? accounts[0], [accounts, state.fromId]);

  const provider = state.wNetwork ? normalizeNetworkName(state.wNetwork) : "";

  const cleanAcct = state.aPhone.replace(/[\s-]/g, "");
  const isAcctValid = cleanAcct.length >= 9;

  // A short "verifying" beat, like the other account flows.
  const [resolving, setResolving] = useState(false);
  useEffect(() => {
    if (!isAcctValid) {
      setResolving(false);
      return;
    }
    setResolving(true);
    const timer = setTimeout(() => setResolving(false), 250);
    return () => clearTimeout(timer);
  }, [cleanAcct, isAcctValid]);

  const verifiedName = useMemo(() => resolveAccountName(state.aPhone, state.benName), [state.aPhone, state.benName]);
  const isVerified = Boolean(provider) && isAcctValid && !resolving && Boolean(verifiedName);

  const packages = useMemo(() => getBroadbandPackages(provider), [provider]);
  const groups = useMemo(() => {
    const byGroup = new Map<string, typeof packages>();
    for (const p of packages) byGroup.set(p.group, [...(byGroup.get(p.group) ?? []), p]);
    return [...byGroup.entries()];
  }, [packages]);
  const selected = packages.find((p) => p.id === state.bundleId);
  // One kind of plan at a time: a handful of tiles, not the whole catalogue. A chosen package keeps its own kind open.
  const [pickedGroup, setPickedGroup] = useState<string | null>(null);
  const activeGroup =
    groups.find(([g]) => g === pickedGroup)?.[0] ?? groups.find(([g]) => g === selected?.group)?.[0] ?? groups[0]?.[0] ?? "";
  const activeItems = groups.find(([g]) => g === activeGroup)?.[1] ?? [];
  const price = selected?.price ?? 0;
  const overBalance = price > (fromAccount?.available ?? 0);
  const isValid = Boolean(state.fromId) && isVerified && Boolean(selected) && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From account */}
      <FromAccountSelector accounts={accounts} value={state.fromId} onChange={(id) => onChange("fromId", id)} />

      {/* 2. Provider, then the broadband account at that provider */}
      <Field label="Broadband Provider">
        {isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName}
            subtitle={`${provider} · ${state.aPhone}`}
            icon={operatorBadgeIcon(provider)}
            nameCheck={{ confirmed: true, by: provider }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <NetworkSelect
              value={provider}
              placeholder="Select provider"
              options={BROADBAND_NETWORKS}
              onChange={(val) => {
                onChange("wNetwork", val);
                // The account and the package belong to the provider: clear them when it changes.
                onChange("aPhone", "");
                onChange("benName", "");
                onChange("bundleId", "");
                setPickedGroup(null);
              }}
            />

            {provider && (
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                <Label htmlFor="broadband-account">
                  Account number
                </Label>
                <Input
                  id="broadband-account"
                  type="text"
                  inputMode="numeric"
                  value={state.aPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    onChange("aPhone", val);
                    onChange("benName", resolveAccountName(val, ""));
                  }}
                  placeholder="Enter the number on your bill"
                  className="tabular"
                />
                <p className="text-[12px] text-muted-foreground">The number on your bill, or on the router’s SIM.</p>
                {isAcctValid && resolving && (
                  <ResolvingAccountBadge message={provider === "Telecel Ghana" ? "Verifying Telecel account details..." : "Verifying MTN account details..."} />
                )}
                {isVerified && <VerifiedAccountBadge name={verifiedName} />}
              </div>
            )}
          </div>
        )}
</Field>

      {/* Only once the account is verified: the package and what it costs */}
      {isVerified && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          <div className="flex flex-col gap-2">
            <Label id="broadband-package-label">
              Package
            </Label>
            {groups.length > 1 && (
              <SegmentedControl
                aria-label="Plan type"
                options={groups.map(([g]) => ({ value: g, label: g }))}
                value={activeGroup}
                onChange={setPickedGroup}
              />
            )}
            <div role="radiogroup" aria-labelledby="broadband-package-label" className="flex flex-col gap-2.5">
              {activeItems.map((p) => (
                <OptionTile
                  key={p.id}
                  title={p.label}
                  detail={p.duration}
                  value={formatMoney(p.price, "GHS", true)}
                  selected={p.id === state.bundleId}
                  onSelect={() => {
                    onChange("bundleId", p.id);
                    setCollapsed(true);
                  }}
                />
              ))}
            </div>
            {overBalance && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                <InsufficientFundsAlert />
              </div>
            )}
          </div>

          {selected && (
            <>
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

              <ProceedButton disabled={!isValid} onClick={onProceed} label={`Buy Package (${formatMoney(price, "GHS", true)})`} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
