import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The line a sum ends on: a plain label and the figure, one look everywhere (designer, 2026-11-05). Forms, the review
 * step, receipts and invoices all use this, so a total never changes size between the amount and the receipt.
 */
export function TotalRow({
  label,
  value,
  definition,
  className,
}: {
  label: ReactNode;
  /** Already formatted, and already respecting the hide-amounts setting. */
  value: ReactNode;
  /** Inside a `<dl>`, the label and figure are its term and description. */
  definition?: boolean;
  className?: string;
}) {
  const Label = definition ? "dt" : "span";
  const Figure = definition ? "dd" : "span";
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <Label className="min-w-0 text-[14px] text-foreground">{label}</Label>
      <Figure className="tabular shrink-0 text-[20px] text-foreground">{value}</Figure>
    </div>
  );
}
