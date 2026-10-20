/**
 * Approval queue and trade-finance versions (13.4, 13.5): business banking only. Personal banking has no
 * approver, so nothing in `mock-data` or the personal screens reads this.
 */

import type { TradeApprovalState } from "../states";

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
