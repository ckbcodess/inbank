/**
 * Screen state models — Screen Consolidation v2, section 13.
 *
 * These are the actual per-screen state machines from the doc, not a generic
 * Loading/Empty/Populated/Error toggle. Screens import the union that belongs
 * to their pattern; 13.9 governs which screens inherit which model.
 */

/* ── 13.1 List Pattern ───────────────────────────────────────────────────────
 * Applies to: Accounts, Transaction List, Approval Queue, Trade Monitoring,
 * Customer Management, User Management, Bulk Validation.
 *
 * `empty` (true-empty) and `filtered-empty` are DISTINCT states with different
 * copy and different actions. Never render one for the other.
 */
export type ListState =
  | "loading" // skeleton rows, not a spinner-only screen
  | "empty" // no records exist yet for this context
  | "filtered-empty" // search/filter applied, zero matches
  | "populated"
  | "partial-load" // pagination mid-fetch; existing rows stay interactive
  | "error"; // fetch failed — retry required, never silently fall back to empty

/* ── 13.2 Transaction Details ────────────────────────────────────────────────
 * Highest-leverage screen in the system. Three distinct failure paths keyed to
 * transaction type — these must not collapse into one generic "Error".
 */
export type TransactionState =
  | "pending" // submitted, not yet resolved — show expected timing
  | "completed"
  | "failed-single" // reason (FR-32) + "Duplicate & Edit" → fresh draft
  | "failed-bulk" // link back to batch correction, no standalone fix here
  | "failed-trade" // version history (v1/v2/v3) + resubmit path
  | "reversed" // show original + reversal reference
  | "disputed" // flagged — open item, confirm scope with BRD
  | "awaiting-approval"; // read-only variant for initiator, no decision controls

export type TransactionKind = "single" | "bulk" | "trade";

/* ── 13.3 Payment Form ─────────────────────────────────────────────────────── */
export type PaymentFormState =
  | "initial" // progressive disclosure by payment type
  | "field-error" // inline field-level issue, never a blocking modal
  | "submitting" // disable submit, prevent double-submit
  | "submission-error"; // server-side failure — distinct from field validation

/* ── 13.4 Payment Approval Details ─────────────────────────────────────────── */
export type PaymentApprovalState =
  | "awaiting-decision"
  | "within-limit" // approver's authority covers this transaction
  | "exceeds-limit" // outside authority — open item, confirm behavior with BRD
  | "decision-submitted"; // transient, before returning to queue

/* ── 13.5 Trade Approval Details ───────────────────────────────────────────── */
export type TradeApprovalState =
  | "awaiting-decision" // document viewer present
  | "documents-incomplete" // block decision controls until resolved
  | "version-comparison" // visual diff of v(n) vs v(n-1), not two docs side by side
  | "returned-for-clarification" // FR-13 — must be visually distinct from Rejected
  | "decision-submitted";

/* ── 13.6 Trade Details ────────────────────────────────────────────────────── */
export type TradeState =
  | "draft" // customer-editable
  | "submitted-in-review" // with corporate approver, read-only to initiator
  | "under-bank-review" // with Trade Officer — general status only, no internal notes
  | "approved-active" // full lifecycle/timeline visible
  | "returned-for-correction" // references a version, links to history
  | "completed-closed";

/* ── 13.7 User Access Wizard ───────────────────────────────────────────────── */
export type WizardStepState =
  | "locked" // show the REASON explicitly, never a silent grey-out
  | "valid"
  | "invalid"
  | "review-pending";

/* ── 13.8 Bulk Upload / Validation ─────────────────────────────────────────── */
export type BulkUploadState =
  | "uploading"
  | "upload-failed" // file-level: wrong format/too large — not record-level
  | "validating"
  | "mixed" // core state: valid + invalid counts, correct inline, no re-upload
  | "revalidating"; // re-run on edited records only, not the full batch

/* ── 13.9 Baseline — object-detail and static/reference screens ────────────── */
export type BaselineState = "loading" | "empty" | "populated" | "error";

/** Human-readable labels for the state switcher used across screens. */
export const LIST_STATE_LABEL: Record<ListState, string> = {
  loading: "Loading",
  empty: "Empty (true)",
  "filtered-empty": "Filtered empty",
  populated: "Populated",
  "partial-load": "Partial load",
  error: "Error",
};

export const TRANSACTION_STATE_LABEL: Record<TransactionState, string> = {
  pending: "Pending / Processing",
  completed: "Completed",
  "failed-single": "Failed — single",
  "failed-bulk": "Failed — bulk",
  "failed-trade": "Failed — trade",
  reversed: "Reversed",
  disputed: "Disputed",
  "awaiting-approval": "Awaiting approval",
};
