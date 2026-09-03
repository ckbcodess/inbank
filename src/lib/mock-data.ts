/**
 * Mock domain data for the NIBS MVP prototype.
 *
 * No backend — every screen reads from here so the state models in section 13
 * can be exercised directly from the UI.
 */

import type { Actor, Profile } from "./roles";
import type { TransactionKind, TransactionState, TradeApprovalState } from "./states";
import { getGlobalShowAmounts } from "@/components/providers/AmountVisibilityProvider";

/* ── Actors ────────────────────────────────────────────────────────────────── */

const RETAIL_PROFILE: Profile = {
  id: "prof-retail",
  kind: "RETAIL",
  name: "Personal Banking",
  reference: "•••• 4821",
};

const JOINT_PROFILE: Profile = {
  id: "prof-joint",
  kind: "RETAIL",
  name: "Kwame & Efua Mensah (Joint)",
  reference: "JOINT-8844",
};

const CORPORATE_PROFILE: Profile = {
  id: "prof-corp",
  kind: "CORPORATE",
  name: "Adinkra Textiles Ltd",
  reference: "CORP-90114",
};

/**
 * Demo identities. Each is a separate credential — per section 12.1 no identity
 * spans both shells, which is why internal staff carry no profiles.
 */
export const ACTORS: Actor[] = [
  {
    id: "u-retail",
    name: "Ama Serwaa",
    email: "ama.serwaa@example.com",
    role: "RETAIL_CUSTOMER",
    shell: "customer",
    profiles: [RETAIL_PROFILE],
    tradeEligible: false,
  },
  {
    id: "u-joint",
    name: "Kwame Mensah",
    email: "kwame.joint@example.com",
    role: "RETAIL_CUSTOMER",
    shell: "customer",
    profiles: [RETAIL_PROFILE, JOINT_PROFILE],
    tradeEligible: false,
  },
  {
    id: "u-joint-either",
    name: "Kojo Appiah",
    email: "kojo.appiah@example.com",
    role: "RETAIL_CUSTOMER",
    shell: "customer",
    profiles: [RETAIL_PROFILE],
    tradeEligible: false,
  },
  {
    id: "u-abena",
    name: "Abena Osei (Mobile App)",
    email: "abena.osei@example.com",
    role: "RETAIL_CUSTOMER",
    shell: "customer",
    profiles: [RETAIL_PROFILE],
    tradeEligible: false,
  },
  {
    id: "u-kofi",
    name: "Kofi Mensah (COOS)",
    email: "kofi.mensah@example.com",
    role: "RETAIL_CUSTOMER",
    shell: "customer",
    profiles: [RETAIL_PROFILE],
    tradeEligible: false,
  },
  {
    id: "u-yaw",
    name: "Yaw Oppong (New Device)",
    email: "yaw.oppong@example.com",
    role: "RETAIL_CUSTOMER",
    shell: "customer",
    profiles: [RETAIL_PROFILE, CORPORATE_PROFILE],
    tradeEligible: true,
  },
  {
    id: "u-dual",
    name: "Kwame Boateng",
    email: "kwame.boateng@example.com",
    role: "CORPORATE_MAKER",
    shell: "customer",
    profiles: [RETAIL_PROFILE, CORPORATE_PROFILE],
    tradeEligible: true,
  },
  {
    id: "u-approver",
    name: "Efua Mensah",
    email: "efua.mensah@example.com",
    role: "CORPORATE_APPROVER",
    shell: "customer",
    profiles: [RETAIL_PROFILE, CORPORATE_PROFILE],
    tradeEligible: true,
  },
  {
    id: "u-corpadmin",
    name: "Yaw Oppong (Corporate Admin)",
    email: "yaw.corp@example.com",
    role: "CORPORATE_ADMIN",
    shell: "customer",
    profiles: [CORPORATE_PROFILE],
    tradeEligible: true,
  },
  {
    id: "u-tradeofficer",
    name: "Nana Addo",
    email: "nana.addo@bank.internal",
    role: "TRADE_OFFICER",
    shell: "admin",
    profiles: [],
    tradeEligible: false,
  },
  {
    id: "u-ops",
    name: "Abena Owusu",
    email: "abena.owusu@bank.internal",
    role: "OPERATIONS_USER",
    shell: "admin",
    profiles: [],
    tradeEligible: false,
  },
  {
    id: "u-bankadmin",
    name: "Kofi Asante",
    email: "kofi.asante@bank.internal",
    role: "BANK_ADMIN",
    shell: "admin",
    profiles: [],
    tradeEligible: false,
  },
];

export function findActorByEmail(email: string): Actor | undefined {
  const norm = email.trim().toLowerCase();
  if (norm === "kwame.mensah@example.com" || norm === "kwame.joint@example.com") {
    return ACTORS.find((a) => a.id === "u-joint");
  }
  return ACTORS.find((a) => a.email.toLowerCase() === norm);
}

/* ── Accounts ──────────────────────────────────────────────────────────────── */

export interface Account {
  id: string;
  name: string;
  number: string;
  type: "Current" | "Savings" | "Foreign Currency";
  currency: string;
  balance: number;
  available: number;
  status: "Active" | "Dormant";
  profileKind?: "RETAIL" | "CORPORATE";
  isJoint?: boolean;
  jointHolders?: string[];
  mandate?: "Either to sign" | "Both to sign";
}

