import { cn } from "@/lib/utils";

/**
 * The dashed hairline: 6px dashes, 10px gaps, in the border colour. It closes a total (payment review, key fact),
 * sets a price into a line (product pitch) and separates progress from details (a reported issue). Decorative, so
 * hidden from assistive tech. A `span` so it can sit inside inline content too; pass `flex-1` to fill a row.
 */
export function DashedDivider({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block h-px bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]", className)}
    />
  );
}
