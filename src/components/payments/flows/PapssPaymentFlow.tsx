"use client";

import { useState, useMemo } from "react";
import { Account } from "@/lib/mock-data";
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
  SchedulePaymentSection,
  ScheduleFrequency,
  resolveAccountName,
  RATES,
  DualAmountFields,
} from "./shared";

const PAPSS_COUNTRIES = [
  { name: "Nigeria", currency: "NGN" },
  { name: "Kenya", currency: "KES" },
  { name: "South Africa", currency: "ZAR" },
  { name: "Côte d'Ivoire", currency: "XOF" },
  { name: "Egypt", currency: "EGP" },
  { name: "Rwanda", currency: "RWF" },
  { name: "Zambia", currency: "ZMW" },
];

export interface PapssPaymentFormState {
  fromId: string;
  wCountry: string;
  wCurrency: string;
  wBank: string;
  wIban: string;
  wBenName: string;
  wForeign: string;
  /** What they typed in "You send", or "" when the recipient's box is the source. */
  wGhs: string;
  wPurpose: string;
  category: string;
  saveBeneficiary?: boolean;
  beneficiaryNickname?: string;
  isScheduled?: boolean;
  scheduleDate?: string;
  scheduleFrequency?: ScheduleFrequency;
  scheduleEndDate?: string;
}

interface PapssPaymentFlowProps {
  accounts: Account[];
  state: PapssPaymentFormState;
  onChange: (key: keyof PapssPaymentFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

const PAPSS_BANKS_BY_COUNTRY: Record<string, string[]> = {
  "Nigeria": [
    "Access Bank Nigeria",
    "Zenith Bank",
    "Guaranty Trust Bank (GTBank)",
    "First Bank of Nigeria",
    "United Bank for Africa (UBA)",
    "Fidelity Bank Nigeria",
  ],
  "Kenya": [
    "KCB Bank Kenya",
    "Equity Bank Kenya",
    "NCBA Bank",
    "Co-operative Bank of Kenya",
    "Absa Bank Kenya",
    "Standard Chartered Kenya",
  ],
  "South Africa": [
    "Standard Bank South Africa",
    "FirstNational Bank (FNB)",
    "Absa Bank South Africa",
    "Nedbank",
    "Capitec Bank",
  ],
  "Côte d'Ivoire": [
    "Société Générale Côte d'Ivoire (SGCI)",
    "Ecobank Côte d'Ivoire",
    "NSIA Banque",
    "Banque Atlantique",
    "SIB (Société Ivoirienne de Banque)",
  ],
  "Egypt": [
    "National Bank of Egypt",
    "Banque Misr",
    "Commercial International Bank (CIB)",
    "QNB Alahli",
    "Banque du Caire",
  ],
  "Rwanda": [
    "Bank of Kigali",
    "I&M Bank Rwanda",
    "Equity Bank Rwanda",
    "Cogebanque",
    "Access Bank Rwanda",
  ],
  "Zambia": [
    "Zanaco (Zambia National Commercial Bank)",
    "Stanbic Bank Zambia",
    "Absa Bank Zambia",
    "Standard Chartered Zambia",
    "Atlas Mara Zambia",
  ],
};

export function PapssPaymentFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: PapssPaymentFlowProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(detailsCollapsed ?? false);
  const isCollapsed = detailsCollapsed !== undefined ? detailsCollapsed : internalCollapsed;

  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onToggleCollapsed?.(val);
  };

  const currentCountry = state.wCountry || "Nigeria";
  const availableBanks = PAPSS_BANKS_BY_COUNTRY[currentCountry] || PAPSS_BANKS_BY_COUNTRY["Nigeria"];

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const rate = RATES[state.wCurrency] ?? 0.0098;
  const numForeign = Number(state.wForeign.replace(/[^0-9.]/g, "")) || 0;
  const ghsEquivalent = state.wGhs
    ? Number(state.wGhs.replace(/[^0-9.]/g, "")) || 0
    : Math.round(numForeign * rate * 100) / 100;
  const fee = 25.0; // PAPSS standard fee
  const totalGhs = ghsEquivalent + fee;
  const overBalance = totalGhs > (fromAccount?.available ?? 0);