export const ACCOUNTS: Account[] = [
  {
    id: "acc-personal",
    name: "Personal Current Account",
    number: "1001 4821 9901",
    type: "Current",
    currency: "GHS",
    balance: 42_300.0,
    available: 42_300.0,
    status: "Active",
    profileKind: "RETAIL",
    isJoint: false,
  },
  {
    id: "acc-joint",
    name: "Joint Premier Savings",
    number: "3300 8844 9922",
    type: "Savings",
    currency: "GHS",
    balance: 245_800.0,
    available: 245_800.0,
    status: "Active",
    profileKind: "RETAIL",
    isJoint: true,
    jointHolders: ["Kwame Mensah", "Efua Mensah"],
    mandate: "Both to sign",
  },
  {
    id: "acc-joint-either",
    name: "Joint Family Savings",
    number: "3300 7711 2233",
    type: "Savings",
    currency: "GHS",
    balance: 150_000.0,
    available: 150_000.0,
    status: "Active",
    profileKind: "RETAIL",
    isJoint: true,
    jointHolders: ["Kojo Appiah", "Akosua Appiah"],
    mandate: "Either to sign",
  },
  {
    id: "acc-001",
    name: "Corporate Current Account",
    number: "1001 2345 6789",
    type: "Current",
    currency: "GHS",
    balance: 1_284_530.44,
    available: 1_190_000.0,
    status: "Active",
    profileKind: "CORPORATE",
  },
  {
    id: "acc-002",
    name: "Payroll Account",
    number: "1001 2345 7710",
    type: "Current",
    currency: "GHS",
    balance: 342_118.9,
    available: 342_118.9,
    status: "Active",
    profileKind: "CORPORATE",
  },
  {
    id: "acc-003",
    name: "USD Trade Account",
    number: "2200 8891 0043",
    type: "Foreign Currency",
    currency: "USD",
    balance: 486_220.15,
    available: 452_000.0,
    status: "Active",
    profileKind: "CORPORATE",
  },
  {
    id: "acc-004",
    name: "Reserve Savings",
    number: "3300 1122 5566",
    type: "Savings",
    currency: "GHS",
    balance: 95_400.0,
    available: 95_400.0,
    status: "Dormant",
    profileKind: "CORPORATE",
  },
  {
    id: "acc-ret-001",
    name: "Personal Savings Account",
    number: "4001 9922 1100",
    type: "Savings",
    currency: "GHS",
    balance: 14_250.0,
    available: 14_250.0,
    status: "Active",
    profileKind: "RETAIL",
  },
  {
    id: "acc-ret-002",
    name: "Personal Current Account",
    number: "4001 9922 3344",
    type: "Current",
    currency: "GHS",
    balance: 3_820.5,
    available: 3_820.5,
    status: "Active",
    profileKind: "RETAIL",
  },
];

/**
 * Foreign-currency accounts are out of scope — the BRD covers local-currency
 * accounts only, so they never surface in account lists, balances or pickers.
 * `acc-003` stays in ACCOUNTS purely so trade records and USD cards that
 * reference it still resolve through `findAccount`.
 */
export function accountsForProfile(kind: "RETAIL" | "CORPORATE" = "CORPORATE"): Account[] {
  return ACCOUNTS.filter(
    (a) => (a.profileKind ?? "CORPORATE") === kind && a.type !== "Foreign Currency",
  );
}

export function findAccount(id: string): Account | undefined {
  return ACCOUNTS.find((a) => a.id === id);
}

/* ── Transactions ──────────────────────────────────────────────────────────── */

/**
 * Spend categories are profile-specific — a corporate ledger has no "Groceries"
 * line and a personal one has no "Payroll" line. Both lists are capped at eight
 * so the dashboard breakdown never has to invent a colour; see `insights.ts`.
 */
export const CORPORATE_CATEGORIES = [
  "Payroll",
  "Suppliers",
  "Trade & imports",
  "Rent & facilities",
  "Utilities",
  "Travel",
  "Taxes & levies",
  "Bank charges",
] as const;

export const RETAIL_CATEGORIES = [
  "Groceries",
  "Transport",
  "Shopping",
  "Utilities",
  "Dining",
  "Cash & MoMo",
  "Airtime & data",
  "Health",
] as const;

export type SpendCategory =
  | (typeof CORPORATE_CATEGORIES)[number]
  | (typeof RETAIL_CATEGORIES)[number];

export interface Transaction {
  id: string;
  reference: string;
  date: string;
  valueDate: string;
  description: string;
  counterparty: string;
  counterpartyAccount: string;
  accountId: string;
  currency: string;
  amount: number;
  direction: "debit" | "credit";
  kind: TransactionKind;
  state: TransactionState;
  channel: string;
  profileKind?: "RETAIL" | "CORPORATE";
  /** Spend classification — debits only; credits are income, not a spend line. */
  category?: SpendCategory;
  /** Populated for failed states — drives the recovery path. */
  failureReason?: string;
  /** For failed-bulk: the batch this record belongs to. */
  batchId?: string;
  /** For failed-trade: the trade whose version history to open. */
  tradeId?: string;
  /** For reversed: reference of the reversing entry. */
  reversalReference?: string;
  fee?: number;
}

