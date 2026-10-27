import { cn } from "@/lib/utils";

/**
 * Where the customer is in a flow of fixed steps: one bar per step, the current one in full amber, the finished ones
 * softer. The step's own name is the page title; `Step n of N` sits under the bar, quiet, for anyone who wants the count.
 * Used by every onboarding screen (`AuthLayout`) and the in-app multi-step flows.
 */
export function StepBar({ current, total, className, showCount = false }: { current: number; total: number; className?: string; showCount?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div role="img" aria-label={`Step ${current} of ${total}`} className="flex items-center gap-2 px-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition duration-300",
              i + 1 === current ? "bg-primary" : i + 1 < current ? "bg-primary/60" : "bg-muted",
            )}
          />
        ))}
      </div>
      {showCount && (
        <p className="px-1 text-[12px] text-muted-foreground tabular">
          Step {current} of {total}
        </p>
      )}
    </div>
  );
}
