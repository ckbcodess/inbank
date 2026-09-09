"use client";

/**
 * Send & Pay Unified Payment Flow — Controlled Progressive Disclosure Architecture
 *
 * Implements 4-Stage Progressive Disclosure across all payment and bill services:
 *   Stage 1: Recipient / Biller / Destination (Live resolution, verified badge, recent payees)
 *   Stage 2: Amount & Source Account (68px account card, available balance, reference note)
 *   Stage 3: Review & Summary (Fee breakdown, delivery speed, total debit)
 *   Stage 4: Authorise & OTP Verification (Security panel, OTP inputs, countdown timer)
 *   Receipt: Full transaction receipt with Share, Repeat, and Done actions.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeftRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Church,
  Globe,
  GraduationCap,
  Heart,
  Landmark,
  Loader2,
  Plus,
  Receipt,
  Smartphone,
  Tv,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  accountsForProfile,
  BillerCategory,
  BILLERS,
  CARDS,
  fundCard,
  formatMoney,
  recordTransaction,
} from "@/lib/mock-data";
import { useGroupsStore } from "@/lib/groups-store";
import CreateGroupModal from "@/components/payments/CreateGroupModal";
import { useSession } from "@/lib/session-store";
import { roundMoney, sumMoney } from "@/lib/money";
import { PaymentSuccessScreen } from "./PaymentSuccessScreen";
import TransactionPinModal from "./TransactionPinModal";
import { REGISTERED_PHONE, useAuthorisation } from "./useAuthorisation";
import { OwnAccountFlow } from "./flows/OwnAccountFlow";
import { OtherGcbFlow } from "./flows/OtherGcbFlow";
import { OtherBankFlow } from "./flows/OtherBankFlow";
import { MobileWalletFlow } from "./flows/MobileWalletFlow";
import { WalletToBankFlow } from "./flows/WalletToBankFlow";
import { AirtimeFlow } from "./flows/AirtimeFlow";
import { DataBundleFlow } from "./flows/DataBundleFlow";
import { CardTopUpFlow } from "./flows/CardTopUpFlow";
import { BillsPaymentFlow } from "./flows/BillsPaymentFlow";
import { InternationalWireFlow } from "./flows/InternationalWireFlow";
import { PapssPaymentFlow } from "./flows/PapssPaymentFlow";
import { GroupPaymentFlow } from "./flows/GroupPaymentFlow";
import { ProxyPayFlow } from "./flows/ProxyPayFlow";
import {
  PAYMENT_METHODS,
  getPaymentMethodName,
  getDetailedFeeBreakdown,
  ScheduleFrequency,
  detectTelcoNetwork,
  normalizeNetworkName,
  getBundlesForNetwork,
} from "./flows/shared";
import { useBeneficiariesStore } from "@/lib/beneficiaries-store";

export type FlowGroup = "send" | "bills";

export type Rail =
  | "bank"
  | "ach"
  | "wallet"
  | "proxy"
  | "group"
  | "momo"
  | "papss"
  | "swift"
  | "wallet-to-bank"
  | "airtime"
  | "data"
  | "ecg"
  | "bill"
  | "ghanagov"
  | "card-topup"
  | "qr"
  | "cardless";

const RATES: Record<string, number> = {
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

const BANKS = [
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

const NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money", "GCB Wallet"];

type BundleItem = { id: string; name: string; val: string; price: number; network: string };

const BUNDLES_BY_NETWORK: Record<string, BundleItem[]> = {
  "MTN Mobile Money": [
    { id: "mtn-1", name: "1 GB", val: "1 day", price: 5, network: "MTN Mobile Money" },
    { id: "mtn-2", name: "3.5 GB", val: "7 days", price: 15, network: "MTN Mobile Money" },
    { id: "mtn-3", name: "10 GB", val: "30 days", price: 45, network: "MTN Mobile Money" },
    { id: "mtn-4", name: "25 GB", val: "30 days", price: 90, network: "MTN Mobile Money" },
    { id: "mtn-5", name: "50 GB", val: "Non-expiry", price: 175, network: "MTN Mobile Money" },
  ],
  "Telecel Cash": [
    { id: "tel-1", name: "1.5 GB", val: "1 day", price: 6, network: "Telecel Cash" },
    { id: "tel-2", name: "5 GB", val: "7 days", price: 20, network: "Telecel Cash" },
    { id: "tel-3", name: "15 GB", val: "30 days", price: 50, network: "Telecel Cash" },
    { id: "tel-4", name: "40 GB", val: "30 days", price: 120, network: "Telecel Cash" },
  ],
  "AT Money": [
    { id: "at-1", name: "2 GB", val: "1 day", price: 5, network: "AT Money" },
    { id: "at-2", name: "6 GB", val: "7 days", price: 18, network: "AT Money" },
    { id: "at-3", name: "20 GB", val: "30 days", price: 60, network: "AT Money" },
    { id: "at-4", name: "50 GB", val: "Non-expiry", price: 150, network: "AT Money" },
  ],
  "GCB Wallet": [
    { id: "gcb-1", name: "2 GB", val: "1 day", price: 5, network: "GCB Wallet" },
    { id: "gcb-2", name: "10 GB", val: "30 days", price: 40, network: "GCB Wallet" },
  ],
};

const RAIL_FACTS: Record<Rail, { fee: number; arrives: string; instant: boolean }> = {
  bank: { fee: 0, arrives: "Instantly", instant: true },
  ach: { fee: 12.5, arrives: "Same day", instant: false },
  wallet: { fee: 0, arrives: "Instantly", instant: true },
  proxy: { fee: 0.5, arrives: "Instantly", instant: true },
  group: { fee: 0.5, arrives: "Instantly", instant: true },
  momo: { fee: 0.5, arrives: "Instantly", instant: true },
  papss: { fee: 25, arrives: "Same day", instant: false },
  swift: { fee: 50, arrives: "1–3 Business Days", instant: false },
  "wallet-to-bank": { fee: 0.5, arrives: "Instantly", instant: true },
  airtime: { fee: 0, arrives: "Instantly", instant: true },
  data: { fee: 0, arrives: "Instantly", instant: true },
  ecg: { fee: 0, arrives: "Instantly", instant: true },
  bill: { fee: 0, arrives: "Instantly", instant: true },
  ghanagov: { fee: 0, arrives: "Instantly", instant: true },
  "card-topup": { fee: 0, arrives: "Instantly", instant: true },
  qr: { fee: 0, arrives: "Instantly", instant: true },
  cardless: { fee: 1.0, arrives: "Instantly", instant: true },
};

const RAIL_LABEL: Record<Rail, string> = {
  bank: "To Bank",
  ach: "Other Bank",
  wallet: "To Mobile Wallet",
  proxy: "To Proxy",
  group: "To Group",
  momo: "Mobile Money",
  papss: "PAPSS Payment",
  swift: "SWIFT Wire Transfer",
  "wallet-to-bank": "Wallet to Bank",
  airtime: "Airtime Top-up",
  data: "Data Bundle",
  ecg: "ECG Prepaid",
  bill: "GCB Pay / Bills",
  ghanagov: "Ghana.gov",
  "card-topup": "Card Top up",
  qr: "QR Payment",
  cardless: "Cardless Withdrawal",
};

export const GCB_PAY_CATEGORIES: {
  id: BillerCategory;
  title: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}[] = [
  { id: "Education", title: "Education", icon: GraduationCap },
  { id: "Government", title: "Government", icon: Building2 },
  { id: "Health", title: "Health", icon: Heart },
  { id: "Religious & Donations", title: "Religious & Donations", icon: Church },
  { id: "TV & Entertainment", title: "TV & Entertainment", icon: Tv },
  { id: "Utilities", title: "Utilities", icon: Receipt },
  { id: "Others", title: "Others", icon: Plus },
];

interface RecentPayeeAvatar {
  id: string;
  name: string;
  bank: string;
  acct: string;
  initials: string;
  rail: Rail;
  colorBg?: string;
  colorDarkBg?: string;
  colorDarkText?: string;
  billerId?: string;
  category?: BillerCategory;
  country?: string;
  subtitle?: string;
}

const RECENT_AVATARS: RecentPayeeAvatar[] = [
  // Bank payees
  {
    id: "rec-b1",
    name: "Kwame Boateng",
    bank: "GCB Bank",
    acct: "0231 4455 8890",
    initials: "KB",
    rail: "bank",
    colorBg: "#f1f8f9",
  },
  {
    id: "rec-b2",
    name: "Abena Osei",
    bank: "Stanbic Bank",
    acct: "1089 3322 1100",
    initials: "AO",
    rail: "bank",
    colorBg: "#ebe8de",
  },
  {
    id: "rec-b3",
    name: "Accra Fabrics Ltd",
    bank: "Ecobank Ghana",
    acct: "0142 8899 0011",
    initials: "AF",
    rail: "bank",
    colorBg: "#e0eedd",
  },
  {
    id: "rec-b4",
    name: "Jane Asare",
    bank: "Access Bank",
    acct: "0102 3344 5566",
    initials: "JA",
    rail: "bank",
    colorBg: "#f5ebf7",
  },

  // Mobile Wallet payees
  {
    id: "rec-w1",
    name: "Ama Serwaa Mensah",
    bank: "MTN Mobile Money",
    acct: "0244 123 456",
    initials: "AS",
    rail: "wallet",
    colorBg: "#fef9c3",
  },
  {
    id: "rec-w2",
    name: "Yaw Mensah",
    bank: "Telecel Cash",
    acct: "0201 987 654",
    initials: "YM",
    rail: "wallet",
    colorBg: "#fee2e2",
  },
  {
    id: "rec-w3",
    name: "Kofi Boateng",
    bank: "AT Money",
    acct: "0277 456 789",
    initials: "KB",
    rail: "wallet",
    colorBg: "#dbeafe",
  },

  // Proxy payees
  {
    id: "rec-px1",
    name: "Kwame Boateng",
    bank: "Proxy ID",
    acct: "@kwame.b",
    initials: "KB",
    rail: "proxy",
    subtitle: "@kwame.b",
    colorBg: "#f1f8f9",
  },
  {
    id: "rec-px2",
    name: "Ama Serwaa",
    bank: "Proxy ID",
    acct: "@ama.serwaa",
    initials: "AS",
    rail: "proxy",
    subtitle: "@ama.serwaa",
    colorBg: "#dbeafe",
  },
  {
    id: "rec-px3",
    name: "Kofi Appiah",
    bank: "Ghana Card",
    acct: "GHA-71829304-1",
    initials: "KA",
    rail: "proxy",
    subtitle: "Ghana Card ID",
    colorBg: "#fef9c3",
  },

  // Airtime payees
  {
    id: "rec-air-self",
    name: "My Phone (Self)",
    bank: "MTN Mobile Money",
    acct: "0244 123 821",
    initials: "ME",
    rail: "airtime",
    subtitle: "0244 123 821",
    colorBg: "#fef9c3",
  },
  {
    id: "rec-air-1",
    name: "Ama Serwaa",
    bank: "MTN Mobile Money",
    acct: "0244 123 456",
    initials: "AS",
    rail: "airtime",
    subtitle: "0244 123 456",
    colorBg: "#dbeafe",
  },
  {
    id: "rec-air-2",
    name: "Kwame Boateng",
    bank: "Telecel Cash",
    acct: "0201 987 654",
    initials: "KB",
    rail: "airtime",
    subtitle: "0201 987 654",
    colorBg: "#fee2e2",
  },
  {
    id: "rec-air-3",
    name: "Kofi Boateng",
    bank: "AT Money",
    acct: "0277 456 789",
    initials: "KB",
    rail: "airtime",
    subtitle: "0277 456 789",
    colorBg: "#e0eedd",
  },
  {
    id: "rec-air-4",
    name: "Yaa Asantewaa",
    bank: "MTN Mobile Money",
    acct: "0559 220 118",
    initials: "YA",
    rail: "airtime",
    subtitle: "0559 220 118",
    colorBg: "#f5ebf7",
  },

  // Data Bundle payees
  {
    id: "rec-dat-self",
    name: "My Device (Self)",
    bank: "MTN Mobile Money",
    acct: "0244 123 821",
    initials: "ME",
    rail: "data",
    subtitle: "0244 123 821",
    colorBg: "#fef9c3",
  },
  {
    id: "rec-dat-1",
    name: "Home Router (MiFi)",
    bank: "Telecel Cash",
    acct: "0201 987 654",
    initials: "HR",
    rail: "data",
    subtitle: "0201 987 654",
    colorBg: "#fee2e2",
  },
  {
    id: "rec-dat-2",
    name: "Office iPad",
    bank: "AT Money",
    acct: "0277 456 789",
    initials: "IP",
    rail: "data",
    subtitle: "0277 456 789",
    colorBg: "#e0eedd",
  },
  {
    id: "rec-dat-3",
    name: "Ama Serwaa",
    bank: "MTN Mobile Money",
    acct: "0244 123 456",
    initials: "AS",
    rail: "data",
    subtitle: "0244 123 456",
    colorBg: "#dbeafe",
  },
  {
    id: "rec-dat-4",
    name: "Kwame Boateng",
    bank: "MTN Mobile Money",
    acct: "0559 220 118",
    initials: "KB",
    rail: "data",
    subtitle: "0559 220 118",
    colorBg: "#f5ebf7",
  },

  // PAPSS International payees
  {
    id: "rec-papss1",
    name: "Lagos Textile Mills",
    bank: "Access Bank Nigeria",
    acct: "NG-8891-40023-77",
    initials: "LT",
    rail: "papss",
    country: "Nigeria",
    subtitle: "NGN · Nigeria",
    colorBg: "#dcfce7",
  },
  {
    id: "rec-papss2",
    name: "Abidjan Cocoa Exporters",
    bank: "Ecobank Côte d'Ivoire",
    acct: "CI-5510-99201-12",
    initials: "AC",
    rail: "papss",
    country: "Côte d'Ivoire",
    subtitle: "XOF · Côte d'Ivoire",
    colorBg: "#fee2e2",
  },
  {
    id: "rec-papss3",
    name: "Nairobi Solar Tech",
    bank: "Equity Bank Kenya",
    acct: "KE-0029-44102-88",
    initials: "NS",
    rail: "papss",
    country: "Kenya",
    subtitle: "KES · Kenya",
    colorBg: "#e0f2fe",
  },
  {
    id: "rec-papss4",
    name: "Cape Town Freight",
    bank: "Standard Bank SA",
    acct: "ZA-7712-33901-44",
    initials: "CT",
    rail: "papss",
    country: "South Africa",
    subtitle: "ZAR · South Africa",
    colorBg: "#fef3c7",
  },

  // ECG Prepaid payees
  {
    id: "rec-ecg1",
    name: "Lester Adjei (Home)",
    bank: "ECG Prepaid",
    acct: "P-8839210",
    initials: "ECG",
    rail: "ecg",
    subtitle: "Meter: P-8839210",
    colorBg: "#fef3c7",
  },
  {
    id: "rec-ecg2",
    name: "Kumasi Branch Office",
    bank: "ECG Prepaid",
    acct: "P-9921405",
    initials: "ECG",
    rail: "ecg",
    subtitle: "Meter: P-9921405",
    colorBg: "#fef08a",
  },

  // Ghana.gov payees
  {
    id: "rec-gov1",
    name: "DVLA Licence Renewal",
    bank: "DVLA — Driver licence renewal",
    acct: "DVLA-2026-9901",
    initials: "DV",
    rail: "ghanagov",
    subtitle: "DVLA-2026-9901",
    colorBg: "#e0f2fe",
  },
  {
    id: "rec-gov2",
    name: "Domestic Tax Return",
    bank: "GRA — Domestic Tax Assessment",
    acct: "TIN-9088214-G",
    initials: "GRA",
    rail: "ghanagov",
    subtitle: "TIN-9088214-G",
    colorBg: "#fef9c3",
  },
  {
    id: "rec-gov3",
    name: "Passport 32-Page",
    bank: "Passports Office — Standard 32-Page",
    acct: "PASS-882109",
    initials: "PP",
    rail: "ghanagov",
    subtitle: "PASS-882109",
    colorBg: "#fce7f3",
  },

  // Bills (GCB Pay One-Tap Beneficiaries categorized by Pay Type)
  // 1. Utilities
  {
    id: "rec-bill1",
    name: "Lester Adjei (Home)",
    bank: "ECG — Electricity",
    acct: "P-8839210",
    initials: "ECG",
    rail: "bill",
    billerId: "bil-001",
    category: "Utilities",
    subtitle: "Meter: P-8839210",
    colorBg: "#fef3c7",
  },
  {
    id: "rec-bill2",
    name: "Ghana Water (Res)",
    bank: "Ghana Water (GWCL)",
    acct: "GW-440291",
    initials: "GW",
    rail: "bill",
    billerId: "bil-002",
    category: "Utilities",
    subtitle: "Acct: GW-440291",
    colorBg: "#e0f2fe",
  },
  {
    id: "rec-bill-ut3",
    name: "NEDCo Power (Site)",
    bank: "NEDCo Power Ghana",
    acct: "NED-552019",
    initials: "NED",
    rail: "bill",
    billerId: "bil-002b",
    category: "Utilities",
    subtitle: "Meter: NED-552019",
    colorBg: "#fef08a",
  },

  // 2. TV & Entertainment
  {
    id: "rec-bill3",
    name: "DSTV Family (Hall)",
    bank: "DSTV / MultiChoice",
    acct: "1029384812",
    initials: "DS",
    rail: "bill",
    billerId: "bil-006",
    category: "TV & Entertainment",
    subtitle: "Smartcard: 1029384812",
    colorBg: "#f3e8ff",
  },
  {
    id: "rec-bill-tv2",
    name: "StarTimes (Bedroom)",
    bank: "StarTimes Ghana",
    acct: "0219883421",
    initials: "ST",
    rail: "bill",
    billerId: "bil-007",
    category: "TV & Entertainment",
    subtitle: "Smartcard: 0219883421",
    colorBg: "#e0f2fe",
  },
  {
    id: "rec-bill-tv3",
    name: "GOtv Plus (Kids)",
    bank: "GOtv Ghana",
    acct: "20993841",
    initials: "GO",
    rail: "bill",
    billerId: "bil-007b",
    category: "TV & Entertainment",
    subtitle: "IUC: 20993841",
    colorBg: "#fee2e2",
  },

  // 3. Education
  {
    id: "rec-bill-edu1",
    name: "Kwabena (UG Legon)",
    bank: "University of Ghana (Legon)",
    acct: "UG-10928341",
    initials: "UG",
    rail: "bill",
    billerId: "bil-008",
    category: "Education",
    subtitle: "ID: UG-10928341",
    colorBg: "#dbeafe",
  },
  {
    id: "rec-bill-edu2",
    name: "Akua (KNUST Tuition)",
    bank: "KNUST Tuition & Fees",
    acct: "KN-8839210",
    initials: "KN",
    rail: "bill",
    billerId: "bil-008b",
    category: "Education",
    subtitle: "Student ID: KN-8839210",
    colorBg: "#fef3c7",
  },
  {
    id: "rec-bill-edu3",
    name: "WAEC Portal (Kofi)",
    bank: "WAEC Exams Portal",
    acct: "WAEC-002914",
    initials: "WAEC",
    rail: "bill",
    billerId: "bil-008c",
    category: "Education",
    subtitle: "Index: WAEC-002914",
    colorBg: "#e0eedd",
  },

  // 4. Government
  {
    id: "rec-bill4",
    name: "GRA Tax Assessment",
    bank: "GRA — Tax Payment",
    acct: "TIN-9088214-G",
    initials: "GRA",
    rail: "bill",
    billerId: "bil-004",
    category: "Government",
    subtitle: "TIN: TIN-9088214-G",
    colorBg: "#fef9c3",
  },
  {
    id: "rec-bill-gov2",
    name: "DVLA Licence Renewal",
    bank: "DVLA — Driver Licence",
    acct: "DVLA-2026-9901",
    initials: "DVLA",
    rail: "bill",
    billerId: "bil-004c",
    category: "Government",
    subtitle: "Licence: DVLA-2026-9901",
    colorBg: "#e0f2fe",
  },

  // 5. Health
  {
    id: "rec-bill-hlth1",
    name: "Ama Serwaa (NHIS)",
    bank: "National Health Insurance (NHIS)",
    acct: "NHIS-9920148",
    initials: "NHIS",
    rail: "bill",
    billerId: "bil-009",
    category: "Health",
    subtitle: "Card: NHIS-9920148",
    colorBg: "#fee2e2",
  },
  {
    id: "rec-bill-hlth2",
    name: "Family Folder (Korle Bu)",
    bank: "Korle Bu Teaching Hospital",
    acct: "KBTH-88210-P",
    initials: "KB",
    rail: "bill",
    billerId: "bil-009b",
    category: "Health",
    subtitle: "Folder: KBTH-88210-P",
    colorBg: "#fce7f3",
  },

  // 6. Religious & Donations
  {
    id: "rec-bill-rel1",
    name: "ICGC Tithe & Offering",
    bank: "ICGC Christ Temple",
    acct: "ICGC-0244123456",
    initials: "ICGC",
    rail: "bill",
    billerId: "bil-010",
    category: "Religious & Donations",
    subtitle: "Phone: 0244 123 456",
    colorBg: "#ede9fe",
  },
  {
    id: "rec-bill-rel2",
    name: "Action Chapel Seed",
    bank: "Action Chapel International",
    acct: "ACI-883921",
    initials: "ACI",
    rail: "bill",
    billerId: "bil-010b",
    category: "Religious & Donations",
    subtitle: "Member ID: ACI-883921",
    colorBg: "#fef3c7",
  },

  // 7. Others
  {
    id: "rec-bill5",
    name: "MTN Fibre Broadband",
    bank: "MTN Ghana Broadband",
    acct: "0244 123 456",
    initials: "MTN",
    rail: "bill",
    billerId: "bil-003",
    category: "Others",
    subtitle: "Line: 0244 123 456",
    colorBg: "#fef08a",
  },
  {
    id: "rec-bill6",
    name: "SIC Fleet Insurance",
    bank: "SIC Insurance",
    acct: "POL-882109-SIC",
    initials: "SIC",
    rail: "bill",
    billerId: "bil-005",
    category: "Others",
    subtitle: "Policy: POL-882109-SIC",
    colorBg: "#dcfce7",
  },
];

const GHANAIAN_NAMES = [
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

const ACCOUNT_RESOLUTIONS: Record<string, string> = {
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

function resolveAccountName(number: string, fallback: string = ""): string {
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

function detectNetwork(phone: string): string {
  const c = phone.replace(/[\s-]/g, "");
  if (/^0(24|54|55|59|25)/.test(c)) return "MTN Mobile Money";
  if (/^0(20|50)/.test(c)) return "Telecel Cash";
  if (/^0(27|57|26)/.test(c)) return "AT Money";
  return "MTN Mobile Money";
}

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-[14px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/30 transition-all";
const selectCls =
  "h-11 w-full rounded-xl border border-border bg-background pl-3.5 pr-10 text-[14px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/30 transition-all cursor-pointer";
const labelCls = "text-[12.5px] text-muted-foreground";

type Phase = "form" | "submitting" | "success";
type ReceiptData = {
  pending: boolean;
  title: string;
  msg: string;
  trn: string;
  date: string;
  time: string;
  recipient: string;
  account: string;
  bank: string;
  amount: number;
  fee: number;
  total: number;
  narration: string;
  rows: [string, string][];
};

type GroupLine = { id: string; name: string; dest: string; amount: string };

function HorizontalScrollStrip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => checkScroll());
    observer.observe(el);

    window.addEventListener("resize", checkScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(180, el.clientWidth * 0.65);
    el.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Contextual Left Chevron with gradient mask */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-5 pl-0 bg-gradient-to-r from-card via-card/70 to-transparent dark:from-card dark:via-card/40 dark:to-transparent pointer-events-none animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="pointer-events-auto flex size-8 items-center justify-center rounded-full border border-border/80 bg-card/90 dark:bg-card/90 text-foreground shadow-sm backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer -ml-1"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* Horizontally scrollable track */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-none scroll-smooth"
      >
        {children}
      </div>

      {/* Contextual Right Smart Chevron with gradient mask */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-6 pr-0 bg-gradient-to-l from-card via-card/70 to-transparent dark:from-card dark:via-card/40 dark:to-transparent pointer-events-none animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => scroll("right")}
            className="pointer-events-auto flex size-8 items-center justify-center rounded-full border border-border/80 bg-card/90 dark:bg-card/90 text-foreground shadow-sm backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer -mr-1"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>
  );
}

