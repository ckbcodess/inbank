/**
 * The people and bills a customer pays often — the dashboard's Pay again.
 *
 * Per customer, not one list for everyone: someone who moved from the old
 * internet banking sees the payees that came across with them. Each entry
 * deep-links into its own rail with the recipient prefilled, so a tap lands on
 * the amount (the dashboard adds `?from=` for the selected account).
 */

import { MIGRATED_DATA } from "./migration";

export interface PayAgainPayee {
  name: string;
  detail: string;
  href: string;
}

type Rail = "wallet" | "bank" | "airtime" | "data" | "ecg" | "bill";

function payHref(rail: Rail, recipient: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ rail, recipient, ...extra });
  return `/payments/send?${params.toString()}`;
}

/** The demo customer's regulars (matched by name against the flows' saved payees). */
const DEFAULT_PAYEES: PayAgainPayee[] = [
  { name: "Ama Serwaa", detail: "MTN MoMo", href: payHref("wallet", "Ama Serwaa Mensah") },
  { name: "Lester Adjei", detail: "ECG prepaid", href: payHref("ecg", "Lester Adjei") },
  { name: "Kwame Boateng", detail: "GCB Bank", href: payHref("bank", "Kwame Boateng") },
  { name: "Yaa Asantewaa", detail: "MTN Airtime", href: payHref("airtime", "Yaa Asantewaa") },
  { name: "Abena Osei", detail: "Stanbic Bank", href: payHref("bank", "Abena Osei") },
  { name: "Yaw Mensah", detail: "Telecel Cash", href: payHref("wallet", "Yaw Mensah") },
  { name: "Kofi Boateng", detail: "AT Airtime", href: payHref("airtime", "Kofi Boateng") },
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

export function payAgainFor(actorId: string): PayAgainPayee[] {
  return actorId === "u-legacy" ? migratedPayees() : DEFAULT_PAYEES;
}
