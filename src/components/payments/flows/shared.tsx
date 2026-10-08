"use client";

import { InlineError } from "@/components/ui/inline-error";
import React, { useMemo, useRef, useState, useEffect } from "react";
import { ArrowLeftRight, Landmark, AlertCircle, CheckCircle2, User } from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
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
import { OperatorLogo } from "@/components/ui/operator-logo";
import { OPERATORS, OPERATOR_IDS, operatorFromName, telcoName, type Operator } from "@/lib/operators";
import { formatValueForDisplay, FormatOn, ThousandStyle } from "numora";
import { TextMorph } from "torph/react";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
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
    feeText: "GHS 5.00",
  },
  {
    id: "ach",
    name: "ACH Direct Credit",
    shortName: "ACH",
    description: "Standard clearing · Same day or next clearing cycle",
    speed: "Same day",
    fee: 12.5,
    feeText: "GHS 12.50",
  },
  {
    id: "ach-nrt",
    name: "ACH Near Real Time (NRT)",
    shortName: "ACH NRT",
    description: "Express clearing · Clears within 15–30 minutes",
    speed: "15–30 mins",
    fee: 8.0,
    feeText: "GHS 8.00",
  },
  {
    id: "rtgs",
    name: "RTGS (High Value Transfer)",
    shortName: "RTGS",
    description: "Real-time gross settlement · Bank hours only",
    speed: "1–2 hours",
    fee: 25.0,
    feeText: "GHS 25.00",
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
        eLevyText: "GHS 0.00 (Exempt)",
        commissionText: "GHS 0.00 (Waived)",
      };
    }
    if (bankCategory === "gcb") {
      return {
        feeName: "GCB Intra-bank Transfer Fee",
        feeShortName: "GCB Intra-bank",
        feeAmount: 0,
        eLevyText: "GHS 0.00 (Exempt)",
        commissionText: "GHS 0.00 (Waived)",
      };
    }
    const pm = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
    if (pm) {
      return {
        feeName: `${pm.name} Fee`,
        feeShortName: pm.shortName,
        feeAmount: pm.fee,
        eLevyText: "GHS 0.00 (Exempt)",
        commissionText: "GHS 0.00 (Waived)",
      };
    }
    return {
      feeName: "GhIPSS Instant Pay (GIP) Fee",
      feeShortName: "GIP",
      feeAmount: 5.0,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  if (rail === "ach") {
    const pm = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
    if (pm) {
      return {
        feeName: `${pm.name} Fee`,
        feeShortName: pm.shortName,
        feeAmount: pm.fee,
        eLevyText: "GHS 0.00 (Exempt)",
        commissionText: "GHS 0.00 (Waived)",
      };
    }
    return {
      feeName: "ACH Direct Credit Clearing Fee",
      feeShortName: "ACH",
      feeAmount: 12.5,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  if (rail === "wallet" || rail === "momo") {
    return {
      feeName: "Mobile Money Network Processing Fee",
      feeShortName: "Mobile Money",
      feeAmount: 0.5,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  if (rail === "wallet-to-bank") {
    return {
      feeName: "Wallet-to-Bank Interoperability Fee",
      feeShortName: "Interoperability",
      feeAmount: 0.5,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  if (rail === "proxy") {
    return {
      feeName: "Proxy Pay Routing Fee",
      feeShortName: "Proxy Pay",
      feeAmount: 0.5,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  if (rail === "group") {
    return {
      feeName: `Group Batch Transfer Fee (${membersCount} members × GHS 0.50)`,
      feeShortName: "Group Batch",
      feeAmount: 0.5 * membersCount,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  if (rail === "papss") {
    return {
      feeName: "PAPSS Cross-Border Settlement Fee",
      feeShortName: "PAPSS",
      feeAmount: 25.0,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  if (rail === "swift" || bankCategory === "international") {
    return {
      feeName: "SWIFT International Wire Processing Fee",
      feeShortName: "SWIFT Wire",
      feeAmount: 50.0,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  if (rail === "card-topup") {
    return {
      feeName: "Card Funding Convenience Fee",
      feeShortName: "Card Funding",
      feeAmount: 0,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  if (rail === "cardless") {
    return {
      feeName: "Cardless Token Generation Fee",
      feeShortName: "Cardless",
      feeAmount: 1.0,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  if (rail === "airtime" || rail === "data") {
    return {
      feeName: "Telco Airtime / Data Service Fee",
      feeShortName: "Telco Service",
      feeAmount: 0,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  if (rail === "bill" || rail === "ecg" || rail === "ghanagov") {
    return {
      feeName: "Biller Platform Convenience Fee",
      feeShortName: "Biller Platform",
      feeAmount: 0,
      eLevyText: "GHS 0.00 (Exempt)",
      commissionText: "GHS 0.00 (Waived)",
    };
  }

  return {
    feeName: "Payment Processing Fee",
    feeShortName: "Processing",
    feeAmount: 0,
    eLevyText: "GHS 0.00 (Exempt)",
    commissionText: "GHS 0.00 (Waived)",
  };
}

/** Wallet names, then the bank's own wallet. The networks come from `lib/operators.ts`. */
export const NETWORKS = [...OPERATOR_IDS.map((id) => OPERATORS[id].wallet), "GCB Wallet"];
/** The lines a number can be on. */
export const TELCO_NETWORKS: readonly string[] = OPERATOR_IDS.map((id) => OPERATORS[id].telco);

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
    return { telcoName: OPERATORS.MTN.telco, walletName: OPERATORS.MTN.wallet };
  }
  if (/^0(20|50)/.test(clean)) {
    return { telcoName: OPERATORS.Telecel.telco, walletName: OPERATORS.Telecel.wallet };
  }
  if (/^0(27|57|26|56)/.test(clean)) {
    return { telcoName: OPERATORS.AT.telco, walletName: OPERATORS.AT.wallet };
  }
  return null;
}

/** The line a name belongs to ("MTN Mobile Money" and "MTN" both become "MTN Ghana"). */
export function normalizeNetworkName(name?: string): string {
  return telcoName(name);
}

/** What the collapsed details badge shows for a network: its round mark, or nothing when it isn't one of ours. */
export function operatorBadgeIcon(name?: string | null): React.ReactNode {
  return operatorFromName(name) ? <OperatorLogo name={name} size={36} className="border-0" /> : undefined;
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

/**
 * Broadband plans (the Internet rail's "Broadband" path), grouped the way the providers sell them. `label` is the short
 * name on the tile; `name` is the full name used on the review, receipt and ledger.
 *
 * MTN Fibre: unlimited monthly plans, GHS 299, 444 and 999 for 100, 300 and 500 Mbps (MTN Ghana, 17 June 2026).
 * MTN TurboNet: data for the TurboNet router, 30 days with rollover (MTN Ghana plan list, January 2025).
 * Telecel: the Monthly Core plans, the One Family shared-data plans and the Unlimited passes (Telecel plan listings,
 * updated March 2026). Telecel's smaller add-ons (Mini, Bolt-on) and the Flexi pay-what-you-like bundles are not here yet:
 * their validity and tiers were not confirmed. [ASSUMPTION: re-check every price with the providers before launch.]
 */
export type BroadbandPackage = BundleItem & { group: string; label: string; duration: string };

const pkg = (id: string, network: string, brand: string, group: string, label: string, price: number, duration: string): BroadbandPackage => ({
  id,
  network,
  group,
  label,
  val: label,
  name: `${brand} ${label}`,
  price,
  duration,
});

const MTN_BROADBAND: BroadbandPackage[] = [
  pkg("bb-mtn-fibre-100", "MTN Ghana", "MTN Fibre", "Fibre", "100 Mbps", 299, "30 days"),
  pkg("bb-mtn-fibre-300", "MTN Ghana", "MTN Fibre", "Fibre", "300 Mbps", 444, "30 days"),
  pkg("bb-mtn-fibre-500", "MTN Ghana", "MTN Fibre", "Fibre", "500 Mbps", 999, "30 days"),
  pkg("bb-mtn-turbo-4", "MTN Ghana", "MTN TurboNet", "TurboNet", "4.3 GB", 43, "30 days"),
  pkg("bb-mtn-turbo-9", "MTN Ghana", "MTN TurboNet", "TurboNet", "8.7 GB", 87, "30 days"),
  pkg("bb-mtn-turbo-92", "MTN Ghana", "MTN TurboNet", "TurboNet", "91.8 GB", 253, "30 days"),
  pkg("bb-mtn-turbo-351", "MTN Ghana", "MTN TurboNet", "TurboNet", "350.5 GB", 516, "30 days"),
];

const TELECEL_BROADBAND: BroadbandPackage[] = [
  pkg("bb-tel-browser", "Telecel Ghana", "Telecel", "Monthly Plans", "Browser", 120, "30 days"),
  pkg("bb-tel-streamer", "Telecel Ghana", "Telecel", "Monthly Plans", "Streamer", 220, "30 days"),
  pkg("bb-tel-webmaster", "Telecel Ghana", "Telecel", "Monthly Plans", "Webmaster", 270, "30 days"),
  pkg("bb-tel-downloader", "Telecel Ghana", "Telecel", "Monthly Plans", "Downloader", 410, "30 days"),
  pkg("bb-tel-office", "Telecel Ghana", "Telecel", "Monthly Plans", "Office", 680, "30 days"),
  pkg("bb-tel-family-s", "Telecel Ghana", "Telecel One Family", "One Family", "Small", 180, "30 days"),
  pkg("bb-tel-family-m", "Telecel Ghana", "Telecel One Family", "One Family", "Medium", 330, "30 days"),
  pkg("bb-tel-family-l", "Telecel Ghana", "Telecel One Family", "One Family", "Large", 550, "30 days"),
  pkg("bb-tel-family-xl", "Telecel Ghana", "Telecel One Family", "One Family", "Extra Large", 1045, "30 days"),
  pkg("bb-tel-unl-day", "Telecel Ghana", "Telecel Unlimited", "Unlimited Passes", "Daily", 40, "24 hours"),
  pkg("bb-tel-unl-weekend", "Telecel Ghana", "Telecel Unlimited", "Unlimited Passes", "Weekend", 30, "2 days"),
];

/**
 * The broadband products, in the order they are offered. Each one has its own account (the field label and the rule it
 * is checked against) and its own packages. `packageGroups` limits a product to some of its network's plan groups.
 *
 * [ASSUMPTION] The Telecel user ID rule (8 to 20 letters or numbers) is a placeholder until Telecel confirms its format.
 * The MTN Fibre rule is likewise a guess until MTN confirms its account number format.
 */
export type BroadbandProvider = {
  name: string;
  packageGroups?: readonly string[];
  accountLabel: string;
  accountPlaceholder: string;
  accountError: string;
  maxLength: number;
  inputMode: "numeric" | "text";
  sanitize: (raw: string) => string;
  isValid: (clean: string) => boolean;
  /** Set when the account only shows the package it is on now, not the whole catalogue. */
  activePackageFor?: (clean: string) => BroadbandPackage | undefined;
  activeDueDate?: (clean: string) => string;
};

/**
 * The Telecel package each user ID is on right now. [MOCK] Pinned IDs are listed; any other ID resolves to one of the
 * Telecel plans by hash, so every demo user has an active package. Replace with the provider's lookup.
 */
const TELECEL_ACTIVE_PACKAGE_IDS: Record<string, string> = {
  TEL12345678: "bb-tel-family-m",
};

/** When the active Telecel package is next due, as an ISO date. [MOCK] Two to twenty-six days from today, by user ID. */
export function activeTelecelDueDate(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 25;
  }
  const due = new Date();
  due.setDate(due.getDate() + 2 + Math.abs(hash));
  return due.toISOString();
}

export function activeTelecelPackage(userId: string): BroadbandPackage | undefined {
  const pinned = TELECEL_ACTIVE_PACKAGE_IDS[userId];
  if (pinned) return TELECEL_BROADBAND.find((p) => p.id === pinned);
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % TELECEL_BROADBAND.length;
  }
  return TELECEL_BROADBAND[Math.abs(hash)];
}

export const BROADBAND_PROVIDERS: readonly BroadbandProvider[] = [
  {
    name: "MTN TurboNet",
    packageGroups: ["TurboNet"],
    accountLabel: "Paired Mobile Number",
    accountPlaceholder: "Enter your mobile number",
    accountError: "Enter the 10-digit mobile number paired to your router.",
    maxLength: 10,
    inputMode: "numeric",
    sanitize: (raw) => raw.replace(/\D/g, ""),
    isValid: (clean) => /^0\d{9}$/.test(clean),
  },
  {
    name: "MTN Fibre",
    packageGroups: ["Fibre"],
    accountLabel: "Fibre Account Number",
    accountPlaceholder: "Enter your account number",
    accountError: "Enter a valid Fibre account number (8 to 16 letters or numbers).",
    maxLength: 16,
    inputMode: "text",
    sanitize: (raw) => raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
    isValid: (clean) => /^[A-Z0-9]{8,16}$/.test(clean),
  },
  {
    name: "Telecel Broadband",
    accountLabel: "User ID",
    accountPlaceholder: "Enter your user ID",
    accountError: "Enter a valid Telecel user ID (8 to 20 letters or numbers).",
    maxLength: 20,
    inputMode: "text",
    sanitize: (raw) => raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
    isValid: (clean) => /^[A-Z0-9]{8,20}$/.test(clean),
    activePackageFor: activeTelecelPackage,
    activeDueDate: activeTelecelDueDate,
  },
];

export function getBroadbandProvider(name?: string): BroadbandProvider | undefined {
  return BROADBAND_PROVIDERS.find((p) => p.name === name);
}

/** The packages a broadband product sells. `name` is the product (for example "MTN Fibre"), not the network. */
export function getBroadbandPackages(providerName?: string): BroadbandPackage[] {
  const provider = getBroadbandProvider(providerName);
  if (!provider) return [];
  const network = operatorFromName(provider.name) === "MTN" ? MTN_BROADBAND : TELECEL_BROADBAND;
  return provider.packageGroups ? network.filter((p) => provider.packageGroups?.includes(p.group)) : network;
}

/** The mock name enquiry's pool: any account or phone number that isn't pinned below resolves to one of these. */
export const GHANAIAN_NAMES = [
  "Ransford Gyasi",
  "Elias Ayettey",
  "Ishmael Gyan",
  "Justice Oduro",
  "Reuben Abuga-Williams",
  "Tsotsoo Mills",
  "Samuel Quartey",
  "Kofi Boateng",
  "Kelvin Oso",
];

/** Numbers pinned to a name (with and without spaces), so the demo flows resolve the same person every time. */
export const ACCOUNT_RESOLUTIONS: Record<string, string> = {
  "023144558890": "Justice Oduro",
  "0231 4455 8890": "Justice Oduro",
  "01234567890": "Elias Ayettey",
  "1234567890": "Elias Ayettey",
  "0123456789012": "Samuel Quartey",
  "0244123456": "Ransford Gyasi",
  "0244 123 456": "Ransford Gyasi",
  "0201987654": "Ishmael Gyan",
  "0201 987 654": "Ishmael Gyan",
  "0559220118": "Tsotsoo Mills",
  "0559 220 118": "Tsotsoo Mills",
  "0271445900": "Reuben Abuga-Williams",
  "0271 445 900": "Reuben Abuga-Williams",
  "1023445566": "Kelvin Oso",
  "1023 4455 66": "Kelvin Oso",
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
  return GHANAIAN_NAMES[Math.abs(hash)] || "Ransford Gyasi";
}

export function detectNetwork(phone: string): string {
  const detected = detectTelcoNetwork(phone);
  return detected ? detected.walletName : "MTN Mobile Money";
}

export const RATES: Record<string, number> = {
  USD: 15.4,
  CHF: 17.5,
  SEK: 1.45,
  NOK: 1.42,
  DKK: 2.24,
  NZD: 9.3,
  INR: 0.185,
  BRL: 2.8,
  MXN: 0.8,
  SGD: 11.5,
  HKD: 1.98,
  KRW: 0.0115,
  TRY: 0.45,
  SAR: 4.1,
  QAR: 4.23,
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
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="flex size-9 shrink-0 items-center justify-center text-muted-foreground">
          <Landmark size={20} strokeWidth={1.8} className="shrink-0" />
        </span>
        <span className="text-[14px] text-muted-foreground font-normal truncate">
          {placeholder}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between min-w-0 flex-1 gap-3">
      {/* Left: Icon + Account Name + Account Number */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex size-9 shrink-0 items-center justify-center text-foreground">
          <Landmark size={20} strokeWidth={1.8} className="shrink-0" />
        </span>
        <div className="flex flex-col min-w-0 text-left gap-0.5">
          <span className="text-[14.5px] text-foreground font-medium tracking-[-0.01em] truncate leading-tight">
            {account.name}
          </span>
          <span className="text-[12.5px] text-muted-foreground font-normal truncate tabular leading-tight">
            {account.number}
          </span>
        </div>
      </div>

      {/* Right: Balance */}
      <div className="text-right shrink-0">
        <span className="text-[14.5px] text-foreground font-medium tabular tracking-tight">
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
    <Field label={label}>
      <Select value={value} onValueChange={(val) => val && onChange(val)}>
        <SelectTrigger className="h-[58px] min-h-[58px] text-left cursor-pointer flex items-center">
          <AccountSelectTriggerContent
            account={selected}
            placeholder={placeholder}
          />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id} className="py-2.5">
              <AccountSelectTriggerContent account={a} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
</Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Two-way amount: what you send (GHS) and what they get (their currency)      */
/* -------------------------------------------------------------------------- */
const asNumber = (v: string) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;

/**
 * "You send" and "Recipient gets", linked by the rate. Whichever box the customer
 * types in is the source of truth and keeps exactly what they typed; the other is
 * worked out from it. (Deriving both from one stored value rewrote the box under
 * their fingers: typing 22 became 22.02.) Typing GHS rounds the recipient's amount
 * down, so they are never promised more than was paid.
 *
 * `ghs` is "" while the foreign box is the source; `onChange` always gets both.
 */
export function DualAmountFields({
  foreign,
  ghs,
  rate,
  foreignCurrency,
  sendCurrency = "GHS",
  onChange,
  onFocus,
  hasError,
}: {
  foreign: string;
  ghs: string;
  rate: number;
  foreignCurrency: string;
  sendCurrency?: string;
  onChange: (next: { foreign: string; ghs: string }) => void;
  onFocus?: () => void;
  hasError?: boolean;
}) {
  const numForeign = asNumber(foreign);
  const ghsShown = ghs !== "" ? ghs : numForeign > 0 ? String(Math.round(numForeign * rate * 100) / 100) : "";

  return (
    <div className="relative grid grid-cols-1 items-center gap-3 md:grid-cols-2">
      <AmountInput
        value={ghsShown}
        onChange={(val) => {
          const n = asNumber(val);
          const recipientGets = n > 0 && rate > 0 ? String(Math.floor((n / rate) * 100 + 1e-9) / 100) : "";
          onChange({ ghs: val, foreign: recipientGets });
        }}
        currency={sendCurrency}
        label="You Send"
        onFocus={onFocus}
        hasError={hasError}
      />

      <div className="absolute left-1/2 top-[calc(50%+14px)] z-10 hidden -translate-x-1/2 -translate-y-1/2 md:flex">
        <div className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm">
          <ArrowLeftRight size={15} strokeWidth={2} />
        </div>
      </div>

      <AmountInput
        value={foreign}
        onChange={(val) => onChange({ foreign: val, ghs: "" })}
        currency={foreignCurrency}
        label="Recipient Gets"
        onFocus={onFocus}
        hasError={hasError}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 2: Animated Amount Input with Numora & Torph                  */
/* -------------------------------------------------------------------------- */
/** Upper ceiling for any amount entry: 900 billion. */
const MAX_AMOUNT = 900_000_000_000;

/** Formats a raw or numeric string for display with thousands commas. */
function getFormatted(val: string): string {
  if (!val) return "";
  return formatValueForDisplay(val, 2, {
    formatOn: FormatOn.Change,
    thousandSeparator: ",",
    thousandStyle: ThousandStyle.Thousand,
  }).formatted;
}

export function AmountInput({
  value,
  onChange,
  onFocus,
  currency = "GHS",
  label = "Enter Amount",
  error,
  hasError,
  disabled,
  onNext,
  enterKeyHint = "next",
}: {
  value: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  onNext?: () => void;
  currency?: string;
  label?: string;
  error?: React.ReactNode;
  hasError?: boolean;
  disabled?: boolean;
  enterKeyHint?: "next" | "done" | "go" | "search" | "send" | "enter" | "previous";
}) {
  const isError = Boolean(error || hasError);
  const inputRef = useRef<HTMLInputElement>(null);
  // Ceiling: no amount may exceed 900 billion. This is a fat-finger / paste
  // guard, not a real transfer size — enforced at entry so the value can never
  // cross it, with a slight shake as the only nudge.
  const [nudge, setNudge] = useState(false);

  const [displayValue, setDisplayValue] = useState(() => getFormatted(value));

  // Sync when parent component updates the value externally (e.g. form reset, preset amount)
  useEffect(() => {
    const nextRaw = (value || "").replace(/,/g, "");
    setDisplayValue((current) => (current.replace(/,/g, "") !== nextRaw ? getFormatted(nextRaw) : current));
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
    if (e.key === "Enter") {
      e.preventDefault();
      if (onNext) {
        onNext();
        return;
      }
      // Locate the narration input within the current flow or page container
      const container =
        inputRef.current?.closest("form") ||
        inputRef.current?.closest(".animate-in") ||
        inputRef.current?.closest(".page-stagger") ||
        document;
      const narrationEl = container.querySelector<HTMLInputElement>(
        'input[data-field="narration"], input[data-narration="true"], input[name="narration"], input[placeholder*="narration" i]'
      );

      if (narrationEl) {
        narrationEl.focus();
        narrationEl.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        // No narration field found; dismiss keyboard so CTA is visible
        inputRef.current?.blur();
        setTimeout(() => {
          const cta = document.querySelector<HTMLElement>(
            'button[data-proceed-cta="true"], .proceed-btn, button[type="submit"]'
          );
          if (cta) {
            cta.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }, 120);
      }
      return;
    }

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
    <Field label={label}>
      <div
        onClick={handleClick}
        onAnimationEnd={() => setNudge(false)}
        className={cn(
          "relative flex h-[68px] min-h-[68px] w-full items-center justify-center rounded-2xl border bg-field transition-colors px-4",
          nudge && "animate-amount-shake",
          disabled ? "bg-muted/30 cursor-not-allowed opacity-80" : "hover:bg-field-hover cursor-text",
          isError
            ? "border-destructive focus-within:border-destructive focus-within:ring-1 focus-within:ring-destructive"
            : "border-field-border focus-within:border-field-border-focus focus-within:bg-field-focus focus-within:ring-1 focus-within:ring-field-border-focus"
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
              enterKeyHint={enterKeyHint}
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
</Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 3: Narration Input                                            */
/* -------------------------------------------------------------------------- */
export function NarrationInput({
  value,
  onChange,
  onDone,
  label = "Narration",
  placeholder = "Enter narration",
}: {
  value: string;
  onChange: (val: string) => void;
  onDone?: () => void;
  label?: string;
  placeholder?: string;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Dismiss the virtual keyboard automatically
      e.currentTarget.blur();
      onDone?.();
      // Smoothly bring CTA into view after keyboard collapses
      setTimeout(() => {
        const cta = document.querySelector<HTMLElement>(
          'button[data-proceed-cta="true"], .proceed-btn, button[type="submit"]'
        );
        if (cta) {
          cta.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 120);
    }
  };

  return (
    <Field label={label}>
      <Input
        type="text"
        data-field="narration"
        data-narration="true"
        enterKeyHint="done"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        
      />
</Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 4: Category Select (Optional)                                 */
/* -------------------------------------------------------------------------- */
export function CategorySelect({
  value,
  onChange,
  label = "Transaction Category",
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}) {
  return (
    <Field label={label}>
      <Select value={value || null} onValueChange={(val) => onChange(val || "")}>
        <SelectTrigger >
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
</Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 5: Insufficient Funds Alert                                   */
/* -------------------------------------------------------------------------- */
export function InsufficientFundsAlert() {
  // Sits right under the amount field (it's about what was just typed), not in a toast.
  return (
    <InlineError
      message="Exceeds your current balance."
      className="text-left"
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 6: Proceed Button                                             */
/* -------------------------------------------------------------------------- */
export function ProceedButton({
  disabled,
  onClick,
  label = "Proceed",
  loading = false,
}: {
  disabled: boolean;
  onClick: () => void;
  label?: string;
  loading?: boolean;
}) {
  return (
    <div className="pt-2">
      <Button
        type="button"
        data-proceed-cta="true"
        className="w-full h-13 rounded-2xl text-[16px] bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
        disabled={disabled}
        loading={loading}
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
    <div className="flex items-center justify-between gap-3 py-2.5 animate-in fade-in duration-150">
      <span className="min-w-0 truncate text-[14px] text-foreground">{name}</span>
      <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-success-text">
        <CheckCircle2 size={14} strokeWidth={1.9} className="shrink-0" aria-hidden="true" />
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
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-[12.5px] text-muted-foreground">
      <AppLoader size={14} className="text-muted-foreground shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Subcomponent 8: Collapsed Details Badge                                    */
/* -------------------------------------------------------------------------- */
/** Ghana numbers grouped for reading back: 0XX XXX XXXX (or +233 XX XXX XXXX). Anything else as typed. */
export function formatGhPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("0")) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  if (d.length === 12 && d.startsWith("233")) return `+233 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return raw;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/**
 * The recipient, collapsed once chosen — the answer to "is this definitely the
 * right person?" before money moves.
 *
 * `nameCheck` says whether the name came back from the provider's lookup
 * (name enquiry), and who did it. It only claims what's true: a confirmed name gets a quiet tick
 * (its tooltip says who confirmed it); an unconfirmed one says so and asks for a check.
 * Recipients the app already knows (own accounts, cards, groups) pass nothing
 * and show no status.
 */
export function CollapsedDetailsBadge({
  title,
  subtitle,
  icon,
  nameCheck,
  onChange,
}: {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  nameCheck?: { confirmed: boolean; by?: string };
  onChange: () => void;
}) {
  const initials = initialsOf(title);
  return (
    <div className="flex min-h-[58px] items-center justify-between gap-3 rounded-2xl border border-field-border bg-field px-3.5 py-2.5 transition-colors animate-in fade-in duration-150 ease-out hover:bg-field-hover">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center text-foreground">
            {icon}
          </span>
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[12.5px] text-muted-foreground">
            {initials || <User size={16} strokeWidth={1.8} aria-hidden="true" />}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-0.5 text-left">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[14.5px] font-medium leading-tight tracking-[-0.01em] text-foreground">{title}</span>
            {nameCheck?.confirmed && (
              <span className="shrink-0 text-success-text" title={`Name confirmed${nameCheck.by ? ` by ${nameCheck.by}` : ""}`}>
                <CheckCircle2 size={14} strokeWidth={1.8} aria-hidden="true" />
                <span className="sr-only">Name confirmed{nameCheck.by ? ` by ${nameCheck.by}` : ""}</span>
              </span>
            )}
          </span>
          {subtitle && (
            <span className="truncate text-[12.5px] leading-tight text-muted-foreground tabular">{subtitle}</span>
          )}
          {nameCheck &&
            !nameCheck.confirmed && (
              <span className="flex items-center gap-1 text-[12px] leading-tight text-warning">
                <AlertCircle size={12} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                <span className="truncate">Name not confirmed — check the details before you send</span>
              </span>
            )}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 cursor-pointer text-[13.5px] font-medium text-foreground hover:underline"
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
  label = "Save as Beneficiary",
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
          className="size-4.5 rounded-[5px] border-border text-foreground focus:ring-ring accent-foreground cursor-pointer"
        />
        <span className="text-[14px] font-medium text-foreground">
          {label}
        </span>
      </label>
      {checked && onNicknameChange && (
        <div className="pl-7 animate-in fade-in slide-in-from-top-1 duration-150">
          <Input
            type="text"
            value={nickname || ""}
            onChange={(e) => onNicknameChange(e.target.value)}
            placeholder="Beneficiary nickname (optional)"
            
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
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 transition">
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
          <div className="w-11 h-6 bg-muted-foreground/25 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition peer-checked:bg-primary"></div>
        </label>
      </div>

      {state.enabled && (
        <div className="flex flex-col gap-3 pt-2 border-t border-border/60 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Execution Date">
              <Input
                type="date"
                value={state.startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => onChange({ startDate: e.target.value })}
                className="tabular"
              />
</Field>
            <Field label="Frequency">
              <Select
                value={state.frequency}
                onValueChange={(val) => onChange({ frequency: (val || "once") as ScheduleFrequency })}
              >
                <SelectTrigger >
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">One-off (Single Run)</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
</Field>
          </div>
        </div>
      )}
    </div>
  );
}




/* ── Shared dropdowns: every flow picks a network, bank or payment method the same way ─────────── */

/** Mobile network / wallet provider picker, with the operator's logo in the trigger and in every option. */
export function NetworkSelect({
  value,
  onChange,
  options,
  placeholder = "Select network",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(val) => val && onChange(val)}>
      <SelectTrigger className="h-[58px] min-h-[58px] text-left cursor-pointer flex items-center">
        <div className="flex items-center gap-3">
          <OperatorLogo name={value} size={36} />
          <span className={cn("text-[14.5px]", value ? "font-medium text-foreground" : "font-normal text-muted-foreground")}>
            {value || placeholder}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.map((n) => (
          <SelectItem key={n} value={n}>
            <div className="flex items-center gap-3">
              {operatorFromName(n) && <OperatorLogo name={n} size={28} />}
              <span>{n}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * The same picker for code that holds a network id ("MTN") rather than a name: the dashboard's fund flows and the
 * Link a wallet form. It is `NetworkSelect` underneath, so it can never drift from the Send & Pay one.
 */
export function OperatorSelect({
  value,
  onChange,
}: {
  value: Operator;
  onChange: (value: Operator) => void;
}) {
  return (
    <NetworkSelect
      value={OPERATORS[value].wallet}
      onChange={(name) => {
        const op = operatorFromName(name);
        if (op) onChange(op);
      }}
      options={OPERATOR_IDS.map((id) => OPERATORS[id].wallet)}
    />
  );
}

/** Bank picker. */
export function BankSelect({
  value,
  onChange,
  options = BANKS,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={(val) => val && onChange(val)}>
      <SelectTrigger >
        <SelectValue placeholder="Select bank" />
      </SelectTrigger>
      <SelectContent>
        {options.map((b) => (
          <SelectItem key={b} value={b}>
            {b}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Payment method picker for other-bank transfers: name and description on the left, fee and speed on the right. */
export function PaymentMethodSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = PAYMENT_METHODS.find((m) => m.id === value);
  return (
    <Select value={value} onValueChange={(val) => val && onChange(val)}>
      <SelectTrigger >
        <span className={cn("truncate text-[15px] font-normal", selected ? "text-foreground" : "text-muted-foreground")}>
          {selected ? selected.name : "Select payment method"}
        </span>
      </SelectTrigger>
      <SelectContent>
        {PAYMENT_METHODS.map((m) => (
          <SelectItem key={m.id} value={m.id} label={m.name}>
            <div className="flex w-full items-center justify-between gap-4 py-0.5">
              <div className="flex flex-col text-left">
                <span className="font-medium text-foreground">{m.name}</span>
                <span className="text-[12px] font-normal text-muted-foreground">{m.description}</span>
              </div>
              <div className="shrink-0 text-right">
                <span className="tabular block text-[13px] font-medium text-foreground">{m.feeText}</span>
                <span className="text-[11.5px] font-normal text-muted-foreground">{m.speed}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
