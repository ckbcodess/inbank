"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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
}

export const SEED_BENEFICIARIES: BeneficiaryRecord[] = [
  // ── Bank Transfers ─────────────────────────────────────────────
  {
    id: "ben-b1",
    name: "Accra Fabrics Ltd",
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
    name: "Kofi Osei",
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
    name: "Ama Serwaa Mensah",
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
    name: "Kwame Boateng",
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
    name: "Yaa Asantewaa",
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
    name: "Efua Mensah",
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
    name: "Ama Serwaa (Alias)",
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
    proxyId: "GHA-71829304-1",
    detail: "Ghana Card · GHA-71829304-1",
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

interface BeneficiariesState {
  beneficiaries: BeneficiaryRecord[];
  addBeneficiary: (record: Omit<BeneficiaryRecord, "id" | "createdAt">) => BeneficiaryRecord;
  updateBeneficiary: (id: string, updates: Partial<BeneficiaryRecord>) => void;
  removeBeneficiary: (id: string) => void;
  changeTransactionType: (id: string, newType: TransactionType) => void;
  resetToDefault: () => void;
}

export const useBeneficiariesStore = create<BeneficiariesState>()(
  persist(
    (set) => ({
      beneficiaries: SEED_BENEFICIARIES,

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
        set({ beneficiaries: SEED_BENEFICIARIES });
      },
    }),
    {
      name: "nibs_beneficiaries_store",
    }
  )
);