export const TRANSACTIONS: Transaction[] = [
  {
    id: "txn-001",
    reference: "NIB-2026-884213",
    date: "2026-08-10",
    valueDate: "2026-08-10",
    description: "Supplier payment — Accra Fabrics",
    counterparty: "Accra Fabrics Ltd",
    counterpartyAccount: "0231 4455 8890",
    accountId: "acc-001",
    currency: "GHS",
    amount: 48_500.0,
    direction: "debit",
    kind: "single",
    state: "completed",
    channel: "Internet Banking",
    fee: 12.5,
    category: "Suppliers",
    profileKind: "CORPORATE",
  },
  {
    id: "txn-002",
    reference: "NIB-2026-884219",
    date: "2026-08-10",
    valueDate: "2026-08-11",
    description: "Payroll batch — August",
    counterparty: "Multiple (142 beneficiaries)",
    counterpartyAccount: "—",
    accountId: "acc-002",
    currency: "GHS",
    amount: 286_400.0,
    direction: "debit",
    kind: "bulk",
    state: "pending",
    channel: "Bulk Upload",
    batchId: "batch-0091",
    category: "Payroll",
    profileKind: "CORPORATE",
  },
  {
    id: "txn-003",
    reference: "NIB-2026-884101",
    date: "2026-08-09",
    valueDate: "2026-08-09",
    description: "Vendor settlement — Tema Logistics",
    counterparty: "Tema Logistics",
    counterpartyAccount: "0554 7781 2200",
    accountId: "acc-001",
    currency: "GHS",
    amount: 15_750.0,
    direction: "debit",
    kind: "single",
    state: "failed-single",
    channel: "Internet Banking",
    failureReason:
      "Beneficiary account name does not match the account number at the receiving bank (FR-32).",
    category: "Suppliers",
    profileKind: "CORPORATE",
  },
  {
    id: "txn-004",
    reference: "NIB-2026-883940",
    date: "2026-08-08",
    valueDate: "2026-08-08",
    description: "Payroll record — K. Amoah",
    counterparty: "Kwesi Amoah",
    counterpartyAccount: "0119 2234 7781",
    accountId: "acc-002",
    currency: "GHS",
    amount: 4_200.0,
    direction: "debit",
    kind: "bulk",
    state: "failed-bulk",
    channel: "Bulk Upload",
    batchId: "batch-0090",
    failureReason: "Record 37 of 140 — beneficiary account closed.",
    category: "Payroll",
    profileKind: "CORPORATE",
  },
  {
    id: "txn-005",
    reference: "TRD-2026-00417",
    date: "2026-08-07",
    valueDate: "2026-08-07",
    description: "Documentary collection — cotton import",
    counterparty: "Shenzhen Textile Group",
    counterpartyAccount: "CN-8891-40023",
    accountId: "acc-003",
    currency: "USD",
    amount: 128_000.0,
    direction: "debit",
    kind: "trade",
    state: "failed-trade",
    channel: "Trade Portal",
    tradeId: "trade-0417",
    failureReason:
      "Returned by bank operations — commercial invoice does not match the bill of lading quantity.",
    category: "Trade & imports",
    profileKind: "CORPORATE",
  },
  {
    id: "txn-006",
    reference: "NIB-2026-883712",
    date: "2026-08-06",
    valueDate: "2026-08-06",
    description: "Incoming transfer — Ghana Cocoa Board",
    counterparty: "Ghana Cocoa Board",
    counterpartyAccount: "0044 1123 9080",
    accountId: "acc-001",
    currency: "GHS",
    amount: 512_000.0,
    direction: "credit",
    kind: "single",
    state: "completed",
    channel: "RTGS",
    profileKind: "CORPORATE",
  },
  {
    id: "txn-007",
    reference: "NIB-2026-883550",
    date: "2026-08-05",
    valueDate: "2026-08-05",
    description: "Corporate Travel POS — Flight Booking",
    counterparty: "Ghana Airways",
    counterpartyAccount: "0099 2211 4400",
    accountId: "acc-001",
    currency: "GHS",
    amount: 3_850.0,
    direction: "debit",
    kind: "single",
    state: "completed",
    channel: "POS Card",
    category: "Travel",
    profileKind: "CORPORATE",
  },
  {
    id: "txn-008",
    reference: "NIB-2026-883490",
    date: "2026-08-04",
    valueDate: "2026-08-04",
    description: "Executive Mobile Pay — Utility Bill",
    counterparty: "ECG Ghana",
    counterpartyAccount: "0012 9944 8811",
    accountId: "acc-001",
    currency: "GHS",
    amount: 1_200.0,
    direction: "debit",
    kind: "single",
    state: "completed",
    channel: "Mobile Banking",
    category: "Utilities",
    profileKind: "CORPORATE",
  },
  {
    id: "txn-ret-001",
    reference: "NIB-2026-901124",
    date: "2026-08-11",
    valueDate: "2026-08-11",
    description: "Supermarket Purchase — Melcom",
    counterparty: "Melcom Stores",
    counterpartyAccount: "0012 3456 7890",
    accountId: "acc-ret-002",
    currency: "GHS",
    amount: 450.0,
    direction: "debit",
    kind: "single",
    state: "completed",
    channel: "POS Card",
    category: "Groceries",
    profileKind: "RETAIL",
  },
  {
    id: "txn-ret-002",
    reference: "NIB-2026-901125",
    date: "2026-08-10",
    valueDate: "2026-08-10",
    description: "Monthly Salary Credit",
    counterparty: "Employer Ltd",
    counterpartyAccount: "1001 2345 6789",
    accountId: "acc-ret-002",
    currency: "GHS",
    amount: 8_500.0,
    direction: "credit",
    kind: "single",
    state: "completed",
    channel: "ACH Direct Credit",
    profileKind: "RETAIL",
  },
  {
    id: "txn-ret-003",
    reference: "NIB-2026-901126",
    date: "2026-08-08",
    valueDate: "2026-08-08",
    description: "Transfer to Savings",
    counterparty: "Personal Savings Account",
    counterpartyAccount: "4001 9922 1100",
    accountId: "acc-ret-001",
    currency: "GHS",
    amount: 2_000.0,
    direction: "credit",
    kind: "single",
    state: "completed",
    channel: "Mobile Banking",
    profileKind: "RETAIL",
  },
  {
    id: "txn-ret-004",
    reference: "NIB-2026-901127",
    date: "2026-08-07",
    valueDate: "2026-08-07",
    description: "Online Merchant — Amazon Checkout",
    counterparty: "Amazon Pay",
    counterpartyAccount: "US-AMZN-9912",
    accountId: "acc-ret-002",
    currency: "GHS",
    amount: 210.0,
    direction: "debit",
    kind: "single",
    state: "completed",
    channel: "POS Card",
    category: "Shopping",
    profileKind: "RETAIL",
  },
  {
    id: "txn-ret-005",
    reference: "NIB-2026-901128",
    date: "2026-08-06",
    valueDate: "2026-08-06",
    description: "Mobile Money Cashout — MTN MoMo",
    counterparty: "MTN MoMo Agent",
    counterpartyAccount: "0244 1122 33",
    accountId: "acc-ret-002",
    currency: "GHS",
    amount: 500.0,
    direction: "debit",
    kind: "single",
    state: "completed",
    channel: "Mobile Banking",
    category: "Cash & MoMo",
    profileKind: "RETAIL",
  },
];

