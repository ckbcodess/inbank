/**
 * "Pay again" for personal banking: Send & Pay opened on a copy of an earlier debit. Business has its own
 * (`lib/corporate/repeat-payment.ts`), so neither app's receipt or list links into the other's payment flow.
 */

import type { Transaction } from "./mock-data";

export function personalRepeatHref(t: Transaction): string | null {
  if (t.direction !== "debit") return null;
  return `/payments/send?duplicate=${t.id}&amount=${t.amount}&payee=${encodeURIComponent(t.counterparty || t.description)}`;
}
