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
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  CollapsedDetailsBadge,
  RATES,
} from "./shared";

const PAPSS_COUNTRIES = [
  { name: "Nigeria", currency: "NGN" },
  { name: "Kenya", currency: "KES" },
  { name: "South Africa", currency: "ZAR" },
  { name: "Ivory Coast", currency: "XOF" },
  { name: "Egypt", currency: "EGP" },
];

export interface InternationalWireFormState {
  fromId: string;
  wCountry: string;
  wCurrency: string;
  wBank: string;
  wIban: string;
  wBenName: string;
  wForeign: string;
  wPurpose: string;
  category: string;
}

interface InternationalWireFlowProps {
  accounts: Account[];
  state: InternationalWireFormState;
  onChange: (key: keyof InternationalWireFormState, value: string) => void;
  onProceed: () => void;
}

export function InternationalWireFlow({
  accounts,
  state,
  onChange,
  onProceed,
}: InternationalWireFlowProps) {
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const rate = RATES[state.wCurrency] ?? 1;
  const numForeign = Number(state.wForeign.replace(/[^0-9.]/g, "")) || 0;
  const ghsEquivalent = Math.round(numForeign * rate * 100) / 100;
  const fee = 25.0; // PAPSS standard fee
  const totalGhs = ghsEquivalent + fee;
  const overBalance = totalGhs > (fromAccount?.available ?? 0);

  const isDestinationValid =
    state.wBenName.trim().length >= 3 &&
    state.wIban.trim().length >= 6 &&
    Boolean(state.wBank);

  const isValid =
    Boolean(state.fromId) && isDestinationValid && numForeign > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Recipient & Destination Details */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Recipient & Destination Details</label>
        {isDestinationValid && detailsCollapsed ? (
          <CollapsedDetailsBadge
            title={state.wBenName}
            subtitle={`${state.wBank || "Bank"} · ${state.wIban} (${state.wCountry || "International"})`}
            onChange={() => setDetailsCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-medium text-foreground">Destination Country</label>
                <Select
                  value={state.wCountry || "Nigeria"}
                  onValueChange={(val) => {
                    const found = PAPSS_COUNTRIES.find((c) => c.name === val);
                    if (found) {
                      onChange("wCountry", found.name);
                      onChange("wCurrency", found.currency);
                    }
                  }}
                >
                  <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPSS_COUNTRIES.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name} ({c.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-medium text-foreground">Recipient Bank</label>
                <input
                  type="text"
                  value={state.wBank}
                  onChange={(e) => onChange("wBank", e.target.value)}
                  placeholder="e.g. Zenith Bank Nigeria"
                  className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-foreground">Recipient Full Name</label>
              <input
                type="text"
                value={state.wBenName}
                onChange={(e) => onChange("wBenName", e.target.value)}
                placeholder="Legal name of beneficiary or business"
                className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-foreground">Account Number / IBAN</label>
              <input
                type="text"
                value={state.wIban}
                onChange={(e) => onChange("wIban", e.target.value)}
                placeholder="Account number or international IBAN"
                className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Amount in Foreign Currency */}
      <div className="flex flex-col gap-2">
        <AmountInput
          value={state.wForeign}
          onChange={(val) => onChange("wForeign", val)}
          currency={state.wCurrency || "NGN"}
          label={`Amount (${state.wCurrency || "NGN"})`}
          onFocus={() => {
            if (isDestinationValid) setDetailsCollapsed(true);
          }}
        />
        {numForeign > 0 && (
          <div className="flex items-center justify-between px-2 text-[13px] text-muted-foreground">
            <span>Approx. GHS Equivalent:</span>
            <span className="font-semibold text-foreground tabular">
              {formatMoney(ghsEquivalent, "GHS", true)} (at 1 {state.wCurrency} = GHS {rate})
            </span>
          </div>
        )}
      </div>

      {/* 4. Narration / Purpose of Payment */}
      <NarrationInput
        value={state.wPurpose}
        onChange={(val) => onChange("wPurpose", val)}
        label="Purpose of Payment"
        placeholder="e.g. Commercial invoice, family support"
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
        label="Review Transfer"
      />
    </div>
  );
}