export function findTransaction(id: string): Transaction | undefined {
  return TRANSACTIONS.find((t) => t.id === id);
}

export function transactionsForAccount(accountId: string): Transaction[] {
  return TRANSACTIONS.filter((t) => t.accountId === accountId);
}

export function transactionsForProfile(kind: "RETAIL" | "CORPORATE" = "CORPORATE"): Transaction[] {
  return TRANSACTIONS.filter((t) => (t.profileKind ?? "CORPORATE") === kind);
}

/* ── Beneficiaries ─────────────────────────────────────────────────────────── */

export interface Beneficiary {
  id: string;
  name: string;
  accountNumber: string;
  bank: string;
  currency: string;
}

export const BENEFICIARIES: Beneficiary[] = [
  { id: "ben-1", name: "Accra Fabrics Ltd", accountNumber: "0231 4455 8890", bank: "Standard Bank Ghana", currency: "GHS" },
  { id: "ben-2", name: "Tema Logistics", accountNumber: "0554 7781 2200", bank: "Ecobank Ghana", currency: "GHS" },
  { id: "ben-3", name: "Volta Machinery Ltd", accountNumber: "0661 9902 3345", bank: "Absa Ghana", currency: "GHS" },
  { id: "ben-4", name: "Kumasi Supplies", accountNumber: "0788 3312 0091", bank: "GCB Bank", currency: "GHS" },
  { id: "ben-5", name: "Shenzhen Textile Group", accountNumber: "CN-8891-40023", bank: "Bank of China", currency: "USD" },
];

/* ── Approval queue ────────────────────────────────────────────────────────── */

export interface ApprovalItem {
  id: string;
  reference: string;
  type: "payment" | "trade";
  description: string;
  counterparty: string;
  currency: string;
  amount: number;
  submittedBy: string;
  submittedAt: string;
  /** Approver authority check — drives 13.4 within-limit vs exceeds-limit. */
  approvalLimit: number;
  priority: "standard" | "urgent";
}

export const APPROVAL_QUEUE: ApprovalItem[] = [
  {
    id: "apr-001",
    reference: "NIB-2026-884260",
    type: "payment",
    description: "Equipment purchase — Volta Machinery",
    counterparty: "Volta Machinery Ltd",
    currency: "GHS",
    amount: 96_000.0,
    submittedBy: "Kwame Boateng",
    submittedAt: "2026-08-11 09:14",
    approvalLimit: 250_000.0,
    priority: "standard",
  },
  {
    id: "apr-002",
    reference: "NIB-2026-884288",
    type: "payment",
    description: "Quarterly supplier settlement",
    counterparty: "Accra Fabrics Ltd",
    currency: "GHS",
    amount: 480_000.0,
    submittedBy: "Kwame Boateng",
    submittedAt: "2026-08-11 10:02",
    approvalLimit: 250_000.0, // exceeds → 13.4 exceeds-limit
    priority: "urgent",
  },
  {
    id: "apr-003",
    reference: "TRD-2026-00421",
    type: "trade",
    description: "Letter of credit — cotton import Q3",
    counterparty: "Shenzhen Textile Group",
    currency: "USD",
    amount: 210_000.0,
    submittedBy: "Kwame Boateng",
    submittedAt: "2026-08-10 16:41",
    approvalLimit: 500_000.0,
    priority: "standard",
  },
  {
    id: "apr-004",
    reference: "TRD-2026-00423",
    type: "trade",
    description: "Documentary collection — machinery parts",
    counterparty: "Hamburg Werke GmbH",
    currency: "USD",
    amount: 74_500.0,
    submittedBy: "Yaw Oppong",
    submittedAt: "2026-08-11 08:30",
    approvalLimit: 500_000.0,
    priority: "standard",
  },
];

export function findApproval(id: string): ApprovalItem | undefined {
  return APPROVAL_QUEUE.find((a) => a.id === id);
}

/* ── Trade documents & versions (13.5) ─────────────────────────────────────── */

export interface TradeDocument {
  id: string;
  name: string;
  type: string;
  pages: number;
  uploadedAt: string;
  status: "received" | "missing" | "superseded";
}

export const TRADE_DOCUMENTS: TradeDocument[] = [
  { id: "doc-1", name: "Commercial Invoice", type: "PDF", pages: 3, uploadedAt: "2026-08-10 16:38", status: "received" },
  { id: "doc-2", name: "Bill of Lading", type: "PDF", pages: 2, uploadedAt: "2026-08-10 16:39", status: "received" },
  { id: "doc-3", name: "Packing List", type: "PDF", pages: 4, uploadedAt: "2026-08-10 16:40", status: "received" },
  { id: "doc-4", name: "Certificate of Origin", type: "PDF", pages: 1, uploadedAt: "—", status: "missing" },
  { id: "doc-5", name: "Insurance Certificate", type: "PDF", pages: 2, uploadedAt: "2026-08-10 16:41", status: "received" },
];

export interface TradeVersion {
  version: number;
  submittedAt: string;
  submittedBy: string;
  summary: string;
}

