import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface TrackerStep {
  key: string;
  title: string;
  /** When it happened, or a short state for the current step ("In progress"). */
  date?: string;
  description?: string;
}

/**
 * A vertical progress tracker: numbered steps joined by a line, done steps filled amber with a tick. Steps up to
 * `current` are done, and the line between two done steps turns amber. Card delivery and reported issues use it.
 */
export function ProgressTracker({
  steps,
  current,
  className,
}: {
  steps: readonly TrackerStep[];
  /** Index of the latest step reached. */
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("relative flex flex-col pl-1", className)}>
      {steps.map((step, idx) => {
        const done = idx <= current;
        const isLast = idx === steps.length - 1;
        const isCurrent = idx === current;
        return (
          <li key={step.key} className="relative flex items-start gap-3 pb-5 last:pb-0" aria-current={isCurrent ? "step" : undefined}>
            {!isLast && (
              <div
                aria-hidden="true"
                className={cn(
                  "absolute left-[13px] top-[26px] bottom-0 w-[2px] transition-colors",
                  done && idx < current ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <div
              className={cn(
                "z-10 flex size-6 shrink-0 select-none items-center justify-center rounded-full transition",
                done ? "bg-primary font-medium text-primary-foreground" : "border border-border bg-muted text-caption text-muted-foreground",
              )}
            >
              {done ? <Check size={15} aria-hidden="true" /> : <span className="tabular text-caption font-medium">{idx + 1}</span>}
            </div>
            <div className="flex min-w-0 flex-1 flex-col pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-body leading-tight tracking-[var(--ls-tight)]",
                    done ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
                {step.date && (
                  <span className={cn("tabular text-body", isCurrent ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {step.date}
                  </span>
                )}
              </div>
              {step.description && <p className="mt-1 text-body leading-relaxed text-muted-foreground">{step.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
