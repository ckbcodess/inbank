/**
 * The people and bills a customer pays often — the dashboard's Pay again.
 *
 * Per customer, not one list for everyone: someone who moved from the old
 * internet banking sees the payees that came across with them. Each entry
 * deep-links into its own rail with the recipient prefilled, so a tap lands on
 * the amount (the dashboard adds `?from=` for the selected account).
 */

import { MIGRATED_DATA } from "./migration";
import { rankPayAgain, type PayAgainHistory } from "./pay-again-rank";
import type { Transaction } from "./mock-data";

export interface PayAgainPayee {
  name: string;
  detail: string;
  href: string;
  /** What the ledger says about this suggestion. Absent on hand-written ones, which have nothing to back a "why". */
  history?: PayAgainHistory;
}

/** Who a suggestion is, stable across amounts: the rail plus the recipient (or the biller and reference). */
export function payeeKey(p: PayAgainPayee): string {
  const q = new URL(p.href, "http://x").searchParams;
  return [q.get("rail"), q.get("recipient") ?? q.get("billerId"), q.get("ref")].filter(Boolean).join(":");
}

/** The amount of their last payment, when it is a fixed one (data bundles are priced by the bundle, so they have none). */
export function payeeLastAmount(p: PayAgainPayee): number | null {
  const n = Number(new URL(p.href, "http://x").searchParams.get("amount"));
  return Number.isFinite(n) && n > 0 ? n : null;
}

type Rail = "wallet" | "bank" | "airtime" | "data" | "ecg" | "bill";

function payHref(rail: Rail, recipient: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ rail, recipient, ...extra });
  return `/payments/send?${params.toString()}`;
}

/** The demo customer's regulars (matched by name against the flows' saved payees). */
/*
 * Each payee carries the amount of their last payment, so Pay again repeats it:
 * the form opens with that amount filled in, and the customer can change it.
 */
const DEFAULT_PAYEES: PayAgainPayee[] = [
  { name: "Ransford Gyasi", detail: "MTN MoMo", href: payHref("wallet", "Ransford Gyasi", { amount: "150" }) },
  { name: "Lester Adjei", detail: "ECG prepaid", href: payHref("ecg", "Lester Adjei", { amount: "120" }) },
  { name: "Kwame Boateng", detail: "GCB Bank", href: payHref("bank", "Kwame Boateng", { amount: "500" }) },
  { name: "Yaa Asantewaa", detail: "MTN Airtime", href: payHref("airtime", "Yaa Asantewaa", { amount: "20" }) },
  { name: "Abena Osei", detail: "Stanbic Bank", href: payHref("bank", "Abena Osei", { amount: "1200" }) },
  { name: "Yaw Mensah", detail: "Telecel Cash", href: payHref("wallet", "Yaw Mensah", { amount: "80" }) },
  { name: "Kofi Boateng", detail: "AT Airtime", href: payHref("airtime", "Kofi Boateng", { amount: "10" }) },
  { name: "Home MiFi", detail: "Telecel Data", href: payHref("data", "Home Router (MiFi)") },
];

/** A migrated customer's carried-over payees, opened by their number / account / reference. */
function migratedPayees(): PayAgainPayee[] {
  return MIGRATED_DATA.payees.map((p) => {
    const extra: Record<string, string> = {};
    if ("bank" in p && p.bank) extra.bank = p.bank;
    if ("billerId" in p && p.billerId) {
      return { name: p.name, detail: p.detail, href: `/payments/send?${new URLSearchParams({ rail: "bill", billerId: p.billerId, ref: p.recipient })}` };
    }
    return { name: p.name, detail: p.detail, href: payHref(p.rail as Rail, p.recipient, extra) };
  });
}

const SINGLE_PAYEES: PayAgainPayee[] = [
  { name: "Mum (Yaa Gyan)", detail: "MTN MoMo", href: payHref("wallet", "Mum (Yaa Gyan)", { account: "0244889900", amount: "100" }) },
  { name: "ECG Electricity", detail: "ECG prepaid", href: payHref("bill", "ECG Electricity", { ref: "P-992014", amount: "180" }) },
];

/**
 * The customer's Pay again. Worked out from their payments when there is enough history (lib/pay-again-rank); until
 * then the hand-written lists above stand in, and those carry no history, so nothing claims a reason it can't back.
 */
export function payAgainFor(actorId: string, transactions: Transaction[] = [], today = new Date().toISOString().slice(0, 10)): PayAgainPayee[] {
  if (actorId === "u-clean") return [];
  // A migrated customer shares the retail ledger but keeps the payees that came across with them.
  const derived = actorId === "u-legacy" ? [] : rankPayAgain(transactions, today);
  if (derived.length > 0) return derived;
  if (actorId === "u-single") return SINGLE_PAYEES;
  return actorId === "u-legacy" ? migratedPayees() : DEFAULT_PAYEES;
}
