/**
 * Approval queue and trade-finance versions (13.4, 13.5): business banking only. Personal banking has no
 * approver, so nothing in `mock-data` or the personal screens reads this.
 */

import type { TradeApprovalState } from "../states";
import type { Actor } from "../roles";
import { canSeeAccount, companyUserFor, dailyRoomLeft } from "./controls";
import { stepFor, type ApprovalStepKind } from "./roles";

/* ── Approval queue ────────────────────────────────────────────────────────── */

/**
 * A request moves through its steps in order (BRL-09): review, if the amount needs it, then authorise. Each step
 * is taken by someone in that role, within their limit, who didn't submit it (BRL-04). Anyone along the way can
 * send it back to the inputter with a comment (BRL-10). Only the last step releases the money.
 */
export interface ApprovalStep {
  kind: ApprovalStepKind;
  /** Who took the step, once taken. */
  by?: string;
  at?: string;
  comment?: string;
}

export interface ApprovalEvent {
  by: string;
  role: "Inputter" | "Reviewer" | "Authoriser";
  action: "submitted" | "passed" | "authorised" | "returned";
  at: string;
  comment?: string;
}

export interface ApprovalItem {
  id: string;
  reference: string;
  type: "payment" | "trade";
  description: string;
  counterparty: string;
  currency: string;
  amount: number;
  /** The account it would leave. Only people who can see that account see the request (UAR-05). */
  accountId?: string;
  /** Set when the request is a bulk batch: the approver sees its lines, and release pays each one. */
  batchId?: string;
  submittedBy: string;
  submittedAt: string;
  priority: "standard" | "urgent";
  steps: ApprovalStep[];
  /** Index into `steps` of the step waiting now. */
  current: number;
  status: "open" | "returned" | "authorised";
  trail: ApprovalEvent[];
}

function seed(
  item: Omit<ApprovalItem, "steps" | "current" | "status" | "trail">,
  steps: ApprovalStepKind[],
  done: Omit<ApprovalStep, "kind">[] = [],
): ApprovalItem {
  const trail: ApprovalEvent[] = [{ by: item.submittedBy, role: "Inputter", action: "submitted", at: item.submittedAt }];
  for (const d of done) {
    trail.push({ by: d.by ?? "", role: "Reviewer", action: "passed", at: d.at ?? "", comment: d.comment });
  }
  return {
    ...item,
    steps: steps.map((kind, i) => ({ ...done[i], kind })),
    current: done.length,
    status: "open",
    trail,
  };
}

export const APPROVAL_QUEUE: ApprovalItem[] = [
  // Above the review threshold, waiting for a Reviewer
  seed(
    {
      id: "apr-001",
      reference: "NIB-2026-884260",
      type: "payment",
      description: "Equipment purchase — Volta Machinery",
      counterparty: "Volta Machinery Ltd",
      currency: "GHS",
      amount: 96_000.0,
      accountId: "acc-001",
      submittedBy: "Ransford Gyasi",
      submittedAt: "2026-08-11 09:14",
      priority: "standard",
    },
    ["review", "authorise"],
  ),
  // Reviewed, waiting for an Authoriser
  seed(
    {
      id: "apr-002",
      reference: "NIB-2026-884288",
      type: "payment",
      description: "Quarterly supplier settlement",
      counterparty: "Accra Fabrics Ltd",
      currency: "GHS",
      amount: 480_000.0,
      accountId: "acc-001",
      submittedBy: "Ransford Gyasi",
      submittedAt: "2026-08-11 10:02",
      priority: "urgent",
    },
    ["review", "authorise"],
    [{ by: "Justice Oduro", at: "2026-08-11 11:20", comment: "Matches the signed delivery notes for July to September." }],
  ),
  // Reviewed, but above the Authoriser's limit
  seed(
    {
      id: "apr-005",
      reference: "NIB-2026-884301",
      type: "payment",
      description: "Spinning machine deposit — Kumasi Engineering",
      counterparty: "Kumasi Engineering Works",
      currency: "GHS",
      amount: 720_000.0,
      accountId: "acc-001",
      submittedBy: "Ransford Gyasi",
      submittedAt: "2026-08-11 12:40",
      priority: "standard",
    },
    ["review", "authorise"],
    [{ by: "Justice Oduro", at: "2026-08-11 14:05" }],
  ),
  // Under the review threshold: straight to an Authoriser
  seed(
    {
      id: "apr-006",
      reference: "NIB-2026-884315",
      type: "payment",
      description: "Dye and chemicals — Tema Chem Supplies",
      counterparty: "Tema Chem Supplies",
      currency: "GHS",
      amount: 18_450.0,
      accountId: "acc-002",
      submittedBy: "Ransford Gyasi",
      submittedAt: "2026-08-12 08:55",
      priority: "standard",
    },
    ["authorise"],
  ),
  // Trade requests: authorise only (trade is not in BRD v2; kept as it was)
  seed(
    {
      id: "apr-003",
      reference: "TRD-2026-00421",
      type: "trade",
      description: "Letter of credit — cotton import Q3",
      counterparty: "Shenzhen Textile Group",
      currency: "USD",
      amount: 210_000.0,
      accountId: "acc-003",
      submittedBy: "Ransford Gyasi",
      submittedAt: "2026-08-10 16:41",
      priority: "standard",
    },
    ["authorise"],
  ),
  seed(
    {
      id: "apr-004",
      reference: "TRD-2026-00423",
      type: "trade",
      description: "Documentary collection — machinery parts",
      counterparty: "Hamburg Werke GmbH",
      currency: "USD",
      amount: 74_500.0,
      accountId: "acc-003",
      submittedBy: "Yaw Oppong",
      submittedAt: "2026-08-11 08:30",
      priority: "standard",
    },
    ["authorise"],
  ),
];

