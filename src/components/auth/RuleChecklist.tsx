"use client";

import { AlertTriangle, Check } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type RuleState = "pending" | "met" | "broken";

/**
 * The live checks under a password or PIN: a quiet two-column list with no panel and no heading. A rule turns amber with a tick
 * the moment it's met. An unmet rule is just not ticked yet, never red; a rule that the input has already broken (a
 * PIN run, for example) turns amber. This is the one allowed kind of line under a field (CONSTITUTION §9).
 */
export default function RuleChecklist({
  rules,
  label,
}: {
  rules: { id: string; label: string; state: RuleState }[];
  /** Names the list for assistive tech ("Password requirements"). */
  label: string;
}) {
  return (
    <ul className="grid w-full grid-cols-1 gap-x-6 gap-y-3 text-left sm:grid-cols-2" aria-label={label}>
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={cn(
            "flex items-center gap-2 text-[13px] transition-colors duration-hover",
            rule.state === "met" && "text-foreground",
            rule.state === "pending" && "text-muted-foreground",
            rule.state === "broken" && "text-warning-text",
          )}
        >
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-hover",
              rule.state === "met" && "border-primary bg-primary text-primary-foreground",
              rule.state === "pending" && "border-border",
              rule.state === "broken" && "border-warning text-warning-text",
            )}
          >
            {rule.state === "met" && <Check size={12} aria-hidden="true" />}
            {rule.state === "broken" && <AlertTriangle size={10} aria-hidden="true" />}
          </span>
          <span>
            {rule.label}
            <span className="sr-only">
              {rule.state === "met" ? " — met" : rule.state === "broken" ? " — not met" : " — not yet"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
