/**
 * "Pay again" for business banking: the supplier payment screen opened on a copy of an earlier debit. Batch
 * and trade records are not single payments, so they have nothing to repeat here (a batch is corrected in
 * batch validation, a trade is resubmitted as a new version).
 */

import type { Transaction } from "../mock-data";

export function businessRepeatHref(t: Transaction): string | null {
  if (t.direction !== "debit" || t.batchId || t.tradeId) return null;
  return `/business/payments/supplier?duplicate=${t.id}`;
}
