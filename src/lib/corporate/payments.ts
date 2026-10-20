/**
 * Business payments, maker to approver. A maker prepares a supplier payment and submits it; it is held in the
 * approvers' queue and recorded as "awaiting approval" on the company's ledger, and nothing leaves the account
 * until an approver decides. The approver's decision then settles the same transaction, so the two screens tell
 * one story.
 *
 * Mock data, in memory: a reload returns to the seeded queue and ledger, like the rest of the prototype's store.
 */

import { APPROVAL_QUEUE, type ApprovalItem } from "./approvals";
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

/** The limit shown to approvers until limits are set per user in Administration. */
const DEFAULT_APPROVAL_LIMIT = 250_000;

let sequence = 0;

function stamp(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  const time = date.toISOString().slice(11, 16);
  return { day, time };
}

/** Submit a supplier payment for approval. Returns the ledger entry and the queue item it created. */
export function submitSupplierPayment(
  request: SupplierPaymentRequest,
  submittedBy: string,
): { transaction: Transaction; approval: ApprovalItem } {
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
    state: "awaiting-approval",
    channel: "Internet Banking",
    paymentMethod: request.method,
    fee: request.fee,
    category: "Suppliers",
    profileKind: "CORPORATE",
  };
  recordTransaction(transaction);

  const approval: ApprovalItem = {
    id: `apr-${suffix}`,
    reference,
    type: "payment",
    description: request.reference ? `${request.reference} — ${request.supplierName}` : `Supplier payment — ${request.supplierName}`,
    counterparty: request.supplierName,
    currency: "GHS",
    amount: roundMoney(request.amount),
    submittedBy,
    submittedAt: `${day} ${time}`,
    approvalLimit: DEFAULT_APPROVAL_LIMIT,
    priority: "standard",
  };
  APPROVAL_QUEUE.unshift(approval);

  return { transaction, approval };
}

/**
 * Record an approver's decision. An approved payment is on its way (pending until it settles); a rejected one never
 * left the account. Items from the seeded queue have no ledger entry, so only the queue changes for them.
 */
export function decideApproval(approvalId: string, decision: "approved" | "rejected"): void {
  const index = APPROVAL_QUEUE.findIndex((a) => a.id === approvalId);
  if (index < 0) return;
  const [item] = APPROVAL_QUEUE.splice(index, 1);

  const txn = TRANSACTIONS.find((t) => t.reference === item.reference);
  if (!txn) return;
  if (decision === "approved") {
    txn.state = "pending";
  } else {
    txn.state = "failed-single";
    txn.failureReason = "An approver rejected this payment. Nothing was debited.";
  }
}