export const TRADE_VERSIONS: TradeVersion[] = [
  { version: 1, submittedAt: "2026-08-04 11:20", submittedBy: "Kwame Boateng", summary: "Initial submission" },
  { version: 2, submittedAt: "2026-08-08 09:55", submittedBy: "Kwame Boateng", summary: "Corrected invoice quantity after clarification" },
  { version: 3, submittedAt: "2026-08-10 16:41", submittedBy: "Kwame Boateng", summary: "Added insurance certificate, revised incoterms" },
];

/** Field-level diff between v(n-1) and v(n) — 13.5 requires a visual diff. */
export interface VersionFieldDiff {
  field: string;
  previous: string;
  current: string;
  changed: boolean;
}

export const VERSION_DIFF: VersionFieldDiff[] = [
  { field: "Goods description", previous: "Raw cotton, grade A", current: "Raw cotton, grade A", changed: false },
  { field: "Quantity", previous: "18,000 kg", current: "16,400 kg", changed: true },
  { field: "Unit price", previous: "USD 7.10 / kg", current: "USD 7.80 / kg", changed: true },
  { field: "Total value", previous: "USD 127,800.00", current: "USD 127,920.00", changed: true },
  { field: "Incoterms", previous: "FOB Shenzhen", current: "CIF Tema", changed: true },
  { field: "Latest shipment date", previous: "2026-09-15", current: "2026-09-15", changed: false },
  { field: "Beneficiary", previous: "Shenzhen Textile Group", current: "Shenzhen Textile Group", changed: false },
];

export const TRADE_APPROVAL_DEFAULT_STATE: TradeApprovalState = "awaiting-decision";

/* ── Cards — FR-33 (fund prepaid card), FR-34 (block / unblock) ─────────────── */

export type CardStatus = "Active" | "Blocked" | "Expired";
export type CardType = "Prepaid" | "Debit" | "Virtual";

export interface PaymentCard {
  id: string;
  name: string;
  /** Only the last four digits are rendered by default. */
  maskedNumber: string;
  fullNumber?: string;
  cvv?: string;
  type: CardType;
  scheme: "Visa" | "Mastercard";
  currency: string;
  /** Prepaid/Virtual cards carry their own balance; debit cards draw on the linked account. */
  balance: number | null;
  spendLimit?: number | null;
  linkedAccountId: string;
  holder: string;
  expiry: string;
  status: CardStatus;
  /** FR-33 applies only to eligible prepaid/virtual cards. */
  fundable: boolean;
  isVirtual?: boolean;
  singleUse?: boolean;
  profileKind?: "RETAIL" | "CORPORATE";
}

export const CARDS: PaymentCard[] = [
  {
    id: "card-v01",
    name: "AWS & SaaS Virtual Card",
    maskedNumber: "•••• 9102",
    fullNumber: "4532 8910 4421 9102",
    cvv: "814",
    type: "Virtual",
    scheme: "Visa",
    currency: "USD",
    balance: 5_000.0,
    spendLimit: 10_000.0,
    linkedAccountId: "acc-003",
    holder: "Kwame Boateng",
    expiry: "12/28",
    status: "Active",
    fundable: true,
    isVirtual: true,
    singleUse: false,
    profileKind: "CORPORATE",
  },
  {
    id: "card-v02",
    name: "Google Ads Marketing Virtual Card",
    maskedNumber: "•••• 3194",
    fullNumber: "5412 7719 3320 3194",
    cvv: "492",
    type: "Virtual",
    scheme: "Mastercard",
    currency: "GHS",
    balance: 2_500.0,
    spendLimit: 5_000.0,
    linkedAccountId: "acc-001",
    holder: "Kwame Boateng",
    expiry: "06/27",
    status: "Active",
    fundable: true,
    isVirtual: true,
    singleUse: false,
    profileKind: "CORPORATE",
  },
  {
    id: "card-001",
    name: "Corporate Prepaid — Travel",
    maskedNumber: "•••• 4412",
    fullNumber: "4532 1100 8820 4412",
    cvv: "219",
    type: "Prepaid",
    scheme: "Visa",
    currency: "GHS",
    balance: 12_450.0,
    linkedAccountId: "acc-001",
    holder: "Ama Serwaa",
    expiry: "09/28",
    status: "Active",
    fundable: true,
    profileKind: "CORPORATE",
  },
  {
    id: "card-002",
    name: "Corporate Prepaid — Procurement",
    maskedNumber: "•••• 8830",
    fullNumber: "5412 6601 2290 8830",
    cvv: "614",
    type: "Prepaid",
    scheme: "Mastercard",
    currency: "USD",
    balance: 3_180.5,
    linkedAccountId: "acc-003",
    holder: "Kwabena Mensah",
    expiry: "02/27",
    status: "Active",
    fundable: true,
    profileKind: "CORPORATE",
  },
  {
    id: "card-003",
    name: "Business Debit",
    maskedNumber: "•••• 1207",
    type: "Debit",
    scheme: "Visa",
    currency: "GHS",
    balance: null,
    linkedAccountId: "acc-001",
    holder: "Ama Serwaa",
    expiry: "11/29",
    status: "Active",
    fundable: false,
    profileKind: "CORPORATE",
  },
  {
    id: "card-004",
    name: "Payroll Prepaid",
    maskedNumber: "•••• 6654",
    type: "Prepaid",
    scheme: "Mastercard",
    currency: "GHS",
    balance: 0,
    linkedAccountId: "acc-002",
    holder: "Yaw Boateng",
    expiry: "05/26",
    status: "Blocked",
    fundable: true,
    profileKind: "CORPORATE",
  },
  {
    id: "card-ret-001",
    name: "Visa Personal Debit",
    maskedNumber: "•••• 9102",
    type: "Debit",
    scheme: "Visa",
    currency: "GHS",
    balance: null,
    linkedAccountId: "acc-ret-002",
    holder: "Efua Mensah",
    expiry: "12/28",
    status: "Active",
    fundable: false,
    profileKind: "RETAIL",
  },
  {
    id: "card-ret-002",
    name: "Mastercard Virtual Prepaid",
    maskedNumber: "•••• 5521",
    type: "Prepaid",
    scheme: "Mastercard",
    currency: "GHS",
    balance: 2_450.0,
    linkedAccountId: "acc-ret-001",
    holder: "Ama Serwaa",
    expiry: "08/29",
    status: "Active",
    fundable: true,
    profileKind: "RETAIL",
  },
  {
    id: "card-005",
    name: "Executive Rewards Debit",
    maskedNumber: "•••• 3719",
    type: "Debit",
    scheme: "Mastercard",
    currency: "GHS",
    balance: null,
    linkedAccountId: "acc-001",
    holder: "Kwame Boateng",
    expiry: "10/30",
    status: "Active",
    fundable: false,
    profileKind: "CORPORATE",
  },
];