// Sent back by the Reviewer: the inputter sees the comment on the receipt and can edit and resubmit
const SENT_BACK = seed(
  {
    id: "apr-007",
    reference: "NIB-2026-884244",
    type: "payment",
    description: "Invoice 2231 — Bonwire Kente Weavers",
    counterparty: "Bonwire Kente Weavers",
    currency: "GHS",
    amount: 62_750.0,
    accountId: "acc-001",
    submittedBy: "Ransford Gyasi",
    submittedAt: "2026-08-10 14:22",
    priority: "standard",
  },
  ["review", "authorise"],
);
SENT_BACK.status = "returned";
SENT_BACK.trail.push({
  by: "Justice Oduro",
  role: "Reviewer",
  action: "returned",
  at: "2026-08-10 16:05",
  comment: "The invoice says 2,500 metres, not 3,000. Please correct the amount and attach the revised invoice.",
});
APPROVAL_QUEUE.push(SENT_BACK);

export function findApproval(id: string): ApprovalItem | undefined {
  return APPROVAL_QUEUE.find((a) => a.id === id);
}

export function findApprovalByReference(reference: string): ApprovalItem | undefined {
  return APPROVAL_QUEUE.find((a) => a.reference === reference);
}

/** The step waiting now, or undefined once the request is settled. */
export function currentStep(item: ApprovalItem): ApprovalStep | undefined {
  return item.status === "open" ? item.steps[item.current] : undefined;
}

/**
 * Whether this person can act on the request now, and if not, why. A request reaches someone's queue only when its
 * waiting step is their role's, they can see the account, and they didn't submit it or take an earlier step
 * (BRL-04). Within that, their limit and the company's daily room decide whether they can complete it.
 */
export type ActEligibility =
  | { ok: true }
  | { ok: false; reason: "over-limit"; limit: number }
  | { ok: false; reason: "over-daily-limit"; room: number };

export function inQueueFor(actor: Actor | null | undefined, item: ApprovalItem): boolean {
  if (!actor) return false;
  const step = currentStep(item);
  if (!step || stepFor(actor.role) !== step.kind) return false;
  if (item.accountId && !canSeeAccount(actor, item.accountId)) return false;
  if (item.submittedBy === actor.name) return false;
  return !item.steps.some((s) => s.by === actor.name);
}

export function queueFor(actor: Actor | null | undefined): ApprovalItem[] {
  return APPROVAL_QUEUE.filter((item) => inQueueFor(actor, item));
}

export function eligibility(actor: Actor | null | undefined, item: ApprovalItem): ActEligibility {
  const user = companyUserFor(actor);
  const limit = user?.limit ?? Infinity;
  // Trade is in USD on its own track; only GHS payments are held to the GHS limits.
  if (item.currency === "GHS" && item.amount > limit) return { ok: false, reason: "over-limit", limit };
  if (item.currency === "GHS" && currentStep(item)?.kind === "authorise" && item.amount > dailyRoomLeft()) {
    return { ok: false, reason: "over-daily-limit", room: dailyRoomLeft() };
  }
  return { ok: true };
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
  { version: 1, submittedAt: "2026-08-04 11:20", submittedBy: "Ransford Gyasi", summary: "Initial submission" },
  { version: 2, submittedAt: "2026-08-08 09:55", submittedBy: "Ransford Gyasi", summary: "Corrected invoice quantity after clarification" },
  { version: 3, submittedAt: "2026-08-10 16:41", submittedBy: "Ransford Gyasi", summary: "Added insurance certificate, revised incoterms" },
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
