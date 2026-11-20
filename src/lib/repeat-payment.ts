/**
 * "Pay again" for personal banking: Send & Pay opened on a copy of an earlier debit. Business has its own
 * (`lib/corporate/repeat-payment.ts`), so neither app's receipt or list links into the other's payment flow.
 */

import type { Transaction } from "./mock-data";

/**
 * Only the id goes in the URL: the payee, account and amount are read back from the ledger by Send & Pay, so no
 * personal details end up in the address bar. Card purchases, QR merchants, PAPSS and cash-out codes aren't repeated.
 */
const NOT_REPEATABLE = new Set(["card", "qr", "papss", "cardless", "wallet-to-bank", "loan"]);

export function personalRepeatHref(t: Transaction): string | null {
  if (t.direction !== "debit" || NOT_REPEATABLE.has(t.paymentMethod ?? "")) return null;
  return `/payments/send?repeat=${encodeURIComponent(t.id)}`;
}
