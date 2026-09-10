"use client";

import { useState, useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
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
  SchedulePaymentSection,
  ScheduleFrequency,
  RATES,
} from "./shared";

const SWIFT_COUNTRIES = [
  { name: "United States", currency: "USD" },
  { name: "United Kingdom", currency: "GBP" },
  { name: "Germany (Eurozone)", currency: "EUR" },
  { name: "France (Eurozone)", currency: "EUR" },
  { name: "Canada", currency: "CAD" },
  { name: "China", currency: "CNY" },
  { name: "United Arab Emirates", currency: "AED" },
  { name: "Australia", currency: "AUD" },
  { name: "Japan", currency: "JPY" },
  { name: "South Africa", currency: "ZAR" },
];

export interface InternationalWireFormState {
  fromId: string;
  wCountry: string;
  wCurrency: string;
  wBank: string;
  wSwift: string;
  wIban: string;
  wBenName: string;
  wForeign: string;
  wPurpose: string;
  category: string;
  saveBeneficiary?: boolean;
  beneficiaryNickname?: string;
  isScheduled?: boolean;
  scheduleDate?: string;
  scheduleFrequency?: ScheduleFrequency;
  scheduleEndDate?: string;
}

interface InternationalWireFlowProps {
  accounts: Account[];
  state: InternationalWireFormState;
  onChange: (key: keyof InternationalWireFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

const INTERNATIONAL_BANKS_BY_COUNTRY: Record<string, string[]> = {
  "United States": [
    "JPMorgan Chase Bank",
    "Bank of America",
    "Citibank",
    "Wells Fargo",
    "Goldman Sachs",
    "Morgan Stanley",
    "PNC Bank",
    "U.S. Bank",
  ],
  "United Kingdom": [
    "Barclays",
    "HSBC UK",
    "Lloyds Bank",
    "NatWest",
    "Royal Bank of Scotland",
    "Standard Chartered",
    "Santander UK",
  ],
  "Germany (Eurozone)": [
    "Deutsche Bank",
    "Commerzbank",
    "KfW",
    "DZ Bank",
    "Landesbank Baden-Württemberg",
    "HypoVereinsbank",
  ],
  "France (Eurozone)": [
    "BNP Paribas",
    "Crédit Agricole",
    "Société Générale",
    "BPCE",
    "Crédit Mutuel",
  ],
  "Canada": [
    "RBC Royal Bank",
    "TD Bank",
    "Scotiabank",
    "BMO Bank of Montreal",
    "CIBC",
  ],
  "China": [
    "Industrial & Commercial Bank of China (ICBC)",
    "China Construction Bank",
    "Bank of China",
    "Agricultural Bank of China",
  ],
  "United Arab Emirates": [
    "Emirates NBD",
    "First Abu Dhabi Bank (FAB)",
    "Abu Dhabi Commercial Bank (ADCB)",
    "Mashreq Bank",
  ],
  "Australia": [
    "Commonwealth Bank of Australia",
    "ANZ Bank",
    "National Australia Bank (NAB)",
    "Westpac",
  ],
  "Japan": [
    "MUFG Bank",
    "Sumitomo Mitsui Banking Corporation (SMBC)",
    "Mizuho Bank",
    "Japan Post Bank",
  ],
  "South Africa": [
    "Standard Bank South Africa",
    "FirstNational Bank (FNB)",
    "Absa Bank South Africa",
    "Nedbank",
    "Capitec Bank",
  ],
};

export function InternationalWireFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: InternationalWireFlowProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(detailsCollapsed ?? false);
  const [amountMode, setAmountMode] = useState<"send" | "receive">("receive");
  const isCollapsed = detailsCollapsed !== undefined ? detailsCollapsed : internalCollapsed;

  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onToggleCollapsed?.(val);
  };

