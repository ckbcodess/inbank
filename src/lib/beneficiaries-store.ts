"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MIGRATED_DATA } from "./migration";
import { BILLERS } from "./mock-data";

export type TransactionType =
  | "bank"
  | "wallet"
  | "proxy"
  | "bill"
  | "airtime"
  | "papss"
  | "swift";

export type BeneficiaryCategory = "person" | "biller" | "number";

export interface BeneficiaryRecord {
  id: string;
  name: string;
  transactionType: TransactionType;
  category: BeneficiaryCategory;
  detail: string;
  verified: boolean;
  bankName?: string;
  accountNumber?: string;
  currency?: string;
  network?: string;
  phoneNumber?: string;
  proxyType?: "ghana-card" | "phone" | "alias";
  proxyId?: string;
  billerCategory?: string;
  billerName?: string;
  billerReference?: string;
  country?: string;
  countryCode?: string;
  label?: string;
  createdAt: string;
  /** Kept at the top of every list the customer picks from. */
  pinned?: boolean;
  /** When this person was last paid, the amount, and how many times: what the pickers rank by and show. */
  lastPaidAt?: string;
  lastAmount?: number;
  payCount?: number;
}

const RAW_SEED_BENEFICIARIES: BeneficiaryRecord[] = [
  // ── Bank Transfers ─────────────────────────────────────────────
  {
    id: "ben-b0",
    name: "Akua Mansah",
    transactionType: "bank",
    category: "person",
    bankName: "GCB Bank",
    accountNumber: "wqeqeeeeq",
    currency: "GHS",
    detail: "GCB Bank · wqeqeeeeq",
    verified: true,
    createdAt: "2026-06-01",
  },
  {
    id: "ben-b1",
    name: "Justice Oduro",
    transactionType: "bank",
    category: "person",
    bankName: "Standard Bank Ghana",
    accountNumber: "0231 4455 8890",
    currency: "GHS",
    detail: "Standard Bank Ghana · 0231 4455 8890",
    verified: true,
    createdAt: "2026-06-01",
  },
  {
    id: "ben-b2",
    name: "Tema Logistics",
    transactionType: "bank",
    category: "person",
    bankName: "Ecobank Ghana",
    accountNumber: "0554 7781 2200",
    currency: "GHS",
    detail: "Ecobank Ghana · 0554 7781 2200",
    verified: true,
    createdAt: "2026-06-10",
  },
  {
    id: "ben-b3",
    name: "Volta Machinery Ltd",
    transactionType: "bank",
    category: "person",
    bankName: "Absa Ghana",
    accountNumber: "0661 9902 3345",
    currency: "GHS",
    detail: "Absa Ghana · 0661 9902 3345",
    verified: true,
    createdAt: "2026-06-20",
  },
  {
    id: "ben-b4",
    name: "Kumasi Supplies",
    transactionType: "bank",
    category: "person",
    bankName: "GCB Bank",
    accountNumber: "0788 3312 0091",
    currency: "GHS",
    detail: "GCB Bank · 0788 3312 0091",
    verified: true,
    createdAt: "2026-07-02",
  },
  {
    id: "ben-b5",
    name: "Abena Osei",
    transactionType: "bank",
    category: "person",
    bankName: "Stanbic Bank Ghana",
    accountNumber: "1089 3322 1100",
    currency: "GHS",
    detail: "Stanbic Bank Ghana · 1089 3322 1100",
    verified: true,
    createdAt: "2026-07-15",
  },
  {
    id: "ben-b6",
    name: "Kelvin Oso",
    transactionType: "bank",
    category: "person",
    bankName: "GCB Bank",
    accountNumber: "1023 4455 66",
    currency: "GHS",
    detail: "GCB Bank · 1023 4455 66",
    verified: true,
    createdAt: "2026-07-22",
  },

  // ── Mobile Wallets ─────────────────────────────────────────────
  {
    id: "ben-w1",
    name: "Ransford Gyasi",
    transactionType: "wallet",
    category: "person",
    network: "MTN Mobile Money",
    phoneNumber: "0244 123 456",
    detail: "MTN Mobile Money · 0244 123 456",
    verified: true,
    createdAt: "2026-06-05",
  },
  {
    id: "ben-w2",
    name: "Ishmael Gyan",
    transactionType: "wallet",
    category: "person",
    network: "Telecel Cash",
    phoneNumber: "0201 987 654",
    detail: "Telecel Cash · 0201 987 654",
    verified: true,
    createdAt: "2026-06-18",
  },
  {
    id: "ben-w3",
    name: "Tsotsoo Mills",
    transactionType: "wallet",
    category: "person",
    network: "MTN Mobile Money",
    phoneNumber: "0559 220 118",
    detail: "MTN Mobile Money · 0559 220 118",
    verified: true,
    createdAt: "2026-07-04",
  },
  {
    id: "ben-w4",
    name: "Reuben Abuga-Williams",
    transactionType: "wallet",
    category: "person",
    network: "AT Money",
    phoneNumber: "0271 445 900",
    detail: "AT Money · 0271 445 900",
    verified: true,
    createdAt: "2026-07-11",
  },
  {
    id: "ben-w5",
    name: "Kofi Boateng",
    transactionType: "wallet",
    category: "person",
    network: "AT Money",
    phoneNumber: "0277 456 789",
    detail: "AT Money · 0277 456 789",
    verified: true,
    createdAt: "2026-07-25",
  },

  // ── Proxy Pay ─────────────────────────────────────────────────
  {
    id: "ben-px1",
    name: "Kwame Boateng (Alias)",
    transactionType: "proxy",
    category: "person",
    proxyType: "alias",
    proxyId: "@kwame.b",
    detail: "Proxy Alias · @kwame.b",
    verified: true,
    createdAt: "2026-07-01",
  },
  {
    id: "ben-px2",
    name: "Ransford Gyasi (Alias)",
    transactionType: "proxy",
    category: "person",
    proxyType: "alias",
    proxyId: "@ama.serwaa",
    detail: "Proxy Alias · @ama.serwaa",
    verified: true,
    createdAt: "2026-07-08",
  },
  {
    id: "ben-px3",
    name: "Kofi Appiah",
    transactionType: "proxy",
    category: "person",
    proxyType: "ghana-card",
    proxyId: "GHA-718293041-1",
    detail: "Ghana Card · GHA-718293041-1",
    verified: true,
    createdAt: "2026-07-16",
  },

  // ── Bills & Utilities ──────────────────────────────────────────
  {
    id: "ben-bl1",
    name: "Lester Adjei (Home ECG)",
    transactionType: "bill",
    category: "biller",
    billerCategory: "Bills & Utilities",
    billerName: "ECG Prepaid",
    billerReference: "P-8839210",
    detail: "ECG Prepaid · Meter P-8839210",
    verified: true,
    createdAt: "2026-05-15",
  },
  {
    id: "ben-bl2",
    name: "Ghana Water (Residence)",
    transactionType: "bill",
    category: "biller",
    billerCategory: "Bills & Utilities",
    billerName: "Ghana Water (GWCL)",
    billerReference: "GW-440291",
    detail: "Ghana Water · Acct GW-440291",
    verified: true,
    createdAt: "2026-06-02",
  },
  {
    id: "ben-bl3",
    name: "NEDCo Power Ghana",
    transactionType: "bill",
    category: "biller",
    billerCategory: "Bills & Utilities",
    billerName: "NEDCo Power",
    billerReference: "NED-552019",
    detail: "NEDCo Power · Meter NED-552019",
    verified: true,
    createdAt: "2026-06-12",
  },
  {
    id: "ben-bl4",
    name: "DSTV Family (Living Room)",
    transactionType: "bill",
    category: "biller",
    billerCategory: "Subscriptions",
    billerName: "DSTV / MultiChoice",
    billerReference: "10982341",
    detail: "DSTV · Smartcard 10982341",
    verified: true,
    createdAt: "2026-06-25",
  },
  {
    id: "ben-bl5",
    name: "Domestic Tax Assessment",
    transactionType: "bill",
    category: "biller",
    billerCategory: "Government Services",
    billerName: "GRA — Domestic Tax",
    billerReference: "TIN-9088214-G",
    detail: "GRA Domestic Tax · TIN-9088214-G",
    verified: true,
    createdAt: "2026-07-05",
  },

  // ── Airtime & Data ─────────────────────────────────────────────
  {
    id: "ben-at1",
    name: "Personal Phone Line",
    transactionType: "airtime",
    category: "number",
    network: "MTN Ghana",
    phoneNumber: "0244 123 821",
    label: "Main line airtime & bundles",
    detail: "MTN · 0244 123 821 (Personal)",
    verified: true,
    createdAt: "2026-06-01",
  },
  {
    id: "ben-at2",
    name: "Field Team Line",
    transactionType: "airtime",
    category: "number",
    network: "AT Ghana",
    phoneNumber: "0271 556 220",
    label: "Operations field team line",
    detail: "AT · 0271 556 220 (Field team)",
    verified: true,
    createdAt: "2026-06-14",
  },
  {
    id: "ben-at3",
    name: "Site Office Line",
    transactionType: "airtime",
    category: "number",
    network: "Telecel Ghana",
    phoneNumber: "0201 448 900",
    label: "Kumasi site branch office",
    detail: "Telecel · 0201 448 900 (Site office)",
    verified: true,
    createdAt: "2026-06-28",
  },
  {
    id: "ben-at4",
    name: "Home Router (MiFi)",
    transactionType: "airtime",
    category: "number",
    network: "MTN Ghana",
    phoneNumber: "0244 123 456",
    label: "4G LTE Wireless router",
    detail: "MTN · 0244 123 456 (Home Router)",
    verified: true,
    createdAt: "2026-07-10",
  },

  // ── PAPSS International ────────────────────────────────────────
  {
    id: "ben-pa1",
    name: "Lagos Textile Mills",
    transactionType: "papss",
    category: "person",
    country: "Nigeria",
    countryCode: "NG",
    bankName: "Access Bank Nigeria",
    accountNumber: "NG-8891-40023-77",
    currency: "NGN",
    detail: "Access Bank Nigeria · NGN · NG-8891-40023-77",
    verified: true,
    createdAt: "2026-06-15",
  },
  {
    id: "ben-pa2",
    name: "Abidjan Cocoa Exporters",
    transactionType: "papss",
    category: "person",
    country: "Côte d'Ivoire",
    countryCode: "CI",
    bankName: "Ecobank Côte d'Ivoire",
    accountNumber: "CI-5510-99201-12",
    currency: "XOF",
    detail: "Ecobank Côte d'Ivoire · XOF · CI-5510-99201-12",
    verified: true,
    createdAt: "2026-06-29",
  },
  {
    id: "ben-pa3",
    name: "Nairobi Solar Tech",
    transactionType: "papss",
    category: "person",
    country: "Kenya",
    countryCode: "KE",
    bankName: "Equity Bank Kenya",
    accountNumber: "KE-0029-44102-88",
    currency: "KES",
    detail: "Equity Bank Kenya · KES · KE-0029-44102-88",
    verified: true,
    createdAt: "2026-07-14",
  },
  {
    id: "ben-pa4",
    name: "Cape Town Freight",
    transactionType: "papss",
    category: "person",
    country: "South Africa",
    countryCode: "ZA",
    bankName: "Standard Bank South Africa",
    accountNumber: "ZA-7712-33901-44",
    currency: "ZAR",
    detail: "Standard Bank SA · ZAR · ZA-7712-33901-44",
    verified: true,
    createdAt: "2026-07-28",
  },
];

