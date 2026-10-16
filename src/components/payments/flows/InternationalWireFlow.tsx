"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PAPSS_COUNTRY_NAMES, type Country } from "@/lib/countries";
import { CountryPicker } from "./CountryPicker";
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
  CollapsedDetailsBadge,
  SchedulePaymentSection,
  ScheduleFrequency,
  RATES,
  DualAmountFields,
} from "./shared";

import { Label } from "@/components/ui/label";
import { Field as UiField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
export interface InternationalWireFormState {
  fromId: string;
  wCountry: string;
  wCurrency: string;
  wBank: string;
  wSwift: string;
  wIban: string;
  wBenName: string;
  wForeign: string;
  /** What they typed in "You send", or "" when the recipient's box is the source. */
  wGhs: string;
  /** The kind of bank code they have for the recipient: "swift", "sort" or "iban". The code itself is wSwift. */
  wMode: string;
  wBankAddress: string;
  wBenEmail: string;
  wBenPhone: string;
  wBenAddress: string;
  /** Who pays the charges: "shared", "sender" or "recipient". */
  wCharges: string;
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
  /** Switch to the PAPSS flow for this African country. */
  onUsePapss?: (countryName: string, currency: string) => void;
}

/** Mode of delivery is the kind of bank code they have; each has its own shape. */
const CODE_TYPES = [
  {
    id: "swift",
    label: "Swift Code",
    hint: "8 or 11 letters and numbers",
    placeholder: "e.g. CHASUS33",
    clean: (v: string) => v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 11),
    valid: (v: string) => v.length === 8 || v.length === 11,
  },
  {
    id: "sort",
    label: "Sort Code",
    hint: "6 digits",
    placeholder: "e.g. 123456",
    clean: (v: string) => v.replace(/\D/g, "").slice(0, 6),
    valid: (v: string) => v.length === 6,
  },
  {
    id: "iban",
    label: "IBAN",
    hint: "Up to 34 letters and numbers",
    placeholder: "e.g. GB29NWBK60161331926819",
    clean: (v: string) => v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 34),
    valid: (v: string) => v.length >= 15 && v.length <= 34,
  },
];

export const CODE_TYPE_LABELS: Record<string, string> = Object.fromEntries(CODE_TYPES.map((c) => [c.id, c.label]));

export const CHARGE_OPTIONS = [
  { id: "shared", label: "Shared", note: "You pay GCB's fee. The recipient's bank may deduct its own." },
  { id: "sender", label: "I Pay All Charges", note: "The recipient gets the full amount." },
  { id: "recipient", label: "Recipient Pays", note: "GCB's fee is taken out of the amount sent." },
];


