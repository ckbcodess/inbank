/**
 * What a customer agrees to before a purchase, in plain words and only what the app actually does. One list per
 * product so the review step of every flow and the Invest offer page say the same thing. [ASSUMPTION] These are
 * working summaries, not the legal text: swap in the bank's signed-off Terms & Conditions when they are supplied.
 */

import { formatMoney } from "@/lib/mock-data";
import { FACILITY_FEE_RATE, LATE_CHARGE_RATE, MONTHLY_RATE, PROCESSING_FEE_RATE, SALARY_ACCOUNT_FEE } from "@/lib/loans";
import { MIN_DEPOSIT } from "@/lib/term-deposits";

const money = (n: number) => formatMoney(n, "GHS", true);
const pct = (r: number) => `${Math.round(r * 10000) / 100}%`;

export function advanceTerms(needsSwitch = false): string[] {
  return [
    `Interest is ${pct(MONTHLY_RATE)} a month, charged for each day the advance is out.`,
    `A processing fee of ${pct(PROCESSING_FEE_RATE)} and a facility fee of ${pct(FACILITY_FEE_RATE)} are taken from the amount before it is paid in.`,
    "You repay from your next salary, allowance or pension credit. Repaying early costs less.",
    `If repayment is late, a charge of ${pct(LATE_CHARGE_RATE)} of the advance is added for each month, or part of one, it stays unpaid.`,
    "You can have one advance at a time.",
    ...(needsSwitch ? [`Your account becomes a Salary Account for ${money(SALARY_ACCOUNT_FEE)} a month.`] : []),
    "Every advance is authorised with a one-time code.",
  ];
}

export function insuranceTerms(provider: string): string[] {
  return [
    `The cover is provided by ${provider}. GCB Bank passes your application on and collects your premiums.`,
    "Your premium is deducted from the account you choose, between the days you choose.",
    "If a premium cannot be taken it is marked as missed. We tell you, and you can pay it from the policy page.",
    "Above the limit for cover without a medical, a representative will call you to arrange an assessment. Nothing is deducted until your cover is confirmed.",
    "You can ask to cancel at any time. Your cover continues until the cancellation is completed.",
    "The beneficiaries you name receive the benefit.",
    "Every purchase is authorised with a one-time code.",
  ];
}

export function depositTerms(tenureDays?: number): string[] {
  return [
    tenureDays ? `The rate is fixed when you start and applies for ${tenureDays} days.` : "The rate is fixed when you start and applies for the whole period.",
    `The minimum deposit is ${money(MIN_DEPOSIT)}.`,
    "Taking money out before it matures is allowed. The cost is shown before you confirm.",
    "At maturity you can take your money out or roll it over.",
    "Every deposit is authorised with a one-time code.",
  ];
}

export function securityTerms(kind: "bill" | "bond", primary: boolean): string[] {
  return [
    primary ? "The rate shown is indicative. The final rate is set at the auction." : "You are buying from another investor, at the rate shown.",
    kind === "bond" ? "Interest is paid every 6 months until the bond matures." : "You pay a discounted price and receive the full face value at maturity.",
    "Your holding is registered in your own securities account at the CSD.",
    "You can sell early through a rediscount. The price and your payout are shown before you confirm.",
    "Every purchase is authorised with a one-time code.",
  ];
}