export function cardsForProfile(kind: "RETAIL" | "CORPORATE" = "CORPORATE"): PaymentCard[] {
  return CARDS.filter((c) => (c.profileKind ?? "CORPORATE") === kind);
}

export function findCard(id: string): PaymentCard | undefined {
  return CARDS.find((c) => c.id === id);
}

export function addCard(card: PaymentCard): void {
  CARDS.unshift(card);
}

/**
 * FR-34 — block/unblock a card. Mutates in place, like `addCard`, so the change
 * survives navigation within the session; callers bump their own state to
 * re-render.
 */
export function setCardStatus(id: string, status: CardStatus): void {
  const card = CARDS.find((c) => c.id === id);
  if (card) card.status = status;
}

/** FR-33 — prepaid/virtual card funding. Debit cards draw on their linked
 *  account and carry no balance of their own, so they are not fundable. */
export function fundCard(id: string, amount: number): boolean {
  const card = CARDS.find((c) => c.id === id);
  if (!card || !card.fundable || card.balance === null || amount <= 0) return false;
  card.balance = Math.round((card.balance + amount) * 100) / 100;
  return true;
}

/* ── FX rates — FR-30 (Bank's published daily rates) ────────────────────────── */

export interface FxRate {
  pair: string;
  base: string;
  quote: string;
  buy: number;
  sell: number;
  mid: number;
  /** Day-on-day change in the mid rate, as a percentage. */
  changePct: number;
}

/**
 * FR-30 is a *published rates* board — reference data, not a dealing screen.
 * Converting an amount against a published rate is still reference use: it is
 * indicative, it books nothing, and it holds no quote. What stays out is any
 * action that commits the customer to a rate; the actual deal happens in the
 * transaction flow (S14).
 */
export const FX_PUBLISHED_AT = "2026-08-11T08:30:00Z";

export const FX_RATES: FxRate[] = [
  { pair: "USD/GHS", base: "USD", quote: "GHS", buy: 11.42, sell: 11.68, mid: 11.55, changePct: 0.34 },
  { pair: "GBP/GHS", base: "GBP", quote: "GHS", buy: 14.55, sell: 14.89, mid: 14.72, changePct: -0.18 },
  { pair: "EUR/GHS", base: "EUR", quote: "GHS", buy: 12.48, sell: 12.77, mid: 12.63, changePct: 0.11 },
  { pair: "CHF/GHS", base: "CHF", quote: "GHS", buy: 12.9, sell: 13.24, mid: 13.07, changePct: 0.05 },
  { pair: "ZAR/GHS", base: "ZAR", quote: "GHS", buy: 0.62, sell: 0.67, mid: 0.645, changePct: -0.42 },
  { pair: "NGN/GHS", base: "NGN", quote: "GHS", buy: 0.0071, sell: 0.0079, mid: 0.0075, changePct: -1.05 },
  { pair: "CNY/GHS", base: "CNY", quote: "GHS", buy: 1.58, sell: 1.66, mid: 1.62, changePct: 0.22 },
];

export function findFxRate(currency: string): FxRate | undefined {
  return FX_RATES.find((r) => r.base === currency.toUpperCase());
}

/**
 * Local-currency equivalent of a foreign balance, at the published mid rate.
 *
 * Any figure shown in a currency the customer does not think in is a figure
 * they have to convert in their head. Wherever a non-GHS amount appears, the
 * GHS equivalent belongs beside it. Returns null for GHS (nothing to convert)
 * and for currencies with no published rate — better to show nothing than a
 * number the bank has not published.
 */
export function toLocalEquivalent(amount: number, currency: string): number | null {
  if (currency.toUpperCase() === "GHS") return null;
  const rate = findFxRate(currency);
  if (!rate) return null;
  return Math.round(amount * rate.mid * 100) / 100;
}

/* ── Billers & standing instructions — FR-05 ────────────────────────────────── */

export type BillerCategory =
  | "Education"
  | "Government"
  | "Health"
  | "Religious & Donations"
  | "TV & Entertainment"
  | "Utilities"
  | "Others";

export interface Biller {
  id: string;
  name: string;
  category: BillerCategory;
  reference: string;
}

