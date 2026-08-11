/**
 * Status rendering for transaction / trade / approval states.
 *
 * Section 13.5 requires "Returned for Clarification" to read as visually
 * distinct from "Rejected" — the former is warning-toned and recoverable, the
 * latter is destructive and terminal. That distinction is encoded here so it
 * cannot drift between screens.
 */

import { Badge } from "@/components/ui/badge";
import type { TransactionState } from "@/lib/states";

type Variant = "default" | "secondary" | "destructive" | "success" | "warning" | "outline";

const TRANSACTION_STATUS: Record<TransactionState, { label: string; variant: Variant }> = {
  pending: { label: "Pending", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  "failed-single": { label: "Failed", variant: "destructive" },
  "failed-bulk": { label: "Failed in batch", variant: "destructive" },
  "failed-trade": { label: "Returned", variant: "warning" },
  reversed: { label: "Reversed", variant: "secondary" },
  disputed: { label: "Disputed", variant: "warning" },
  "awaiting-approval": { label: "Awaiting approval", variant: "outline" },
};

export function TransactionStatusBadge({ state }: { state: TransactionState }) {
  const { label, variant } = TRANSACTION_STATUS[state];
  return <Badge variant={variant}>{label}</Badge>;
}

/** Generic status pill for trade/approval lifecycle labels. */
export function StatusBadge({ label, variant = "secondary" }: { label: string; variant?: Variant }) {
  return <Badge variant={variant}>{label}</Badge>;
}
