"use client";

/**
 * Broadband, on the Internet rail ("Broadband" next to "Data for Myself" and "Data for others").
 *
 * Three steps, in order: the product (MTN TurboNet, MTN Fibre or Telecel Broadband), then the one account field, whose
 * label and rule come from that product, then the package. The account resolves to a name before any package or price
 * is shown, and nothing is preselected. Products, their account rules and their packages live in `BROADBAND_PROVIDERS`
 * and `getBroadbandPackages` (shared.tsx).
 */

import { useEffect, useMemo, useState } from "react";
import { Account, formatDate, formatMoney } from "@/lib/mock-data";
import { OperatorLogo } from "@/components/ui/operator-logo";
import { OptionTile } from "@/components/ui/option-tile";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { InlineError } from "@/components/ui/inline-error";
import {
  FromAccountSelector,
  InsufficientFundsAlert,
  ProceedButton,
  AccountVerificationStatus,
  VerifiedAccountBadge,
  ResolvingAccountBadge,
  CollapsedDetailsBadge,
  SchedulePaymentSection,
  ScheduleFrequency,
  NetworkSelect,
  operatorBadgeIcon,
  resolveAccountName,
  BROADBAND_PROVIDERS,
  getBroadbandProvider,
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

  // Step 1 stores the product's name in `wNetwork`, so the rule for step 2 is looked up from it.
  const provider = getBroadbandProvider(state.wNetwork);

  const cleanAcct = provider ? provider.sanitize(state.aPhone) : "";
  const isAcctValid = provider ? provider.isValid(cleanAcct) : false;
  // An error shows once the person has left the field, so typing a number isn't scolded letter by letter.
  const [acctTouched, setAcctTouched] = useState(false);
  const showAcctError = acctTouched && state.aPhone.length > 0 && !isAcctValid;

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

  // Some products show only the package this account is on now (Telecel); the rest show their whole catalogue.
  const activeOnly = Boolean(provider?.activePackageFor);
  const packages = useMemo(() => {
    if (!provider) return [];
    if (provider.activePackageFor) {
      const active = provider.activePackageFor(cleanAcct);
      return active ? [active] : [];
    }
    return getBroadbandPackages(provider.name);
  }, [provider, cleanAcct]);
  const groups = useMemo(() => {
    const byGroup = new Map<string, typeof packages>();
    for (const p of packages) byGroup.set(p.group, [...(byGroup.get(p.group) ?? []), p]);
    return [...byGroup.entries()];
  }, [packages]);
  const selected = activeOnly ? packages[0] : packages.find((p) => p.id === state.bundleId);
  const dueOn = provider?.activeDueDate ? provider.activeDueDate(cleanAcct) : "";

  // The active package is the only one there is, so it is what the payment carries. Keep the stored choice in step.
  const activeId = activeOnly && isVerified ? (packages[0]?.id ?? "") : "";
  useEffect(() => {
    if (activeOnly && state.bundleId !== activeId) onChange("bundleId", activeId);
  }, [activeOnly, activeId, state.bundleId, onChange]);
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

      {isVerified && isCollapsed ? (
        <CollapsedDetailsBadge
          title={verifiedName}
          subtitle={`${provider?.name} · ${state.aPhone}`}
          icon={operatorBadgeIcon(provider?.name)}
          nameCheck={{ confirmed: true, by: provider?.name ?? "" }}
          onChange={() => setCollapsed(false)}
        />
      ) : (
        <>
          {/* 2. Which broadband product */}
          <Field label="Broadband Provider">
            <NetworkSelect
              value={state.wNetwork}
              placeholder="Select provider"
              options={BROADBAND_PROVIDERS.map((p) => p.name)}
              onChange={(val) => {
                onChange("wNetwork", val);
                // The account and the package belong to the product: clear them when it changes.
                onChange("aPhone", "");
                onChange("benName", "");
                onChange("bundleId", "");
                setPickedGroup(null);
                setAcctTouched(false);
              }}
            />
          </Field>

          {/* 3. The one account field. Its label, placeholder and rule come from the product chosen above. */}
          {provider && (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
              <Label htmlFor="broadband-account">{provider.accountLabel}</Label>
              <Input
                id="broadband-account"
                type="text"
                inputMode={provider.inputMode}
                autoComplete="off"
                maxLength={provider.maxLength}
                value={state.aPhone}
                onChange={(e) => {
                  const val = provider.sanitize(e.target.value);
                  onChange("aPhone", val);
                  onChange("benName", resolveAccountName(val, ""));
                }}
                onBlur={() => setAcctTouched(true)}
                aria-invalid={showAcctError || undefined}
                placeholder={provider.accountPlaceholder}
                className="tabular"
              />
              <InlineError message={showAcctError && provider.accountError} className="text-left" />
              <AccountVerificationStatus
                resolving={isAcctValid && resolving}
                name={isVerified ? verifiedName : null}
                resolvingMessage="Verifying..."
              />
            </div>
          )}
        </>
      )}

      {/* 4. Only once the account is verified: the package and what it costs */}
      {isVerified && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {activeOnly ? (
            <div className="flex flex-col gap-2">
              <Label id="broadband-package-label">Your Active Package</Label>
              {selected ? (
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                  <OperatorLogo name={provider?.name} size={36} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[14px] text-foreground">{selected.label}</span>
                    <span className="text-[12px] text-muted-foreground tabular">Due {formatDate(dueOn)}</span>
                  </div>
                  <span className="text-[16px] text-foreground tabular">{formatMoney(selected.price, "GHS", true)}</span>
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">There’s no active package on this account right now.</p>
              )}
            </div>
          ) : (
          <div className="flex flex-col gap-2">
            <Label id="broadband-package-label">Bundle Package</Label>
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
          )}

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
