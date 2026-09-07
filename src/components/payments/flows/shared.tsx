"use client";

import React, { useMemo, useRef } from "react";
import { Landmark, AlertCircle, CheckCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Account, formatMoney } from "@/lib/mock-data";

export const BANKS = [
  "GCB Bank",
  "Standard Bank Ghana",
  "Ecobank Ghana",
  "Absa Ghana",
  "Fidelity Bank",
  "Stanbic Bank Ghana",
  "CalBank",
  "CBG (Consolidated Bank Ghana)",
  "Access Bank",
  "Zenith Bank Ghana",
];

export const OTHER_BANKS = BANKS.filter((b) => !b.includes("GCB"));

export const NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money", "GCB Wallet"];

export type BundleItem = { id: string; name: string; val: string; price: number; network: string };

export const BUNDLES_BY_NETWORK: Record<string, BundleItem[]> = {
  "MTN Mobile Money": [
    { id: "m-1", name: "MTN 1GB Daily", val: "1 GB", price: 6, network: "MTN Mobile Money" },
    { id: "m-2", name: "MTN 2.5GB 3-Day", val: "2.5 GB", price: 15, network: "MTN Mobile Money" },
    { id: "m-3", name: "MTN 5GB Weekly", val: "5 GB", price: 30, network: "MTN Mobile Money" },
    { id: "m-4", name: "MTN 15GB Monthly", val: "15 GB", price: 80, network: "MTN Mobile Money" },
    { id: "m-5", name: "MTN 30GB Monthly", val: "30 GB", price: 150, network: "MTN Mobile Money" },
    { id: "m-6", name: "MTN 100GB Jumbo", val: "100 GB", price: 350, network: "MTN Mobile Money" },
  ],
  "Telecel Cash": [
    { id: "t-1", name: "Telecel 1.2GB Daily", val: "1.2 GB", price: 6, network: "Telecel Cash" },
    { id: "t-2", name: "Telecel 6GB Weekly", val: "6 GB", price: 30, network: "Telecel Cash" },
    { id: "t-3", name: "Telecel 20GB Monthly", val: "20 GB", price: 90, network: "Telecel Cash" },
    { id: "t-4", name: "Telecel 50GB Monthly", val: "50 GB", price: 200, network: "Telecel Cash" },
  ],
  "AT Money": [
    { id: "a-1", name: "AT Big Time 2GB", val: "2 GB", price: 10, network: "AT Money" },
    { id: "a-2", name: "AT Big Time 8GB", val: "8 GB", price: 35, network: "AT Money" },
    { id: "a-3", name: "AT Sika Kokoo 25GB", val: "25 GB", price: 100, network: "AT Money" },
  ],
  "GCB Wallet": [
    { id: "g-1", name: "GCB Data Pass 3GB", val: "3 GB", price: 15, network: "GCB Wallet" },
    { id: "g-2", name: "GCB Data Pass 10GB", val: "10 GB", price: 45, network: "GCB Wallet" },
  ],
};

export const GHANAIAN_NAMES = [
  "Ama Serwaa Mensah",
  "Kwame Boateng",
  "Kofi Osei Asante",
  "Akua Mansah",
  "Efua Addo Mensah",
  "Nana Yaw Osei",
  "Tsotsoo Mills Naa",
  "Abena Danso",
  "Esi Sutherland",
  "Kwadwo Appiah",
  "Yaw Frempong",
  "Adwoa Sarfo",
  "Kweku Baako",
  "Accra Fabrics Ltd",
  "Golden Coast Logistics Ltd",
];

export const ACCOUNT_RESOLUTIONS: Record<string, string> = {
  "023144558890": "Accra Fabrics Ltd",
  "0231 4455 8890": "Accra Fabrics Ltd",
  "01234567890": "Akua Mansah",
  "1234567890": "Akua Mansah",
  "0123456789012": "Tsotsoo Mills Naa",
  "0244123456": "Ama Serwaa Mensah",
  "0244 123 456": "Ama Serwaa Mensah",
  "0201987654": "Kwame Boateng",
  "0201 987 654": "Kwame Boateng",
  "0559220118": "Yaa Asantewaa",
  "0559 220 118": "Yaa Asantewaa",
  "0271445900": "Efua Mensah",
  "0271 445 900": "Efua Mensah",
  "1023445566": "Kofi Osei",
  "1023 4455 66": "Kofi Osei",
  "0277456789": "Kofi Boateng",
  "0277 456 789": "Kofi Boateng",
  "0244123821": "My Phone (Self)",
  "0244 123 821": "My Phone (Self)",
};