export const BILLERS: Biller[] = [
  // Utilities
  { id: "bil-001", name: "ECG — Electricity", category: "Utilities", reference: "Meter number" },
  { id: "bil-002", name: "Ghana Water (GWCL)", category: "Utilities", reference: "Account number" },
  { id: "bil-002b", name: "NEDCo Power Ghana", category: "Utilities", reference: "Meter number" },

  // TV & Entertainment
  { id: "bil-006", name: "DSTV / MultiChoice", category: "TV & Entertainment", reference: "Smartcard number" },
  { id: "bil-007", name: "StarTimes Ghana", category: "TV & Entertainment", reference: "Smartcard number" },
  { id: "bil-007b", name: "GOtv Ghana", category: "TV & Entertainment", reference: "IUC number" },
  { id: "bil-007c", name: "Showmax Ghana", category: "TV & Entertainment", reference: "Mobile number" },

  // Education
  { id: "bil-008", name: "University of Ghana (Legon)", category: "Education", reference: "Student ID / Index No." },
  { id: "bil-008b", name: "KNUST Tuition & Fees", category: "Education", reference: "Student ID" },
  { id: "bil-008c", name: "WAEC Exams Portal", category: "Education", reference: "Index number" },
  { id: "bil-008d", name: "UCC Cape Coast", category: "Education", reference: "Registration number" },

  // Government
  { id: "bil-004", name: "GRA — Tax Payment", category: "Government", reference: "TIN" },
  { id: "bil-004b", name: "Ghana.gov Platform", category: "Government", reference: "Invoice / Ref Code" },
  { id: "bil-004c", name: "DVLA — Driver Licence", category: "Government", reference: "Licence / Reg No." },
  { id: "bil-004d", name: "Passports Office Ghana", category: "Government", reference: "Application ID" },

  // Health
  { id: "bil-009", name: "National Health Insurance (NHIS)", category: "Health", reference: "Membership ID" },
  { id: "bil-009b", name: "Korle Bu Teaching Hospital", category: "Health", reference: "Hospital Folder / Patient ID" },
  { id: "bil-009c", name: "37 Military Hospital", category: "Health", reference: "Patient ID" },

  // Religious & Donations
  { id: "bil-010", name: "ICGC Christ Temple", category: "Religious & Donations", reference: "Member ID / Phone" },
  { id: "bil-010b", name: "Action Chapel International", category: "Religious & Donations", reference: "Member ID / Pledge Code" },
  { id: "bil-010c", name: "Catholic Archdiocese of Accra", category: "Religious & Donations", reference: "Parish / Donor ID" },
  { id: "bil-010d", name: "Ghana Red Cross Society", category: "Religious & Donations", reference: "Donor ID" },

  // Others
  { id: "bil-003", name: "MTN Ghana Broadband", category: "Others", reference: "Mobile / Account number" },
  { id: "bil-003b", name: "Telecel Fixed Broadband", category: "Others", reference: "Broadband account ID" },
  { id: "bil-005", name: "SIC Insurance", category: "Others", reference: "Policy number" },
  { id: "bil-005b", name: "Enterprise Life Insurance", category: "Others", reference: "Policy number" },
  { id: "bil-005c", name: "Ghana Post / Courier EMS", category: "Others", reference: "Tracking / Account ID" },
];

export type InstructionFrequency = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";

export interface StandingInstruction {
  id: string;
  beneficiary: string;
  accountId: string;
  amount: number;
  currency: string;
  frequency: InstructionFrequency;
  nextRun: string;
  status: "Active" | "Paused";
}

export const STANDING_INSTRUCTIONS: StandingInstruction[] = [
  {
    id: "si-001",
    beneficiary: "Adom Facilities Ltd — Office rent",
    accountId: "acc-001",
    amount: 18_500,
    currency: "GHS",
    frequency: "Monthly",
    nextRun: "2026-09-01",
    status: "Active",
  },
  {
    id: "si-002",
    beneficiary: "SIC Insurance — Fleet premium",
    accountId: "acc-001",
    amount: 4_200,
    currency: "GHS",
    frequency: "Quarterly",
    nextRun: "2026-10-01",
    status: "Active",
  },
  {
    id: "si-003",
    beneficiary: "Zenith Cleaning Services",
    accountId: "acc-002",
    amount: 2_750,
    currency: "GHS",
    frequency: "Monthly",
    nextRun: "2026-09-05",
    status: "Paused",
  },
];

let standingSeq = STANDING_INSTRUCTIONS.length;

/** Pause or resume a standing instruction (mutates in place, like fundCard). */
export function setStandingStatus(id: string, status: "Active" | "Paused"): void {
  const si = STANDING_INSTRUCTIONS.find((s) => s.id === id);
  if (si) si.status = status;
}

/** Permanently cancel (remove) a standing instruction. */
export function cancelStandingInstruction(id: string): void {
  const i = STANDING_INSTRUCTIONS.findIndex((s) => s.id === id);
  if (i >= 0) STANDING_INSTRUCTIONS.splice(i, 1);
}

/** Create a new instruction, or update an existing one when `id` is supplied. */
export function saveStandingInstruction(input: Omit<StandingInstruction, "id"> & { id?: string }): StandingInstruction {
  if (input.id) {
    const si = STANDING_INSTRUCTIONS.find((s) => s.id === input.id);
    if (si) {
      Object.assign(si, input);
      return si;
    }
  }
  standingSeq += 1;
  const created: StandingInstruction = { ...input, id: `si-${String(standingSeq).padStart(3, "0")}` };
  STANDING_INSTRUCTIONS.unshift(created);
  return created;
}

/* ── Notifications — FR-22 ──────────────────────────────────────────────────── */

