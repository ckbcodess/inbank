import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Where the customer is in a flow of fixed steps: one bar per step, the current one in full amber, the finished ones
 * softer. The step's own name is the page title, so there is no "Step n of N" text; the bar carries it for screen readers.
 * `compact` shrinks it to small ticks that fit in a page header's `actions`, for a short flow where a full-width bar
 * above the form would be more than the customer needs (the Insure buy flow). The compact ticks say "Step n of N" in a
 * tooltip on hover, and grow taller while hovered, since nothing on screen names them.
 */
export function StepBar({ current, total, compact = false, className }: { current: number; total: number; compact?: boolean; className?: string }) {
  const label = `Step ${current} of ${total}`;
  const bar = (
    // Compact ticks get vertical padding so the tooltip's hover target isn't a 4px line.
    <div role="img" aria-label={label} className={cn("flex items-center", compact ? "group gap-1 py-2" : "gap-2 px-0.5", className)}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            // Grows by scale, not height, so the header around it never shifts.
            "rounded-full transition-[transform,background-color] duration-reveal ease-settle",
            compact ? "h-1 w-5 group-hover:scale-y-200" : "h-1.5 flex-1",
            i + 1 === current ? "bg-primary" : i + 1 < current ? "bg-primary/60" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
  return compact ? <SimpleTooltip content={label}>{bar}</SimpleTooltip> : bar;
}