/** Demo usage, so the pickers have something to rank and show: who is pinned, last paid, how often. */
const SEED_USAGE: Record<string, Pick<BeneficiaryRecord, "pinned" | "lastPaidAt" | "lastAmount" | "payCount">> = {
  "ben-w1": { pinned: true, lastPaidAt: "2026-10-13", lastAmount: 200, payCount: 14 },
  "ben-b1": { pinned: true, lastPaidAt: "2026-10-10", lastAmount: 500, payCount: 9 },
  "ben-at1": { lastPaidAt: "2026-10-12", lastAmount: 20, payCount: 20 },
  "ben-w5": { lastPaidAt: "2026-10-08", lastAmount: 120, payCount: 6 },
  "ben-px1": { lastPaidAt: "2026-10-05", lastAmount: 80, payCount: 5 },
  "ben-bl1": { lastPaidAt: "2026-10-01", lastAmount: 245, payCount: 11 },
  "ben-bl4": { lastPaidAt: "2026-09-30", lastAmount: 245, payCount: 8 },
  "ben-b5": { lastPaidAt: "2026-09-28", lastAmount: 1500, payCount: 4 },
  "ben-w2": { lastPaidAt: "2026-09-15", lastAmount: 300, payCount: 3 },
  "ben-pa1": { lastPaidAt: "2026-09-02", lastAmount: 3000, payCount: 2 },
  "ben-b2": { lastPaidAt: "2026-08-20", lastAmount: 4200, payCount: 2 },
};

