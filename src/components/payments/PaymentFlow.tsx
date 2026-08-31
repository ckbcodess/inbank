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
  ArrowRight,
  AtSign,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Globe,
  Landmark,
  Loader2,
  Plus,
  QrCode,
  RotateCw,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  accountsForProfile,
  BILLERS,
  formatMoney,
  saveStandingInstruction,
  type InstructionFrequency,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { roundMoney, sumMoney } from "@/lib/money";
import { AuthorisePanel } from "./AuthorisePanel";
import { REGISTERED_PHONE, useAuthorisation } from "./useAuthorisation";

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
};

function resolveAccountName(number: string, fallback: string = ""): string {
  const clean = number.replace(/[\s-]/g, "");
  if (!clean || clean.length < 8) return "";
  if (ACCOUNT_RESOLUTIONS[clean]) return ACCOUNT_RESOLUTIONS[clean];
  return fallback || "Verified Account Holder";
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
  const [bankCategory, setBankCategory] = useState<"gcb" | "other" | "international" | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // Progressive Disclosure Stage Control (1..4)
  const [stage, setStage] = useState<number>(1);
  const [maxRevealedStage, setMaxRevealedStage] = useState<number>(1);
  const [resolvingAcct, setResolvingAcct] = useState(false);

  const [f, setF] = useState({
    fromId: accounts[0]?.id ?? "",
    benName: "Accra Fabrics Ltd",
    benAcct: "0231 4455 8890",
    bank: "GCB Bank",
    bankAmount: "5000",
    bankRef: "Fabric supply — Aug",
    wPhone: "0244 123 456",
    wName: "Ama Serwaa Mensah",
    wNetwork: "MTN Mobile Money",
    wAmount: "200",
    wRef: "August upkeep",
    pxId: "0244 123 456",
    pxAmount: "150",
    pxRef: "Lunch payment",
    groupName: "Family Contribution Circle (5 Members)",
    grpAmount: "500",
    grpRef: "September stipends",
    aPhone: "0244 123 456",
    product: "airtime" as "airtime" | "data",
    airtimeAmount: "20",
    bundleId: "mtn-3",
    cardId: "card-v1",
    cardAmount: "250",
    ecgMeter: "P-8839210",
    ecgAmount: "150",
    billerId: BILLERS[0]?.id ?? "bil-001",
    billRef: "P-8839210",
    billAmount: "150",
    govService: "DVLA — Driver licence renewal",
    govRef: "GHA-2026-88213",
    govAmount: "120",
    qrMerchant: "Shoprite Accra Mall (GCB-QR-8841)",
    qrAmount: "85",
    qrRef: "Groceries",
    wBenName: "Lagos Textile Mills",
    wIban: "NG-8891-40023-77",
    wSwift: "PAPSSNGLA",
    wBank: "Access Bank Nigeria",
    wCountry: "Nigeria",
    wCurrency: "NGN",
    wForeign: "500000",
    wPurpose: "Goods purchased",
    wireRef: "PO-2026-4471",
  });

  const [lines] = useState<GroupLine[]>([
    { id: "g1", name: "Ama Serwaa Mensah", dest: "0244 123 456", amount: "500" },
    { id: "g2", name: "Kwame Boateng", dest: "0201 987 654", amount: "500" },
    { id: "g3", name: "Yaa Asantewaa Osei", dest: "0277 445 221", amount: "750" },
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

    if (categoryParam === "gcb" || categoryParam === "other" || categoryParam === "international") {
      setBankCategory(categoryParam);
    } else if (r === "ach") {
      setBankCategory("other");
    } else if (r === "papss") {
      setBankCategory("international");
    } else if (recipientParam) {
      setBankCategory("gcb");
    } else {
      setBankCategory(null);
    }

    if (recipientParam) {
      setF((p) => ({ ...p, benName: recipientParam, wName: recipientParam, benAcct: recipientParam }));
      setStage(2);
      setMaxRevealedStage(2);
    } else {
      // Reset progressive stage on rail switch
      setStage(1);
      setMaxRevealedStage(1);
    }
    if (productParam) {
      setF((p) => ({ ...p, product: productParam }));
    }

    auth.reset();
  }, [searchParams, group]);

  const set = (k: keyof typeof f, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const account = accounts.find((a) => a.id === f.fromId) ?? accounts[0];
  const availableBundles = useMemo(() => {
    return BUNDLES_BY_NETWORK[f.wNetwork] ?? BUNDLES_BY_NETWORK["MTN Mobile Money"];
  }, [f.wNetwork]);

  const bundle = useMemo(() => {
    return availableBundles.find((b) => b.id === f.bundleId) ?? availableBundles[0];
  }, [availableBundles, f.bundleId]);

  const biller = BILLERS.find((b) => b.id === f.billerId) ?? BILLERS[0];

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
        return bundle.price;
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
    bundle.price,
    f.cardAmount,
    f.ecgAmount,
    f.billAmount,
    f.govAmount,
    f.qrAmount,
    f.wForeign,
  ]);

  const fee = rail ? (rail === "group" ? roundMoney(RAIL_FACTS.group.fee * 5) : RAIL_FACTS[rail].fee) : 0;
  const rate = RATES[f.wCurrency] ?? 1;
  const papssGhs = roundMoney(num(f.wForeign) * rate);
  const totalDebit = rail === "papss" ? sumMoney([papssGhs, fee]) : sumMoney([currentAmount, fee]);
  const overBalance = totalDebit > (account?.available ?? 0);

  const resolvedName = useMemo(() => {
    if (rail === "bank" || rail === "ach") return resolveAccountName(f.benAcct, f.benName);
    if (rail === "wallet" || rail === "momo" || rail === "wallet-to-bank") return resolveAccountName(f.wPhone, f.wName);
    if (rail === "proxy") return resolveAccountName(f.pxId, f.pxId);
    if (rail === "papss") return f.wBenName;
    if (rail === "group") return f.groupName;
    if (rail === "data" || rail === "airtime") return resolveAccountName(f.aPhone, "Ama Serwaa Mensah");
    if (rail === "card-topup") return "GCB Virtual Card (••4101)";
    if (rail === "bill") return biller.name;
    if (rail === "ecg") return "ECG — Electricity";
    if (rail === "ghanagov") return f.govService;
    if (rail === "qr") return f.qrMerchant;
    return f.benName;
  }, [
    rail,
    f.benAcct,
    f.benName,
    f.wPhone,
    f.wName,
    f.pxId,
    f.wBenName,
    f.groupName,
    f.aPhone,
    biller.name,
    f.govService,
    f.qrMerchant,
  ]);

  // Stage 1 Validation
  const isStage1Valid = useMemo(() => {
    if (resolvingAcct) return false;
    switch (rail) {
      case "bank":
      case "ach":
        return f.benAcct.trim().length >= 8 && Boolean(resolvedName);
      case "wallet":
      case "momo":
      case "wallet-to-bank":
        return f.wPhone.replace(/\s/g, "").length >= 9;
      case "proxy":
        return f.pxId.trim().length >= 4;
      case "group":
        return Boolean(f.groupName);
      case "papss":
        return f.wBenName.trim().length >= 3 && f.wIban.trim().length >= 6;
      case "data":
        return f.aPhone.replace(/\s/g, "").length >= 9 && Boolean(resolvedName);
      case "airtime":
        return f.aPhone.replace(/\s/g, "").length >= 9;
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
    resolvingAcct,
    f.benAcct,
    resolvedName,
    f.wPhone,
    f.pxId,
    f.groupName,
    f.wBenName,
    f.wIban,
    f.aPhone,
    f.bundleId,
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

  const handlePhoneLookup = (key: "wPhone" | "aPhone" | "benAcct", rawVal: string) => {
    // Sanitize non-digits and non-spaces
    const val = rawVal.replace(/[^\d\s]/g, "");
    set(key, val);
    const clean = val.replace(/\s/g, "");
    if (clean.length >= 8) {
      setResolvingAcct(true);
      setTimeout(() => {
        setResolvingAcct(false);
      }, 300);
    } else {
      setResolvingAcct(false);
    }
  };

  const confirm = () => {
    if (!auth.verify() || phase === "submitting") return;
    setPhase("submitting");
    window.setTimeout(() => {
      const trn = "TRN-" + Math.floor(10000000 + Math.random() * 90000000);
      const d = new Date();
      setReceipt({
        pending: false,
        title: "Transfer Successful",
        msg: `Sent ${formatMoney(currentAmount, rail === "papss" ? f.wCurrency : "GHS", true)} to ${resolvedName || "recipient"}`,
        trn,
        date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        recipient: resolvedName || "Recipient",
        account:
          rail === "bank"
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
            ? biller.name
            : "GCB Bank",
        amount: currentAmount,
        fee,
        total: totalDebit,
        narration: f.bankRef || f.wRef || f.pxRef || (rail === "data" ? bundle?.name : "Online Payment"),
        rows: [
          ["Payment Method", rail.toUpperCase()],
          ["Delivery Speed", RAIL_FACTS[rail]?.arrives ?? "Instantly"],
          ["From Account", `${account?.name} (••${account?.number.slice(-4)})`],
          ["Reference / Ref Code", trn],
        ],
      });
      setPhase("success");
    }, 1200);
  };

  const getPageTitle = () => {
    if (rail === "bank") {
      return bankCategory === "gcb" ? "GCB Bank Transfer" : "Other Local Bank Transfer";
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
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/payments")}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
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
                proceedToStage(2);
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

        {/* 3 Large Category Cards */}
        <div className="flex flex-col gap-3.5">
          <button
            type="button"
            onClick={() => {
              setBankCategory("gcb");
              setF((p) => ({ ...p, bank: "GCB Bank" }));
              setStage(1);
              setMaxRevealedStage(1);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-amber-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-[#fdc307] dark:shadow-none font-medium text-[13px]">
                GCB
              </span>
              <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">GCB Bank</span>
            </div>
            <ChevronRight
              size={20}
              strokeWidth={1.8}
              className="text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setBankCategory("other");
              setF((p) => ({ ...p, bank: "Standard Bank Ghana" }));
              setStage(1);
              setMaxRevealedStage(1);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-amber-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-[#fdc307] dark:shadow-none">
                <Landmark size={20} strokeWidth={1.8} />
              </span>
              <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">Other Local Banks</span>
            </div>
            <ChevronRight
              size={20}
              strokeWidth={1.8}
              className="text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setBankCategory("international");
              setRail("papss");
              setStage(1);
              setMaxRevealedStage(1);
            }}
            className="group flex w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] p-4.5 transition-all duration-150 hover:bg-[#eeeeed] active:scale-[0.99] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-[38.5px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-amber-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-transform duration-150 group-hover:scale-105 dark:border-white/[0.06] dark:bg-[#252525] dark:text-[#fdc307] dark:shadow-none">
                <Globe size={20} strokeWidth={1.8} />
              </span>
              <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">International</span>
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
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            if (rail === "bank" && bankCategory) {
              setBankCategory(null);
            } else {
              router.push("/payments");
            }
          }}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
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
         * STAGE 1: Recipient / Biller / Destination
         * =================================================================== */}
        <div className="flex flex-col gap-2">
          <div className="text-[16px] text-foreground tracking-[-0.01em]">
            1. {rail === "bill" || rail === "ecg" || rail === "ghanagov" ? "Biller & Account" : "Recipient"}
          </div>

          {stage > 1 ? (
            /* Confirmed Read-Only Summary */
            <div className="flex h-[68px] items-center justify-between rounded-xl border border-border bg-muted/40 dark:bg-muted/20 px-4 py-2 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Check size={14} strokeWidth={2.5} />
                </span>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[16px] text-foreground font-normal tracking-[-0.08px] truncate">
                    {resolvedName}
                  </span>
                  <span className="text-[12px] text-muted-foreground truncate">
                    {rail === "bank" || rail === "ach"
                      ? `${f.bank} • ${f.benAcct}`
                      : rail === "wallet" || rail === "momo" || rail === "wallet-to-bank"
                      ? `${f.wNetwork} • ${f.wPhone}`
                      : rail === "proxy"
                      ? f.pxId
                      : rail === "papss"
                      ? `${f.wBank} (${f.wCountry}) • ${f.wIban}`
                      : rail === "data"
                      ? `${f.wNetwork} • ${f.aPhone}`
                      : rail === "airtime"
                      ? f.aPhone
                      : rail === "card-topup"
                      ? "GCB Virtual Card (••4101)"
                      : rail === "ecg"
                      ? `ECG Prepaid • ${f.ecgMeter}`
                      : rail === "bill"
                      ? `${biller.name} • ${f.billRef}`
                      : rail === "ghanagov"
                      ? `${f.govService} • ${f.govRef}`
                      : resolvedName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => editStage(1)}
                className="text-[14px] text-foreground hover:underline cursor-pointer ml-3 shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            /* Active Editable Form */
            <div className="flex flex-col gap-3.5 pt-1 animate-in fade-in duration-150 ease-out">
              {/* Rail Specific Stage 1 Inputs */}
              {(rail === "bank" || rail === "ach") && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Destination Bank</span>
                    <select className={selectCls} value={f.bank} onChange={(e) => set("bank", e.target.value)}>
                      {BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>

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

                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Network Provider</span>
                    <select className={selectCls} value={f.wNetwork} onChange={(e) => set("wNetwork", e.target.value)}>
                      {NETWORKS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {rail === "proxy" && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Proxy ID (Phone, @Alias, or Ghana Card)</span>
                  <input
                    className={inputCls}
                    value={f.pxId}
                    onChange={(e) => set("pxId", e.target.value)}
                    placeholder="e.g. @kwame.b or GHA-000000000-0"
                    autoFocus
                  />
                </label>
              )}

              {rail === "group" && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Select Group</span>
                  <select className={selectCls} value={f.groupName} onChange={(e) => set("groupName", e.target.value)}>
                    <option value="Family Contribution Circle (5 Members)">Family Contribution Circle (5 Members)</option>
                    <option value="Colleagues Susu Circle (10 Members)">Colleagues Susu Circle (10 Members)</option>
                    <option value="Welfare Fund (12 Members)">Welfare Fund (12 Members)</option>
                  </select>
                </label>
              )}

              {rail === "papss" && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Destination Country & Currency</span>
                    <select
                      className={selectCls}
                      value={f.wCountry}
                      onChange={(e) => {
                        const country = e.target.value;
                        const curr = country === "Nigeria" ? "NGN" : country === "Kenya" ? "KES" : country === "South Africa" ? "ZAR" : "XOF";
                        set("wCountry", country);
                        set("wCurrency", curr);
                      }}
                    >
                      <option value="Nigeria">Nigeria (NGN - Nigerian Naira)</option>
                      <option value="Côte d'Ivoire">Côte d&apos;Ivoire (XOF - West African CFA)</option>
                      <option value="Kenya">Kenya (KES - Kenyan Shilling)</option>
                      <option value="South Africa">South Africa (ZAR - South African Rand)</option>
                    </select>
                  </label>

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

                  {/* Network field disclosed only after typing first 3 digits */}
                  {f.aPhone.replace(/\s/g, "").length >= 3 && (
                    <label className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                      <span className={labelCls}>Network Provider</span>
                      <select
                        className={selectCls}
                        value={f.wNetwork}
                        onChange={(e) => {
                          const net = e.target.value;
                          set("wNetwork", net);
                          const firstBundle = BUNDLES_BY_NETWORK[net]?.[0]?.id;
                          if (firstBundle) set("bundleId", firstBundle);
                        }}
                      >
                        {Object.keys(BUNDLES_BY_NETWORK).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {/* Verifying loader */}
                  {resolvingAcct && (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2.5 text-[12.5px] text-muted-foreground animate-pulse">
                      <Loader2 size={13} className="animate-spin text-primary shrink-0" />
                      <span>Verifying subscriber name...</span>
                    </div>
                  )}

                  {/* Verified subscriber badge */}
                  {!resolvingAcct && f.aPhone.replace(/\s/g, "").length >= 8 && resolvedName && (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[12.5px] text-foreground dark:bg-emerald-500/10 animate-in fade-in duration-150 ease-out">
                      <span className="font-medium text-foreground">{resolvedName}</span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Verified Account Holder
                      </span>
                    </div>
                  )}
                </>
              )}

              {rail === "airtime" && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Phone Number</span>
                  <input
                    className={inputCls + " tabular"}
                    value={f.aPhone}
                    onChange={(e) => handlePhoneLookup("aPhone", e.target.value)}
                    placeholder="0244 000 000"
                    autoFocus
                  />
                </label>
              )}

              {rail === "card-topup" && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Select Card to Fund</span>
                  <select className={selectCls} value={f.cardId} onChange={(e) => set("cardId", e.target.value)}>
                    <option value="card-v1">GCB Virtual Card (••4101) — Balance: GHS 1,420.00</option>
                    <option value="card-p1">GCB Prepaid Travel Card (••8892) — Balance: USD 350.00</option>
                  </select>
                </label>
              )}

              {rail === "ecg" && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>ECG Meter Number</span>
                  <input
                    className={inputCls + " tabular"}
                    value={f.ecgMeter}
                    onChange={(e) => set("ecgMeter", e.target.value)}
                    placeholder="e.g. P-8839210"
                    autoFocus
                  />
                </label>
              )}

              {rail === "bill" && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Select Biller</span>
                    <select className={selectCls} value={f.billerId} onChange={(e) => set("billerId", e.target.value)}>
                      {BILLERS.map((b) => (
                        <option key={b.id} value={b.id}>{b.name} ({b.category})</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Customer / Account / Reference Number</span>
                    <input
                      className={inputCls}
                      value={f.billRef}
                      onChange={(e) => set("billRef", e.target.value)}
                      placeholder="e.g. GW-440291 or DSTV SmartCard No."
                      autoFocus
                    />
                  </label>
                </>
              )}

              {rail === "ghanagov" && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Government Agency & Service</span>
                    <select className={selectCls} value={f.govService} onChange={(e) => set("govService", e.target.value)}>
                      <option value="DVLA — Driver licence renewal">DVLA — Driver licence renewal</option>
                      <option value="GRA — Domestic Tax Assessment">GRA — Domestic Tax Assessment</option>
                      <option value="Passports Office — Standard 32-Page">Passports Office — Standard 32-Page</option>
                      <option value="Lands Commission — Search & Validation">Lands Commission — Search & Validation</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Ghana.gov Invoice / Reference Code</span>
                    <input
                      className={inputCls}
                      value={f.govRef}
                      onChange={(e) => set("govRef", e.target.value)}
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

              {/* Auto-resolved Account Badge (for non-data rails) */}
              {rail !== "data" && resolvingAcct && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2.5 text-[12.5px] text-muted-foreground animate-pulse">
                  <Loader2 size={13} className="animate-spin text-primary shrink-0" />
                  <span>Verifying details...</span>
                </div>
              )}

              {rail !== "data" && !resolvingAcct && resolvedName && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[12.5px] text-foreground dark:bg-emerald-500/10 animate-in fade-in duration-150 ease-out">
                  <span className="font-medium text-foreground">{resolvedName}</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Verified Account Holder
                  </span>
                </div>
              )}

              {/* Quick beneficiaries carousel for relevant rails */}
              {RECENT_AVATARS.filter((item) => (rail === "ach" ? item.rail === "bank" : item.rail === rail)).length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-[11.5px] text-muted-foreground">Or pick recent payee:</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {RECENT_AVATARS.filter((item) => (rail === "ach" ? item.rail === "bank" : item.rail === rail)).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          if (rail === "bank" || rail === "ach") {
                            setF((p) => ({ ...p, benName: r.name, benAcct: r.acct, bank: r.bank }));
                          } else if (rail === "wallet" || rail === "momo") {
                            setF((p) => ({ ...p, wName: r.name, wPhone: r.acct }));
                          } else if (rail === "proxy") {
                            setF((p) => ({ ...p, pxId: r.acct }));
                          }
                          proceedToStage(2);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11.5px] hover:bg-muted text-foreground cursor-pointer shrink-0"
                      >
                        <span className="font-medium">{r.name}</span>
                        <span className="text-[10px] text-muted-foreground">({r.bank})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="mt-2 w-full h-11 rounded-xl text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98]"
                disabled={!isStage1Valid}
                onClick={() => proceedToStage(2)}
              >
                {rail === "data" ? "Continue to Bundle & Source" : "Continue to Amount"}
              </Button>
            </div>
          )}
        </div>

        {/* ===================================================================
         * STAGE 2: Amount & Source Account (or Bundle & Source for Data)
         * =================================================================== */}
        {maxRevealedStage >= 2 && (
          <div
            className={`flex flex-col gap-2 ${
              stage === 2 ? "border-t border-border/70 pt-6" : ""
            } animate-in fade-in slide-in-from-top-2 duration-200 ease-out`}
          >
            <div className="text-[16px] text-foreground tracking-[-0.01em]">
              2. {rail === "data" ? "Bundle & Source" : "Amount & Source"}
            </div>

            {stage > 2 ? (
              /* Confirmed Read-Only Summary */
              <div className="flex h-[68px] items-center justify-between rounded-xl border border-border bg-muted/40 dark:bg-muted/20 px-4 py-2 transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-[16px] text-foreground font-normal tracking-[-0.08px] truncate tabular">
                      {rail === "data"
                        ? `${bundle?.name} (${bundle?.val}) • ${formatMoney(currentAmount, "GHS", true)}`
                        : formatMoney(currentAmount, rail === "papss" ? f.wCurrency : "GHS", true)}
                    </span>
                    <span className="text-[12px] text-muted-foreground truncate">
                      From {account?.name} •••{account?.number.slice(-4)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => editStage(2)}
                  className="text-[14px] text-foreground hover:underline cursor-pointer ml-3 shrink-0"
                >
                  Change
                </button>
              </div>
            ) : stage === 2 ? (
              /* Active Editable Form */
              <div className="flex flex-col gap-4 pt-1">
                {/* Enter Amount / Choose Bundle */}
                {rail === "data" ? (
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Choose Data Package ({f.wNetwork})</span>
                    <select
                      className={selectCls}
                      value={bundle?.id ?? f.bundleId}
                      onChange={(e) => set("bundleId", e.target.value)}
                      autoFocus
                    >
                      {availableBundles.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.val}) — GHS {b.price}.00
                        </option>
                      ))}
                    </select>
                  </label>
                ) : rail === "papss" ? (
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className={labelCls}>Amount in {f.wCurrency}</span>
                      <input
                        className={inputCls + " tabular"}
                        value={f.wForeign}
                        onChange={(e) => set("wForeign", e.target.value)}
                        placeholder="0.00"
                        autoFocus
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
                        autoFocus
                        required
                      />
                    </label>

                    {/* Quick amount presets for airtime */}
                    {rail === "airtime" && (
                      <div className="flex items-center gap-2 pt-1">
                        {["10", "20", "50", "100", "200"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => set("airtimeAmount", preset)}
                            className="flex-1 rounded-lg border border-border bg-muted/30 py-1.5 text-[12px] font-medium hover:bg-muted text-foreground cursor-pointer tabular"
                          >
                            GHS {preset}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sending From Account Selector Card */}
                <div className="flex flex-col gap-1.5">
                  <span className={labelCls}>Sending from</span>
                  <div className="group relative flex h-[68px] items-center justify-between rounded-xl border border-border bg-card px-4 transition-colors hover:border-primary/50">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                        <Landmark size={16} strokeWidth={1.8} />
                      </span>
                      <div className="flex flex-col min-w-0 text-left">
                        <span className="text-[15px] text-foreground font-normal truncate">
                          {account?.name} ••{account?.number?.slice(-4) || "7658"}
                        </span>
                        <span className="text-[12px] text-muted-foreground truncate tabular">
                          {formatMoney(account?.available ?? 1320201, "GHS", true)} available
                        </span>
                      </div>
                    </div>

                    <ChevronDown size={16} className="text-muted-foreground shrink-0 transition-transform group-hover:translate-y-0.5" />

                    {/* Native invisible select for seamless switching */}
                    <select
                      className="absolute inset-0 size-full opacity-0 cursor-pointer"
                      value={f.fromId}
                      onChange={(e) => set("fromId", e.target.value)}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.number}) — {formatMoney(a.available, a.currency, true)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Insufficient Funds Warning */}
                {overBalance && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[12.5px] text-destructive animate-in fade-in duration-150 ease-out">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-destructive" />
                    <div>
                      <span className="font-semibold">Insufficient available balance.</span> Total debit of {formatMoney(totalDebit, "GHS", true)} exceeds available balance {formatMoney(account?.available ?? 0, "GHS", true)} on {account?.name}.
                    </div>
                  </div>
                )}

                {/* Reference / Narration Input */}
                {rail !== "data" && rail !== "airtime" && (
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Reference / Note (optional)</span>
                    <input
                      className={inputCls}
                      value={f.bankRef || f.wRef || f.pxRef || f.grpRef || ""}
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

                <Button
                  className="mt-2 w-full h-11 rounded-xl text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98]"
                  disabled={!isStage2Valid}
                  onClick={() => proceedToStage(3)}
                >
                  Continue to Review
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* ===================================================================
         * STAGE 3: Review & Summary
         * =================================================================== */}
        {maxRevealedStage >= 3 && (
          <div
            className={`flex flex-col gap-2 ${
              stage === 3 ? "border-t border-border/70 pt-6" : ""
            } animate-in fade-in slide-in-from-top-2 duration-200 ease-out`}
          >
            <div className="text-[16px] text-foreground tracking-[-0.01em]">3. Review &amp; Summary</div>

            {stage === 3 && (
              <div className="flex flex-col gap-4 pt-1">
                <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-muted/40 dark:bg-muted/20 px-4 py-1 text-[13.5px]">
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
                    <span className="text-foreground font-medium tabular">
                      {formatMoney(totalDebit, "GHS", true)}
                    </span>
                  </div>
                </div>

                <Button
                  className="mt-2 w-full h-11 rounded-xl text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98]"
                  onClick={() => {
                    auth.reset();
                    proceedToStage(4);
                  }}
                >
                  Continue to Authorisation
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
         * STAGE 4: Authorise & OTP Verification
         * =================================================================== */}
        {maxRevealedStage >= 4 && stage === 4 && (
          <div className="flex flex-col gap-4 border-t border-border/70 pt-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
            <div className="text-[16px] text-foreground tracking-[-0.01em]">4. Authorise &amp; Send</div>

            {/* Compact Order Summary Pill */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-[13.5px] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Amount</span>
                <span className="font-medium text-foreground tabular">
                  {formatMoney(currentAmount, rail === "papss" ? f.wCurrency : "GHS", true)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                <span>To {resolvedName}</span>
                <span>From {account?.name}</span>
              </div>
            </div>

            {/* Authorisation Panel */}
            <AuthorisePanel
              summary={null}
              otp={auth.otp}
              onOtpChange={auth.setOtp}
              state={auth.state}
              resend={auth.resend}
              onResend={auth.requestResend}
            />

            <Button
              className="mt-2 w-full h-11 rounded-xl text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm transition-transform duration-100 active:scale-[0.98]"
              disabled={!auth.complete}
              onClick={confirm}
            >
              Authorize &amp; Send {formatMoney(totalDebit, "GHS", true)}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