export function resolveAccountName(number: string, fallback: string = ""): string {
  const clean = number.replace(/[\s-]/g, "");
  if (!clean || clean.length < 8) return "";
  if (fallback && fallback.trim() && fallback !== "Verified Account Holder") return fallback;
  if (ACCOUNT_RESOLUTIONS[clean]) return ACCOUNT_RESOLUTIONS[clean];
  
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) % GHANAIAN_NAMES.length;
  }
  return GHANAIAN_NAMES[Math.abs(hash)] || "Ama Serwaa Mensah";
}

export function detectNetwork(phone: string): string {
  const c = phone.replace(/[\s-]/g, "");
  if (/^0(24|54|55|59|25)/.test(c)) return "MTN Mobile Money";
  if (/^0(20|50)/.test(c)) return "Telecel Cash";
  if (/^0(27|57|26)/.test(c)) return "AT Money";
  return "MTN Mobile Money";
}

export const RATES: Record<string, number> = {
  NGN: 0.0085,
  XOF: 0.021,
  KES: 0.096,
  ZAR: 0.68,
  EGP: 0.26,
};

/* -------------------------------------------------------------------------- */
/* Subcomponent 1: Account Select Trigger Content                             */
/* -------------------------------------------------------------------------- */
export function AccountSelectTriggerContent({
  account,
  placeholder = "Select account",
}: {
  account?: Account | null;
  placeholder?: string;
}) {
  if (!account) {
    return (
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Landmark size={19} strokeWidth={1.8} />
        </span>
        <span className="text-[15px] text-muted-foreground font-normal truncate">
          {placeholder}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between min-w-0 flex-1 gap-3">
      {/* Left: Icon + Account Name + Account Number */}
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Landmark size={19} strokeWidth={1.8} />
        </span>
        <div className="flex flex-col min-w-0 text-left gap-0.5">
          <span className="text-[15px] text-foreground font-medium tracking-[-0.01em] truncate leading-tight">
            {account.name}
          </span>
          <span className="text-[13px] text-muted-foreground font-normal truncate tabular leading-tight">
            {account.number}
          </span>
        </div>
      </div>

      {/* Right: Balance */}
      <div className="text-right shrink-0">
        <span className="text-[15px] text-foreground font-medium tabular tracking-tight">
          {formatMoney(account.available ?? 0, account.currency || "GHS", true)}
        </span>
      </div>
    </div>
  );
}

export function FromAccountSelector({
  accounts,
  value,
  onChange,
  label = "From Account",
  placeholder = "Select account",
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const selected = useMemo(
    () => accounts.find((a) => a.id === value),
    [accounts, value]
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[14px] font-medium text-foreground">{label}</label>
      <Select value={value} onValueChange={(val) => val && onChange(val)}>
        <SelectTrigger className="h-[68px] min-h-[68px] px-4 w-full rounded-2xl border border-border/80 bg-card hover:bg-muted/20 text-left cursor-pointer transition-colors shadow-none flex items-center">
          <AccountSelectTriggerContent
            account={selected}
            placeholder={placeholder}
          />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              <div className="flex items-center justify-between w-full gap-4">
                <span>{a.name} ({a.number})</span>
                <span className="font-medium text-muted-foreground tabular">
                  {formatMoney(a.available, a.currency, true)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 2: Amount Input                                               */
/* -------------------------------------------------------------------------- */
export function AmountInput({
  value,
  onChange,
  onFocus,
  currency = "GHS",
  label = "Amount",
}: {
  value: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  currency?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.focus();
    onFocus?.();
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[14px] font-medium text-foreground">{label}</label>
      <div
        onClick={handleClick}
        className="relative flex h-[68px] min-h-[68px] w-full items-center justify-center rounded-2xl border border-border/80 bg-card hover:bg-muted/10 transition-colors cursor-text px-4 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30"
      >
        <div className="inline-flex items-center justify-center gap-2">
          <span className="text-[17px] font-medium text-muted-foreground select-none">
            {currency}
          </span>
          <div className="relative inline-flex items-center">
            {/* Ghost text that perfectly sets the width of the input */}
            <span
              aria-hidden="true"
              className="text-[24px] font-semibold tracking-tight tabular opacity-0 pointer-events-none px-0.5 whitespace-pre"
            >
              {value || "0"}
            </span>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={value}
              onFocus={onFocus}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d.]/g, "");
                const parts = val.split(".");
                if (parts.length > 2) return;
                onChange(val);
                onFocus?.();
              }}
              placeholder="0"
              className="absolute inset-0 w-full h-full bg-transparent text-[24px] font-semibold text-foreground tracking-tight outline-none text-left tabular p-0 m-0 border-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 3: Narration Input                                            */
/* -------------------------------------------------------------------------- */
export function NarrationInput({
  value,
  onChange,
  label = "Narration",
  placeholder = "Enter narration",
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[14px] font-medium text-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 4: Category Select (Optional)                                 */
/* -------------------------------------------------------------------------- */
export function CategorySelect({
  value,
  onChange,
  label = "Transaction Category (Optional)",
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[14px] font-medium text-foreground">{label}</label>
      <Select value={value} onValueChange={(val) => onChange(val || "")}>
        <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="General">General</SelectItem>
          <SelectItem value="Savings">Savings</SelectItem>
          <SelectItem value="Family & Friends">Family & Friends</SelectItem>
          <SelectItem value="Living Expenses">Living Expenses</SelectItem>
          <SelectItem value="Business">Business</SelectItem>
          <SelectItem value="Utilities">Utilities</SelectItem>
          <SelectItem value="Rent">Rent</SelectItem>
          <SelectItem value="Other">Other</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 5: Insufficient Funds Alert                                   */
/* -------------------------------------------------------------------------- */
export function InsufficientFundsAlert({
  available,
  currency = "GHS",
}: {
  available: number;
  currency?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[12.5px] text-destructive animate-in fade-in duration-150 ease-out">
      <AlertCircle size={15} className="mt-0.5 shrink-0 text-destructive" />
      <div>
        <span className="font-semibold">Insufficient funds.</span> Transfer amount exceeds your available balance ({formatMoney(available, currency, true)}).
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 6: Proceed Button                                             */
/* -------------------------------------------------------------------------- */
export function ProceedButton({
  disabled,
  onClick,
  label = "Proceed",
}: {
  disabled: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <div className="pt-2">
      <Button
        type="button"
        className="w-full h-13 rounded-2xl text-[16px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 7: Verified Badge                                             */
/* -------------------------------------------------------------------------- */
export function VerifiedAccountBadge({ name }: { name: string }) {
  if (!name) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[13px] text-foreground">
      <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span className="font-medium text-foreground">{name}</span>
      <span className="text-[11.5px] text-emerald-600 dark:text-emerald-400 ml-auto font-medium">
        Verified
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 8: Collapsed Details Badge                                    */
/* -------------------------------------------------------------------------- */
export function CollapsedDetailsBadge({
  title,
  subtitle,
  onChange,
}: {
  title: string;
  subtitle?: string;
  onChange: () => void;
}) {
  return (
    <div className="flex h-[68px] min-h-[68px] items-center justify-between rounded-2xl border border-border/80 bg-muted/40 dark:bg-muted/20 px-4 py-2 transition-all animate-in fade-in duration-150 ease-out">
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Check size={15} strokeWidth={2.5} />
        </span>
        <div className="flex flex-col min-w-0 text-left gap-0.5">
          <span className="text-[15px] text-foreground font-medium tracking-[-0.01em] truncate leading-tight">
            {title}
          </span>
          {subtitle && (
            <span className="text-[13px] text-muted-foreground truncate leading-tight">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="text-[14px] font-medium text-primary hover:underline cursor-pointer ml-3 shrink-0"
      >
        Change
      </button>
    </div>
  );
}