  const currentCountry = state.wCountry || "United States";
  const availableBanks = INTERNATIONAL_BANKS_BY_COUNTRY[currentCountry] || INTERNATIONAL_BANKS_BY_COUNTRY["United States"];

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const rate = RATES[state.wCurrency] ?? 15.4;
  const numForeign = Number(state.wForeign.replace(/[^0-9.]/g, "")) || 0;
  const ghsEquivalent = Math.round(numForeign * rate * 100) / 100;
  const fee = 50.0; // SWIFT Wire standard fee
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
        <label className="text-[14px] font-medium text-foreground">SWIFT Beneficiary Details</label>
        {isDestinationValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={state.wBenName}
            subtitle={`${state.wBank || "Bank"} · SWIFT: ${state.wSwift || "BIC"} · ${state.wIban}`}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={currentCountry}
                onValueChange={(val) => {
                  const found = SWIFT_COUNTRIES.find((c) => c.name === val);
                  if (found) {
                    onChange("wCountry", found.name);
                    onChange("wCurrency", found.currency);
                    const newBanks = INTERNATIONAL_BANKS_BY_COUNTRY[found.name] || [];
                    onChange("wBank", newBanks[0] || "");
                  }
                }}
              >
                <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {SWIFT_COUNTRIES.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name} ({c.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={state.wBank}
                onValueChange={(val) => val && onChange("wBank", val)}
              >
                <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                  <SelectValue placeholder="Select receiving bank" />
                </SelectTrigger>
                <SelectContent>
                  {availableBanks.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={state.wSwift}
                onChange={(e) => onChange("wSwift", e.target.value.toUpperCase())}
                placeholder="SWIFT / BIC Code (e.g. CHASUS33)"
                className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all uppercase tracking-wider"
              />

              <input
                type="text"
                value={state.wIban}
                onChange={(e) => onChange("wIban", e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                placeholder="Account number or IBAN"
                className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular uppercase"
              />
            </div>

            <input
              type="text"
              value={state.wBenName}
              onChange={(e) => onChange("wBenName", e.target.value)}
              placeholder="Enter legal name of recipient"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
            />
          </div>
        )}
      </div>

      {/* Progressive Disclosure: Only reveal Foreign Amount & onwards after wire details are entered */}
      {isDestinationValid && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount Section: You Send (GHS) vs Recipient Gets (Foreign) with switcher */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-foreground">Transfer Amount</label>

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              {/* You Send (GHS) */}
              <AmountInput
                value={
                  amountMode === "send"
                    ? state.wForeign ? String(ghsEquivalent) : ""
                    : String(ghsEquivalent)
                }
                onChange={(val) => {
                  const numVal = Number(val.replace(/[^0-9.]/g, "")) || 0;
                  const foreignVal = rate > 0 ? Math.round((numVal / rate) * 100) / 100 : 0;
                  onChange("wForeign", foreignVal > 0 ? String(foreignVal) : "");
                }}
                currency={fromAccount?.currency || "GHS"}
                label="You Send"
                onFocus={() => {
                  if (isDestinationValid) setCollapsed(true);
                }}
                hasError={overBalance}
              />

              {/* Central Switcher Indicator */}
              <div className="hidden md:flex absolute left-1/2 top-[calc(50%+14px)] -translate-x-1/2 -translate-y-1/2 z-10">
                <div
                  className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm"
                >
                  <ArrowLeftRight size={15} strokeWidth={2} />
                </div>
              </div>

              {/* Recipient Gets (Foreign Currency) */}
              <AmountInput
                value={state.wForeign}
                onChange={(val) => onChange("wForeign", val)}
                currency={state.wCurrency || "USD"}
                label="Recipient Gets"
                onFocus={() => {
                  if (isDestinationValid) setCollapsed(true);
                }}
                hasError={overBalance}
              />
            </div>

            {/* Exchange rate display underneath fields */}
            <div className="flex items-center justify-end px-1 pt-0.5 text-[12.5px] text-muted-foreground font-medium">
              <span>Rate: 1 {state.wCurrency || "USD"} = GHS {rate}</span>
            </div>

            {/* Row-level error alert below the entire row */}
            {overBalance && (
              <div className="mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <InsufficientFundsAlert
                  available={fromAccount?.available ?? 0}
                  currency={fromAccount?.currency || "GHS"}
                />
              </div>
            )}
          </div>

          {/* 4. Narration / Purpose of Payment */}
          <NarrationInput
            value={state.wPurpose}
            onChange={(val) => onChange("wPurpose", val)}
            label="Purpose of Payment"
            placeholder="e.g. Commercial invoice, tuition fee, investment"
          />

          {/* 5. Transaction Category */}
          <CategorySelect
            value={state.category}
            onChange={(val) => onChange("category", val)}
            defaultCategory="Remittances"
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
