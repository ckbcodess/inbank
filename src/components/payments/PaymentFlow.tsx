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

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Landmark,
  Loader2,
  Plus,
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
  BILLERS,
  formatMoney,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { roundMoney, sumMoney } from "@/lib/money";
import { AuthorisePanel } from "./AuthorisePanel";
import { useAuthorisation } from "./useAuthorisation";

export type FlowGroup = "send" | "bills";

export type Rail =
  | "bank"
  | "ach"
  | "wallet"
  | "proxy"
  | "group"
  | "momo"
  | "papss"
  | "wallet-to-bank"
  | "airtime"
  | "data"
  | "ecg"
  | "bill"
  | "ghanagov"
  | "card-topup"
  | "qr"
  | "cardless";

const RATES: Record<string, number> = { NGN: 0.0085, XOF: 0.021, KES: 0.096, ZAR: 0.68, EGP: 0.26 };

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
}

const RECENT_AVATARS: RecentPayeeAvatar[] = [
  // Bank payees
  {
    id: "rec-b1",
    name: "Kwame Boateng",
    bank: "GCB Bank",
    acct: "0231 4455 8890",
    initials: "K",
    rail: "bank",
    colorBg: "#f1f8f9",
  },
  {
    id: "rec-b2",
    name: "Abena Osei",
    bank: "Stanbic Bank",
    acct: "1089 3322 1100",
    initials: "A",
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
  },
  {
    id: "rec-w2",
    name: "Yaw Mensah",
    bank: "Telecel Cash",
    acct: "0201 987 654",
    initials: "YM",
    rail: "wallet",
  },
  {
    id: "rec-w3",
    name: "Kofi Boateng",
    bank: "AT Money",
    acct: "0277 456 789",
    initials: "KB",
    rail: "wallet",
  },

  // Proxy payees
  {
    id: "rec-px1",
    name: "Kwame Boateng",
    bank: "@kwame.b",
    acct: "@kwame.b",
    initials: "KB",
    rail: "proxy",
  },
  {
    id: "rec-px2",
    name: "Ama Serwaa",
    bank: "@ama.serwaa",
    acct: "@ama.serwaa",
    initials: "AS",
    rail: "proxy",
  },

  // Bills
  {
    id: "rec-bill1",
    name: "Lester Adjei",
    bank: "ECG Prepaid",
    acct: "P-8839210",
    initials: "LA",
    rail: "bill",
  },
  {
    id: "rec-bill2",
    name: "Ghana Water",
    bank: "GWCL Water",
    acct: "GW-440291",
    initials: "GW",
    rail: "bill",
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

export function PaymentFlow({ group }: { group: FlowGroup }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeProfile = useSession((s) => s.activeProfile);
  const accounts = useMemo(() => accountsForProfile(activeProfile?.kind), [activeProfile?.kind]);

  const auth = useAuthorisation();

  const [rail, setRail] = useState<Rail>("bank");
  const [bankCategory, setBankCategory] = useState<"own" | "gcb" | "other" | "international" | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // Progressive Disclosure Stage Control (1..4)
  const [stage, setStage] = useState<number>(1);
  const [maxRevealedStage, setMaxRevealedStage] = useState<number>(1);
  const [stage1Collapsed, setStage1Collapsed] = useState(false);
  const [resolvingAcct, setResolvingAcct] = useState(false);
  const [f, setF] = useState({
    fromId: accounts[0]?.id ?? "",
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

  useEffect(() => {
    const r = searchParams.get("rail") as Rail | null;
    const recipientParam = searchParams.get("recipient");
    const productParam = searchParams.get("product") as "airtime" | "data" | null;
    const categoryParam = searchParams.get("category") as string | null;

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

    if (categoryParam === "own" || categoryParam === "between-accounts") {
      setBankCategory("own");
      setF((p) => ({ ...p, toOwnAccountId: "", bank: "GCB Bank" }));
    } else if (categoryParam === "gcb" || categoryParam === "other-gcb") {
      setBankCategory("gcb");
    } else if (categoryParam === "other") {
      setBankCategory("other");
    } else if (categoryParam === "international" || r === "papss") {
      setBankCategory("international");
    } else if (r === "ach") {
      setRail("ach");
    }

    if (recipientParam) {
      handleLookup("benAcct", recipientParam, 8);
    }
  }, [searchParams, group, accounts]);

  const set = (k: keyof typeof f, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const account = accounts.find((a) => a.id === f.fromId) ?? accounts[0];
  const toOwnAccount = accounts.find((a) => a.id === f.toOwnAccountId);

  const availableBundles = useMemo(() => {
    return BUNDLES_BY_NETWORK[f.wNetwork] ?? BUNDLES_BY_NETWORK["MTN Mobile Money"] ?? [];
  }, [f.wNetwork]);

  const bundle = useMemo(() => {
    return availableBundles.find((b) => b.id === f.bundleId);
  }, [availableBundles, f.bundleId]);

  const biller = BILLERS.find((b) => b.id === f.billerId);

  const num = (v: string) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
  const groupTotal = sumMoney(lines.map((l) => num(l.amount)));

  const currentAmount = useMemo(() => {
    switch (rail) {
      case "bank":
      case "ach":
        return num(f.bankAmount);
      case "wallet":
      case "momo":
      case "wallet-to-bank":
        return num(f.wAmount);
      case "proxy":
        return num(f.pxAmount);
      case "group":
        return num(f.grpAmount) * 5;
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
  ]);

  const fee = rail
    ? rail === "group"
      ? roundMoney(RAIL_FACTS.group.fee * 5)
      : rail === "bank" && (bankCategory === "own" || bankCategory === "gcb")
      ? 0
      : RAIL_FACTS[rail]?.fee ?? 0
    : 0;

  const rate = RATES[f.wCurrency] ?? 1;
  const papssGhs = roundMoney(num(f.wForeign) * rate);
  const totalDebit = rail === "papss" ? sumMoney([papssGhs, fee]) : sumMoney([currentAmount, fee]);
  const overBalance = totalDebit > (account?.available ?? 0);

  // Live external name enquiry / account verification result
  const verifiedAccountName = useMemo(() => {
    if (rail === "bank" || rail === "ach") {
      if (bankCategory === "own") return ""; // Internal account transfers don't use external name enquiry
      return resolveAccountName(f.benAcct, f.benName);
    }
    if (rail === "wallet" || rail === "momo" || rail === "wallet-to-bank") {
      return resolveAccountName(f.wPhone, f.wName);
    }
    if (rail === "proxy") {
      return resolveAccountName(f.pxId, f.pxId.startsWith("@") ? `${f.pxId.replace("@", "").toUpperCase()} Alias` : "");
    }
    if (rail === "data" || rail === "airtime") {
      return resolveAccountName(f.aPhone, "");
    }
    if (rail === "bill") {
      if (f.billRef.trim().length >= 5) {
        return `${biller?.name || "Biller"} · Acct Ref: ${f.billRef.trim()}`;
      }
      return "";
    }
    if (rail === "ecg") {
      if (f.ecgMeter.trim().length >= 5) {
        return `ECG Prepaid · Meter: ${f.ecgMeter.trim()}`;
      }
      return "";
    }
    if (rail === "ghanagov") {
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
    f.ecgMeter,
    f.govRef,
  ]);

  // Overall display name of recipient for Stage 2/3 and receipts
  const recipientDisplayName = useMemo(() => {
    if (rail === "bank" || rail === "ach") {
      if (bankCategory === "own") {
        return toOwnAccount ? `${toOwnAccount.name} (••${toOwnAccount.number.slice(-4)})` : "My GCB Account";
      }
      return verifiedAccountName || f.benName || (f.benAcct ? `Account ${f.benAcct}` : "Beneficiary");
    }
    if (rail === "wallet" || rail === "momo" || rail === "wallet-to-bank") {
      return verifiedAccountName || f.wName || (f.wPhone ? `Wallet ${f.wPhone}` : "Recipient");
    }
    if (rail === "proxy") return verifiedAccountName || f.pxId || "Proxy Recipient";
    if (rail === "papss") return f.wBenName || "International Beneficiary";
    if (rail === "group") return f.groupName || "Group Contribution";
    if (rail === "data" || rail === "airtime") return verifiedAccountName || (f.aPhone ? `Mobile ${f.aPhone}` : "Recipient");
    if (rail === "card-topup") return f.cardId ? (f.cardId === "card-p1" ? "GCB Prepaid Travel Card (••8892)" : "GCB Virtual Card (••4101)") : "Select Card";
    if (rail === "bill") return biller?.name || "Biller";
    if (rail === "ecg") return "ECG — Electricity";
    if (rail === "ghanagov") return f.govService || "Ghana.gov";
    if (rail === "qr") return f.qrMerchant || "Merchant";
    return f.benName || "Recipient";
  }, [
    rail,
    bankCategory,
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
    f.govService,
    f.qrMerchant,
  ]);

  // Subtitle description of recipient for collapsed summary badge
  const recipientSubtitle = useMemo(() => {
    if (rail === "bank" || rail === "ach") {
      if (bankCategory === "own") {
        return `GCB Bank • Own Account (••${toOwnAccount?.number?.slice(-4) || "4891"})`;
      }
      return `${f.bank} • ${f.benAcct}`;
    }
    if (rail === "wallet" || rail === "momo" || rail === "wallet-to-bank") {
      return `${f.wNetwork} • ${f.wPhone}`;
    }
    if (rail === "proxy") return `Proxy • ${f.pxId}`;
    if (rail === "papss") return `${f.wBank} (${f.wCountry}) • ${f.wIban}`;
    if (rail === "data") return `${f.wNetwork} • ${f.aPhone}`;
    if (rail === "airtime") return `${f.wNetwork || "Mobile"} • ${f.aPhone}`;
    if (rail === "card-topup") return f.cardId === "card-p1" ? "USD 350.00 Balance" : "GHS 1,420.00 Balance";
    if (rail === "bill") return `${biller?.name || "Biller"} • ${f.billRef}`;
    if (rail === "ecg") return `Meter: ${f.ecgMeter}`;
    if (rail === "ghanagov") return `Invoice: ${f.govRef}`;
    if (rail === "group") return f.groupName;
    return f.benAcct || "";
  }, [
    rail,
    bankCategory,
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

  // Stage 1 Validation
  const isStage1Valid = useMemo(() => {
    if (resolvingAcct) return false;
    switch (rail) {
      case "bank":
      case "ach":
        if (bankCategory === "own") {
          return Boolean(f.toOwnAccountId) && f.toOwnAccountId !== f.fromId;
        }
        return f.benAcct.replace(/\s/g, "").length >= 8 && Boolean(verifiedAccountName);
      case "wallet":
      case "momo":
      case "wallet-to-bank":
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
        return f.billRef.trim().length >= 4;
      case "ghanagov":
        return f.govRef.trim().length >= 4;
      case "qr":
        return Boolean(f.qrMerchant);
      default:
        return true;
    }
  }, [
    rail,
    bankCategory,
    resolvingAcct,
    f.toOwnAccountId,
    f.fromId,
    f.benAcct,
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
    f.govRef,
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

  const confirm = () => {
    if (!auth.verify() || phase === "submitting") return;
    setPhase("submitting");
    window.setTimeout(() => {
      const trn = "TRN-" + Math.floor(10000000 + Math.random() * 90000000);
      const d = new Date();
      const isOwnTransfer = rail === "bank" && bankCategory === "own";
      const isDualMandate = account?.isJoint && account?.mandate === "Both to sign";

      setReceipt({
        pending: Boolean(isDualMandate),
        title: isDualMandate
          ? "Payment Queued — Awaiting Co-Signatory Approval"
          : isOwnTransfer
          ? "Transfer Between Accounts Successful"
          : "Transfer Successful",
        msg: isDualMandate
          ? `Your transfer of ${formatMoney(currentAmount, "GHS", true)} from ${account?.name} has been authorized with your PIN. An alert was sent to co-holder Efua Mensah to approve.`
          : isOwnTransfer
          ? `Transferred ${formatMoney(currentAmount, "GHS", true)} to your ${toOwnAccount?.name || "Account"}`
          : `Sent ${formatMoney(currentAmount, rail === "papss" ? f.wCurrency : "GHS", true)} to ${resolvedName || "recipient"}`,
        trn,
        date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        recipient: isOwnTransfer ? (toOwnAccount?.name || "My Account") : (resolvedName || "Recipient"),
        account:
          isOwnTransfer
            ? (toOwnAccount?.number || "")
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
          rail === "bank"
            ? f.bank
            : rail === "wallet" || rail === "data" || rail === "airtime"
            ? f.wNetwork
            : rail === "bill"
            ? (biller?.name || "Biller")
            : "GCB Bank",
        amount: currentAmount,
        fee,
        total: totalDebit,
        narration: f.bankRef || f.wRef || f.pxRef || (rail === "data" ? (bundle?.name || "Data Bundle") : "Online Payment"),
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
          ["Payment Method", isOwnTransfer ? "OWN ACCOUNT TRANSFER" : rail.toUpperCase()],
          ["Delivery Speed", isDualMandate ? "Upon Co-Signatory Approval" : (RAIL_FACTS[rail]?.arrives ?? "Instantly")],
          ["From Account", `${account?.name} (••${account?.number.slice(-4)})`],
          ...(isOwnTransfer ? ([["To Account", `${toOwnAccount?.name} (••${toOwnAccount?.number.slice(-4)})`]] as [string, string][]) : []),
          ["Reference / Ref Code", trn],
        ],
      });
      setPhase("success");
    }, 1200);
  };

  const getPageTitle = () => {
    if (stage === 2) {
      if (rail === "airtime" || rail === "data") return "Review Purchase";
      if (rail === "bill" || rail === "ecg" || rail === "ghanagov") return "Review Payment";
      return "Review Transfer";
    }
    if (rail === "bank") {
      if (bankCategory === "own") return "Between My Accounts";
      if (bankCategory === "gcb") return "Other GCB Accounts";
      if (bankCategory === "other") return "Other Local Bank Transfer";
      return "Bank Transfer";
    }
    return RAIL_LABEL[rail] || "Send Money";
  };

  // Submitting Spinner View
  if (phase === "submitting") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-4 py-24 text-center">
        <Loader2 size={36} className="animate-spin text-primary" />
        <h2 className="text-[20px] font-medium text-foreground">Authorising payment...</h2>
        <p className="text-[13.5px] text-muted-foreground">Please wait while your transaction is securely processed.</p>
      </div>
    );
  }

  // Success Receipt View
  if (phase === "success" && receipt) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4 animate-in fade-in duration-200">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-3">
            <CheckCircle2 size={32} strokeWidth={2.2} />
          </span>
          <h1 className="text-[24px] font-medium text-foreground">{receipt.title}</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{receipt.msg}</p>
        </div>

        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card p-5 text-[13.5px]">
          {receipt.rows.map(([label, val]) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground text-right">{val}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setPhase("form");
              setStage(1);
              setMaxRevealedStage(1);
              setF((p) => ({
                ...p,
                benName: "",
                benAcct: "",
                bankAmount: "",
                bankRef: "",
                wPhone: "",
                wName: "",
                wAmount: "",
                wRef: "",
                pxId: "",
                pxAmount: "",
                pxRef: "",
                aPhone: "",
                airtimeAmount: "",
                cardAmount: "",
                ecgMeter: "",
                ecgAmount: "",
                billRef: "",
                billAmount: "",
                govRef: "",
                govAmount: "",
                qrAmount: "",
                qrRef: "",
                wBenName: "",
                wIban: "",
                wForeign: "",
                wireRef: "",
              }));
              auth.reset();
            }}
          >
            Send another
          </Button>
          <Button className="flex-1" onClick={() => router.push("/payments")}>
            Done
          </Button>
        </div>
      </div>
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
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-2 scrollbar-none">
          {RECENT_AVATARS.filter((item) => item.rail === "bank").map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setF((p) => ({ ...p, benName: item.name, benAcct: item.acct, bank: item.bank }));
                setBankCategory(item.bank.includes("GCB") ? "gcb" : "other");
                setStage(2);
              }}
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

          <Link
            href="/payments/payees"
            className="group flex flex-col items-center gap-2.5 w-[84px] shrink-0 text-center"
          >
            <span className="flex size-14 items-center justify-center rounded-full border border-dashed border-border bg-transparent text-muted-foreground transition-colors group-hover:border-primary group-hover:text-primary">
              <Plus size={20} strokeWidth={1.8} />
            </span>
            <span className="text-[12px] text-muted-foreground group-hover:text-primary">See All</span>
          </Link>
        </div>

        {/* 4 Category Cards */}
        <div className="flex flex-col gap-3.5">
          {/* Card 1: Between My Accounts */}
          <button
            type="button"
            onClick={() => {
              const defaultDest = accounts.find((a) => a.id !== f.fromId)?.id ?? accounts[1]?.id ?? accounts[0]?.id ?? "";
              setBankCategory("own");
              setF((p) => ({
                ...p,
                bank: "GCB Bank",
                toOwnAccountId: defaultDest,
                benAcct: "",
                benName: "My GCB Account",
                bankAmount: "",
                bankRef: "",
              }));
              setStage(1);
              setMaxRevealedStage(1);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-amber-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-[#fdc307] dark:shadow-none">
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
              setMaxRevealedStage(1);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-amber-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-[#fdc307] dark:shadow-none font-medium text-[13px]">
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
              setF((p) => ({ ...p, bank: "Standard Bank Ghana", benAcct: "", benName: "", bankAmount: "", bankRef: "" }));
              setStage(1);
              setMaxRevealedStage(1);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-amber-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-[#fdc307] dark:shadow-none">
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
              setRail("papss");
              setF((p) => ({ ...p, wBenName: "", wIban: "", wBank: "Access Bank Nigeria", wForeign: "", wireRef: "" }));
              setStage(1);
              setMaxRevealedStage(1);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-amber-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-[#fdc307] dark:shadow-none">
                <Globe size={20} strokeWidth={1.8} />
              </span>
              <div className="flex flex-col">
                <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">International (PAPSS / Swift)</span>
                <span className="text-[12.5px] text-muted-foreground">Cross-border transfers across Africa and abroad</span>
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

  // Unified Progressive Disclosure Experience across ALL Services
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4 animate-in fade-in duration-200 ease-out">
      {/* Header with back button sitting outside the text */}
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => {
            if (stage === 2) {
              setStage(1);
            } else if (rail === "bank" && bankCategory) {
              setBankCategory(null);
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

      <div className="flex flex-col gap-8">
        {/* ===================================================================
         * STAGE 1: Payment Details (Recipient + Auto-Disclosed Amount & Live Summary)
         * =================================================================== */}
        {stage === 1 && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-200 ease-out">
            {/* 1. Recipient Section */}
            <div className="flex flex-col gap-2">
              <div className="text-[16px] font-medium text-foreground tracking-[-0.01em]">
                1. {bankCategory === "own" ? "Destination Account" : rail === "bill" || rail === "ecg" || rail === "ghanagov" ? "Biller & Account" : "Recipient"}
              </div>

              {isStage1Valid && stage1Collapsed ? (
                /* Confirmed Read-Only Summary Badge (Collapsed after user clicks amount) */
                <div className="flex h-[68px] items-center justify-between rounded-xl border border-border bg-muted/40 dark:bg-muted/20 px-4 py-2 transition-all animate-in fade-in duration-150 ease-out">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                    <div className="flex flex-col min-w-0 text-left">
                      <span className="text-[16px] text-foreground font-medium tracking-[-0.08px] truncate">
                        {recipientDisplayName}
                      </span>
                      <span className="text-[12px] text-muted-foreground truncate">
                        {recipientSubtitle}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStage1Collapsed(false)}
                    className="text-[14px] text-foreground hover:underline cursor-pointer ml-3 shrink-0"
                  >
                    Change
                  </button>
                </div>
              ) : (
                /* Active Editable Form */
                <div className="flex flex-col gap-3.5 pt-1 animate-in fade-in duration-150 ease-out">
                  {(rail === "bank" || rail === "ach") && (
                    <>
                      {bankCategory === "own" ? (
                        <div className="flex flex-col gap-3.5">
                          <div className="flex flex-col gap-1.5">
                            <span className={labelCls}>Transfer To (My Destination Account)</span>
                            <Select
                              value={f.toOwnAccountId}
                              onValueChange={(val) => val && set("toOwnAccountId", val)}
                            >
                              <SelectTrigger className="h-auto min-h-[68px] py-3.5 px-4 w-full rounded-2xl border border-border bg-card dark:bg-[#181818] hover:border-primary/50 text-left cursor-pointer transition-colors">
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/80 text-foreground dark:bg-[#252525]">
                                    <Landmark size={18} strokeWidth={1.8} />
                                  </span>
                                  <div className="flex flex-col min-w-0 text-left gap-0.5">
                                    {toOwnAccount ? (
                                      <>
                                        <span className="text-[15px] text-foreground font-medium tracking-[-0.01em] truncate leading-tight">
                                          {toOwnAccount.name} ••{toOwnAccount.number?.slice(-4)}
                                        </span>
                                        <span className="text-[13px] text-muted-foreground font-normal truncate tabular leading-tight">
                                          {formatMoney(toOwnAccount.available ?? 0, toOwnAccount.currency ?? "GHS", true)}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-[15px] text-muted-foreground font-medium tracking-[-0.01em] truncate leading-tight">
                                          Select destination account
                                        </span>
                                        <span className="text-[12.5px] text-muted-foreground/70 font-normal truncate leading-tight">
                                          Choose from your GCB accounts
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map((a) => (
                                  <SelectItem key={a.id} value={a.id} disabled={a.id === f.fromId}>
                                    {a.name} ({a.number}) — {formatMoney(a.available, a.currency, true)} {a.id === f.fromId ? "(Sending Account)" : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {f.toOwnAccountId && f.toOwnAccountId === f.fromId && (
                            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-[12.5px] text-destructive">
                              <AlertCircle size={14} className="shrink-0" />
                              <span>Destination account must be different from source account.</span>
                            </div>
                          )}

                          {toOwnAccount && f.toOwnAccountId !== f.fromId && (
                            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[12.5px] text-foreground dark:bg-emerald-500/10">
                              <span className="font-medium text-foreground">
                                {toOwnAccount.name} ({toOwnAccount.number})
                              </span>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                ✓ Own Account Verified
                              </span>
                            </div>
                          )}
                        </div>
                      ) : bankCategory === "gcb" ? (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <span className={labelCls}>Destination Bank</span>
                            <div className="flex h-11 items-center rounded-xl border border-border bg-muted/30 px-3.5 text-[15px] font-medium text-foreground">
                              GCB Bank PLC
                            </div>
                          </div>

                          <label className="flex flex-col gap-1.5">
                            <span className={labelCls}>GCB Account Number</span>
                            <input
                              className={inputCls + " tabular"}
                              value={f.benAcct}
                              onChange={(e) => handlePhoneLookup("benAcct", e.target.value)}
                              placeholder="Enter 10-13 digit GCB account number..."
                              autoFocus
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <span className={labelCls}>Destination Bank</span>
                            <Select
                              value={f.bank}
                              onValueChange={(val) => val && set("bank", val)}
                            >
                              <SelectTrigger className="h-11 w-full">
                                <SelectValue placeholder="Select destination bank" />
                              </SelectTrigger>
                              <SelectContent>
                                {BANKS.filter((b) => !b.includes("GCB")).map((b) => (
                                  <SelectItem key={b} value={b}>{b}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <label className="flex flex-col gap-1.5">
                            <span className={labelCls}>Account Number</span>
                            <input
                              className={inputCls + " tabular"}
                              value={f.benAcct}
                              onChange={(e) => handlePhoneLookup("benAcct", e.target.value)}
                              placeholder="Enter 10-13 digit account number..."
                              autoFocus
                            />
                          </label>
                        </>
                      )}
                    </>
                  )}

                  {(rail === "wallet" || rail === "momo" || rail === "wallet-to-bank") && (
                    <>
                      <label className="flex flex-col gap-1.5">
                        <span className={labelCls}>Recipient Phone Number</span>
                        <input
                          className={inputCls + " tabular"}
                          value={f.wPhone}
                          onChange={(e) => {
                            handlePhoneLookup("wPhone", e.target.value);
                            set("wNetwork", detectNetwork(e.target.value));
                          }}
                          placeholder="0244 000 000"
                          autoFocus
                        />
                      </label>

                      <div className="flex flex-col gap-1.5">
                        <span className={labelCls}>Network Provider</span>
                        <Select
                          value={f.wNetwork}
                          onValueChange={(val) => val && set("wNetwork", val)}
                        >
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder="Select network" />
                          </SelectTrigger>
                          <SelectContent>
                            {NETWORKS.map((n) => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {rail === "proxy" && (
                    <label className="flex flex-col gap-1.5">
                      <span className={labelCls}>Proxy ID (Phone, @Alias, or Ghana Card)</span>
                      <input
                        className={inputCls}
                        value={f.pxId}
                        onChange={(e) => handleLookup("pxId", e.target.value, 4)}
                        placeholder="e.g. @kwame.b or GHA-000000000-0"
                        autoFocus
                      />
                    </label>
                  )}

                  {rail === "group" && (
                    <div className="flex flex-col gap-1.5">
                      <span className={labelCls}>Select Group</span>
                      <Select
                        value={f.groupName}
                        onValueChange={(val) => val && set("groupName", val)}
                      >
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue placeholder="Select contribution circle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Family Contribution Circle (5 Members)">Family Contribution Circle (5 Members)</SelectItem>
                          <SelectItem value="Colleagues Susu Circle (10 Members)">Colleagues Susu Circle (10 Members)</SelectItem>
                          <SelectItem value="Welfare Fund (12 Members)">Welfare Fund (12 Members)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {rail === "papss" && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <span className={labelCls}>Destination Country & Currency</span>
                        <Select
                          value={f.wCountry}
                          onValueChange={(country) => {
                            if (!country) return;
                            const curr = country === "Nigeria" ? "NGN" : country === "Kenya" ? "KES" : country === "South Africa" ? "ZAR" : "XOF";
                            set("wCountry", country);
                            set("wCurrency", curr);
                          }}
                        >
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder="Select country & currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Nigeria">Nigeria (NGN - Nigerian Naira)</SelectItem>
                            <SelectItem value="Côte d'Ivoire">Côte d&apos;Ivoire (XOF - West African CFA)</SelectItem>
                            <SelectItem value="Kenya">Kenya (KES - Kenyan Shilling)</SelectItem>
                            <SelectItem value="South Africa">South Africa (ZAR - South African Rand)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <label className="flex flex-col gap-1.5">
                        <span className={labelCls}>Beneficiary Full Name</span>
                        <input
                          className={inputCls}
                          value={f.wBenName}
                          onChange={(e) => set("wBenName", e.target.value)}
                          placeholder="e.g. Lagos Textile Mills"
                          autoFocus
                        />
                      </label>

                      <label className="flex flex-col gap-1.5">
                        <span className={labelCls}>Destination Bank Name</span>
                        <input
                          className={inputCls}
                          value={f.wBank}
                          onChange={(e) => set("wBank", e.target.value)}
                          placeholder="e.g. Access Bank Nigeria"
                        />
                      </label>

                      <label className="flex flex-col gap-1.5">
                        <span className={labelCls}>Account / IBAN Number</span>
                        <input
                          className={inputCls + " tabular"}
                          value={f.wIban}
                          onChange={(e) => set("wIban", e.target.value)}
                          placeholder="e.g. NG-8891-40023-77"
                        />
                      </label>
                    </>
                  )}

                  {rail === "data" && (
                    <>
                      <label className="flex flex-col gap-1.5">
                        <span className={labelCls}>Phone Number</span>
                        <input
                          className={inputCls + " tabular"}
                          value={f.aPhone}
                          onChange={(e) => {
                            const val = e.target.value;
                            handlePhoneLookup("aPhone", val);
                            if (val.replace(/\s/g, "").length >= 3) {
                              const net = detectNetwork(val);
                              set("wNetwork", net);
                              const firstBundle = BUNDLES_BY_NETWORK[net]?.[0]?.id;
                              if (firstBundle) set("bundleId", firstBundle);
                            }
                          }}
                          placeholder="0244 000 000"
                          autoFocus
                        />
                      </label>

                      {f.aPhone.replace(/\s/g, "").length >= 3 && (
                        <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                          <span className={labelCls}>Network Provider</span>
                          <Select
                            value={f.wNetwork}
                            onValueChange={(net) => {
                              if (!net) return;
                              set("wNetwork", net);
                              const firstBundle = BUNDLES_BY_NETWORK[net]?.[0]?.id;
                              if (firstBundle) set("bundleId", firstBundle);
                            }}
                          >
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="Select network" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(BUNDLES_BY_NETWORK).map((n) => (
                                <SelectItem key={n} value={n}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}

                  {rail === "airtime" && (
                    <>
                      <label className="flex flex-col gap-1.5">
                        <span className={labelCls}>Phone Number</span>
                        <input
                          className={inputCls + " tabular"}
                          value={f.aPhone}
                          onChange={(e) => {
                            const val = e.target.value;
                            handlePhoneLookup("aPhone", val);
                            if (val.replace(/\s/g, "").length >= 3) {
                              const net = detectNetwork(val);
                              set("wNetwork", net);
                            }
                          }}
                          placeholder="0244 000 000"
                          autoFocus
                        />
                      </label>

                      {f.aPhone.replace(/\s/g, "").length >= 3 && (
                        <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                          <span className={labelCls}>Network Provider</span>
                          <Select
                            value={f.wNetwork}
                            onValueChange={(net) => {
                              if (!net) return;
                              set("wNetwork", net);
                            }}
                          >
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="Select network" />
                            </SelectTrigger>
                            <SelectContent>
                              {NETWORKS.map((n) => (
                                <SelectItem key={n} value={n}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}

                  {rail === "card-topup" && (
                    <div className="flex flex-col gap-1.5">
                      <span className={labelCls}>Select Card to Fund</span>
                      <Select
                        value={f.cardId}
                        onValueChange={(val) => val && set("cardId", val)}
                      >
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue placeholder="Select card" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="card-v1">GCB Virtual Card (••4101) — Balance: GHS 1,420.00</SelectItem>
                          <SelectItem value="card-p1">GCB Prepaid Travel Card (••8892) — Balance: USD 350.00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {rail === "ecg" && (
                    <label className="flex flex-col gap-1.5">
                      <span className={labelCls}>ECG Meter Number</span>
                      <input
                        className={inputCls + " tabular"}
                        value={f.ecgMeter}
                        onChange={(e) => handleLookup("ecgMeter", e.target.value, 5)}
                        placeholder="e.g. P-8839210"
                        autoFocus
                      />
                    </label>
                  )}

                  {rail === "bill" && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <span className={labelCls}>Select Biller</span>
                        <Select
                          value={f.billerId}
                          onValueChange={(val) => val && set("billerId", val)}
                        >
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder="Select biller" />
                          </SelectTrigger>
                          <SelectContent>
                            {BILLERS.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name} ({b.category})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <label className="flex flex-col gap-1.5">
                        <span className={labelCls}>Customer / Account / Reference Number</span>
                        <input
                          className={inputCls}
                          value={f.billRef}
                          onChange={(e) => handleLookup("billRef", e.target.value, 4)}
                          placeholder="e.g. GW-440291 or DSTV SmartCard No."
                          autoFocus
                        />
                      </label>
                    </>
                  )}

                  {rail === "ghanagov" && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <span className={labelCls}>Government Agency & Service</span>
                        <Select
                          value={f.govService}
                          onValueChange={(val) => val && set("govService", val)}
                        >
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DVLA — Driver licence renewal">DVLA — Driver licence renewal</SelectItem>
                            <SelectItem value="GRA — Domestic Tax Assessment">GRA — Domestic Tax Assessment</SelectItem>
                            <SelectItem value="Passports Office — Standard 32-Page">Passports Office — Standard 32-Page</SelectItem>
                            <SelectItem value="Lands Commission — Search & Validation">Lands Commission — Search & Validation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <label className="flex flex-col gap-1.5">
                        <span className={labelCls}>Ghana.gov Invoice / Reference Code</span>
                        <input
                          className={inputCls}
                          value={f.govRef}
                          onChange={(e) => handleLookup("govRef", e.target.value, 4)}
                          placeholder="e.g. GHA-2026-88213"
                          autoFocus
                        />
                      </label>
                    </>
                  )}

                  {rail === "qr" && (
                    <label className="flex flex-col gap-1.5">
                      <span className={labelCls}>Merchant Terminal</span>
                      <input
                        className={inputCls}
                        value={f.qrMerchant}
                        onChange={(e) => set("qrMerchant", e.target.value)}
                        placeholder="Merchant name or terminal ID"
                        autoFocus
                      />
                    </label>
                  )}

                  {bankCategory !== "own" && rail !== "group" && rail !== "card-topup" && rail !== "papss" && rail !== "qr" && (
                    <>
                      {resolvingAcct && (
                        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2.5 text-[12.5px] text-muted-foreground animate-pulse">
                          <Loader2 size={13} className="animate-spin text-primary shrink-0" />
                          <span>Verifying...</span>
                        </div>
                      )}

                      {!resolvingAcct && verifiedAccountName && (
                        <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[12.5px] text-foreground dark:bg-emerald-500/10 animate-in fade-in duration-150 ease-out">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                              <Check size={11} strokeWidth={2.5} />
                            </span>
                            <span className="font-medium text-foreground truncate">{verifiedAccountName}</span>
                          </div>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 ml-2">✓ Verified</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 2. Amount & Source Account Section (Automatically revealed once recipient is verified) */}
            {isStage1Valid && (
              <div
                onClickCapture={() => {
                  if (isStage1Valid && !stage1Collapsed) setStage1Collapsed(true);
                }}
                className="flex flex-col gap-2 border-t border-border/70 pt-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out"
              >
                <div className="text-[16px] font-medium text-foreground tracking-[-0.01em]">
                  2. {rail === "data" ? "Bundle & Source" : "Amount & Source"}
                </div>

                <div className="flex flex-col gap-4 pt-1">
                  {rail === "data" ? (
                    <div className="flex flex-col gap-1.5">
                      <span className={labelCls}>Choose Data Package ({f.wNetwork})</span>
                      <Select
                        value={bundle?.id ?? f.bundleId}
                        onValueChange={(val) => {
                          if (val) set("bundleId", val);
                          if (!stage1Collapsed) setStage1Collapsed(true);
                        }}
                        onOpenChange={(open) => {
                          if (open && !stage1Collapsed) setStage1Collapsed(true);
                        }}
                      >
                        <SelectTrigger
                          className="h-11 w-full"
                          onClick={() => {
                            if (!stage1Collapsed) setStage1Collapsed(true);
                          }}
                        >
                          <SelectValue placeholder="Select data package" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBundles.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name} ({b.val}) — GHS {b.price}.00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : rail === "papss" ? (
                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col gap-1.5">
                        <span className={labelCls}>Amount in {f.wCurrency}</span>
                        <input
                          className={inputCls + " tabular"}
                          value={f.wForeign}
                          onFocus={() => {
                            if (!stage1Collapsed) setStage1Collapsed(true);
                          }}
                          onClick={() => {
                            if (!stage1Collapsed) setStage1Collapsed(true);
                          }}
                          onChange={(e) => set("wForeign", e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </label>
                      <div className="rounded-xl border border-border bg-muted/40 p-3 text-[12.5px] flex items-center justify-between text-muted-foreground">
                        <span>Indicative GHS equivalent:</span>
                        <span className="font-medium text-foreground tabular">
                          ≈ {formatMoney(papssGhs, "GHS", true)} (Rate: 1 {f.wCurrency} = {rate} GHS)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <label className="flex flex-col gap-1.5">
                        <span className={labelCls}>Enter Amount (GHS)</span>
                        <input
                          className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-[15px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/30 transition-all tabular"
                          onFocus={() => {
                            if (!stage1Collapsed) setStage1Collapsed(true);
                          }}
                          onClick={() => {
                            if (!stage1Collapsed) setStage1Collapsed(true);
                          }}
                          value={
                            rail === "bank" || rail === "ach"
                              ? f.bankAmount
                              : rail === "wallet" || rail === "momo" || rail === "wallet-to-bank"
                              ? f.wAmount
                              : rail === "proxy"
                              ? f.pxAmount
                              : rail === "group"
                              ? f.grpAmount
                              : rail === "airtime"
                              ? f.airtimeAmount
                              : rail === "card-topup"
                              ? f.cardAmount
                              : rail === "ecg"
                              ? f.ecgAmount
                              : rail === "bill"
                              ? f.billAmount
                              : rail === "ghanagov"
                              ? f.govAmount
                              : f.qrAmount
                          }
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^\d.]/g, "");
                            if (rail === "bank" || rail === "ach") set("bankAmount", val);
                            else if (rail === "wallet" || rail === "momo" || rail === "wallet-to-bank") set("wAmount", val);
                            else if (rail === "proxy") set("pxAmount", val);
                            else if (rail === "group") set("grpAmount", val);
                            else if (rail === "airtime") set("airtimeAmount", val);
                            else if (rail === "card-topup") set("cardAmount", val);
                            else if (rail === "ecg") set("ecgAmount", val);
                            else if (rail === "bill") set("billAmount", val);
                            else if (rail === "ghanagov") set("govAmount", val);
                            else set("qrAmount", val);
                          }}
                          placeholder="GHS 0.00"
                          required
                        />
                      </label>

                      {rail === "airtime" && (
                        <div className="flex items-center gap-2 pt-1">
                          {["10", "20", "50", "100", "200"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                set("airtimeAmount", preset);
                                if (!stage1Collapsed) setStage1Collapsed(true);
                              }}
                              className="flex-1 rounded-lg border border-border bg-muted/30 py-1.5 text-[12px] font-medium hover:bg-muted text-foreground cursor-pointer tabular"
                            >
                              GHS {preset}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <span className={labelCls}>Sending from</span>
                    <Select
                      value={f.fromId}
                      onValueChange={(val) => {
                        if (val) set("fromId", val);
                        if (!stage1Collapsed) setStage1Collapsed(true);
                      }}
                    >
                      <SelectTrigger
                        className="h-auto min-h-[68px] py-3.5 px-4 w-full rounded-2xl border border-border bg-card dark:bg-[#181818] hover:border-primary/50 text-left cursor-pointer transition-colors"
                        onClick={() => {
                          if (!stage1Collapsed) setStage1Collapsed(true);
                        }}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/80 text-foreground dark:bg-[#252525]">
                            <Landmark size={18} strokeWidth={1.8} />
                          </span>
                          <div className="flex flex-col min-w-0 text-left gap-1">
                            <span className="text-[15px] text-foreground font-medium tracking-[-0.01em] truncate leading-tight">
                              {account?.name} ••{account?.number?.slice(-4) || "7658"}
                            </span>
                            <span className="text-[13px] text-muted-foreground font-normal truncate tabular leading-tight">
                              {formatMoney(account?.available ?? 1320201, account?.currency || "GHS", true)}
                            </span>
                          </div>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({a.number}) — {formatMoney(a.available, a.currency, true)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {overBalance && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[12.5px] text-destructive animate-in fade-in duration-150 ease-out">
                      <AlertCircle size={15} className="mt-0.5 shrink-0 text-destructive" />
                      <div>
                        <span className="font-semibold">Insufficient funds.</span> Total debit exceeds your available balance.
                      </div>
                    </div>
                  )}

                  {rail !== "data" && rail !== "airtime" && (
                    <label className="flex flex-col gap-1.5">
                      <span className={labelCls}>Reference / Note (optional)</span>
                      <input
                        className={inputCls}
                        value={f.bankRef || f.wRef || f.pxRef || f.grpRef || ""}
                        onFocus={() => {
                          if (!stage1Collapsed) setStage1Collapsed(true);
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          set("bankRef", val);
                          set("wRef", val);
                          set("pxRef", val);
                          set("grpRef", val);
                        }}
                        placeholder="e.g. Invoice payment, groceries"
                      />
                    </label>
                  )}

                  {/* Real-time Live Breakdown Summary Card */}
                  {currentAmount > 0 && (
                    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-muted/40 dark:bg-muted/20 px-4 py-1 text-[13.5px] animate-in fade-in duration-150">
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-muted-foreground">Transfer Fee</span>
                        <span className="text-foreground font-medium">
                          {fee === 0 ? "Free" : formatMoney(fee, "GHS", true)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-muted-foreground">Delivery Speed</span>
                        <span className="text-foreground">{RAIL_FACTS[rail]?.arrives ?? "Instantly"}</span>
                      </div>
                      {rail === "papss" && (
                        <div className="flex items-center justify-between py-2.5">
                          <span className="text-muted-foreground">Applied FX Rate</span>
                          <span className="text-foreground">1 {f.wCurrency} = {rate} GHS</span>
                        </div>
                      )}
                      {rail === "group" && (
                        <div className="flex items-center justify-between py-2.5">
                          <span className="text-muted-foreground">Recipients Count</span>
                          <span className="text-foreground font-medium">5 members (GHS {f.grpAmount} each)</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-muted-foreground font-medium">Total Debit</span>
                        <span className="text-foreground font-semibold tabular">
                          {formatMoney(totalDebit, "GHS", true)}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="mt-2 w-full h-11 rounded-xl text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98]"
                    disabled={!isStage2Valid}
                    onClick={() => {
                      auth.reset();
                      setStage1Collapsed(true);
                      setStage(2);
                    }}
                  >
                    {rail === "airtime" || rail === "data" ? "Review Purchase" : rail === "bill" || rail === "ecg" || rail === "ghanagov" ? "Review Payment" : "Review Transfer"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
         * STAGE 2: Dedicated Review & Authorisation Page
         * =================================================================== */}
        {stage === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
            {/* Hero Amount Display */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card dark:bg-[#181818] p-6 text-center shadow-xs">
              <span className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Total Amount</span>
              <span className="mt-1 text-[32px] font-semibold tracking-[-0.02em] text-foreground tabular">
                {formatMoney(currentAmount, rail === "papss" ? f.wCurrency : "GHS", true)}
              </span>
              <div className="mt-2 flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[12px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>{fee === 0 ? "Zero Transfer Fee" : `Fee: ${formatMoney(fee, "GHS", true)}`}</span>
                <span>•</span>
                <span>{RAIL_FACTS[rail]?.arrives ?? "Instant Transfer"}</span>
              </div>
            </div>

            {/* Transfer Breakdown Card */}
            <div className="flex flex-col divide-y divide-border/70 rounded-2xl border border-border bg-card dark:bg-[#181818] text-[14px] shadow-xs">
              {/* Recipient Row */}
              <div className="flex items-center justify-between p-4">
                <div className="flex flex-col min-w-0 pr-3">
                  <span className="text-[12.5px] text-muted-foreground">
                    {bankCategory === "own" ? "Destination Account" : rail === "bill" || rail === "ecg" || rail === "ghanagov" ? "Biller & Account" : "Recipient"}
                  </span>
                  <span className="font-medium text-foreground truncate mt-0.5">{recipientDisplayName}</span>
                  <span className="text-[12.5px] text-muted-foreground truncate">{recipientSubtitle}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStage(1);
                    setStage1Collapsed(false);
                  }}
                  className="text-[13px] font-medium text-primary hover:underline cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Source Account Row */}
              <div className="flex items-center justify-between p-4">
                <div className="flex flex-col min-w-0 pr-3">
                  <span className="text-[12.5px] text-muted-foreground">Sending from</span>
                  <span className="font-medium text-foreground truncate mt-0.5">
                    {account?.name} ••{account?.number.slice(-4)}
                  </span>
                  <span className="text-[12.5px] text-muted-foreground truncate tabular">
                    Balance: {formatMoney(account?.available ?? 0, account?.currency || "GHS", true)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStage(1);
                    setStage1Collapsed(true);
                  }}
                  className="text-[13px] font-medium text-primary hover:underline cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Transfer Details Rows */}
              <div className="flex items-center justify-between p-4 text-[13.5px]">
                <span className="text-muted-foreground">Transfer Fee</span>
                <span className="font-medium text-foreground">
                  {fee === 0 ? "Free" : formatMoney(fee, "GHS", true)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 text-[13.5px]">
                <span className="text-muted-foreground">Delivery Speed</span>
                <span className="text-foreground font-medium">{RAIL_FACTS[rail]?.arrives ?? "Instantly"}</span>
              </div>

              {rail === "papss" && (
                <div className="flex items-center justify-between p-4 text-[13.5px]">
                  <span className="text-muted-foreground">Applied FX Rate</span>
                  <span className="text-foreground font-medium tabular">1 {f.wCurrency} = {rate} GHS</span>
                </div>
              )}

              {(f.bankRef || f.wRef || f.pxRef || f.grpRef) && (
                <div className="flex items-center justify-between p-4 text-[13.5px]">
                  <span className="text-muted-foreground">Reference / Note</span>
                  <span className="text-foreground font-medium truncate max-w-[200px]">
                    {f.bankRef || f.wRef || f.pxRef || f.grpRef}
                  </span>
                </div>
              )}

              {/* Total Debit */}
              <div className="flex items-center justify-between p-4 text-[15px] bg-muted/30 dark:bg-muted/15 rounded-b-2xl">
                <span className="font-medium text-foreground">Total Debit</span>
                <span className="font-semibold text-foreground tabular text-[16px]">
                  {formatMoney(totalDebit, "GHS", true)}
                </span>
              </div>
            </div>

            {/* Dedicated Authentication Card */}
            <div className="flex flex-col rounded-2xl border border-border bg-card dark:bg-[#181818] p-5 shadow-xs">
              <AuthorisePanel
                summary={null}
                method={auth.method}
                onMethodChange={auth.setMethod}
                pin={auth.pin}
                onPinChange={auth.setPin}
                otp={auth.otp}
                onOtpChange={auth.setOtp}
                state={auth.state}
                resend={auth.resend}
                onResend={auth.requestResend}
              />

              <Button
                className="mt-6 w-full h-11 rounded-xl text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm transition-transform duration-100 active:scale-[0.98]"
                disabled={!auth.complete}
                onClick={confirm}
              >
                {rail === "airtime" || rail === "data"
                  ? `Authorise Purchase of ${formatMoney(totalDebit, "GHS", true)}`
                  : `Authorise & Send ${formatMoney(totalDebit, "GHS", true)}`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
