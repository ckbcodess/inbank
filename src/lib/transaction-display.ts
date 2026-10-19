import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/mock-data";

/**
 * How a transaction's amount is drawn, shared by every list of transactions. The colour answers one question: did
 * this money move, and which way? Money in that completed is green, money out that completed is plain, and money
 * that did not move (pending, failed, reversed) is muted, with a line through a failed one. The status word under it
 * answers the other question, and only when it isn't the usual "Completed".
 */
export function amountStyling(t: Pick<Transaction, "state" | "direction">): { colorClass: string; prefix: string } {
  const prefix = t.direction === "debit" ? "− " : "+ ";
  if (t.state !== "completed") {
    const struck = t.state.startsWith("failed") || t.state === "reversed";
    return { colorClass: cn("text-muted-foreground font-normal", struck && "line-through"), prefix };
  }
  if (t.direction === "credit") return { colorClass: "text-success-text font-medium", prefix };
  return { colorClass: "text-foreground font-normal", prefix };
}

/** A state worth saying in words next to an amount: anything that isn't Completed. */
export const hasStatusWord = (t: Pick<Transaction, "state">) => t.state !== "completed";
