import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The tick that marks the chosen row in a list of options: a yellow disc with a dark check. One component, so
 * every "this one is selected" row (payment method, account to add, and any list after them) marks it alike.
 */
export function CheckBadge({ className }: { className?: string }) {
  return (
    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground", className)}>
      <Check size={12} strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}
