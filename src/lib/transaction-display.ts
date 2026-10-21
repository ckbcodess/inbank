import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/mock-data";

/**
 * How a transaction's amount is drawn, shared by every list of transactions. Which way the money went is the sign
 * (+ or −), not a colour: a completed payment is plain text either way. Money that did not move (pending, failed,
 * reversed) is muted, with a line through a failed one. The status word under it says why, and only when it isn't the
 * usual "Completed".
 */
export function amountStyling(t: Pick<Transaction, "state" | "direction">): { colorClass: string; prefix: string } {
  const prefix = t.direction === "debit" ? "− " : "+ ";
  if (t.state !== "completed") {
    const struck = t.state.startsWith("failed") || t.state === "reversed";
    return { colorClass: cn("text-muted-foreground font-normal", struck && "line-through"), prefix };
  }
  // Money that has landed is green; money out stays the foreground colour
  return { colorClass: t.direction === "credit" ? "text-success-text font-normal" : "text-foreground font-normal", prefix };
}

/** A state worth saying in words next to an amount: anything that isn't Completed. */
export const hasStatusWord = (t: Pick<Transaction, "state">) => t.state !== "completed";
