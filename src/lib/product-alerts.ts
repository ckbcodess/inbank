/**
 * What needs the customer on a product they hold (Loans, Invest, Insure), in one place so the page banner and the
 * sidebar dot always agree. Two tones only:
 *  - `act`: something is wrong or due and the customer can fix it (an overdue advance, a missed premium).
 *  - `wait`: we are working, or a date is coming, and nothing is required of them.
 * "Done" is not an alert; the record's own page says it.
 */

import { useMemo } from "react";
import { ADVANCE_PRODUCTS, useMyLoans, type Advance } from "@/lib/loans";
import { useMyDeposits, type TermDeposit } from "@/lib/term-deposits";
import { findPlan } from "@/lib/insurance-plans";
import { MOCK_TODAY, daysBetween, useMyTreasury, type Holding } from "@/lib/treasury";
import { useMyInsurance, type Policy } from "@/lib/insurance";
import { formatDate } from "@/lib/mock-data";

export type AlertTone = "act" | "wait";

export interface ProductAlert {
  tone: AlertTone;
  /** Up to six words. */
  headline: string;
  /** One quiet line under the headline, when the headline alone leaves a question (shown on a record's own banner only). */
  detail?: string;
  /** Good news rather than a to-do: drawn in the success colour with a tick (the securities account is ready). */
  success?: boolean;
  /** The one thing to do, when there is one. */
  action?: { label: string; href: string; /** Runs first, when the link has something to tidy up on the way. */ onClick?: () => void };
}

/** A holding is flagged this many days before it matures. */
export const MATURITY_NOTICE_DAYS = 14;

export function advanceAlert(a: Advance): ProductAlert | null {
  if (a.status === "pending") return { tone: "wait", headline: "Waiting for approval" };
  if (a.status === "active" && a.dueOn < MOCK_TODAY) {
    return { tone: "act", headline: `Overdue since ${formatDate(a.dueOn)}`, action: { label: "Repay now", href: `/loans/${a.id}/repay` } };
  }
  if (a.status === "active") return { tone: "wait", headline: `Due ${formatDate(a.dueOn)}`, action: { label: "Repay now", href: `/loans/${a.id}/repay` } };
  return null;
}

export function policyAlert(p: Policy): ProductAlert | null {
  if (p.arrears.length > 0) {
    return {
      tone: "act",
      headline: p.arrears.length === 1 ? "1 premium missed" : `${p.arrears.length} premiums missed`,
      action: { label: "Pay now", href: `/insure/policies/${p.id}/pay` },
    };
  }
  if (p.status === "pending-medical") return { tone: "wait", headline: "Waiting for a medical assessment" };
  if (p.status === "cancel-requested") return { tone: "wait", headline: "Cancellation requested" };
  return null;
}

export function holdingAlert(h: Holding): ProductAlert | null {
  if (h.status === "rediscount-pending") return { tone: "wait", headline: "Cash-in requested" };
  if (h.status === "active") {
    const days = daysBetween(MOCK_TODAY, h.maturity);
    if (days >= 0 && days <= MATURITY_NOTICE_DAYS) {
      return {
        tone: "wait",
        headline: days === 0 ? "Matures today" : days === 1 ? "Matures tomorrow" : `Matures in ${days} days`,
        action: { label: "Change what happens", href: `/invest/treasury/holdings/${h.id}/maturity` },
      };
    }
  }
  return null;
}


export function depositAlert(d: TermDeposit): ProductAlert | null {
  const days = daysBetween(MOCK_TODAY, d.maturity);
  if (days < 0 || days > MATURITY_NOTICE_DAYS) return null;
  return {
    tone: "wait",
    headline: days === 0 ? "Matures today" : days === 1 ? "Matures tomorrow" : `Matures in ${days} days`,
    action: { label: "Change what happens", href: `/invest/term-deposits/${d.id}/maturity` },
  };
}

export type AlertProduct = "loans" | "invest" | "insure";

/** One record that has something to say: what it is called, and what to tell the customer about it. */
export interface AlertItem {
  key: string;
  label: string;
  alert: ProductAlert;
}

const rank = (t: AlertTone) => (t === "act" ? 2 : 1);

/** Needs-you first. The order the banner lists them in. */
const byUrgency = (a: AlertItem, b: AlertItem) => rank(b.alert.tone) - rank(a.alert.tone);

function items<T>(records: T[], make: (r: T) => ProductAlert | null, id: (r: T) => string, label: (r: T) => string): AlertItem[] {
  return records.flatMap((r) => {
    const alert = make(r);
    return alert ? [{ key: id(r), label: label(r), alert }] : [];
  });
}

/** Every record on each product that has an alert, most urgent first. */
export function useProductAlertItems(): Record<AlertProduct, AlertItem[]> {
  const { advances } = useMyLoans();
  const { policies } = useMyInsurance();
  const { holdings } = useMyTreasury();
  const { active: deposits } = useMyDeposits();
  return useMemo(
    () => ({
      loans: items(advances, advanceAlert, (a) => a.id, (a) => ADVANCE_PRODUCTS[a.kind].name).sort(byUrgency),
      insure: items(policies, policyAlert, (p) => p.id, (p) => findPlan(p.planId)?.name ?? "Policy").sort(byUrgency),
      invest: [
        ...items(holdings, holdingAlert, (h) => h.id, (h) => h.title),
        ...items(deposits, depositAlert, (d) => d.id, (d) => `${d.tenureDays}-Day Term Deposit`),
      ].sort(byUrgency),
    }),
    [advances, policies, holdings, deposits],
  );
}

/** The loudest alert on each product, for the sidebar. */
export function useProductAlertTones(): Record<AlertProduct, AlertTone | null> {
  const all = useProductAlertItems();
  return useMemo(
    () => ({
      loans: all.loans[0]?.alert.tone ?? null,
      insure: all.insure[0]?.alert.tone ?? null,
      invest: all.invest[0]?.alert.tone ?? null,
    }),
    [all],
  );
}
