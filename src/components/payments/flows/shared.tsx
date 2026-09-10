"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Landmark, AlertCircle, CheckCircle2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Account, formatMoney } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { formatValueForDisplay, FormatOn, ThousandStyle } from "numora";
import { TextMorph } from "torph/react";

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

export interface PaymentMethodOption {
  id: string;
  name: string;
  shortName: string;
  description: string;
  speed: string;
  fee: number;
  feeText: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: "gip",
    name: "GhIPSS Instant Pay (GIP)",
    shortName: "GIP",
    description: "Instant (24/7) · Real-time interbank settlement",
    speed: "Instant",
    fee: 5.0,
    feeText: "GH₵5.00",
  },
  {
    id: "ach",
    name: "ACH Direct Credit",
    shortName: "ACH",
    description: "Standard clearing · Same day or next clearing cycle",
    speed: "Same day",
    fee: 12.5,
    feeText: "GH₵12.50",
  },
  {
    id: "ach-nrt",
    name: "ACH Near Real Time (NRT)",
    shortName: "ACH NRT",
    description: "Express clearing · Clears within 15–30 minutes",
    speed: "15–30 mins",
    fee: 8.0,
    feeText: "GH₵8.00",
  },
  {
    id: "rtgs",
    name: "RTGS (High Value Transfer)",
    shortName: "RTGS",
    description: "Real-time gross settlement · Bank hours only",
    speed: "1–2 hours",
    fee: 25.0,
    feeText: "GH₵25.00",
  },
];

export function getPaymentMethodName(id?: string): string {
  if (!id) return "GhIPSS Instant Pay (GIP)";
  const found = PAYMENT_METHODS.find((m) => m.id === id);
  return found?.name || id;
}

export interface DetailedFeeBreakdown {
  feeName: string;
  feeShortName: string;
  feeAmount: number;
  eLevyText: string;
  commissionText: string;
}