/** The same mobile number, whatever it was typed as: its last nine digits. */
export function phoneKey(phone?: string): string {
  return (phone ?? "").replace(/\D/g, "").slice(-9);
}

const WALLET_NETWORK_FOR: Record<string, string> = {
  "MTN Ghana": "MTN Mobile Money",
  "Telecel Ghana": "Telecel Cash",
  "AT Ghana": "AT Money",
};
/** A top-up line's network as the matching wallet is named ("MTN Ghana" becomes "MTN Mobile Money"). */
export function walletNetworkName(network?: string): string | undefined {
  return network ? WALLET_NETWORK_FOR[network] ?? network : network;
}

/**
 * One saved record per mobile number. A number you top up with airtime or data is the same thing as a wallet
 * you send money to, so airtime records fold into the wallet with the same number (usage added together), or
 * become a wallet record when no wallet has that number. How it is paid (money, airtime, data) is chosen at
 * payment time. Safe to run on a list that is already unified.
 */
export function unifyMobile(list: BeneficiaryRecord[]): BeneficiaryRecord[] {
  const out: BeneficiaryRecord[] = [];
  const byPhone = new Map<string, BeneficiaryRecord>();
  const copies = list.map((b) => ({ ...b }));
  for (const b of copies) {
    if (b.transactionType === "wallet" && phoneKey(b.phoneNumber)) byPhone.set(phoneKey(b.phoneNumber), b);
  }
  for (const b of copies) {
    if (b.transactionType !== "airtime") {
      out.push(b);
      continue;
    }
    const target = byPhone.get(phoneKey(b.phoneNumber));
    if (target) {
      target.payCount = (target.payCount ?? 0) + (b.payCount ?? 0) || undefined;
      target.pinned = target.pinned || b.pinned;
      if ((b.lastPaidAt ?? "") > (target.lastPaidAt ?? "")) {
        target.lastPaidAt = b.lastPaidAt;
        target.lastAmount = b.lastAmount;
      }
      continue;
    }
    const network = walletNetworkName(b.network);
    const converted: BeneficiaryRecord = {
      ...b,
      transactionType: "wallet",
      category: "person",
      network,
      detail: `${network ?? "Mobile Money"} · ${b.phoneNumber ?? ""}`,
    };
    if (phoneKey(converted.phoneNumber)) byPhone.set(phoneKey(converted.phoneNumber), converted);
    out.push(converted);
  }
  return out;
}