  const isDetailsValid = state.wIban.trim().length >= 6 && Boolean(state.wBank);

  const verifiedName = useMemo(() => {
    return resolveAccountName(state.wIban, state.wBenName);
  }, [state.wIban, state.wBenName]);

  const isVerified = isDetailsValid && Boolean(verifiedName);

  const isDestinationValid = isVerified;

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
        <label className="text-[13px] font-medium text-foreground">PAPSS Beneficiary Details</label>
        {isDestinationValid && isCollapsed ? (
          <CollapsedDetailsBadge
            title={verifiedName || `PAPSS Account (${state.wIban})`}
            subtitle={`${state.wBank || "Bank"} · ${state.wIban} (${state.wCountry || "Africa"})`}
            nameCheck={{ confirmed: Boolean(verifiedName), by: state.wBank || undefined }}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={currentCountry}
                onValueChange={(val) => {
                  const found = PAPSS_COUNTRIES.find((c) => c.name === val);
                  if (found) {
                    onChange("wCountry", found.name);
                    onChange("wCurrency", found.currency);
                    const newBanks = PAPSS_BANKS_BY_COUNTRY[found.name] || [];
                    onChange("wBank", newBanks[0] || "");
                  }
                }}
              >
                <SelectTrigger className="h-13 w-full rounded-2xl border border-field-border bg-field px-4 text-[15px] text-foreground shadow-none">
                  <SelectValue placeholder="Select African country" />
                </SelectTrigger>
                <SelectContent>
                  {PAPSS_COUNTRIES.map((c) => (
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
                <SelectTrigger className="h-13 w-full rounded-2xl border border-field-border bg-field px-4 text-[15px] text-foreground shadow-none">
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

            <input
              type="text"
              value={state.wIban}
              onChange={(e) => {
                const val = e.target.value;
                onChange("wIban", val);
                const resolved = resolveAccountName(val, "");
                if (resolved) {
                  onChange("wBenName", resolved);
                }
              }}
              placeholder="Enter account number or IBAN"
              className="h-13 w-full rounded-2xl border border-field-border bg-field px-4 text-[15px] text-foreground outline-none focus:border-field-border-focus focus:ring-0 transition tabular"
            />

            {/* Verified badge */}
            {isVerified && <VerifiedAccountBadge name={verifiedName} />}
          </div>
        )}
      </div>

      {/* Progressive Disclosure: Only reveal Foreign Amount & onwards after PAPSS details are entered */}
      {isDestinationValid && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount Section: You Send (GHS) vs Recipient Gets (Foreign) with switcher */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-foreground">Transfer Amount</label>

            <DualAmountFields
              foreign={state.wForeign}
              ghs={state.wGhs}
              rate={rate}
              foreignCurrency={state.wCurrency || "NGN"}
              sendCurrency={fromAccount?.currency || "GHS"}
              onChange={({ foreign, ghs }) => {
                onChange("wForeign", foreign);
                onChange("wGhs", ghs);
              }}
              onFocus={() => {
                if (isDestinationValid) setCollapsed(true);
              }}
              hasError={overBalance}
            />

            {/* Exchange rate display underneath fields */}
            <div className="flex items-center justify-end px-1 pt-0.5 text-[12.5px] text-muted-foreground font-medium">
              <span>Rate: 1 {state.wCurrency || "NGN"} = GHS {rate}</span>
            </div>

            {/* Row-level error alert below the entire row */}
            {overBalance && (
              <div className="mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <InsufficientFundsAlert />
              </div>
            )}
          </div>

          {/* 4. Narration / Purpose of Payment */}
          <NarrationInput
            value={state.wPurpose}
            onChange={(val) => onChange("wPurpose", val)}
            label="Purpose of Payment"
            placeholder="e.g. Trade settlement, family remittance"
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
            label="Proceed"
          />
        </div>
      )}
    </div>
  );
}