function RailBeneficiaryStrip({
  items,
  onSelect,
}: {
  title?: string;
  items: RecentPayeeAvatar[];
  onSelect: (item: RecentPayeeAvatar) => void;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="pb-2">
      <HorizontalScrollStrip>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="group flex flex-col items-center gap-2 w-[84px] shrink-0 text-center cursor-pointer"
            title={`Select ${item.name} (${item.subtitle || item.bank || item.acct})`}
          >
            <span
              className="flex size-14 items-center justify-center rounded-full text-[14px] font-semibold text-[#111] transition-transform group-hover:scale-105 shadow-xs border border-black/5 dark:border-white/10"
              style={{ backgroundColor: item.colorBg || "#f1f8f9" }}
            >
              {item.initials}
            </span>
            <div className="flex flex-col w-full px-0.5">
              <span className="text-[12px] font-medium text-foreground truncate w-full" title={item.name}>
                {item.name}
              </span>
              <span className="text-[11px] text-muted-foreground truncate w-full" title={item.subtitle || item.bank}>
                {item.subtitle || item.bank.split(" ")[0]}
              </span>
            </div>
          </button>
        ))}
      </HorizontalScrollStrip>
    </div>
  );
}

export function PaymentFlow({ group }: { group: FlowGroup }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeProfile = useSession((s) => s.activeProfile);
  const accounts = useMemo(() => accountsForProfile(activeProfile?.kind), [activeProfile?.kind]);

  const auth = useAuthorisation();

  const [rail, setRail] = useState<Rail>("bank");
  const [bankCategory, setBankCategory] = useState<"own" | "gcb" | "other" | "international" | null>(null);
  const [walletCategory, setWalletCategory] = useState<"self" | "other" | null>(null);
  const [billCategory, setBillCategory] = useState<BillerCategory | null>(null);
  const [billMode, setBillMode] = useState<"saved" | "custom">("saved");
  const [saveBillAsBeneficiary, setSaveBillAsBeneficiary] = useState(true);
  const [saveBeneficiary, setSaveBeneficiary] = useState(true);
  const [phase, setPhase] = useState<Phase>("form");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const { groups } = useGroupsStore();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  // Progressive Disclosure Stage Control (1..4)
  const [stage, setStage] = useState<number>(1);
  const [maxRevealedStage, setMaxRevealedStage] = useState<number>(1);
  const [stage1Collapsed, setStage1Collapsed] = useState(false);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const [resolvingAcct, setResolvingAcct] = useState(false);
  const [f, setF] = useState({
    fromId: accounts[0]?.id ?? "",
    toOwnAccountId: "",
    benName: "",
    benAcct: "",
    bank: "",
    paymentMethod: "",
    bankAmount: "",
    bankRef: "",
    category: "",
    saveBeneficiary: false,
    beneficiaryNickname: "",
    isScheduled: false,
    scheduleDate: "2026-09-08",
    scheduleFrequency: "once" as ScheduleFrequency,
    scheduleEndDate: "",
    wPhone: "",
    wName: "",
    wNetwork: "",
    wAmount: "",
    wRef: "",
    pxId: "",
    pxAmount: "",
    pxRef: "",
    groupName: "",
    grpAmount: "",
    grpRef: "",
    aPhone: "",
    product: "airtime" as "airtime" | "data",
    airtimeAmount: "",
    bundleId: "",
    cardId: "",
    cardAmount: "",
    ecgMeter: "",
    ecgAmount: "",
    billerId: "",
    billRef: "",
    billAmount: "",
    govService: "",
    govRef: "",
    govAmount: "",
    qrMerchant: "",
    qrAmount: "",
    qrRef: "",
    wBenName: "",
    wIban: "",
    wSwift: "",
    wBank: "",
    wCountry: "",
    wCurrency: "NGN",
    wForeign: "",
    wPurpose: "Goods purchased",
    wireRef: "",
  });

  const [lines] = useState<GroupLine[]>([
    { id: "g1", name: "Ama Serwaa Mensah", dest: "0244 123 456", amount: "500" },
    { id: "g2", name: "Kwabena Boateng", dest: "0554 987 654", amount: "500" },
    { id: "g3", name: "Kofi Appiah", dest: "0201 112 233", amount: "500" },
    { id: "g4", name: "Yaa Asantewaa", dest: "0277 445 566", amount: "500" },
    { id: "g5", name: "Abena Osei", dest: "0249 333 444", amount: "500" },
  ]);

  const selectBeneficiary = (item: RecentPayeeAvatar) => {
    if (item.rail === "bill") {
      setRail("bill");
      const matchedBiller =
        BILLERS.find((b) => b.id === item.billerId || b.name.toLowerCase().includes(item.bank.toLowerCase())) ??
        BILLERS[0];
      if (item.category) {
        setBillCategory(item.category);
      } else if (matchedBiller?.category) {
        setBillCategory(matchedBiller.category);
      }
      setF((p) => ({
        ...p,
        billerId: item.billerId || matchedBiller.id,
        billRef: item.acct,
        benName: item.name,
      }));
      setStage(1);
      setStage1Collapsed(true);
      setMaxRevealedStage(1);
      return;
    }

    if (item.rail === "group") {
      setRail("group");
      const matchedGrp = groups.find((g) => g.name === item.name || g.id === item.id);
      setF((p) => ({
        ...p,
        groupName: item.name,
        grpAmount: matchedGrp?.defaultPerMemberAmount ? String(matchedGrp.defaultPerMemberAmount) : p.grpAmount || "200",
      }));
      setStage(1);
      setStage1Collapsed(true);
      return;
    }

    if (item.rail === "bank" || item.rail === "ach") {
      setRail("bank");
      setF((p) => ({
        ...p,
        benName: item.name,
        benAcct: item.acct,
        bank: item.bank,
        paymentMethod: item.bank.includes("GCB") ? "" : (p.paymentMethod || "gip"),
      }));
      setBankCategory(item.bank.includes("GCB") ? "gcb" : "other");
      setStage(1);
      setStage1Collapsed(true);
      setMaxRevealedStage(1);
      return;
    }

    if (item.rail === "wallet-to-bank") {
      setRail("wallet-to-bank");
      setF((p) => ({ ...p, benName: item.name, benAcct: item.acct, bank: item.bank || "GCB Bank" }));
      setStage(1);
      setStage1Collapsed(true);
      setMaxRevealedStage(1);
      return;
    }

    if (item.rail === "wallet" || item.rail === "momo") {
      setRail("wallet");
      setF((p) => ({ ...p, wName: item.name, wPhone: item.acct, wNetwork: item.bank }));
      setWalletCategory("other");
      setStage(1);
      setStage1Collapsed(true);
      setMaxRevealedStage(1);
      return;
    }

    if (item.rail === "airtime") {
      setRail("airtime");
      const detected = detectTelcoNetwork(item.acct);
      const net = detected?.telcoName || normalizeNetworkName(item.bank) || "MTN Ghana";
      setF((p) => ({
        ...p,
        aPhone: item.acct,
        wNetwork: net,
        benName: item.name,
      }));
      setStage(1);
      setStage1Collapsed(true);
      setMaxRevealedStage(1);
      return;
    }

    if (item.rail === "data") {
      setRail("data");
      const detected = detectTelcoNetwork(item.acct);
      const net = detected?.telcoName || normalizeNetworkName(item.bank) || "MTN Ghana";
      const bundles = getBundlesForNetwork(net);
      const firstBundle = bundles[0]?.id;
      setF((p) => ({
        ...p,
        aPhone: item.acct,
        wNetwork: net,
        bundleId: firstBundle || p.bundleId,
        benName: item.name,
      }));
      setStage(1);
      setStage1Collapsed(true);
      setMaxRevealedStage(1);
      return;
    }

    if (item.rail === "proxy") {
      setRail("proxy");
      setF((p) => ({
        ...p,
        pxId: item.acct,
        benName: item.name,
      }));
      setStage(1);
      setStage1Collapsed(true);
      setMaxRevealedStage(1);
      return;
    }

    if (item.rail === "papss") {
      setRail("papss");
      const country = item.country || "Nigeria";
      const curr = country === "Nigeria" ? "NGN" : country === "Kenya" ? "KES" : country === "South Africa" ? "ZAR" : "XOF";
      setF((p) => ({
        ...p,
        wBenName: item.name,
        wBank: item.bank,
        wIban: item.acct,
        wCountry: country,
        wCurrency: curr,
      }));
      setStage(1);
      setStage1Collapsed(true);
      setMaxRevealedStage(1);
      return;
    }

    if (item.rail === "ecg") {
      setRail("ecg");
      setF((p) => ({
        ...p,
        ecgMeter: item.acct,
        benName: item.name,
      }));
      setStage(1);
      setStage1Collapsed(true);
      setMaxRevealedStage(1);
      return;
    }

    if (item.rail === "ghanagov") {
      setRail("ghanagov");
      setF((p) => ({
        ...p,
        govRef: item.acct,
        govService: item.bank,
        benName: item.name,
      }));
      setStage(1);
      setStage1Collapsed(true);
      setMaxRevealedStage(1);
      return;
    }

    if (item.rail === "card-topup") {
      setRail("card-topup");
      setF((p) => ({
        ...p,
        cardId: item.acct,
        benName: item.name,
      }));
      setStage(1);
      setStage1Collapsed(true);
      setMaxRevealedStage(1);
      return;
    }
  };

  useEffect(() => {
    const r = searchParams.get("rail") as Rail | null;
    const recipientParam = searchParams.get("recipient");
    const productParam = searchParams.get("product") as "airtime" | "data" | null;
    const categoryParam = searchParams.get("category") as string | null;
    const billerIdParam = searchParams.get("billerId");
    const refParam = searchParams.get("ref");

    if (productParam === "data" || r === "data") {
      setRail("data");
    } else if (productParam === "airtime" || r === "airtime") {
      setRail("airtime");
    } else if (categoryParam === "card" || r === "card-topup") {
      setRail("card-topup");
    } else if (r && r in RAIL_FACTS) {
      setRail(r);
    } else if (group === "bills") {
      setRail("bill");
    } else {
      setRail("bank");
    }

    if (r === "wallet-to-bank") {
      setRail("wallet-to-bank");
      setF((p) => ({ ...p, bank: p.bank || "GCB Bank" }));
      setStage(1);
    } else if (categoryParam === "own" || categoryParam === "between-accounts") {
      setBankCategory("own");
      setF((p) => ({ ...p, toOwnAccountId: "", bank: "GCB Bank" }));
    } else if (categoryParam === "gcb" || categoryParam === "other-gcb") {
      setBankCategory("gcb");
    } else if (categoryParam === "other") {
      if (r === "wallet" || r === "momo") {
        setWalletCategory("other");
        setStage1Collapsed(false);
      } else {
        setBankCategory("other");
      }
    } else if (categoryParam === "self") {
      setWalletCategory("self");
      setStage1Collapsed(true);
      setF((p) => ({ ...p, wPhone: "0244123821", wName: "Ama Serwaa Mensah", wNetwork: "MTN Mobile Money" }));
    } else if (categoryParam === "international" || r === "swift") {
      setBankCategory("international");
      setRail("swift");
    } else if (r === "papss") {
      setRail("papss");
    } else if (r === "ach") {
      setRail("ach");
    }

    if (r === "bill" || group === "bills") {
      if (categoryParam) {
        const foundCat = GCB_PAY_CATEGORIES.find((c) => c.id.toLowerCase() === categoryParam.toLowerCase())?.id;
        if (foundCat) setBillCategory(foundCat);
      }
      if (billerIdParam) {
        const b = BILLERS.find((x) => x.id === billerIdParam);
        if (b?.category) setBillCategory(b.category);
        setF((p) => ({ ...p, billerId: billerIdParam, billRef: refParam || p.billRef }));
        if (refParam && refParam.length >= 4) {
          setStage1Collapsed(true);
        }
      } else if (recipientParam) {
        const decoded = decodeURIComponent(recipientParam).toLowerCase();
        const matchedAvatar = RECENT_AVATARS.find(
          (a) =>
            a.rail === "bill" &&
            (a.name.toLowerCase().includes(decoded) ||
              a.bank.toLowerCase().includes(decoded) ||
              a.acct.includes(decoded))
        );
        const matchedBiller = BILLERS.find((b) => b.name.toLowerCase().includes(decoded) || b.id.toLowerCase() === decoded);

        if (matchedAvatar) {
          if (matchedAvatar.category) setBillCategory(matchedAvatar.category);
          setF((p) => ({
            ...p,
            billerId: matchedAvatar.billerId || (matchedBiller?.id ?? ""),
            billRef: matchedAvatar.acct,
            benName: matchedAvatar.name,
          }));
          setStage1Collapsed(true);
        } else if (matchedBiller) {
          if (matchedBiller.category) setBillCategory(matchedBiller.category);
          setF((p) => ({
            ...p,
            billerId: matchedBiller.id,
            billRef: refParam || "",
          }));
          if (refParam && refParam.length >= 4) {
            setStage1Collapsed(true);
          }
        }
      }
    } else if (r === "group" && (searchParams.get("group") || recipientParam)) {
      const gName = decodeURIComponent(searchParams.get("group") || recipientParam || "");
      const matchedG = groups.find((g) => g.name.toLowerCase().includes(gName.toLowerCase()));
      if (matchedG) {
        setF((p) => ({
          ...p,
          groupName: matchedG.name,
          grpAmount: String(matchedG.defaultPerMemberAmount || p.grpAmount || 200),
        }));
        setStage1Collapsed(true);
      }
    } else if (recipientParam) {
      const decoded = decodeURIComponent(recipientParam);
      if (r === "wallet-to-bank") {
        const matched = RECENT_AVATARS.find(
          (a) => (a.rail === "wallet-to-bank" || a.rail === "bank") &&
                 (a.name.toLowerCase().includes(decoded.toLowerCase()) || a.acct.includes(decoded))
        );
        if (matched) {
          selectBeneficiary(matched);
        } else {
          setF((p) => ({ ...p, benAcct: decoded, bank: p.bank || "GCB Bank" }));
          handlePhoneLookup("benAcct", decoded);
        }
      } else if (r === "wallet" || r === "momo") {
        setWalletCategory("other");
        const matched = RECENT_AVATARS.find((a) => a.rail === "wallet" && (a.name.toLowerCase().includes(decoded.toLowerCase()) || a.acct.includes(decoded)));
        if (matched) {
          selectBeneficiary(matched);
        } else {
          handlePhoneLookup("wPhone", decoded);
        }
      } else if (r === "airtime") {
        const matched = RECENT_AVATARS.find((a) => a.rail === "airtime" && (a.name.toLowerCase().includes(decoded.toLowerCase()) || a.acct.includes(decoded)));
        if (matched) {
          selectBeneficiary(matched);
        } else {
          handlePhoneLookup("aPhone", decoded);
          const detected = detectTelcoNetwork(decoded);
          const net = detected?.telcoName || "MTN Ghana";
          setF((p) => ({ ...p, aPhone: decoded, wNetwork: net }));
          setStage1Collapsed(true);
        }
      } else if (r === "data") {
        const matched = RECENT_AVATARS.find((a) => a.rail === "data" && (a.name.toLowerCase().includes(decoded.toLowerCase()) || a.acct.includes(decoded)));
        if (matched) {
          selectBeneficiary(matched);
        } else {
          handlePhoneLookup("aPhone", decoded);
          const detected = detectTelcoNetwork(decoded);
          const net = detected?.telcoName || "MTN Ghana";
          const bundles = getBundlesForNetwork(net);
          const firstBundle = bundles[0]?.id;
          setF((p) => ({ ...p, aPhone: decoded, wNetwork: net, bundleId: firstBundle || p.bundleId }));
          setStage1Collapsed(true);
        }
      } else if (r === "proxy") {
        const matched = RECENT_AVATARS.find((a) => a.rail === "proxy" && (a.name.toLowerCase().includes(decoded.toLowerCase()) || a.acct.includes(decoded)));
        if (matched) {
          selectBeneficiary(matched);
        } else {
          handleLookup("pxId", decoded, 4);
          setStage1Collapsed(true);
        }
      } else if (r === "papss") {
        const matched = RECENT_AVATARS.find((a) => a.rail === "papss" && (a.name.toLowerCase().includes(decoded.toLowerCase()) || a.acct.includes(decoded)));
        if (matched) {
          selectBeneficiary(matched);
        }
      } else if (r === "ecg") {
        const matched = RECENT_AVATARS.find((a) => a.rail === "ecg" && (a.name.toLowerCase().includes(decoded.toLowerCase()) || a.acct.includes(decoded)));
        if (matched) {
          selectBeneficiary(matched);
        } else {
          setF((p) => ({ ...p, ecgMeter: decoded }));
          setStage1Collapsed(true);
        }
      } else {
        const matched = RECENT_AVATARS.find((a) => a.rail === "bank" && (a.name.toLowerCase().includes(decoded.toLowerCase()) || a.acct.includes(decoded)));
        if (matched) {
          selectBeneficiary(matched);
        } else {
          handleLookup("benAcct", decoded, 8);
        }
      }
    }
  }, [searchParams, group, accounts]);

  const set = (k: string, v: unknown) => setF((prev) => ({ ...prev, [k]: v } as typeof prev));

  const account = accounts.find((a) => a.id === f.fromId) ?? accounts[0];
  const toOwnAccount = accounts.find((a) => a.id === f.toOwnAccountId);

  const availableBundles = useMemo(() => {
    return getBundlesForNetwork(f.wNetwork);
  }, [f.wNetwork]);

  const bundle = useMemo(() => {
    return availableBundles.find((b) => b.id === f.bundleId);
  }, [availableBundles, f.bundleId]);

  const biller = BILLERS.find((b) => b.id === f.billerId);

  const availableBillers = useMemo(() => {
    if (!billCategory) return BILLERS;
    return BILLERS.filter((b) => b.category === billCategory);
  }, [billCategory]);

  const categoryBeneficiaries = useMemo(() => {
    if (!billCategory) return RECENT_AVATARS.filter((item) => item.rail === "bill");
    return RECENT_AVATARS.filter((item) => item.rail === "bill" && item.category === billCategory);
  }, [billCategory]);

  const selectedGroupObj = useMemo(() => groups.find((g) => g.name === f.groupName), [groups, f.groupName]);

  const activeRailBeneficiaries = useMemo(() => {
    if (bankCategory === "own" || walletCategory === "self" || rail === "card-topup" || rail === "qr") {
      return [];
    }
    if (rail === "group") {
      return groups.map((g) => ({
        id: g.id,
        name: g.name,
        initials:
          g.name
            .replace(/[^a-zA-Z ]/g, "")
            .split(" ")
            .filter(Boolean)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "GP",
        rail: "group" as const,
        bank: `${g.members.length} members`,
        acct: g.splitType === "equal" ? `GHS ${g.defaultPerMemberAmount} each` : "Custom split",
      }));
    }
    if (rail === "bill") {
      return categoryBeneficiaries;
    }
    if (rail === "bank" || rail === "ach") {
      if (bankCategory === "gcb") {
        return RECENT_AVATARS.filter((i) => i.rail === "bank" && i.bank.includes("GCB"));
      }
      return RECENT_AVATARS.filter((i) => i.rail === "bank" && !i.bank.includes("GCB"));
    }
    if (rail === "wallet-to-bank") {
      return RECENT_AVATARS.filter((i) => i.rail === "bank" || i.rail === "wallet-to-bank");
    }
    return RECENT_AVATARS.filter((i) => i.rail === rail);
  }, [rail, bankCategory, walletCategory, categoryBeneficiaries, groups]);

  const num = (v: string) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
  const groupTotal = sumMoney(lines.map((l) => num(l.amount)));

  const currentAmount = useMemo(() => {
    switch (rail) {
      case "bank":
      case "ach":
      case "wallet-to-bank":
        return num(f.bankAmount || f.wAmount);
      case "wallet":
      case "momo":
        return num(f.wAmount);
      case "proxy":
        return num(f.pxAmount);
      case "group": {
        const count = selectedGroupObj ? selectedGroupObj.members.length : 5;
        return num(f.grpAmount) * count;
      }
      case "airtime":
        return num(f.airtimeAmount);
      case "data":
        return bundle?.price ?? 0;
      case "card-topup":
        return num(f.cardAmount);
      case "ecg":
        return num(f.ecgAmount);
      case "bill":
        return num(f.billAmount);
      case "ghanagov":
        return num(f.govAmount);
      case "qr":
        return num(f.qrAmount);
      case "papss":
        return num(f.wForeign);
      default:
        return 0;
    }
  }, [
    rail,
    f.bankAmount,
    f.wAmount,
    f.pxAmount,
    f.grpAmount,
    f.airtimeAmount,
    bundle?.price,
    f.cardAmount,
    f.ecgAmount,
    f.billAmount,
    f.govAmount,
    f.qrAmount,
    f.wForeign,
    selectedGroupObj,
  ]);

  const feeDetails = useMemo(() => {
    return getDetailedFeeBreakdown({
      rail,
      bankCategory,
      paymentMethod: f.paymentMethod,
      membersCount: selectedGroupObj?.members.length ?? 5,
    });
  }, [rail, bankCategory, f.paymentMethod, selectedGroupObj]);

  const fee = feeDetails.feeAmount;

  const deliverySpeed = useMemo(() => {
    if ((rail === "bank" && bankCategory === "other") || rail === "ach") {
      const pm = PAYMENT_METHODS.find((m) => m.id === f.paymentMethod);
      if (pm) return pm.speed;
    }
    return RAIL_FACTS[rail]?.arrives || "Same day";
  }, [rail, bankCategory, f.paymentMethod]);

  const rate = RATES[f.wCurrency] ?? 1;
  const papssGhs = roundMoney(num(f.wForeign) * rate);
  const totalDebit = rail === "papss" ? sumMoney([papssGhs, fee]) : sumMoney([currentAmount, fee]);
  const overBalance = rail === "wallet-to-bank" ? totalDebit > 1450 : totalDebit > (account?.available ?? 0);

  // Live external name enquiry / account verification result
  const verifiedAccountName = useMemo(() => {
    if (rail === "bank" || rail === "ach" || rail === "wallet-to-bank") {
      if (bankCategory === "own" && rail !== "wallet-to-bank") return ""; // Internal account transfers don't use external name enquiry
      return resolveAccountName(f.benAcct, f.benName);
    }
    if (rail === "wallet" || rail === "momo") {
      return resolveAccountName(f.wPhone, f.wName);
    }
    if (rail === "proxy") {
      if (f.benName) return f.benName;
      return resolveAccountName(f.pxId, f.pxId.startsWith("@") ? `${f.pxId.replace("@", "").toUpperCase()} Alias` : "");
    }
    if (rail === "data" || rail === "airtime") {
      if (f.benName) return f.benName;
      return resolveAccountName(f.aPhone, "");
    }
    if (rail === "bill") {
      const matchedRecent = RECENT_AVATARS.find(
        (x) => x.rail === "bill" && (x.billerId === f.billerId || x.acct === f.billRef)
      );
      if (matchedRecent && f.billRef === matchedRecent.acct) {
        return `${matchedRecent.name} · ${biller?.name || matchedRecent.bank}`;
      }
      if (f.benName && f.billRef.trim().length >= 4) {
        return `${f.benName} · ${biller?.name || "Biller"}`;
      }
      if (f.billRef.trim().length >= 4) {
        return `${biller?.name || "Biller"} · Ref: ${f.billRef.trim()}`;
      }
      return "";
    }
    if (rail === "ecg") {
      if (f.benName) return f.benName;
      if (f.ecgMeter.trim().length >= 5) {
        return `ECG Prepaid · Meter: ${f.ecgMeter.trim()}`;
      }
      return "";
    }
    if (rail === "ghanagov") {
      if (f.benName) return f.benName;
      if (f.govRef.trim().length >= 5) {
        return `Ghana.gov Invoice · ${f.govRef.trim()}`;
      }
      return "";
    }
    return "";
  }, [
    rail,
    bankCategory,
    f.benAcct,
    f.benName,
    f.wPhone,
    f.wName,
    f.pxId,
    f.aPhone,
    f.billRef,
    biller?.name,
    f.billerId,
    f.ecgMeter,
    f.govRef,
  ]);

  // Overall display name of recipient for Stage 2/3 and receipts
  const recipientDisplayName = useMemo(() => {
    if (rail === "bank" || rail === "ach" || rail === "wallet-to-bank") {
      if (bankCategory === "own" && rail !== "wallet-to-bank") {
        return toOwnAccount ? `${toOwnAccount.name} (••${toOwnAccount.number.slice(-4)})` : "My GCB Account";
      }
      return verifiedAccountName || f.benName || (f.benAcct ? `Account ${f.benAcct}` : "Beneficiary");
    }
    if (rail === "wallet" || rail === "momo") {
      if (walletCategory === "self") return "My Own Wallet (Self)";
      return verifiedAccountName || f.wName || (f.wPhone ? `Wallet ${f.wPhone}` : "Recipient");
    }
    if (rail === "proxy") return verifiedAccountName || f.pxId || "Proxy Recipient";
    if (rail === "papss") return f.wBenName || "International Beneficiary";
    if (rail === "group") return f.groupName || "Group Contribution";
    if (rail === "data") return verifiedAccountName || (f.aPhone ? `Data Bundle (${f.aPhone})` : "Recipient");
    if (rail === "airtime") return verifiedAccountName || (f.aPhone ? `Airtime (${f.aPhone})` : "Recipient");
    if (rail === "card-topup") {
      const card = CARDS.find((c) => c.id === f.cardId);
      return card ? `${card.name} (${card.maskedNumber})` : "Card Top up";
    }
    if (rail === "bill") {
      const matchedRecent = RECENT_AVATARS.find(
        (x) => x.rail === "bill" && (x.billerId === f.billerId || x.acct === f.billRef)
      );
      if (matchedRecent && f.billRef === matchedRecent.acct) {
        return matchedRecent.name;
      }
      return f.benName || biller?.name || "Biller";
    }
    if (rail === "ecg") return "ECG — Electricity";
    if (rail === "ghanagov") return f.govService || "Ghana.gov";
    if (rail === "qr") return f.qrMerchant || "Merchant";
    return f.benName || "Recipient";
  }, [
    rail,
    bankCategory,
    walletCategory,
    toOwnAccount,
    verifiedAccountName,
    f.benAcct,
    f.benName,
    f.wPhone,
    f.wName,
    f.pxId,
    f.wBenName,
    f.groupName,
    f.aPhone,
    f.cardId,
    biller?.name,
    f.billerId,
    f.billRef,
    f.govService,
    f.qrMerchant,
  ]);

  // Subtitle description of recipient for collapsed summary badge
  const recipientSubtitle = useMemo(() => {
    if (rail === "bank" || rail === "ach" || rail === "wallet-to-bank") {
      if (bankCategory === "own" && rail !== "wallet-to-bank") {
        return `GCB Bank • Own Account (••${toOwnAccount?.number?.slice(-4) || "4891"})`;
      }
      return `${f.bank || "GCB Bank"} • ${f.benAcct}`;
    }
    if (rail === "wallet" || rail === "momo") {
      if (walletCategory === "self") return "MTN Mobile Money • 0244 123 821";
      return `${f.wNetwork || "Mobile Money"} • ${f.wPhone}`;
    }
    if (rail === "proxy") return `Proxy • ${f.pxId}`;
    if (rail === "papss") return `${f.wBank} (${f.wCountry}) • ${f.wIban}`;
    if (rail === "data") return `${f.wNetwork || "Mobile Network"} • ${f.aPhone}`;
    if (rail === "airtime") return `${f.wNetwork || "Mobile Network"} • ${f.aPhone}`;
    if (rail === "card-topup") {
      const card = CARDS.find((c) => c.id === f.cardId);
      return card ? `${card.scheme} ${card.type} • Balance: ${formatMoney(card.balance ?? 0, card.currency, true)}` : "Prepaid / Virtual Card";
    }
    if (rail === "bill") return `${biller?.name || "Biller"} • ${f.billRef}`;
    if (rail === "ecg") return `Meter: ${f.ecgMeter}`;
    if (rail === "ghanagov") return `Invoice: ${f.govRef}`;
    if (rail === "group") return f.groupName;
    return f.benAcct || "";
  }, [
    rail,
    bankCategory,
    walletCategory,
    toOwnAccount,
    f.bank,
    f.benAcct,
    f.wNetwork,
    f.wPhone,
    f.pxId,
    f.wBank,
    f.wCountry,
    f.wIban,
    f.aPhone,
    f.cardId,
    biller?.name,
    f.billRef,
    f.ecgMeter,
    f.govRef,
    f.groupName,
  ]);

  // Backwards compatibility alias for components expecting resolvedName
  const resolvedName = recipientDisplayName;

  const reviewAccountLabel = useMemo(() => {
    if (rail === "card-topup") return "Destination Card";
    if (rail === "wallet" || rail === "momo" || rail === "airtime" || rail === "data") {
      return "Phone Number";
    }
    if (rail === "ecg") return "Meter Number";
    if (rail === "bill") return biller?.reference || "Account / Reference";
    if (rail === "ghanagov") return "Invoice / Reference";
    if (rail === "proxy") return "Proxy ID";
    if (rail === "group") return "Split Type";
    return "Account";
  }, [rail, biller?.reference]);

  const reviewAccountValue = useMemo(() => {
    if (bankCategory === "own" && rail !== "wallet-to-bank") return toOwnAccount?.number ? `••••${toOwnAccount.number.slice(-4)}` : "Own Account";
    if (rail === "card-topup") {
      const card = CARDS.find((c) => c.id === f.cardId);
      return card ? `${card.maskedNumber}` : "Card";
    }
    if (rail === "bank" || rail === "ach" || rail === "wallet-to-bank") return f.benAcct;
    if (rail === "wallet" || rail === "momo") return f.wPhone;
    if (rail === "airtime" || rail === "data") return f.aPhone;
    if (rail === "ecg") return f.ecgMeter;
    if (rail === "bill") return f.billRef;
    if (rail === "ghanagov") return f.govRef;
    if (rail === "proxy") return f.pxId;
    if (rail === "group") return selectedGroupObj ? `${selectedGroupObj.members.length} members (${selectedGroupObj.splitType === "equal" ? `GHS ${selectedGroupObj.defaultPerMemberAmount} each` : "Custom"})` : "Group";
    return f.benAcct;
  }, [bankCategory, toOwnAccount?.number, rail, f.benAcct, f.wPhone, f.aPhone, f.ecgMeter, f.billRef, f.govRef, f.pxId, f.cardId, selectedGroupObj]);

  const reviewInstitutionLabel = useMemo(() => {
    if (rail === "card-topup") return "Card Details";
    if (rail === "wallet" || rail === "momo" || rail === "airtime" || rail === "data") {
      return "Network Provider";
    }
    if (rail === "bill" || rail === "ecg") return "Service Provider";
    if (rail === "ghanagov") return "Agency / Service";
    return "Bank";
  }, [rail]);

  const reviewInstitutionValue = useMemo(() => {
    if (rail === "card-topup") {
      const card = CARDS.find((c) => c.id === f.cardId);
      return card ? `${card.scheme} ${card.type} (${card.currency})` : "Prepaid Card";
    }
    if (rail === "bank" || rail === "ach" || rail === "wallet-to-bank") return f.bank || "GCB Bank";
    if (rail === "wallet" || rail === "momo" || rail === "airtime" || rail === "data") return f.wNetwork || "Mobile Money";
    if (rail === "bill") return biller?.name || "Biller";
    if (rail === "ecg") return "Electricity Company of Ghana";
    if (rail === "ghanagov") return f.govService || "Ghana.gov";
    return "";
  }, [rail, f.bank, f.wNetwork, biller?.name, f.govService, f.cardId]);

  // Stage 1 Validation
  const isStage1Valid = useMemo(() => {
    if (resolvingAcct) return false;
    switch (rail) {
      case "bank":
      case "ach":
      case "wallet-to-bank":
        if (rail === "wallet-to-bank") {
          return f.benAcct.replace(/\s/g, "").length >= 8 && Boolean(verifiedAccountName);
        }
        if (bankCategory === "own") {
          return Boolean(f.toOwnAccountId) && f.toOwnAccountId !== f.fromId;
        }
        return f.benAcct.replace(/\s/g, "").length >= 8 && Boolean(verifiedAccountName);
      case "wallet":
      case "momo":
        if (walletCategory === "self") return true;
        return f.wPhone.replace(/\s/g, "").length >= 9 && Boolean(verifiedAccountName);
      case "proxy":
        return f.pxId.trim().length >= 4 && Boolean(verifiedAccountName);
      case "group":
        return Boolean(f.groupName);
      case "papss":
        return f.wBenName.trim().length >= 3 && f.wIban.trim().length >= 6;
      case "data":
        return f.aPhone.replace(/\s/g, "").length >= 9 && Boolean(verifiedAccountName);
      case "airtime":
        return f.aPhone.replace(/\s/g, "").length >= 9 && Boolean(verifiedAccountName);
      case "card-topup":
        return Boolean(f.cardId);
      case "ecg":
        return f.ecgMeter.trim().length >= 5;
      case "bill":
        return Boolean(f.billerId) && f.billRef.trim().length >= 4;
      case "ghanagov":
        return Boolean(f.govService) && f.govRef.trim().length >= 4;
      case "qr":
        return Boolean(f.qrMerchant);
      default:
        return true;
    }
  }, [
    rail,
    bankCategory,
    walletCategory,
    resolvingAcct,
    f.toOwnAccountId,
    f.fromId,
    f.benAcct,
    f.bank,
    verifiedAccountName,
    f.wPhone,
    f.pxId,
    f.groupName,
    f.wBenName,
    f.wIban,
    f.aPhone,
    f.cardId,
    f.ecgMeter,
    f.billRef,
    f.billerId,
    f.govRef,
    f.govService,
    f.qrMerchant,
  ]);

  // Stage 2 Validation
  const isStage2Valid = useMemo(() => {
    return currentAmount > 0 && !overBalance;
  }, [currentAmount, overBalance]);

  const proceedToStage = (nextStage: number) => {
    setStage(nextStage);
    setMaxRevealedStage((prev) => Math.max(prev, nextStage));
  };

  const editStage = (stageToEdit: number) => {
    setStage(stageToEdit);
  };

  const handleLookup = (key: keyof typeof f, rawVal: string, minLength: number = 8) => {
    set(key, rawVal);
    const clean = rawVal.replace(/\s/g, "");
    if (clean.length >= minLength) {
      setResolvingAcct(true);
      setTimeout(() => {
        setResolvingAcct(false);
      }, 300);
    } else {
      setResolvingAcct(false);
    }
  };

  const handlePhoneLookup = (key: "wPhone" | "aPhone" | "benAcct", rawVal: string) => {
    const val = rawVal.replace(/[^\d\s]/g, "");
    handleLookup(key, val, 8);
  };

  const confirm = (codeOverride?: string | string[]) => {
    if (!auth.verify(codeOverride) || phase === "submitting") return;
    setPhase("submitting");
    window.setTimeout(() => {
      const trn = "TRN-" + Math.floor(10000000 + Math.random() * 90000000);
      const d = new Date();
      const isOwnTransfer = rail === "bank" && bankCategory === "own";
      const isDualMandate = account?.isJoint && account?.mandate === "Both to sign";
      const cardObj = rail === "card-topup" ? CARDS.find((c) => c.id === f.cardId) : null;

      if (rail === "card-topup" && f.cardId && currentAmount > 0) {
        fundCard(f.cardId, currentAmount);
      }

      if (f.saveBeneficiary) {
        const benDisplayName = f.beneficiaryNickname?.trim() || resolvedName || f.benName || f.wName || "New Payee";
        let txType: "bank" | "wallet" | "proxy" | "bill" | "airtime" | "papss" = "bank";
        let benCat: "person" | "biller" | "number" = "person";
        let detail = "";
        let bankName = f.bank || "GCB Bank";
        let accountNumber = f.benAcct;
        let phoneNumber = f.wPhone;
        let network = f.wNetwork;
        let billerName = biller?.name;
        let billerReference = f.billRef;

        if (rail === "wallet" || rail === "momo") {
          txType = "wallet";
          benCat = "person";
          network = f.wNetwork || "MTN Mobile Money";
          phoneNumber = f.wPhone;
          detail = `${network} · ${phoneNumber}`;
        } else if (rail === "airtime") {
          txType = "airtime";
          benCat = "number";
          network = f.wNetwork || "MTN";
          phoneNumber = f.aPhone;
          detail = `${network} · ${phoneNumber}`;
        } else if (rail === "data") {
          txType = "wallet";
          benCat = "number";
          network = f.wNetwork || "MTN";
          phoneNumber = f.aPhone;
          detail = `${network} · ${phoneNumber} · ${bundle?.name || "Data Bundle"}`;
        } else if (rail === "proxy") {
          txType = "proxy";
          benCat = "person";
          detail = `Proxy · ${f.pxId}`;
        } else if (rail === "papss") {
          txType = "papss";
          benCat = "person";
          bankName = f.wBank || "International Bank";
          accountNumber = f.wIban;
          detail = `${bankName} · ${f.wCurrency} · ${f.wIban}`;
        } else if (rail === "bill" || rail === "ecg" || rail === "ghanagov") {
          txType = "bill";
          benCat = "biller";
          billerName = rail === "ecg" ? "ECG Prepaid" : rail === "ghanagov" ? (f.govService || "Ghana.gov") : (biller?.name || "Utility Biller");
          billerReference = rail === "ecg" ? f.ecgMeter : rail === "ghanagov" ? f.govRef : f.billRef;
          detail = `${billerName} · ${billerReference}`;
        } else {
          txType = "bank";
          benCat = "person";
          bankName = bankCategory === "gcb" ? "GCB Bank" : (f.bank || "Commercial Bank");
          accountNumber = f.benAcct;
          detail = `${bankName} · ${accountNumber}`;
        }

        useBeneficiariesStore.getState().addBeneficiary({
          name: benDisplayName,
          transactionType: txType,
          category: benCat,
          detail,
          verified: true,
          bankName,
          accountNumber,
          network,
          phoneNumber,
          billerName,
          billerReference,
          label: f.beneficiaryNickname?.trim() || undefined,
        });
      }

      setReceipt({
        pending: Boolean(isDualMandate),
        title: isDualMandate
          ? "Payment Queued — Awaiting Co-Signatory Approval"
          : f.isScheduled
          ? "Payment Successfully Scheduled"
          : isOwnTransfer
          ? "Transfer Between Accounts Successful"
          : rail === "card-topup"
          ? "Card Top-Up Successful"
          : "Transfer Successful",
        msg: isDualMandate
          ? `Your transfer of ${formatMoney(currentAmount, "GHS", true)} from ${account?.name} has been authorized with your PIN. An alert was sent to co-holder Efua Mensah to approve.`
          : f.isScheduled
          ? `Your payment order of ${formatMoney(currentAmount, rail === "papss" ? f.wCurrency : "GHS", true)} to ${resolvedName || "recipient"} is scheduled for execution on ${f.scheduleDate} (${f.scheduleFrequency === "once" ? "One-off" : f.scheduleFrequency}).`
          : isOwnTransfer
          ? `Transferred ${formatMoney(currentAmount, "GHS", true)} to your ${toOwnAccount?.name || "Account"}`
          : rail === "card-topup"
          ? `Topped up ${cardObj?.name || "card"} with ${formatMoney(currentAmount, cardObj?.currency || "GHS", true)}`
          : `Sent ${formatMoney(currentAmount, rail === "papss" ? f.wCurrency : "GHS", true)} to ${resolvedName || "recipient"}`,
        trn,
        date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        recipient: isOwnTransfer ? (toOwnAccount?.name || "My Account") : rail === "card-topup" ? (cardObj?.name || "Card") : (resolvedName || "Recipient"),
        account:
          isOwnTransfer
            ? (toOwnAccount?.number || "")
            : rail === "card-topup"
            ? (cardObj?.maskedNumber || "")
            : rail === "bank"
            ? f.benAcct
            : rail === "wallet" || rail === "data" || rail === "airtime"
            ? f.aPhone || f.wPhone
            : rail === "proxy"
            ? f.pxId
            : rail === "ecg"
            ? f.ecgMeter
            : rail === "bill"
            ? f.billRef
            : rail === "ghanagov"
            ? f.govRef
            : f.benAcct,
        bank:
          rail === "card-topup"
            ? `${cardObj?.scheme || "Visa"} ${cardObj?.type || "Prepaid"}`
            : rail === "bank"
            ? f.bank
            : rail === "wallet" || rail === "data" || rail === "airtime"
            ? f.wNetwork
            : rail === "bill"
            ? (biller?.name || "Biller")
            : "GCB Bank",
        amount: currentAmount,
        fee,
        total: totalDebit,
        narration: f.bankRef || f.wRef || f.pxRef || (rail === "card-topup" ? "Card top up" : rail === "data" ? (bundle?.name || "Data Bundle") : "Online Payment"),
        rows: [
          ...(isDualMandate
            ? ([
                ["Signing Mandate", "Both to Sign (Dual Authorization)"],
                ["Co-Signatory Status", "Pending approval by Efua Mensah"],
              ] as [string, string][])
            : account?.isJoint
            ? ([
                ["Signing Mandate", "Either to Sign (Single Authority - Executed)"],
              ] as [string, string][])
            : []),
          ["Payment Method", isOwnTransfer ? "OWN ACCOUNT TRANSFER" : ((rail === "bank" && bankCategory === "other") || rail === "ach") && f.paymentMethod ? getPaymentMethodName(f.paymentMethod) : rail.toUpperCase()],
          ["Delivery Speed", isDualMandate ? "Upon Co-Signatory Approval" : (f.isScheduled ? `Scheduled for ${f.scheduleDate}` : deliverySpeed)],
          ["Payment Timing", f.isScheduled ? `Scheduled · ${f.scheduleFrequency === "once" ? "One-off" : f.scheduleFrequency.charAt(0).toUpperCase() + f.scheduleFrequency.slice(1)} (${f.scheduleDate})` : "Immediate Transfer"],
          ["Fee", `${feeDetails.feeName}: ${feeDetails.feeAmount === 0 ? "Free (GH₵0.00)" : formatMoney(feeDetails.feeAmount, "GHS", true)}`],
          ...(f.saveBeneficiary ? ([["Beneficiary Saved", `Yes — ${f.beneficiaryNickname || resolvedName || "Saved to Payees"}`]] as [string, string][]) : []),
          ["From Account", `${account?.name} (••${account?.number.slice(-4)})`],
          ...(isOwnTransfer ? ([["To Account", `${toOwnAccount?.name} (••${toOwnAccount?.number.slice(-4)})`]] as [string, string][]) : []),
          ["Reference / Ref Code", trn],
        ],
      });
      recordTransaction({
        id: trn,
        reference: trn,
        date: d.toISOString().slice(0, 10),
        valueDate: d.toISOString().slice(0, 10),
        description: f.bankRef || f.wRef || f.pxRef || (rail === "card-topup" ? "Card top up" : rail === "data" ? (bundle?.name || "Data Bundle") : "Online Payment"),
        counterparty: isOwnTransfer ? (toOwnAccount?.name || "My Account") : rail === "card-topup" ? (cardObj?.name || "Card") : (resolvedName || "Recipient"),
        counterpartyAccount: isOwnTransfer
          ? (toOwnAccount?.number || "")
          : rail === "card-topup"
          ? (cardObj?.maskedNumber || "")
          : rail === "bank"
          ? f.benAcct
          : rail === "wallet" || rail === "data" || rail === "airtime"
          ? f.aPhone || f.wPhone
          : rail === "proxy"
          ? f.pxId
          : rail === "ecg"
          ? f.ecgMeter
          : rail === "bill"
          ? f.billRef
          : rail === "ghanagov"
          ? f.govRef
          : f.benAcct,
        accountId: account?.id || "acc-ret-001",
        currency: rail === "papss" ? f.wCurrency : "GHS",
        amount: currentAmount,
        fee,
        direction: "debit",
        kind: "single",
        state: "completed",
        paymentMethod: rail === "card-topup" ? "card" : rail === "airtime" ? "airtime" : rail === "data" ? "data" : rail === "wallet" ? "momo" : rail === "bill" ? "bill" : rail === "ecg" ? "bill" : rail === "ghanagov" ? "bill" : rail === "papss" ? "papss" : "gip",
        channel: "Internet Banking",
        profileKind: "RETAIL",
        category: rail === "data" || rail === "airtime" ? "Airtime & data" : rail === "bill" || rail === "ecg" ? "Utilities" : "Cash & MoMo",
      });

      setPhase("success");
    }, 1200);
  };

  const getPageTitle = () => {
    if (stage === 2) {
      return "Review";
    }
    if (stage === 3) {
      return "Authorization";
    }
    if (rail === "bill") {
      return billCategory || "GCB Pay";
    }
    if (rail === "bank") {
      if (bankCategory === "own") return "Between My Accounts";
      if (bankCategory === "gcb") return "Other GCB Accounts";
      if (bankCategory === "other") return "Other Local Bank Transfer";
      return "Bank Transfer";
    }
    if (rail === "wallet-to-bank") {
      return "Wallet to Bank Transfer";
    }
    if (rail === "wallet" || rail === "momo") {
      if (walletCategory === "self") return "Send to My Wallet";
      if (walletCategory === "other") return "Send to Other Wallets";
      return "Mobile Money Transfer";
    }
    return RAIL_LABEL[rail] || "Send Money";
  };

  // Submitting Spinner View
  if (phase === "submitting") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-4 py-24 text-center">
        <Loader2 size={36} className="animate-spin text-muted-foreground" />
        <h2 className="text-[20px] font-medium text-foreground">Authorising payment...</h2>
        <p className="text-[13.5px] text-muted-foreground">Please wait while your transaction is securely processed.</p>
      </div>
    );
  }

  // Success Receipt View (Figma Node 1384:58655)
  if (phase === "success" && receipt) {
    return (
      <PaymentSuccessScreen
        title={receipt.title}
        message={receipt.msg}
        transactionId={receipt.trn}
        receiptRows={receipt.rows}
        onViewReceipt={() => router.push(`/transactions/${receipt.trn}`)}
        onSecondaryAction={() => {
          setPhase("form");
          setStage(1);
          setMaxRevealedStage(1);
          setBankCategory(null);
          setWalletCategory(null);
          setBillCategory(null);
          setF((p) => ({
            ...p,
            toOwnAccountId: "",
            benName: "",
            benAcct: "",
            bank: "",
            bankAmount: "",
            bankRef: "",
            wPhone: "",
            wName: "",
            wNetwork: "",
            wAmount: "",
            wRef: "",
            pxId: "",
            pxAmount: "",
            pxRef: "",
            groupName: "",
            grpAmount: "",
            grpRef: "",
            aPhone: "",
            airtimeAmount: "",
            bundleId: "",
            cardId: "",
            cardAmount: "",
            ecgMeter: "",
            ecgAmount: "",
            billerId: "",
            billRef: "",
            billAmount: "",
            govService: "",
            govRef: "",
            govAmount: "",
            qrAmount: "",
            qrRef: "",
            wBenName: "",
            wIban: "",
            wSwift: "",
            wBank: "",
            wCountry: "",
            wForeign: "",
            wireRef: "",
          }));
          auth.reset();
        }}
        secondaryActionLabel="Send another"
        onPrimaryAction={() => router.push("/payments")}
        primaryActionLabel="Back to Overview"
        showSaveBeneficiary={true}
        initialSaveBeneficiary={f.saveBeneficiary}
        onSaveBeneficiaryChange={(saved) => set("saveBeneficiary", saved)}
        onSchedulePayment={() => router.push("/payments/standing/new")}
      />
    );
  }

  // Intermediary Screen: "Which bank do you want to send to?" (Figma Node 837:9937 / 859:23459)
  if (rail === "bank" && !bankCategory) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4 animate-in fade-in duration-200 ease-out">
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => router.push("/payments")}
            className="absolute -left-11 md:-left-12 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Back to Send & Pay"
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </button>
          <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
            Which bank do you want to send to?
          </h1>
        </div>

        {/* Recent Bank Beneficiaries Avatars */}
        <HorizontalScrollStrip>
          {RECENT_AVATARS.filter((item) => item.rail === "bank").map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectBeneficiary(item)}
              className="group flex flex-col items-center gap-2.5 w-[84px] shrink-0 text-center cursor-pointer"
            >
              <span
                className="flex size-14 items-center justify-center rounded-full text-[20px] text-[#111] transition-transform group-hover:scale-105"
                style={{ backgroundColor: item.colorBg || "#f1f8f9" }}
              >
                {item.initials}
              </span>
              <div className="flex flex-col">
                <span className="text-[12px] font-medium text-foreground truncate max-w-[80px]">
                  {item.name.split(" ")[0]}
                </span>
                <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">
                  {item.bank.split(" ")[0]}
                </span>
              </div>
            </button>
          ))}
        </HorizontalScrollStrip>

        {/* 4 Category Cards */}
        <div className="flex flex-col gap-3.5">
          {/* Card 1: Between My Accounts */}
          <button
            type="button"
            onClick={() => {
              setBankCategory("own");
              setF((p) => ({
                ...p,
                bank: "GCB Bank",
                toOwnAccountId: "",
                benAcct: "",
                benName: "My GCB Account",
                bankAmount: "",
                bankRef: "",
              }));
              setStage(1);
              setStage1Collapsed(false);
              setMaxRevealedStage(1);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-foreground dark:shadow-none">
                <ArrowLeftRight size={20} strokeWidth={1.8} />
              </span>
              <div className="flex flex-col">
                <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">Between My Accounts</span>
                <span className="text-[12.5px] text-muted-foreground">Move money between your own GCB accounts (Zero fee)</span>
              </div>
            </div>
            <ChevronRight
              size={20}
              strokeWidth={1.8}
              className="text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
            />
          </button>

          {/* Card 2: Other GCB Accounts */}
          <button
            type="button"
            onClick={() => {
              setBankCategory("gcb");
              setF((p) => ({ ...p, bank: "GCB Bank", benAcct: "", benName: "", bankAmount: "", bankRef: "" }));
              setStage(1);
              setStage1Collapsed(false);
              setMaxRevealedStage(1);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-foreground dark:shadow-none font-medium text-[13px]">
                GCB
              </span>
              <div className="flex flex-col">
                <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">Other GCB Accounts</span>
                <span className="text-[12.5px] text-muted-foreground">Transfer to another GCB Bank customer</span>
              </div>
            </div>
            <ChevronRight
              size={20}
              strokeWidth={1.8}
              className="text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
            />
          </button>

          {/* Card 3: Other Local Banks */}
          <button
            type="button"
            onClick={() => {
              setBankCategory("other");
              setF((p) => ({ ...p, bank: "", benAcct: "", benName: "", paymentMethod: "", bankAmount: "", bankRef: "" }));
              setStage(1);
              setStage1Collapsed(false);
              setMaxRevealedStage(1);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-foreground dark:shadow-none">
                <Landmark size={20} strokeWidth={1.8} />
              </span>
              <div className="flex flex-col">
                <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">Other Local Banks</span>
                <span className="text-[12.5px] text-muted-foreground">Transfer to other banks in Ghana via GhIPSS / ACH</span>
              </div>
            </div>
            <ChevronRight
              size={20}
              strokeWidth={1.8}
              className="text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
            />
          </button>

          {/* Card 4: International */}
          <button
            type="button"
            onClick={() => {
              setBankCategory("international");
              setRail("swift");
              setF((p) => ({ ...p, wCountry: "United States", wCurrency: "USD", wBenName: "", wIban: "", wBank: "", wSwift: "", wForeign: "", wireRef: "" }));
              setStage(1);
              setStage1Collapsed(false);
              setMaxRevealedStage(1);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-foreground dark:shadow-none">
                <Globe size={20} strokeWidth={1.8} />
              </span>
              <div className="flex flex-col">
                <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">International (SWIFT)</span>
                <span className="text-[12.5px] text-muted-foreground">Cross-border wire transfers worldwide via SWIFT</span>
              </div>
            </div>
            <ChevronRight
              size={20}
              strokeWidth={1.8}
              className="text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
            />
          </button>
        </div>
      </div>
    );
  }

  // Intermediary Screen: "Which wallet do you want to send to?"
  if ((rail === "wallet" || rail === "momo") && !walletCategory) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4 animate-in fade-in duration-200 ease-out">
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => router.push("/payments")}
            className="absolute -left-11 md:-left-12 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Back to Send & Pay"
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </button>
          <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
            Which wallet do you want to send to?
          </h1>
        </div>

        {/* Recent Wallet Beneficiaries Avatars */}
        <HorizontalScrollStrip>
          {RECENT_AVATARS.filter((item) => item.rail === "wallet").map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectBeneficiary(item)}
              className="group flex flex-col items-center gap-2.5 w-[84px] shrink-0 text-center cursor-pointer"
            >
              <span
                className="flex size-14 items-center justify-center rounded-full text-[20px] text-[#111] transition-transform group-hover:scale-105"
                style={{ backgroundColor: item.colorBg || "#f1f8f9" }}
              >
                {item.initials}
              </span>
              <div className="flex flex-col">
                <span className="text-[12px] font-medium text-foreground truncate max-w-[80px]">
                  {item.name.split(" ")[0]}
                </span>
                <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">
                  {item.bank.split(" ")[0]}
                </span>
              </div>
            </button>
          ))}
        </HorizontalScrollStrip>

        {/* 2 Category Cards */}
        <div className="flex flex-col gap-3.5">
          {/* Card 1: Send to Self */}
          <button
            type="button"
            onClick={() => {
              setWalletCategory("self");
              setF((p) => ({
                ...p,
                wPhone: "0244123821",
                wName: "Ama Serwaa Mensah",
                wNetwork: "MTN Mobile Money",
                wAmount: "",
                wRef: "",
              }));
              setStage(1);
              setMaxRevealedStage(1);
              setStage1Collapsed(true);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-foreground dark:shadow-none">
                <Smartphone size={20} strokeWidth={1.8} />
              </span>
              <div className="flex flex-col">
                <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">My Own Wallet (Self)</span>
                <span className="text-[12.5px] text-muted-foreground">Transfer to your registered mobile number ({REGISTERED_PHONE})</span>
              </div>
            </div>
            <ChevronRight
              size={20}
              strokeWidth={1.8}
              className="text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
            />
          </button>

          {/* Card 2: Send to Others */}
          <button
            type="button"
            onClick={() => {
              setWalletCategory("other");
              setF((p) => ({
                ...p,
                wPhone: "",
                wName: "",
                wNetwork: "",
                wAmount: "",
                wRef: "",
              }));
              setStage(1);
              setMaxRevealedStage(1);
              setStage1Collapsed(false);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-foreground dark:shadow-none">
                <Users size={20} strokeWidth={1.8} />
              </span>
              <div className="flex flex-col">
                <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">Other Mobile Wallets</span>
                <span className="text-[12.5px] text-muted-foreground">Transfer to any MTN, Telecel, or AT Money wallet in Ghana</span>
              </div>
            </div>
            <ChevronRight
              size={20}
              strokeWidth={1.8}
              className="text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
            />
          </button>
        </div>
      </div>
    );
  }

  // Intermediary Screen: GCB Pay Category Selection Hub (Figma Node 1176:28982)
  if (rail === "bill" && !billCategory) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4 animate-in fade-in duration-200 ease-out">
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => router.push("/payments")}
            className="absolute -left-11 md:-left-12 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Back to Send & Pay"
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </button>
          <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
            GCB Pay
          </h1>
        </div>

        {/* All Recent GCB Pay Beneficiaries Avatars */}
        <HorizontalScrollStrip>
          {RECENT_AVATARS.filter((item) => item.rail === "bill").map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectBeneficiary(item)}
              className="group flex flex-col items-center gap-2.5 w-[84px] shrink-0 text-center cursor-pointer"
            >
              <span
                className="flex size-14 items-center justify-center rounded-full text-[14px] font-semibold text-[#111] transition-transform group-hover:scale-105 shadow-xs border border-black/5 dark:border-white/10"
                style={{ backgroundColor: item.colorBg || "#fef3c7" }}
              >
                {item.initials}
              </span>
              <div className="flex flex-col w-full">
                <span className="text-[12px] font-medium text-foreground truncate w-full">
                  {item.name.split(" ")[0]}
                </span>
                <span className="text-[11px] text-muted-foreground truncate w-full">
                  {item.bank.split(" ")[0]}
                </span>
              </div>
            </button>
          ))}
        </HorizontalScrollStrip>

        {/* 7 Category Cards (2-column Grid matching Figma Node 1176:28982) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GCB_PAY_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setBillCategory(cat.id);
                  setF((p) => ({ ...p, billerId: "", billRef: "", benName: "" }));
                  setStage(1);
                  setStage1Collapsed(false);
                  setMaxRevealedStage(1);
                }}
                className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-foreground dark:shadow-none">
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">
                    {cat.title}
                  </span>
                </div>
                <ChevronRight
                  size={20}
                  strokeWidth={1.8}
                  className="text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Unified Progressive Disclosure Experience across ALL Services
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4 animate-in fade-in duration-200 ease-out">
      {/* Header with back button sitting outside the text */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => {
              if (stage === 3) {
                setStage(2);
              } else if (stage === 2) {
                setStage(1);
              } else if (rail === "bank" && bankCategory) {
                setBankCategory(null);
              } else if ((rail === "wallet" || rail === "momo" || rail === "wallet-to-bank") && walletCategory) {
                setWalletCategory(null);
              } else if (rail === "bill" && billCategory) {
                setBillCategory(null);
              } else {
                router.push("/payments");
              }
            }}
            className="absolute -left-11 md:-left-12 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Back to previous screen"
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </button>
          <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
            {getPageTitle()}
          </h1>
        </div>

        {rail === "bank" && bankCategory === "own" && (
          <button
            type="button"
            aria-label="Help & Information"
            className="flex size-7 items-center justify-center rounded-full bg-[#f2b200] text-black font-semibold text-[13px] shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            ?
          </button>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {/* ===================================================================
         * STAGE 1: Payment Details (Modularized Subcomponents)
         * =================================================================== */}
        {stage === 1 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
            {/* Top-Level Quick Beneficiaries Strip */}
            {activeRailBeneficiaries.length > 0 && bankCategory !== "own" && walletCategory !== "self" && (
              <div className="flex flex-col gap-6 -mb-1 animate-in fade-in duration-150">
                <RailBeneficiaryStrip
                  items={activeRailBeneficiaries}
                  onSelect={selectBeneficiary}
                />
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStage1Collapsed(false);
                      setF((p) => ({
                        ...p,
                        benAcct: "",
                        benName: "",
                        wPhone: "",
                        wName: "",
                        aPhone: "",
                        pxId: "",
                        billRef: "",
                      }));
                    }}
                    className="relative bg-card px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Or enter new details
                  </button>
                </div>
              </div>
            )}

            {/* Flow 1: Between My Accounts */}
            {rail === "bank" && bankCategory === "own" && (
              <OwnAccountFlow
                accounts={accounts}
                state={{
                  fromId: f.fromId,
                  toOwnAccountId: f.toOwnAccountId,
                  amount: f.bankAmount,
                  narration: f.bankRef,
                  category: f.category,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => {
                  if (key === "amount") set("bankAmount", val);
                  else if (key === "narration") set("bankRef", val);
                  else set(key, val);
                }}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 2: Other GCB Accounts */}
            {rail === "bank" && bankCategory === "gcb" && (
              <OtherGcbFlow
                accounts={accounts}
                state={{
                  fromId: f.fromId,
                  benAcct: f.benAcct,
                  benName: f.benName,
                  amount: f.bankAmount,
                  narration: f.bankRef,
                  category: f.category,
                  saveBeneficiary: f.saveBeneficiary,
                  beneficiaryNickname: f.beneficiaryNickname,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => {
                  if (key === "amount") set("bankAmount", val);
                  else if (key === "narration") set("bankRef", val);
                  else set(key, val);
                }}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 3: Other Local Banks */}
            {((rail === "bank" && (bankCategory === "other" || (!bankCategory && rail === "bank"))) || rail === "ach") && (
              <OtherBankFlow
                accounts={accounts}
                state={{
                  fromId: f.fromId,
                  bank: f.bank,
                  benAcct: f.benAcct,
                  benName: f.benName,
                  paymentMethod: f.paymentMethod,
                  amount: f.bankAmount,
                  narration: f.bankRef,
                  category: f.category,
                  saveBeneficiary: f.saveBeneficiary,
                  beneficiaryNickname: f.beneficiaryNickname,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => {
                  if (key === "amount") set("bankAmount", val);
                  else if (key === "narration") set("bankRef", val);
                  else set(key, val);
                }}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 4: Mobile Wallet (Self & Other) */}
            {(rail === "wallet" || rail === "momo") && (
              <MobileWalletFlow
                key={walletCategory || "other"}
                accounts={accounts}
                walletCategory={walletCategory || "other"}
                state={{
                  fromId: f.fromId,
                  wNetwork: walletCategory === "self" ? (f.wNetwork || "MTN Mobile Money") : f.wNetwork,
                  wPhone: f.wPhone,
                  wName: f.wName,
                  amount: f.wAmount,
                  narration: f.wRef,
                  category: f.category,
                  saveBeneficiary: f.saveBeneficiary,
                  beneficiaryNickname: f.beneficiaryNickname,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => {
                  if (key === "amount") set("wAmount", val);
                  else if (key === "narration") set("wRef", val);
                  else set(key, val);
                }}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 5: Mobile Wallet to Bank */}
            {rail === "wallet-to-bank" && (
              <WalletToBankFlow
                state={{
                  bank: f.bank,
                  benAcct: f.benAcct,
                  benName: f.benName,
                  amount: f.bankAmount || f.wAmount,
                  narration: f.bankRef || f.wRef,
                  category: f.category,
                  saveBeneficiary: f.saveBeneficiary,
                  beneficiaryNickname: f.beneficiaryNickname,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => {
                  if (key === "amount") {
                    set("bankAmount", val);
                    set("wAmount", val);
                  } else if (key === "narration") {
                    set("bankRef", val);
                    set("wRef", val);
                  } else set(key, val);
                }}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 6A: Airtime Top-up */}
            {rail === "airtime" && (
              <AirtimeFlow
                accounts={accounts}
                state={{
                  fromId: f.fromId,
                  wNetwork: f.wNetwork,
                  aPhone: f.aPhone,
                  benName: f.benName,
                  amount: f.airtimeAmount,
                  narration: f.bankRef || f.wRef,
                  category: f.category,
                  saveBeneficiary: f.saveBeneficiary,
                  beneficiaryNickname: f.beneficiaryNickname,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => {
                  if (key === "amount") set("airtimeAmount", val);
                  else if (key === "narration") {
                    set("bankRef", val);
                    set("wRef", val);
                  } else set(key, val);
                }}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 6B: Internet Data Bundle */}
            {rail === "data" && (
              <DataBundleFlow
                accounts={accounts}
                state={{
                  fromId: f.fromId,
                  wNetwork: f.wNetwork,
                  aPhone: f.aPhone,
                  benName: f.benName,
                  bundleId: f.bundleId,
                  narration: f.bankRef || f.wRef,
                  category: f.category,
                  saveBeneficiary: f.saveBeneficiary,
                  beneficiaryNickname: f.beneficiaryNickname,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => {
                  if (key === "narration") {
                    set("bankRef", val);
                    set("wRef", val);
                  } else set(key, val);
                }}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 6C: Card Top up */}
            {rail === "card-topup" && (
              <CardTopUpFlow
                accounts={accounts}
                state={{
                  fromId: f.fromId,
                  cardId: f.cardId,
                  amount: f.cardAmount,
                  narration: f.bankRef || f.wRef,
                  category: f.category,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => {
                  if (key === "amount") set("cardAmount", val);
                  else if (key === "narration") {
                    set("bankRef", val);
                    set("wRef", val);
                  } else set(key, val);
                }}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 7: Bills, ECG, Ghana.gov */}
            {(rail === "bill" || rail === "ecg" || rail === "ghanagov") && (
              <BillsPaymentFlow
                accounts={accounts}
                state={{
                  fromId: f.fromId,
                  subType: rail === "ecg" ? "ecg" : rail === "ghanagov" ? "ghanagov" : "bill",
                  billerId: f.billerId,
                  billRef: f.billRef,
                  ecgMeter: f.ecgMeter,
                  govService: f.govService,
                  govRef: f.govRef,
                  benName: f.benName,
                  amount: rail === "ecg" ? f.ecgAmount : rail === "ghanagov" ? f.govAmount : f.billAmount,
                  narration: f.bankRef || f.wRef,
                  category: f.category,
                  saveBeneficiary: f.saveBeneficiary,
                  beneficiaryNickname: f.beneficiaryNickname,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => {
                  if (key === "amount") {
                    if (rail === "ecg") set("ecgAmount", val);
                    else if (rail === "ghanagov") set("govAmount", val);
                    else set("billAmount", val);
                  } else if (key === "narration") {
                    set("bankRef", val);
                    set("wRef", val);
                  } else if (key !== "subType") {
                    set(key, val);
                  }
                }}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 8: SWIFT International Wire */}
            {(rail === "swift" || (bankCategory === "international" && rail !== "papss")) && (
              <InternationalWireFlow
                accounts={accounts}
                state={{
                  fromId: f.fromId,
                  wCountry: f.wCountry || "United States",
                  wCurrency: f.wCurrency || "USD",
                  wBank: f.wBank,
                  wSwift: f.wSwift,
                  wIban: f.wIban,
                  wBenName: f.wBenName,
                  wForeign: f.wForeign,
                  wPurpose: f.wPurpose || "Commercial invoice",
                  category: f.category,
                  saveBeneficiary: f.saveBeneficiary,
                  beneficiaryNickname: f.beneficiaryNickname,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => set(key, val)}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 8b: PAPSS Payments (Standalone Rail) */}
            {rail === "papss" && (
              <PapssPaymentFlow
                accounts={accounts}
                state={{
                  fromId: f.fromId,
                  wCountry: f.wCountry || "Nigeria",
                  wCurrency: f.wCurrency || "NGN",
                  wBank: f.wBank,
                  wIban: f.wIban,
                  wBenName: f.wBenName,
                  wForeign: f.wForeign,
                  wPurpose: f.wPurpose || "Trade settlement",
                  category: f.category,
                  saveBeneficiary: f.saveBeneficiary,
                  beneficiaryNickname: f.beneficiaryNickname,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => set(key, val)}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 9: Group Payments */}
            {rail === "group" && (
              <GroupPaymentFlow
                accounts={accounts}
                groups={groups}
                state={{
                  fromId: f.fromId,
                  groupName: f.groupName,
                  grpAmount: f.grpAmount,
                  narration: f.grpRef,
                  category: f.category,
                }}
                onChange={(key, val) => {
                  if (key === "narration") set("grpRef", val);
                  else set(key, val);
                }}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onOpenCreateGroup={() => setCreateGroupOpen(true)}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}

            {/* Flow 10: Proxy Pay */}
            {rail === "proxy" && (
              <ProxyPayFlow
                accounts={accounts}
                state={{
                  fromId: f.fromId,
                  pxId: f.pxId,
                  benName: f.benName,
                  amount: f.pxAmount,
                  narration: f.pxRef,
                  category: f.category,
                  saveBeneficiary: f.saveBeneficiary,
                  beneficiaryNickname: f.beneficiaryNickname,
                  isScheduled: f.isScheduled,
                  scheduleDate: f.scheduleDate,
                  scheduleFrequency: f.scheduleFrequency,
                  scheduleEndDate: f.scheduleEndDate,
                }}
                onChange={(key, val) => {
                  if (key === "amount") set("pxAmount", val);
                  else if (key === "narration") set("pxRef", val);
                  else set(key, val);
                }}
                detailsCollapsed={stage1Collapsed}
                onToggleCollapsed={setStage1Collapsed}
                onProceed={() => {
                  auth.reset();
                  setStage1Collapsed(true);
                  setStage(2);
                }}
              />
            )}
          </div>
        )}

        {/* ===================================================================
         * STAGE 2: Dedicated Review Screen (Figma Nodes 1253:14800 & 1253:15001)
         * =================================================================== */}
        {stage === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
            <div className="flex flex-col gap-3 items-center justify-center w-full">
              {/* Card 1: Transaction Details */}
              <div className="flex flex-col w-full rounded-[15.75px] border border-border bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
                {/* From Row */}
                <div className="flex items-center justify-between px-4 py-3 w-full">
                  <span className="text-[13.5px] text-muted-foreground">From</span>
                  <span className="text-[13.5px] font-normal text-foreground">
                    {rail === "wallet-to-bank" ? "MTN Mobile Money (•••3821)" : `${account?.name} (•••${account?.number.slice(-4)})`}
                  </span>
                </div>

                {/* To Row */}
                <div className="flex items-center justify-between px-4 py-3 w-full">
                  <span className="text-[13.5px] text-muted-foreground">To</span>
                  <span className="text-[13.5px] font-normal text-foreground">
                    {recipientDisplayName}
                  </span>
                </div>

                {/* Destination Account / Number Row */}
                {reviewAccountValue && (
                  <div className="flex items-center justify-between px-4 py-3 w-full">
                    <span className="text-[13.5px] text-muted-foreground">{reviewAccountLabel}</span>
                    <span className="text-[13.5px] font-normal text-foreground tabular">
                      {reviewAccountValue}
                    </span>
                  </div>
                )}

                {/* Bank / Provider Row */}
                {reviewInstitutionValue && (
                  <div className="flex items-center justify-between px-4 py-3 w-full">
                    <span className="text-[13.5px] text-muted-foreground">{reviewInstitutionLabel}</span>
                    <span className="text-[13.5px] font-normal text-foreground">
                      {reviewInstitutionValue}
                    </span>
                  </div>
                )}

                {/* Payment Method Row */}
                {((rail === "bank" && bankCategory === "other") || rail === "ach") && f.paymentMethod && (
                  <div className="flex items-center justify-between px-4 py-3 w-full">
                    <span className="text-[13.5px] text-muted-foreground">Payment Method</span>
                    <span className="text-[13.5px] font-normal text-foreground">
                      {getPaymentMethodName(f.paymentMethod)}
                    </span>
                  </div>
                )}

                {/* Reference Row */}
                {(f.bankRef || f.wRef || f.pxRef || f.grpRef || (rail === "data" ? bundle?.name : "")) && (
                  <div className="flex items-center justify-between px-4 py-3 w-full">
                    <span className="text-[13.5px] text-muted-foreground">Reference</span>
                    <span className="text-[13.5px] font-normal text-foreground truncate max-w-[220px]">
                      {f.bankRef || f.wRef || f.pxRef || f.grpRef || (rail === "data" ? bundle?.name : "")}
                    </span>
                  </div>
                )}

                {/* Transfer Fee Row */}
                <div className="flex items-center justify-between px-4 py-3 w-full">
                  <span className="text-[13.5px] text-muted-foreground">Transfer Fee</span>
                  <span className="text-[13.5px] font-normal text-foreground">
                    {feeDetails.feeAmount === 0 ? "Free (GH₵0.00)" : `${feeDetails.feeName} · ${formatMoney(feeDetails.feeAmount, "GHS", true)}`}
                  </span>
                </div>

                {/* Payment Timing / Schedule Row */}
                <div className="flex items-center justify-between px-4 py-3 w-full">
                  <span className="text-[13.5px] text-muted-foreground">Payment Timing</span>
                  <span className="text-[13.5px] font-normal text-foreground">
                    {f.isScheduled
                      ? `Scheduled · ${f.scheduleFrequency === "once" ? "One-off" : f.scheduleFrequency.charAt(0).toUpperCase() + f.scheduleFrequency.slice(1)} (${f.scheduleDate})`
                      : "Immediate Transfer"}
                  </span>
                </div>

                {/* Save Beneficiary Row */}
                {f.saveBeneficiary && (
                  <div className="flex items-center justify-between px-4 py-3 w-full">
                    <span className="text-[13.5px] text-muted-foreground">Save Beneficiary</span>
                    <span className="text-[13.5px] font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>Yes {f.beneficiaryNickname ? `(“${f.beneficiaryNickname}”)` : ""}</span>
                    </span>
                  </div>
                )}

                {/* Arrives Row */}
                <div className="flex items-center justify-between px-4 py-3 w-full">
                  <span className="text-[13.5px] text-muted-foreground">Arrives</span>
                  <span className="text-[13.5px] font-normal text-foreground">
                    {f.isScheduled ? `Executes on ${f.scheduleDate}` : deliverySpeed}
                  </span>
                </div>
              </div>

              {/* Divider Line */}
              <div className="w-full border-t border-border/70 my-1" />

              {/* Card 2: Fee Breakdown Container (Collapsible) */}
              <div className="flex flex-col w-full rounded-[15.75px] border border-border bg-card overflow-hidden shadow-xs">
                {/* Toggle Header */}
                <button
                  type="button"
                  onClick={() => setShowFeeBreakdown((prev) => !prev)}
                  className="flex items-center justify-between px-4 py-3 w-full hover:bg-muted/30 transition-colors cursor-pointer text-left"
                >
                  <span className="text-[13.5px] text-foreground font-normal">
                    {showFeeBreakdown ? "Hide Fee Breakdown" : "Show Fee Breakdown"}
                  </span>
                  {showFeeBreakdown ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  )}
                </button>

                {/* Collapsible Content */}
                {showFeeBreakdown && (
                  <div className="flex flex-col w-full border-t border-border/60 divide-y divide-border/60 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between px-4 py-3 w-full">
                      <span className="text-[13.5px] text-muted-foreground">Transfer Amount</span>
                      <span className="text-[13.5px] text-foreground tabular">
                        {formatMoney(currentAmount, rail === "papss" ? f.wCurrency : "GHS", true)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 w-full">
                      <div className="flex flex-col">
                        <span className="text-[13.5px] text-foreground font-medium">{feeDetails.feeName}</span>
                        <span className="text-[11.5px] text-muted-foreground">Standard clearing tariff</span>
                      </div>
                      <span className="text-[13.5px] text-foreground tabular">
                        {feeDetails.feeAmount === 0 ? "Free (GH₵0.00)" : formatMoney(feeDetails.feeAmount, "GHS", true)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 w-full">
                      <span className="text-[13.5px] text-muted-foreground">Bank Service Commission</span>
                      <span className="text-[13.5px] text-foreground tabular">
                        {feeDetails.commissionText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 w-full">
                      <span className="text-[13.5px] text-muted-foreground">Government E-Levy</span>
                      <span className="text-[13.5px] text-foreground tabular">
                        {feeDetails.eLevyText}
                      </span>
                    </div>
                    {rail === "papss" && (
                      <div className="flex items-center justify-between px-4 py-3 w-full">
                        <span className="text-[13.5px] text-muted-foreground">Exchange Rate</span>
                        <span className="text-[13.5px] text-foreground tabular">1 {f.wCurrency} = {rate} GHS</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Total Row (Always displayed!) */}
                <div className="flex items-center justify-between px-4 py-3.5 w-full bg-muted/40 dark:bg-muted/20 border-t border-border/70">
                  <span className="text-[13.5px] text-foreground font-normal">Total Debit</span>
                  <span className="text-[26px] sm:text-[28px] font-semibold text-foreground tracking-[-0.03em] tabular">
                    {formatMoney(totalDebit, "GHS", true)}
                  </span>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[12px] text-muted-foreground text-center px-4 -mt-1">
              {f.isScheduled
                ? "Clicking “Proceed & Schedule” authorizes GCB Bank PLC to schedule the payment order."
                : "Clicking “Proceed to Pay” authorizes GCB Bank PLC to initiate the transaction."}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-4 items-center w-full pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStage(1)}
                className="flex-1 h-11 rounded-lg text-[14px] font-medium border-border"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setPinModalOpen(true);
                }}
                className="flex-1 h-11 rounded-lg text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98] cursor-pointer"
              >
                {f.isScheduled ? "Proceed & Schedule" : "Proceed to Pay"}
              </Button>
            </div>
          </div>
        )}

        {/* Transaction PIN Modal across board matching Figma node 1277:23601 */}
        <TransactionPinModal
          open={pinModalOpen || stage === 3}
          onOpenChange={(isOpen) => {
            setPinModalOpen(isOpen);
            if (!isOpen && stage === 3) setStage(2);
          }}
          onSuccess={(code) => {
            setPinModalOpen(false);
            confirm(code);
          }}
        />

        <CreateGroupModal
          open={createGroupOpen}
          onOpenChange={setCreateGroupOpen}
          onSuccess={(newGroup) => {
            setF((prev) => ({
              ...prev,
              groupName: newGroup.name,
              grpAmount: String(newGroup.defaultPerMemberAmount || prev.grpAmount || 200),
            }));
            setStage1Collapsed(true);
          }}
        />
      </div>
    </div>
  );
}
