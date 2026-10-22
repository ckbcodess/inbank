/**
 * Business payments: inputters submit for approval; a sole proprietor's payment goes straight out after the code.
 * When an inputter prepares a supplier payment, it is recorded as "awaiting approval" on the company's ledger and
 * starts down its approval path (review if the amount needs it, then authorise). Nothing leaves the account until
 * the last step. A reviewer or authoriser can send it back to the inputter with a comment instead; the ledger
 * entry then reads "sent back" and nothing was debited. Every step settles the same transaction, so the queue,
 * the receipt and the inputter's view tell one story.
 *
 * Mock data, in memory: a reload returns to the seeded queue and ledger, like the rest of the prototype's store.
 */

import { APPROVAL_QUEUE, currentStep, type ApprovalItem } from "./approvals";
import { approvalPath, recordRelease } from "./controls";
import { recordTransaction, TRANSACTIONS, type Transaction } from "../mock-data";
import { roundMoney } from "../money";

export interface SupplierPaymentRequest {
  fromAccountId: string;
  supplierName: string;
  supplierBank: string;
  supplierAccount: string;
  amount: number;
  fee: number;
  /** GIP, ACH, ACH NRT or RTGS: the id of the rail the payment travels on. */
  method: string;
  /** What the invoice or reference says; it becomes the payment's narration. */
  reference: string;
}

let sequence = 0;

function stamp(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  const time = date.toISOString().slice(11, 16);
  return { day, time };
}

function buildSupplierTransaction(
  request: SupplierPaymentRequest,
  state: Transaction["state"],
): { transaction: Transaction; suffix: string } {
  sequence += 1;
  const { day, time } = stamp();
  const suffix = `${Date.now().toString(36)}${sequence}`;
  const reference = `NIB-2026-${String(Math.floor(100000 + Math.random() * 899999))}`;

  const transaction: Transaction = {
    id: `txn-bus-${suffix}`,
    reference,
    date: day,
    time,
    valueDate: day,
    description: request.reference || `Supplier payment — ${request.supplierName}`,
    counterparty: request.supplierName,
    counterpartyAccount: request.supplierAccount,
    counterpartyBank: request.supplierBank,
    accountId: request.fromAccountId,
    currency: "GHS",
    amount: roundMoney(request.amount),
    direction: "debit",
    kind: "single",
    state,
    channel: "Internet Banking",
    paymentMethod: request.method,
    fee: request.fee,
    category: "Suppliers",
    profileKind: "CORPORATE",
  };
  return { transaction, suffix };
}

/** Send a supplier payment directly (sole proprietors). Goes straight out with state: "pending", no approval queue. */
export function sendSupplierPayment(request: SupplierPaymentRequest): { transaction: Transaction } {
  const { transaction } = buildSupplierTransaction(request, "pending");
  recordTransaction(transaction);
  return { transaction };
}

/** Submit a supplier payment for approval. Returns the ledger entry and the queue item it created. */
export function submitSupplierPayment(
  request: SupplierPaymentRequest,
  submittedBy: string,
): { transaction: Transaction; approval: ApprovalItem } {
  const { transaction, suffix } = buildSupplierTransaction(request, "awaiting-approval");
  recordTransaction(transaction);

  const submittedAt = `${transaction.date} ${transaction.time ?? ""}`.trim();
  const approval: ApprovalItem = {
    id: `apr-${suffix}`,
    reference: transaction.reference,
    type: "payment",
    description: request.reference ? `${request.reference} — ${request.supplierName}` : `Supplier payment — ${request.supplierName}`,
    counterparty: request.supplierName,
    currency: "GHS",
    amount: roundMoney(request.amount),
    accountId: request.fromAccountId,
    submittedBy,
    submittedAt,
    priority: "standard",
    steps: approvalPath(request.amount).map((kind) => ({ kind })),
    current: 0,
    status: "open",
    trail: [{ by: submittedBy, role: "Inputter", action: "submitted", at: submittedAt }],
  };
  APPROVAL_QUEUE.unshift(approval);

  return { transaction, approval };
}

function nowStamp(): string {
  const { day, time } = stamp();
  return `${day} ${time}`;
}

function ledgerEntry(item: ApprovalItem): Transaction | undefined {
  return TRANSACTIONS.find((t) => t.reference === item.reference);
}

/**
 * Take the waiting step. A review passes the request on to the next step; the last step authorises it, and the
 * payment is on its way (pending until it settles). Seeded requests have no ledger entry, so only the queue moves.
 */
export function approveStep(approvalId: string, by: string, comment?: string): ApprovalItem | undefined {
  const item = APPROVAL_QUEUE.find((a) => a.id === approvalId);
  const step = item ? currentStep(item) : undefined;
  if (!item || !step) return undefined;
  const at = nowStamp();
  const note = comment?.trim() || undefined;
  step.by = by;
  step.at = at;
  step.comment = note;

  const last = item.current === item.steps.length - 1;
  if (last) {
    item.status = "authorised";
    item.trail.push({ by, role: "Authoriser", action: "authorised", at, comment: note });
    if (item.currency === "GHS") recordRelease(item.amount);
    const txn = ledgerEntry(item);
    if (txn) txn.state = "pending";
  } else {
    item.current += 1;
    item.trail.push({ by, role: "Reviewer", action: "passed", at, comment: note });
  }
  return item;
}

/** Send the request back to the inputter with a comment (BRL-10). Nothing was debited. */
export function sendBack(approvalId: string, by: string, comment: string): ApprovalItem | undefined {
  const item = APPROVAL_QUEUE.find((a) => a.id === approvalId);
  const step = item ? currentStep(item) : undefined;
  if (!item || !step) return undefined;
  const at = nowStamp();
  item.status = "returned";
  item.trail.push({ by, role: step.kind === "review" ? "Reviewer" : "Authoriser", action: "returned", at, comment: comment.trim() });
  const txn = ledgerEntry(item);
  if (txn) {
    txn.state = "returned";
    txn.failureReason = comment.trim();
  }
  return item;
}
