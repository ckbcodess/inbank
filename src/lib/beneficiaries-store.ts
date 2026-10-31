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
  | "swift"
  | "broadband"
  | "card"
  | "qr"
  /** People named on an insurance policy. They are kept by the insurance store and listed here, never saved here. */
  | "insurance";

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
  /** A Ghana.gov service saved for next time: what to open and what to fill in. The invoice number is never kept, it is spent once paid. */
  gov?: { agency: string; serviceId: string; details: Record<string, string> };
  createdAt: string;
}

export const SEED_BENEFICIARIES: BeneficiaryRecord[] = [
  // ── Bank Transfers ─────────────────────────────────────────────
  {
    id: "ben-b0",
    name: "Akua Mansah",
    transactionType: "bank",
    category: "person",
    bankName: "GCB Bank",
    accountNumber: "0412 8890 33210",
    currency: "GHS",
    detail: "GCB Bank · 0412 8890 33210",
    verified: true,
    createdAt: "2026-06-01",
  },
  {
    id: "ben-b1",
    name: "Justice Oduro",
    transactionType: "bank",
    category: "person",
    bankName: "GCB Bank",
    accountNumber: "0231 4455 88901",
    currency: "GHS",
    detail: "GCB Bank · 0231 4455 88901",
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
    accountNumber: "0788 3312 00911",
    currency: "GHS",
    detail: "GCB Bank · 0788 3312 00911",
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
    accountNumber: "1023 4455 66012",
    currency: "GHS",
    detail: "GCB Bank · 1023 4455 66012",
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

  // ── Broadband ──────────────────────────────────────────────────
  {
    id: "ben-bb1",
    name: "Office Broadband",
    transactionType: "broadband",
    category: "number",
    network: "MTN TurboNet",
    phoneNumber: "0244556090",
    detail: "MTN TurboNet · 0244556090",
    verified: true,
    createdAt: "2026-07-18",
  },

  // ── Card Top Up (someone else's prepaid card) ──────────────────
  {
    id: "ben-cd1",
    name: "Kojo's Prepaid Card",
    transactionType: "card",
    category: "number",
    bankName: "GCB Prepaid Card",
    accountNumber: "7X2K89AB",
    currency: "GHS",
    detail: "GCB Prepaid Card · 7X2K89AB",
    verified: true,
    createdAt: "2026-07-20",
  },

  // ── Merchants (GCB QR) ─────────────────────────────────────────
  {
    id: "ben-qr1",
    name: "Melcom Plus — Kaneshie",
    transactionType: "qr",
    category: "biller",
    billerName: "GCB QR",
    billerReference: "GCB-QR-88210",
    detail: "GCB QR · GCB-QR-88210",
    verified: true,
    createdAt: "2026-07-21",
  },
];

export function getInitialBeneficiaries(): BeneficiaryRecord[] {
  if (typeof window === "undefined") return SEED_BENEFICIARIES;
  try {
    const sessionRaw = window.localStorage.getItem("nibs-session");
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      const actorId = parsed?.state?.actor?.id;
      if (actorId === "u-clean") return [];
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

/** The category a kind of beneficiary belongs to. */
export function categoryFor(type: TransactionType): BeneficiaryCategory {
  if (type === "bill" || type === "qr" || type === "insurance") return "biller";
  if (type === "airtime" || type === "broadband" || type === "card") return "number";
  return "person";
}

const identity = (r: Pick<BeneficiaryRecord, "accountNumber" | "phoneNumber" | "proxyId" | "billerReference">) =>
  (r.accountNumber || r.phoneNumber || r.proxyId || r.billerReference || "").replace(/[^a-z0-9]/gi, "").toLowerCase();

/**
 * Saves a beneficiary unless the same one of that kind is already saved. `created` says whether this call added it,
 * so a "Save as beneficiary" switch that is turned off again only removes what it added.
 */
export function saveBeneficiaryOnce(record: Omit<BeneficiaryRecord, "id" | "createdAt">): { id: string; created: boolean } {
  const store = useBeneficiariesStore.getState();
  const key = identity(record);
  const existing = key
    ? store.beneficiaries.find((b) => b.transactionType === record.transactionType && identity(b) === key)
    : undefined;
  if (existing) return { id: existing.id, created: false };
  return { id: store.addBeneficiary(record).id, created: true };
}

interface BeneficiariesState {
  beneficiaries: BeneficiaryRecord[];
  setBeneficiaries: (list: BeneficiaryRecord[]) => void;
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

      removeBeneficiary: (id) => {
        set((state) => ({
          beneficiaries: state.beneficiaries.filter((b) => b.id !== id),
        }));
      },

      changeTransactionType: (id, newType) => {
        set((state) => ({
          beneficiaries: state.beneficiaries.map((b) => {
            if (b.id !== id) return b;
            return {
              ...b,
              transactionType: newType,
              category: categoryFor(newType),
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
      // Browsers that ran the later beneficiaries experiments saved this store as version 3. Keep reading it (extra
      // fields are ignored) instead of throwing it away with a "couldn't be migrated" error.
      version: 4,
      // Version 4 added broadband, card and merchant beneficiaries: bring their demo entries to saved lists.
      migrate: (persisted) => {
        const state = persisted as BeneficiariesState;
        const have = new Set((state.beneficiaries ?? []).map((b) => b.id));
        const added = SEED_BENEFICIARIES.filter(
          (b) => ["broadband", "card", "qr"].includes(b.transactionType) && !have.has(b.id),
        );
        return { ...state, beneficiaries: [...(state.beneficiaries ?? []), ...added] };
      },
    }
  )
);