export type NotificationKind = "submission" | "approval" | "rejection" | "status";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  date: string;
  read: boolean;
  /** Where the notification resolves to, when it refers to an object. */
  href?: string;
}

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "ntf-001",
    kind: "approval",
    title: "Payment approved",
    body: "GHS 84,200.00 to Ridge Logistics Ltd was approved by Kwabena Mensah.",
    date: "2026-08-11T09:14:00Z",
    read: false,
    href: "/transactions/txn-001",
  },
  {
    id: "ntf-002",
    kind: "rejection",
    title: "Trade request returned for clarification",
    body: "LC-2026-0043 needs a corrected commercial invoice before it can proceed.",
    date: "2026-08-11T07:52:00Z",
    read: false,
    href: "/trade/trd-001",
  },
  {
    id: "ntf-003",
    kind: "status",
    title: "Bulk batch partially failed",
    body: "3 of 128 records in PAYROLL-AUG-2026 failed validation and need correction.",
    date: "2026-08-10T16:20:00Z",
    read: false,
    href: "/payments/bulk/bat-001",
  },
  {
    id: "ntf-004",
    kind: "submission",
    title: "Payment submitted for approval",
    body: "GHS 12,000.00 to Nsawam Foods Ltd is awaiting approver action.",
    date: "2026-08-10T11:05:00Z",
    read: true,
    href: "/transactions/txn-004",
  },
  {
    id: "ntf-005",
    kind: "status",
    title: "Card blocked",
    body: "Payroll Prepaid •••• 6654 was blocked at your request.",
    date: "2026-08-09T14:41:00Z",
    read: true,
    href: "/cards/card-004",
  },
];

/* ── Audit log — FR-21, NFR-05 (immutable, searchable) ──────────────────────── */

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  channel: "Internet Banking" | "Admin Portal";
  ip: string;
}

export const AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "aud-001",
    timestamp: "2026-08-11T09:14:22Z",
    actor: "Kwabena Mensah",
    role: "Corporate Approver",
    action: "Approved payment",
    target: "TXN-2026-0001 · GHS 84,200.00",
    channel: "Internet Banking",
    ip: "102.176.44.18",
  },
  {
    id: "aud-002",
    timestamp: "2026-08-11T08:58:03Z",
    actor: "Ama Serwaa",
    role: "Corporate Maker",
    action: "Submitted payment for approval",
    target: "TXN-2026-0001",
    channel: "Internet Banking",
    ip: "102.176.44.02",
  },
  {
    id: "aud-003",
    timestamp: "2026-08-10T17:31:47Z",
    actor: "Efua Danso",
    role: "Bank Admin",
    action: "Suspended customer user",
    target: "Yaw Boateng · Reason: pending KYC refresh",
    channel: "Admin Portal",
    ip: "10.20.5.114",
  },
  {
    id: "aud-004",
    timestamp: "2026-08-10T15:02:10Z",
    actor: "Ama Serwaa",
    role: "Corporate Admin",
    action: "Changed user limits",
    target: "Yaw Boateng · Daily limit GHS 50,000 → GHS 25,000",
    channel: "Internet Banking",
    ip: "102.176.44.02",
  },
  {
    id: "aud-005",
    timestamp: "2026-08-09T14:41:55Z",
    actor: "Ama Serwaa",
    role: "Corporate Admin",
    action: "Blocked card",
    target: "Payroll Prepaid •••• 6654 · Reason: reported lost by holder",
    channel: "Internet Banking",
    ip: "102.176.44.02",
  },
  {
    id: "aud-006",
    timestamp: "2026-08-09T09:12:31Z",
    actor: "Kojo Antwi",
    role: "Trade Officer",
    action: "Returned trade request for clarification",
    target: "LC-2026-0043",
    channel: "Admin Portal",
    ip: "10.20.5.088",
  },
];

/* ── Fee concessions — FR-37 ────────────────────────────────────────────────── */

export interface FeeConcession {
  id: string;
  customer: string;
  feeType: string;
  /** Percentage discount off the standard tariff. */
  concessionPct: number;
  effectiveFrom: string;
  effectiveTo: string;
  status: "Active" | "Pending approval" | "Expired";
  approvedBy: string;
}

export const FEE_CONCESSIONS: FeeConcession[] = [
  {
    id: "fee-001",
    customer: "Ridge Logistics Ltd",
    feeType: "Outward transfer — GIP",
    concessionPct: 50,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    status: "Active",
    approvedBy: "Efua Danso",
  },
  {
    id: "fee-002",
    customer: "Accra Textiles Plc",
    feeType: "LC issuance commission",
    concessionPct: 25,
    effectiveFrom: "2026-03-01",
    effectiveTo: "2027-02-28",
    status: "Active",
    approvedBy: "Efua Danso",
  },
  {
    id: "fee-003",
    customer: "Nsawam Foods Ltd",
    feeType: "Bulk payment processing",
    concessionPct: 100,
    effectiveFrom: "2026-09-01",
    effectiveTo: "2027-08-31",
    status: "Pending approval",
    approvedBy: "—",
  },
  {
    id: "fee-004",
    customer: "Tema Steel Works",
    feeType: "Account maintenance",
    concessionPct: 15,
    effectiveFrom: "2025-01-01",
    effectiveTo: "2025-12-31",
    status: "Expired",
    approvedBy: "Efua Danso",
  },
];

/* ── Formatting helpers ────────────────────────────────────────────────────── */

export function formatMoney(amount: number, currency = "GHS", showAmounts?: boolean): string {
  const visible = showAmounts ?? getGlobalShowAmounts();
  if (!visible) {
    const symbol =
      currency.toUpperCase() === "USD"
        ? "$"
        : currency.toUpperCase() === "EUR"
        ? "€"
        : currency.toUpperCase() === "GBP"
        ? "£"
        : "GH₵";
    return `${symbol} ••••••`;
  }
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  if (!iso || iso === "—") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

/** Audit (FR-21) and notifications (FR-22) need time-of-day, not just the date. */
export function formatDateTime(iso: string): string {
  if (!iso || iso === "—") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Relative age for notification rows; falls back to the absolute date. */
export function formatRelative(iso: string, now: Date = new Date("2026-08-11T10:00:00Z")): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `${days}d ago`;
  return formatDate(iso);
}
