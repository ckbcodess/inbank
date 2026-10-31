import type { Transaction } from "@/lib/mock-data";

/**
 * How a transaction's amount is drawn, shared by every list of transactions (designer, 2026-10-29). Which way the money
 * went is the sign (+ or −) and nothing else: no arrow, no colour. Every state draws the amount the same plain way,
 * with no line through it; a pill under it (pending, failed, reversed) is what says it did not complete, and a
 * completed payment says nothing.
 */
export function amountStyling(t: Pick<Transaction, "state" | "direction">): { colorClass: string; prefix: string } {
  return { colorClass: "text-foreground font-normal", prefix: t.direction === "debit" ? "− " : "+ " };
}

/** A state worth saying in words next to an amount: anything that isn't Completed. */
export const hasStatusWord = (t: Pick<Transaction, "state">) => t.state !== "completed";
