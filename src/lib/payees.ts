/**
 * The people and bills a customer pays often: the dashboard's Pay again.
 *
 * It is not a list of its own. It is the first few saved beneficiaries (newest first), so anyone saved
 * on the Beneficiaries page or from a payment's success screen shows up here, and a customer who moved from
 * the old internet banking sees the payees that came across with them (they are seeded into the same store).
 * Each entry deep-links into its own rail with the recipient prefilled, so a tap lands on the amount (the
 * dashboard adds `?from=` for the selected account).
 */

import { rankBeneficiaries, useBeneficiariesStore, type BeneficiaryRecord } from "./beneficiaries-store";
import { BILLERS } from "./mock-data";

export interface PayAgainPayee {
  name: string;
  detail: string;
  href: string;
}

type Rail = "wallet" | "bank" | "airtime" | "ecg" | "bill" | "proxy" | "papss";

/** How many to show; the panel has room for about this many. */
const LIMIT = 8;

function payHref(rail: Rail, recipient: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ rail, recipient, ...extra });
  return `/payments/send?${params.toString()}`;
}

function billerIdFor(name?: string): string | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  return BILLERS.find((b) => {
    const bn = b.name.toLowerCase();
    return bn === n || bn.includes(n) || n.includes(bn);
  })?.id;
}

function toPayee(b: BeneficiaryRecord): PayAgainPayee | null {
  switch (b.transactionType) {
    case "wallet":
      return { name: b.name, detail: b.network || "Mobile Money", href: payHref("wallet", b.name) };
    case "bank":
      return { name: b.name, detail: b.bankName || "Bank", href: payHref("bank", b.name) };
    case "airtime":
      return { name: b.name, detail: `${b.network || "Mobile"} Airtime`, href: payHref("airtime", b.name) };
    case "proxy":
      return { name: b.name, detail: "Proxy ID", href: payHref("proxy", b.name) };
    case "papss":
      return { name: b.name, detail: "PAPSS", href: payHref("papss", b.name) };
    case "bill": {
      const ecg = /ecg/i.test(b.billerName ?? "");
      if (ecg) return { name: b.name, detail: b.billerName || "ECG", href: payHref("ecg", b.name) };
      const billerId = billerIdFor(b.billerName);
      const extra: Record<string, string> = {};
      if (billerId) extra.billerId = billerId;
      if (b.billerReference) extra.ref = b.billerReference;
      return { name: b.name, detail: b.billerName || "Biller", href: payHref("bill", b.name, extra) };
    }
    default:
      return null;
  }
}

/** The customer's regulars, read from the saved beneficiaries at the time of the call. */
export function payAgainFromSaved(): PayAgainPayee[] {
  return rankBeneficiaries(useBeneficiariesStore.getState().beneficiaries)
    .map(toPayee)
    .filter((p): p is PayAgainPayee => p !== null)
    .slice(0, LIMIT);
}
