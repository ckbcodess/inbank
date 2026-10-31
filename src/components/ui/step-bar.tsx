import { cn } from "@/lib/utils";

/**
 * Where the customer is in a flow of fixed steps: one bar per step, the current one in full amber, the finished ones
 * softer. The step's own name is the page title, so there is no "Step n of N" text; the bar carries it for screen readers.
 * `compact` shrinks it to small ticks that fit in a page header's `actions`, for a short flow where a full-width bar
 * above the form would be more than the customer needs (the Insure buy flow).
 */
export function StepBar({ current, total, compact = false, className }: { current: number; total: number; compact?: boolean; className?: string }) {
  return (
    <div role="img" aria-label={`Step ${current} of ${total}`} className={cn("flex items-center", compact ? "gap-1" : "gap-2 px-0.5", className)}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition duration-300",
            compact ? "h-1 w-5" : "h-1.5 flex-1",
            i + 1 === current ? "bg-primary" : i + 1 < current ? "bg-primary/60" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}