export function getDetailedFeeBreakdown({
  rail,
  bankCategory,
  paymentMethod,
  membersCount = 5,
}: {
  rail: string;
  bankCategory: string | null;
  paymentMethod?: string;
  membersCount?: number;
}): DetailedFeeBreakdown {
  if (rail === "bank") {
    if (bankCategory === "own") {
      return {
        feeName: "Internal Transfer Fee (Between My Accounts)",
        feeShortName: "GCB Internal",
        feeAmount: 0,
        eLevyText: "GH₵0.00 (Exempt)",
        commissionText: "GH₵0.00 (Waived)",
      };
    }
    if (bankCategory === "gcb") {
      return {
        feeName: "GCB Intra-bank Transfer Fee",
        feeShortName: "GCB Intra-bank",
        feeAmount: 0,
        eLevyText: "GH₵0.00 (Exempt)",
        commissionText: "GH₵0.00 (Waived)",
      };
    }
    const pm = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
    if (pm) {
      return {
        feeName: `${pm.name} Fee`,
        feeShortName: pm.shortName,
        feeAmount: pm.fee,
        eLevyText: "GH₵0.00 (Exempt)",
        commissionText: "GH₵0.00 (Waived)",
      };
    }
    return {
      feeName: "GhIPSS Instant Pay (GIP) Fee",
      feeShortName: "GIP",
      feeAmount: 5.0,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  if (rail === "ach") {
    const pm = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
    if (pm) {
      return {
        feeName: `${pm.name} Fee`,
        feeShortName: pm.shortName,
        feeAmount: pm.fee,
        eLevyText: "GH₵0.00 (Exempt)",
        commissionText: "GH₵0.00 (Waived)",
      };
    }
    return {
      feeName: "ACH Direct Credit Clearing Fee",
      feeShortName: "ACH",
      feeAmount: 12.5,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  if (rail === "wallet" || rail === "momo") {
    return {
      feeName: "Mobile Money Network Processing Fee",
      feeShortName: "Mobile Money",
      feeAmount: 0.5,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  if (rail === "wallet-to-bank") {
    return {
      feeName: "Wallet-to-Bank Interoperability Fee",
      feeShortName: "Interoperability",
      feeAmount: 0.5,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  if (rail === "proxy") {
    return {
      feeName: "Proxy Pay Routing Fee",
      feeShortName: "Proxy Pay",
      feeAmount: 0.5,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  if (rail === "group") {
    return {
      feeName: `Group Batch Transfer Fee (${membersCount} members × GH₵0.50)`,
      feeShortName: "Group Batch",
      feeAmount: 0.5 * membersCount,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  if (rail === "papss") {
    return {
      feeName: "PAPSS Cross-Border Settlement Fee",
      feeShortName: "PAPSS",
      feeAmount: 25.0,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  if (rail === "swift" || bankCategory === "international") {
    return {
      feeName: "SWIFT International Wire Processing Fee",
      feeShortName: "SWIFT Wire",
      feeAmount: 50.0,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  if (rail === "card-topup") {
    return {
      feeName: "Card Funding Convenience Fee",
      feeShortName: "Card Funding",
      feeAmount: 0,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  if (rail === "cardless") {
    return {
      feeName: "Cardless Token Generation Fee",
      feeShortName: "Cardless",
      feeAmount: 1.0,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  if (rail === "airtime" || rail === "data") {
    return {
      feeName: "Telco Airtime / Data Service Fee",
      feeShortName: "Telco Service",
      feeAmount: 0,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  if (rail === "bill" || rail === "ecg" || rail === "ghanagov") {
    return {
      feeName: "Biller Platform Convenience Fee",
      feeShortName: "Biller Platform",
      feeAmount: 0,
      eLevyText: "GH₵0.00 (Exempt)",
      commissionText: "GH₵0.00 (Waived)",
    };
  }

  return {
    feeName: "Payment Processing Fee",
    feeShortName: "Processing",
    feeAmount: 0,
    eLevyText: "GH₵0.00 (Exempt)",
    commissionText: "GH₵0.00 (Waived)",
  };
}

export const NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money", "GCB Wallet"];
export const TELCO_NETWORKS = ["MTN Ghana", "Telecel Ghana", "AT Ghana"] as const;

export function normalizeGhanaPhone(phone: string): string {
  let clean = phone.replace(/[\s-]/g, "");
  if (clean.startsWith("+233")) {
    clean = "0" + clean.slice(4);
  } else if (clean.startsWith("233") && clean.length > 9) {
    clean = "0" + clean.slice(3);
  }
  return clean;
}

export function detectTelcoNetwork(phone: string): { telcoName: string; walletName: string } | null {
  const clean = normalizeGhanaPhone(phone);
  if (/^0(24|54|55|59|25)/.test(clean)) {
    return { telcoName: "MTN Ghana", walletName: "MTN Mobile Money" };
  }
  if (/^0(20|50)/.test(clean)) {
    return { telcoName: "Telecel Ghana", walletName: "Telecel Cash" };
  }
  if (/^0(27|57|26|56)/.test(clean)) {
    return { telcoName: "AT Ghana", walletName: "AT Money" };
  }
  return null;
}

export function getTelcoLogo(networkName?: string): string | null {
  if (!networkName) return null;
  const lower = networkName.toLowerCase();
  if (lower.includes("mtn")) return "/mtn.png";
  if (lower.includes("at") || lower.includes("airteltigo")) return "/at.png";
  if (lower.includes("telecel") || lower.includes("vodafone")) return "/telecel.png";
  return null;
}

export function normalizeNetworkName(name?: string): string {
  if (!name) return "MTN Ghana";
  const lower = name.toLowerCase();
  if (lower.includes("mtn")) return "MTN Ghana";
  if (lower.includes("telecel") || lower.includes("vodafone")) return "Telecel Ghana";
  if (lower.includes("at") || lower.includes("airteltigo")) return "AT Ghana";
  return name;
}

export type BundleItem = { id: string; name: string; val: string; price: number; network: string };

const MTN_BUNDLES: BundleItem[] = [
  { id: "m-1", name: "MTN 1GB Daily", val: "1 GB", price: 6, network: "MTN Ghana" },
  { id: "m-2", name: "MTN 2.5GB 3-Day", val: "2.5 GB", price: 15, network: "MTN Ghana" },
  { id: "m-3", name: "MTN 5GB Weekly", val: "5 GB", price: 30, network: "MTN Ghana" },
  { id: "m-4", name: "MTN 15GB Monthly", val: "15 GB", price: 80, network: "MTN Ghana" },
  { id: "m-5", name: "MTN 30GB Monthly", val: "30 GB", price: 150, network: "MTN Ghana" },
  { id: "m-6", name: "MTN 100GB Jumbo", val: "100 GB", price: 350, network: "MTN Ghana" },
];

const TELECEL_BUNDLES: BundleItem[] = [
  { id: "t-1", name: "Telecel 1.2GB Daily", val: "1.2 GB", price: 6, network: "Telecel Ghana" },
  { id: "t-2", name: "Telecel 6GB Weekly", val: "6 GB", price: 30, network: "Telecel Ghana" },
  { id: "t-3", name: "Telecel 20GB Monthly", val: "20 GB", price: 90, network: "Telecel Ghana" },
  { id: "t-4", name: "Telecel 50GB Monthly", val: "50 GB", price: 200, network: "Telecel Ghana" },
];

const AT_BUNDLES: BundleItem[] = [
  { id: "a-1", name: "AT Big Time 2GB", val: "2 GB", price: 10, network: "AT Ghana" },
  { id: "a-2", name: "AT Big Time 8GB", val: "8 GB", price: 35, network: "AT Ghana" },
  { id: "a-3", name: "AT Sika Kokoo 25GB", val: "25 GB", price: 100, network: "AT Ghana" },
];

const GCB_BUNDLES: BundleItem[] = [
  { id: "g-1", name: "GCB Data Pass 3GB", val: "3 GB", price: 15, network: "GCB Wallet" },
  { id: "g-2", name: "GCB Data Pass 10GB", val: "10 GB", price: 45, network: "GCB Wallet" },
];

export const BUNDLES_BY_NETWORK: Record<string, BundleItem[]> = {
  "MTN Ghana": MTN_BUNDLES,
  "MTN Mobile Money": MTN_BUNDLES,
  "Telecel Ghana": TELECEL_BUNDLES,
  "Telecel Cash": TELECEL_BUNDLES,
  "AT Ghana": AT_BUNDLES,
  "AT Money": AT_BUNDLES,
  "GCB Wallet": GCB_BUNDLES,
};

export function getBundlesForNetwork(networkName?: string): BundleItem[] {
  if (!networkName) return MTN_BUNDLES;
  if (BUNDLES_BY_NETWORK[networkName]) return BUNDLES_BY_NETWORK[networkName];
  const normalized = normalizeNetworkName(networkName);
  return BUNDLES_BY_NETWORK[normalized] || MTN_BUNDLES;
}

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
  const detected = detectTelcoNetwork(phone);
  return detected ? detected.walletName : "MTN Mobile Money";
}

export const RATES: Record<string, number> = {
  USD: 15.4,
  GBP: 19.8,
  EUR: 16.7,
  CAD: 11.2,
  CNY: 2.15,
  AED: 4.19,
  AUD: 10.1,
  JPY: 0.10,
  NGN: 0.0098,
  XOF: 0.025,
  KES: 0.119,
  ZAR: 0.85,
  EGP: 0.32,
  RWF: 0.011,
  ZMW: 0.58,
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
        <SelectTrigger className="min-h-[68px] h-auto py-3 px-4 w-full rounded-2xl border border-border/80 bg-card hover:bg-muted/20 text-left cursor-pointer transition-colors shadow-none flex items-center">
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
/* Subcomponent 2: Animated Amount Input with Numora & Torph                  */
/* -------------------------------------------------------------------------- */
/** Upper ceiling for any amount entry: 900 billion. */
const MAX_AMOUNT = 900_000_000_000;

export function AmountInput({
  value,
  onChange,
  onFocus,
  currency = "GHS",
  label = "Enter amount",
  error,
  hasError,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  currency?: string;
  label?: string;
  error?: React.ReactNode;
  hasError?: boolean;
  disabled?: boolean;
}) {
  const isError = Boolean(error || hasError);
  const inputRef = useRef<HTMLInputElement>(null);
  // Ceiling: no amount may exceed 900 billion. This is a fat-finger / paste
  // guard, not a real transfer size — enforced at entry so the value can never
  // cross it, with a slight shake as the only nudge.
  const [nudge, setNudge] = useState(false);

  // Helper to format any raw or numeric string for display with thousand commas
  const getFormatted = (val: string) => {
    if (!val) return "";
    const res = formatValueForDisplay(val, 2, {
      formatOn: FormatOn.Change,
      thousandSeparator: ",",
      thousandStyle: ThousandStyle.Thousand,
    });
    return res.formatted;
  };

  const [displayValue, setDisplayValue] = useState(() => getFormatted(value));

  // Sync when parent component updates the value externally (e.g. form reset, preset amount)
  useEffect(() => {
    const currentRaw = displayValue.replace(/,/g, "");
    const nextRaw = (value || "").replace(/,/g, "");
    if (currentRaw !== nextRaw) {
      setDisplayValue(getFormatted(nextRaw));
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    // Strip any typed letters or invalid characters except digits and single decimal dot
    const cleanVal = inputEl.value.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
    const originalVal = cleanVal;
    const originalCursor = inputEl.selectionStart ?? originalVal.length;

    // Count how many raw characters (digits or dot) were before the cursor
    const rawBeforeCursor = originalVal.slice(0, originalCursor).replace(/,/g, "").length;

    const { formatted, raw } = formatValueForDisplay(originalVal, 2, {
      formatOn: FormatOn.Change,
      thousandSeparator: ",",
      thousandStyle: ThousandStyle.Thousand,
    });

    // Reject any edit that would push the amount past the ceiling. The
    // controlled input reverts to the previous display value on its own; we
    // just nudge with a slight shake so the block feels intentional.
    if (raw && parseFloat(raw) > MAX_AMOUNT) {
      setNudge(true);
      return;
    }

    // Compute exact cursor position in the formatted string
    let newCursor = 0;
    let rawCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (rawCount === rawBeforeCursor) {
        newCursor = i;
        break;
      }
      if (formatted[i] !== ",") {
        rawCount++;
      }
      newCursor = i + 1;
    }

    setDisplayValue(formatted);
    onChange(raw);

    // Restore caret position so cursor never jumps
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const inputEl = inputRef.current;
      if (!inputEl) return;
      const start = inputEl.selectionStart ?? 0;
      const end = inputEl.selectionEnd ?? 0;
      // When backspacing right after a comma, delete the preceding digit as well
      if (start === end && start > 1 && displayValue[start - 1] === ",") {
        e.preventDefault();
        const nextOriginal = displayValue.slice(0, start - 2) + displayValue.slice(start);
        const { formatted, raw } = formatValueForDisplay(nextOriginal, 2, {
          formatOn: FormatOn.Change,
          thousandSeparator: ",",
          thousandStyle: ThousandStyle.Thousand,
        });
        const targetCursor = Math.max(0, start - 2);
        setDisplayValue(formatted);
        onChange(raw);
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(targetCursor, targetCursor);
          }
        });
      }
    }
  };

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.focus();
    onFocus?.();
  };

  // Compute dynamic font size based on character count for low-overhead auto-scaling
  const numLength = (displayValue || "0").length;
  let fontSizeClass = "text-[26px]";
  let currencySizeClass = "text-[17px]";
  if (numLength > 15) {
    fontSizeClass = "text-[15px]";
    currencySizeClass = "text-[13px]";
  } else if (numLength > 12) {
    fontSizeClass = "text-[18px]";
    currencySizeClass = "text-[14px]";
  } else if (numLength > 9) {
    fontSizeClass = "text-[21px]";
    currencySizeClass = "text-[15px]";
  } else if (numLength > 7) {
    fontSizeClass = "text-[23px]";
    currencySizeClass = "text-[16px]";
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[14px] font-medium text-foreground">{label}</label>
      <div
        onClick={handleClick}
        onAnimationEnd={() => setNudge(false)}
        className={cn(
          "relative flex h-[68px] min-h-[68px] w-full items-center justify-center rounded-2xl border bg-card transition-colors px-4",
          nudge && "animate-amount-shake",
          disabled ? "bg-muted/30 cursor-not-allowed opacity-80" : "hover:bg-muted/10 cursor-text",
          isError
            ? "border-destructive/70 focus-within:border-destructive focus-within:ring-1 focus-within:ring-destructive/30"
            : "border-border/80 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30"
        )}
      >
        <div className="inline-flex items-center justify-center gap-2.5">
          <span
            className={cn(
              "font-medium select-none transition-colors transition-[font-size] duration-150",
              currencySizeClass,
              isError ? "text-destructive/80" : "text-muted-foreground"
            )}
          >
            {currency}
          </span>
          <div className="relative inline-flex items-center min-h-[36px]">
            {/* Ghost text that dynamically drives the width of the input wrapper */}
            <span
              aria-hidden="true"
              className={cn(
                "font-semibold tracking-tight tabular-nums opacity-0 pointer-events-none px-0.5 whitespace-pre select-none leading-none transition-[font-size] duration-150",
                fontSizeClass
              )}
            >
              {displayValue || "0"}
            </span>

            {/* Visible animated digit-morphing layer rendered by Torph TextMorph */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-0 flex items-center pointer-events-none whitespace-pre font-semibold tracking-tight tabular-nums select-none leading-none px-0.5 transition-[font-size] duration-150",
                fontSizeClass,
                isError
                  ? "text-destructive"
                  : displayValue
                  ? "text-foreground"
                  : "text-muted-foreground/35"
              )}
            >
              <TextMorph ease={{ stiffness: 400, damping: 30 }}>
                {displayValue || "0"}
              </TextMorph>
            </span>

            {/* Pure React controlled input: 100% deterministic, zero duplicate keystrokes, native IME, cursor & selection */}
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              disabled={disabled}
              readOnly={disabled}
              value={displayValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              aria-label={label}
              className={cn(
                "numorainput absolute inset-0 w-full h-full m-0 p-0 border-0 bg-transparent text-transparent placeholder-transparent outline-none focus:outline-none font-semibold tracking-tight tabular-nums px-0.5 leading-none selection:bg-primary/25 transition-[font-size] duration-150",
                disabled && "pointer-events-none",
                fontSizeClass,
                isError ? "caret-destructive" : "caret-primary"
              )}
            />
          </div>
        </div>
      </div>
      {error && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-150">
          {error}
        </div>
      )}
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
  label = "Transaction Category",
  defaultCategory,
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  defaultCategory?: string;
}) {
  const currentValue = value || defaultCategory || "Other";

  useEffect(() => {
    if (!value && defaultCategory) {
      onChange(defaultCategory);
    }
  }, [value, defaultCategory, onChange]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[14px] font-medium text-foreground">{label}</label>
        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
          Pre-selected for Insights
        </span>
      </div>
      <Select value={currentValue} onValueChange={(val) => onChange(val || "")}>
        <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Bills">Bills</SelectItem>
          <SelectItem value="Data">Data</SelectItem>
          <SelectItem value="Education">Education</SelectItem>
          <SelectItem value="Food">Food</SelectItem>
          <SelectItem value="Household">Household</SelectItem>
          <SelectItem value="Savings">Savings</SelectItem>
          <SelectItem value="Transport">Transport</SelectItem>
          <SelectItem value="Donations">Donations</SelectItem>
          <SelectItem value="Family & Friends">Family & Friends</SelectItem>
          <SelectItem value="Entertainment">Entertainment</SelectItem>
          <SelectItem value="Health">Health</SelectItem>
          <SelectItem value="Remittances">Remittances</SelectItem>
          <SelectItem value="Shopping">Shopping</SelectItem>
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
    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[13px] text-foreground animate-in fade-in duration-150">
      <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span className="font-medium text-foreground">{name}</span>
      <span className="text-[11.5px] text-emerald-600 dark:text-emerald-400 ml-auto font-medium">
        Verified
      </span>
    </div>
  );
}

export function ResolvingAccountBadge({
  message = "Verifying account holder details...",
}: {
  message?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-[12.5px] text-muted-foreground animate-pulse">
      <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 8: Collapsed Details Badge                                    */
/* -------------------------------------------------------------------------- */
export function CollapsedDetailsBadge({
  title,
  subtitle,
  icon,
  onChange,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onChange: () => void;
}) {
  return (
    <div className="flex h-[68px] min-h-[68px] items-center justify-between rounded-2xl border border-border/80 bg-muted/40 dark:bg-muted/20 px-4 py-2 transition-all animate-in fade-in duration-150 ease-out">
      <div className="flex items-center gap-3.5 min-w-0">
        {icon ? (
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/60 border border-black/5 dark:border-white/10 overflow-hidden p-0">
            {icon}
            <span className="absolute bottom-0 right-0 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white ring-1 ring-background shadow-xs">
              <Check size={10} strokeWidth={3} />
            </span>
          </div>
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Check size={18} strokeWidth={2.5} />
          </span>
        )}
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
        className="text-[14px] font-medium text-foreground hover:underline cursor-pointer ml-3 shrink-0"
      >
        Change
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 9: Save Beneficiary Checkbox                                  */
/* -------------------------------------------------------------------------- */
export function SaveBeneficiaryCheckbox({
  checked,
  onChange,
  nickname,
  onNicknameChange,
  label = "Save as beneficiary",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  nickname?: string;
  onNicknameChange?: (val: string) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4.5 rounded-[5px] border-border text-foreground focus:ring-ring/30 accent-foreground cursor-pointer"
        />
        <span className="text-[14px] font-medium text-foreground">
          {label}
        </span>
      </label>
      {checked && onNicknameChange && (
        <div className="pl-7 animate-in fade-in slide-in-from-top-1 duration-150">
          <input
            type="text"
            value={nickname || ""}
            onChange={(e) => onNicknameChange(e.target.value)}
            placeholder="Beneficiary nickname (optional)"
            className="h-11 w-full rounded-xl border border-border/80 bg-card px-3.5 text-[14px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all placeholder:text-muted-foreground"
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 10: Schedule Payment Section                                  */
/* -------------------------------------------------------------------------- */
export type ScheduleFrequency = "once" | "daily" | "weekly" | "monthly";

export interface ScheduleState {
  enabled: boolean;
  startDate: string; // YYYY-MM-DD
  frequency: ScheduleFrequency;
  endDate?: string;
}

export function SchedulePaymentSection({
  state,
  onChange,
}: {
  state: ScheduleState;
  onChange: (updates: Partial<ScheduleState>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-foreground">Schedule Payment</span>
          <span className="text-[12.5px] text-muted-foreground">
            Set up a future date or recurring transfer
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted-foreground/25 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary dark:border-gray-600"></div>
        </label>
      </div>

      {state.enabled && (
        <div className="flex flex-col gap-3 pt-2 border-t border-border/60 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Execution Date</label>
              <input
                type="date"
                value={state.startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => onChange({ startDate: e.target.value })}
                className="h-11 w-full rounded-xl border border-border/80 bg-background px-3 text-[14px] text-foreground outline-none focus:border-ring tabular"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">Frequency</label>
              <Select
                value={state.frequency}
                onValueChange={(val) => onChange({ frequency: (val || "once") as ScheduleFrequency })}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border border-border/80 bg-background text-[14px]">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">One-off (Single Run)</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