export const SEED_BENEFICIARIES: BeneficiaryRecord[] = unifyMobile(
  RAW_SEED_BENEFICIARIES.map((b) => ({ ...b, ...SEED_USAGE[b.id] })),
);

/**
 * The order every picker uses: pinned first, then the most recently paid, then the most often paid, then
 * the most recently saved. People never paid sort after people who have been.
 */
export function rankBeneficiaries(list: BeneficiaryRecord[]): BeneficiaryRecord[] {
  const paidAt = (b: BeneficiaryRecord) => (b.lastPaidAt ? Date.parse(b.lastPaidAt) || 0 : 0);
  return [...list].sort(
    (a, b) =>
      Number(!!b.pinned) - Number(!!a.pinned) ||
      paidAt(b) - paidAt(a) ||
      (b.payCount ?? 0) - (a.payCount ?? 0) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

/** The payees that came across from the old internet banking, as saved beneficiaries. */
export function migratedBeneficiaries(): BeneficiaryRecord[] {
  return MIGRATED_DATA.payees.map((p, i): BeneficiaryRecord => {
    const base = { id: `ben-m${i + 1}`, name: p.name, detail: p.detail, verified: true, currency: "GHS", createdAt: "2026-05-01" };
    if (p.rail === "wallet") {
      return { ...base, transactionType: "wallet", category: "person", network: "MTN Mobile Money", phoneNumber: p.recipient };
    }
    if (p.rail === "ecg") {
      return { ...base, transactionType: "bill", category: "biller", billerCategory: "Bills & Utilities", billerName: "ECG Prepaid", billerReference: p.recipient };
    }
    if (p.rail === "bank") {
      return { ...base, transactionType: "bank", category: "person", bankName: "bank" in p && p.bank ? p.bank : "Bank", accountNumber: p.recipient };
    }
    const biller = BILLERS.find((b) => "billerId" in p && b.id === p.billerId);
    return {
      ...base,
      transactionType: "bill",
      category: "biller",
      billerCategory: biller?.category ?? "Others",
      billerName: biller?.name ?? p.name,
      billerReference: p.recipient,
    };
  });
}

export function getInitialBeneficiaries(): BeneficiaryRecord[] {
  return unifyMobile(initialBeneficiaries());
}

function initialBeneficiaries(): BeneficiaryRecord[] {
  if (typeof window === "undefined") return SEED_BENEFICIARIES;
  try {
    const sessionRaw = window.localStorage.getItem("nibs-session");
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      const actorId = parsed?.state?.actor?.id;
      if (actorId === "u-clean") return [];
      if (actorId === "u-legacy") return migratedBeneficiaries();
      if (actorId === "u-single") {
        return [
          {
            id: "ben-s1",
            name: "Mum (Yaa Gyan)",
            transactionType: "wallet",
            category: "person",
            network: "MTN Mobile Money",
            phoneNumber: "0244 889 900",
            currency: "GHS",
            detail: "MTN Mobile Money · 0244 889 900",
            verified: true,
            createdAt: "2026-08-15",
          },
          {
            id: "ben-s2",
            name: "ECG Prepaid Electricity",
            transactionType: "bill",
            category: "biller",
            billerCategory: "Utilities",
            billerName: "Electricity Company of Ghana (ECG)",
            billerReference: "P-992014",
            currency: "GHS",
            detail: "ECG Prepaid · Meter P-992014",
            verified: true,
            createdAt: "2026-08-20",
          },
        ];
      }
    }
    const devRaw = window.localStorage.getItem("nibs-dev-user-simulation");
    if (devRaw) {
      const parsedDev = JSON.parse(devRaw);
      if (parsedDev?.state?.userType === "clean") return [];
      if (parsedDev?.state?.userType === "single") {
        return [
          {
            id: "ben-s1",
            name: "Mum (Yaa Gyan)",
            transactionType: "wallet",
            category: "person",
            network: "MTN Mobile Money",
            phoneNumber: "0244 889 900",
            currency: "GHS",
            detail: "MTN Mobile Money · 0244 889 900",
            verified: true,
            createdAt: "2026-08-15",
          },
          {
            id: "ben-s2",
            name: "ECG Prepaid Electricity",
            transactionType: "bill",
            category: "biller",
            billerCategory: "Utilities",
            billerName: "Electricity Company of Ghana (ECG)",
            billerReference: "P-992014",
            currency: "GHS",
            detail: "ECG Prepaid · Meter P-992014",
            verified: true,
            createdAt: "2026-08-20",
          },
        ];
      }
    }
  } catch {
    // fallback
  }
  return SEED_BENEFICIARIES;
}

interface BeneficiariesState {
  beneficiaries: BeneficiaryRecord[];
  setBeneficiaries: (list: BeneficiaryRecord[]) => void;
  addBeneficiary: (record: Omit<BeneficiaryRecord, "id" | "createdAt">) => BeneficiaryRecord;
  updateBeneficiary: (id: string, updates: Partial<BeneficiaryRecord>) => void;
  removeBeneficiary: (id: string) => void;
  togglePinned: (id: string) => void;
  /** Called when a payment to a saved beneficiary goes through. */
  recordPayment: (id: string, amount: number) => void;
  changeTransactionType: (id: string, newType: TransactionType) => void;
  resetToDefault: () => void;
}

export const useBeneficiariesStore = create<BeneficiariesState>()(
  persist(
    (set) => ({
      beneficiaries: SEED_BENEFICIARIES,

      setBeneficiaries: (beneficiaries) => set({ beneficiaries }),

      addBeneficiary: (record) => {
        const id = `ben-${Date.now()}`;
        const newRecord: BeneficiaryRecord = {
          ...record,
          id,
          createdAt: new Date().toISOString().split("T")[0],
        };
        set((state) => ({
          beneficiaries: [newRecord, ...state.beneficiaries],
        }));
        return newRecord;
      },

      updateBeneficiary: (id, updates) => {
        set((state) => ({
          beneficiaries: state.beneficiaries.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        }));
      },

      togglePinned: (id) => {
        set((state) => ({
          beneficiaries: state.beneficiaries.map((b) => (b.id === id ? { ...b, pinned: !b.pinned } : b)),
        }));
      },

      recordPayment: (id, amount) => {
        set((state) => ({
          beneficiaries: state.beneficiaries.map((b) =>
            b.id === id
              ? { ...b, lastPaidAt: new Date().toISOString(), lastAmount: amount, payCount: (b.payCount ?? 0) + 1 }
              : b,
          ),
        }));
      },

      removeBeneficiary: (id) => {
        set((state) => ({
          beneficiaries: state.beneficiaries.filter((b) => b.id !== id),
        }));
      },

      changeTransactionType: (id, newType) => {
        set((state) => ({
          beneficiaries: state.beneficiaries.map((b) => {
            if (b.id !== id) return b;
            const category: BeneficiaryCategory =
              newType === "bill" ? "biller" : newType === "airtime" ? "number" : "person";
            return {
              ...b,
              transactionType: newType,
              category,
            };
          }),
        }));
      },

      resetToDefault: () => {
        set({ beneficiaries: getInitialBeneficiaries() });
      },
    }),
    {
      name: "nibs_beneficiaries_store",
      // v2 added pinned / last paid / pay count (older lists get the demo usage filled in); v3 made one record per
      // mobile number (airtime records fold into wallets)
      version: 3,
      migrate: (persisted) => {
        const state = persisted as { beneficiaries?: BeneficiaryRecord[] };
        return {
          ...state,
          beneficiaries: unifyMobile((state.beneficiaries ?? []).map((b) => ({ ...SEED_USAGE[b.id], ...b }))),
        } as BeneficiariesState;
      },
    }
  )
);
