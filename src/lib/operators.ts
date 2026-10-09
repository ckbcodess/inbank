/**
 * The mobile networks (MTN, Telecel, AT): one table for their names, lines and marks, so a wallet or a number
 * reads and looks the same in every list, picker and receipt. Add a network here and nowhere else.
 */

export type Operator = "MTN" | "Telecel" | "AT" | "GhanaPay" | "GMoney";

export const OPERATOR_IDS = ["MTN", "Telecel", "AT", "GhanaPay", "GMoney"] as const satisfies readonly Operator[];

export interface OperatorInfo {
  id: Operator;
  /** The wallet: what a customer links and funds from ("MTN Mobile Money"). */
  wallet: string;
  /** The line: what a number is on, for airtime and data ("MTN Ghana"). */
  telco: string;
  /** The network's mark, in /public. */
  logo: string;
}

export const OPERATORS: Record<Operator, OperatorInfo> = {
  MTN: { id: "MTN", wallet: "MTN Mobile Money", telco: "MTN Ghana", logo: "/mtn.svg" },
  Telecel: { id: "Telecel", wallet: "Telecel Cash", telco: "Telecel Ghana", logo: "/telecel.svg" },
  AT: { id: "AT", wallet: "AT Money", telco: "AT Ghana", logo: "/at.svg" },
  GhanaPay: { id: "GhanaPay", wallet: "GhanaPay", telco: "GhanaPay", logo: "/ghanapay.svg" },
  GMoney: { id: "GMoney", wallet: "G-Money", telco: "G-Money", logo: "/gmoney.svg" },
};

/** Which network a name belongs to, whichever way it is written ("MTN", "MTN Ghana", "Vodafone", "AirtelTigo", "GhanaPay", "G-Money"). */
export function operatorFromName(name?: string | null): Operator | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.includes("mtn")) return "MTN";
  if (lower.includes("telecel") || lower.includes("vodafone")) return "Telecel";
  if (lower.includes("airteltigo") || /\bat\b/.test(lower)) return "AT";
  if (lower.includes("ghanapay") || lower.includes("ghana pay")) return "GhanaPay";
  if (lower.includes("g-money") || lower.includes("gmoney") || lower.includes("g money")) return "GMoney";
  return null;
}

/** The network's mark for a name, or null when it isn't one of ours. */
export function operatorLogo(name?: string | null): string | null {
  const op = operatorFromName(name);
  return op ? OPERATORS[op].logo : null;
}

/** The line a number is on ("MTN Ghana"), leaving a name we don't know as it was. */
export function telcoName(name?: string | null): string {
  const op = operatorFromName(name);
  return op ? OPERATORS[op].telco : name || OPERATORS.MTN.telco;
}
