"use client";

import { useMemo } from "react";
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
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  VerifiedAccountBadge,
  NETWORKS,
  BUNDLES_BY_NETWORK,
  detectNetwork,
  resolveAccountName,
} from "./shared";

export interface AirtimeDataFormState {
  fromId: string;
  product: "airtime" | "data";
  wNetwork: string;
  aPhone: string;
  benName: string;
  airtimeAmount: string;
  bundleId: string;
  narration: string;
  category: string;
}

interface AirtimeDataFlowProps {
  accounts: Account[];
  state: AirtimeDataFormState;
  onChange: (key: keyof AirtimeDataFormState, value: string) => void;
  onProceed: () => void;
}

export function AirtimeDataFlow({
  accounts,
  state,
  onChange,
  onProceed,
}: AirtimeDataFlowProps) {
  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const isData = state.product === "data";

  const bundles = useMemo(() => {
    return BUNDLES_BY_NETWORK[state.wNetwork] ?? BUNDLES_BY_NETWORK["MTN Mobile Money"] ?? [];
  }, [state.wNetwork]);

  const selectedBundle = useMemo(() => {
    return bundles.find((b) => b.id === state.bundleId) ?? bundles[0];
  }, [bundles, state.bundleId]);

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.aPhone, state.benName);
  }, [state.aPhone, state.benName]);

  const numAmount = isData
    ? (selectedBundle?.price ?? 0)
    : Number(state.airtimeAmount.replace(/[^0-9.]/g, "")) || 0;

  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isPhoneValid = state.aPhone.replace(/\s/g, "").length >= 9;
  const isValid = Boolean(state.fromId) && isPhoneValid && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* Product Mode Pill Tabs */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-muted/40 border border-border/60">
        <button
          type="button"
          onClick={() => onChange("product", "airtime")}
          className={`h-10 rounded-xl text-[14px] font-medium transition-all ${
            !isData
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Airtime Top-up
        </button>
        <button
          type="button"
          onClick={() => {
            onChange("product", "data");
            if (!state.bundleId && bundles.length > 0) {
              onChange("bundleId", bundles[0].id);
            }
          }}
          className={`h-10 rounded-xl text-[14px] font-medium transition-all ${
            isData
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Internet Data Bundle
        </button>
      </div>

      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination: Network & Phone Number */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-foreground">Mobile Network</label>
          <Select
            value={state.wNetwork || "MTN Mobile Money"}
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
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              {NETWORKS.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-foreground">Recipient Phone Number</label>
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
            placeholder="e.g. 024 412 3456"
            className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
          />
        </div>

        {verifiedName && <VerifiedAccountBadge name={verifiedName} />}
      </div>

      {/* 3. Amount or Bundle Selection */}
      {isData ? (
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium text-foreground">Select Data Bundle</label>
          <Select
            value={selectedBundle?.id || bundles[0]?.id}
            onValueChange={(val) => val && onChange("bundleId", val)}
          >
            <SelectTrigger className="h-auto min-h-[64px] py-3 px-4 w-full rounded-2xl border border-border/80 bg-card text-left shadow-none">
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="text-[15px] font-medium text-foreground">
                    {selectedBundle?.name}
                  </span>
                  <span className="text-[13px] text-muted-foreground">{selectedBundle?.val}</span>
                </div>
                <span className="text-[16px] font-semibold text-foreground tabular">
                  {formatMoney(selectedBundle?.price ?? 0, "GHS", true)}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {bundles.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} ({b.val}) — {formatMoney(b.price, "GHS", true)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <AmountInput
          value={state.airtimeAmount}
          onChange={(val) => onChange("airtimeAmount", val)}
        />
      )}

      {/* 4. Narration */}
      <NarrationInput
        value={state.narration}
        onChange={(val) => onChange("narration", val)}
        placeholder={isData ? (selectedBundle?.name || "Data bundle") : "Airtime recharge"}
      />

      {/* 5. Transaction Category (Optional) */}
      <CategorySelect
        value={state.category}
        onChange={(val) => onChange("category", val)}
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
        label={isData ? `Buy Bundle (${formatMoney(numAmount, "GHS", true)})` : "Proceed"}
      />
    </div>
  );
}
