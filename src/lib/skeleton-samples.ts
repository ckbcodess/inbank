/**
 * Stand-in data for skullet skeletons. Skullet measures real rows and draws bars over their text, so a loading
 * list renders its real row component with one of these. The values never show; keep them text-shaped.
 */

import type { PaymentCard, Transaction } from "@/lib/mock-data";
import type { UpcomingPayment } from "@/lib/dashboard-insights";

/** Stand-in cards for the Cards panel skeleton; skullet draws bars over their text. */
export const CARDS_SAMPLE: PaymentCard[] = ["a", "b"].map((k) => ({
  id: `sample-card-${k}`,
  name: "Sample card name",
  maskedNumber: "•••• 0000",
  type: "Debit",
  scheme: "Visa",
  currency: "GHS",
  balance: null,
  linkedAccountId: "sample",
  holder: "Sample holder",
  expiry: "01/30",
  status: "Active",
  fundable: false,
}));

/** Stand-in scheduled payments for the Coming up skeleton. */
export const UPCOMING_SAMPLE: UpcomingPayment[] = ["a", "b", "c"].map((k) => ({
  id: `sample-upcoming-${k}`,
  payee: "Sample payee name",
  amount: 100,
  currency: "GHS",
  frequency: "Monthly",
  frequencyLabel: "Monthly",
  date: "2026-01-01",
}));

/** Stand-in rows so the skeleton has the shape of real activity. Their text never shows: skullet draws bars over it. */
export const ACTIVITY_SAMPLE: Transaction[] = ["a", "b", "c", "d", "e"].map((k) => ({
  id: `sample-${k}`,
  reference: "NIB-0000-000000",
  date: "2026-01-01",
  valueDate: "2026-01-01",
  description: "Sample payment",
  counterparty: "Sample payee name",
  counterpartyAccount: "0000000000",
  accountId: "sample",
  currency: "GHS",
  amount: 100,
  direction: "debit",
  kind: "single",
  state: "completed",
  channel: "web",
}));