function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <UiField label={label} optional={optional}>
      {children}
    </UiField>
  );
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
  "Germany": [
    "Deutsche Bank",
    "Commerzbank",
    "KfW",
    "DZ Bank",
    "Landesbank Baden-Württemberg",
    "HypoVereinsbank",
  ],
  "France": [
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
  onUsePapss,
}: InternationalWireFlowProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(detailsCollapsed ?? false);
  const [showOptional, setShowOptional] = useState(false);
  const isCollapsed = detailsCollapsed !== undefined ? detailsCollapsed : internalCollapsed;

  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onToggleCollapsed?.(val);
  };

  const currentCountry = state.wCountry;
  const availableBanks = INTERNATIONAL_BANKS_BY_COUNTRY[currentCountry] ?? [];
  const codeType = CODE_TYPES.find((c) => c.id === state.wMode);
  const [papssFor, setPapssFor] = useState<Country | null>(null);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const rate = RATES[state.wCurrency] ?? 15.4;
  const numForeign = Number(state.wForeign.replace(/[^0-9.]/g, "")) || 0;
  const ghsEquivalent = state.wGhs
    ? Number(state.wGhs.replace(/[^0-9.]/g, "")) || 0
    : Math.round(numForeign * rate * 100) / 100;
  const fee = 50.0; // SWIFT Wire standard fee
  // "Recipient Pays" takes the fee out of the amount, so nothing is added on top.
  const totalGhs = state.wCharges === "recipient" ? ghsEquivalent : ghsEquivalent + fee;
  const overBalance = totalGhs > (fromAccount?.available ?? 0);

  // Each block appears once the one before it is done.
  const accountOk = state.wIban.trim().length >= 6;
  const nameOk = state.wBenName.trim().length >= 3;
  const optionalOpen = showOptional || Boolean(state.wBenEmail || state.wBenPhone);
  const emailOk = !state.wBenEmail.trim() || /^\S+@\S+\.\S+$/.test(state.wBenEmail.trim());
  const codeOk = Boolean(codeType?.valid(state.wSwift));
  const bankDetailsOk =
    codeOk && Boolean(state.wBank.trim()) && state.wBankAddress.trim().length >= 3;

  const isDestinationValid =
    state.wBenName.trim().length >= 3 &&
    state.wBenAddress.trim().length >= 3 &&
    emailOk &&
    accountOk &&
    bankDetailsOk;

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

      {/* 2. Where it's going, and who gets it */}
      {isDestinationValid && isCollapsed ? (
        <Field label="Beneficiary">
          <CollapsedDetailsBadge
            title={state.wBenName}
            subtitle={`${state.wBank} · ${state.wSwift} · ${state.wIban}`}
            onChange={() => setCollapsed(false)}
          />
</Field>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <Label>Destination</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Country">
                <CountryPicker
                  value={currentCountry}
                  onSelect={(country) => {
                    onChange("wCountry", country.name);
                    onChange("wCurrency", country.currency);
                    // A different country means different banks; never carry one over.
                    onChange("wBank", "");
                    onChange("wSwift", "");
                    if (PAPSS_COUNTRY_NAMES[country.code]) setPapssFor(country);
                  }}
                />
              </Field>

              <Field label="Mode of Delivery">
                <Select
                  value={state.wMode}
                  onValueChange={(val) => {
                    if (!val) return;
                    onChange("wMode", val);
                    onChange("wSwift", "");
                  }}
                >
                  <SelectTrigger >
                    <SelectValue placeholder="Select mode of delivery" />
                  </SelectTrigger>
                  <SelectContent>
                    {CODE_TYPES.map((m) => (
                      <SelectItem key={m.id} value={m.id} label={m.label}>
                        <span className="flex flex-col">
                          <span>{m.label}</span>
                          <span className="text-[12px] text-muted-foreground">{m.hint}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {codeType && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                <Field label={codeType.label}>
                  <Input
                    type="text"
                    value={state.wSwift}
                    onChange={(e) => onChange("wSwift", codeType.clean(e.target.value))}
                    placeholder={codeType.placeholder}
                    className="tabular uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
                  />
                </Field>
                <p className="px-1 pt-1.5 text-[12.5px] text-muted-foreground">{codeType.hint}</p>
              </div>
            )}
          </div>

          {codeOk && currentCountry && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
              <Label>Beneficiary Bank</Label>
              <Field label="Bank">
                {availableBanks.length > 0 ? (
                  <Select value={state.wBank} onValueChange={(val) => val && onChange("wBank", val)}>
                    <SelectTrigger >
                      <SelectValue placeholder="Select beneficiary bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBanks.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="text"
                    value={state.wBank}
                    onChange={(e) => onChange("wBank", e.target.value)}
                    placeholder="Enter beneficiary bank"
                  />
                )}
              </Field>

              <Field label="Bank Address">
                <Input
                  type="text"
                  value={state.wBankAddress}
                  onChange={(e) => onChange("wBankAddress", e.target.value)}
                  placeholder="Enter address"
                />
              </Field>
            </div>
          )}

          {bankDetailsOk && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
              <Label>Beneficiary Details</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Account Number">
                  <Input
                    type="text"
                    value={state.wIban}
                    onChange={(e) => onChange("wIban", e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                    placeholder="Enter beneficiary account number"
                    className="tabular uppercase placeholder:normal-case"
                  />
                </Field>
                <Field label="Name">
                  <Input
                    type="text"
                    value={state.wBenName}
                    onChange={(e) => onChange("wBenName", e.target.value)}
                    placeholder="Legal name of recipient"
                  />
                </Field>
              </div>

              {accountOk && nameOk && (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                  <Field label="Address">
                    <Input
                      type="text"
                      value={state.wBenAddress}
                      onChange={(e) => onChange("wBenAddress", e.target.value)}
                      placeholder="Enter beneficiary address"
                    />
                  </Field>

                  {optionalOpen ? (
                    <div className="grid gap-3 animate-in fade-in duration-150 ease-out sm:grid-cols-2">
                      <Field label="Email Address" optional>
                        <Input
                          type="email"
                          value={state.wBenEmail}
                          onChange={(e) => onChange("wBenEmail", e.target.value)}
                          placeholder="Enter email address"
                        />
                      </Field>
                      <Field label="Contact Number" optional>
                        <Input
                          type="tel"
                          value={state.wBenPhone}
                          onChange={(e) => onChange("wBenPhone", e.target.value.replace(/[^0-9+\s]/g, ""))}
                          placeholder="Enter contact number"
                          className="tabular"
                        />
                      </Field>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowOptional(true)}
                      className="cursor-pointer self-start text-[13.5px] text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                    >
                      Add email or contact number
                    </button>
                  )}
                  {!emailOk && (
                    <p className="text-[12.5px] text-warning">That email address doesn&apos;t look right.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={papssFor !== null} onOpenChange={(open) => !open && setPapssFor(null)}>
        <DialogContent size="sm" className="p-0">
          <DialogHeader onClose={() => setPapssFor(null)}>
            <DialogTitle>PAPSS Is Available for This Transfer</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-5 sm:px-6">
            <DialogDescription className="text-[14px] leading-relaxed text-muted-foreground">
              Send money across Africa quickly and conveniently in local African currencies.
            </DialogDescription>
          </div>
          <DialogFooter className="flex-row gap-2.5 px-5 pb-5 sm:px-6">
            <Button type="button" variant="outline" onClick={() => setPapssFor(null)} className="h-11 flex-1 text-[15px]">
              Not now
            </Button>
            <Button
              type="button"
              onClick={() => {
                const name = papssFor ? PAPSS_COUNTRY_NAMES[papssFor.code] : undefined;
                const currency = papssFor?.currency ?? "";
                setPapssFor(null);
                if (name) onUsePapss?.(name, currency);
              }}
              className="h-11 flex-1 text-[15px]"
            >
              Use PAPSS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progressive Disclosure: Only reveal Foreign Amount & onwards after wire details are entered */}
      {isDestinationValid && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount Section: You Send (GHS) vs Recipient Gets (Foreign) with switcher */}
          <Field label="Transfer Amount">

            <DualAmountFields
              foreign={state.wForeign}
              ghs={state.wGhs}
              rate={rate}
              foreignCurrency={state.wCurrency || "USD"}
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
              <span>Rate: 1 {state.wCurrency || "USD"} = GHS {rate}</span>
            </div>

            {/* Row-level error alert below the entire row */}
            {overBalance && (
              <div className="mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <InsufficientFundsAlert />
              </div>
            )}
</Field>

          {numForeign > 0 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* Who pays the charges */}
          <Field label="Charges">
            <Select value={state.wCharges} onValueChange={(val) => val && onChange("wCharges", val)}>
              <SelectTrigger >
                <SelectValue placeholder="Who pays for the charges" />
              </SelectTrigger>
              <SelectContent>
                {CHARGE_OPTIONS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="px-1 text-[12.5px] text-muted-foreground">
              {CHARGE_OPTIONS.find((c) => c.id === state.wCharges)?.note}
            </p>
</Field>

          {/* 4. Narration / Purpose of Payment */}
          <NarrationInput
            value={state.wPurpose}
            onChange={(val) => onChange("wPurpose", val)}
            label="Transaction Narration"
            placeholder="e.g. Commercial invoice, tuition fee, investment"
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
      )}
    </div>
  );
}
