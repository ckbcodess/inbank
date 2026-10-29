/**
 * Where a payment is on its approval path: who submitted it, who reviewed or authorised it and what they said,
 * and the steps still to come. The approver reads it before deciding; the inputter reads it on the receipt, so
 * neither has to ask "who has it now?".
 */

import { Check, Undo2, Circle } from "@/components/ui/icons";
import type { ApprovalEvent, ApprovalItem } from "@/lib/corporate/approvals";
import { cn } from "@/lib/utils";

const ACTION_LINE: Record<ApprovalEvent["action"], string> = {
  submitted: "Submitted",
  passed: "Reviewed and passed on",
  authorised: "Authorised",
  returned: "Sent back",
};

export default function ApprovalTrail({ item }: { item: ApprovalItem }) {
  const waiting = item.status === "open" ? item.steps.slice(item.current) : [];

  return (
    <ol className="flex flex-col">
      {item.trail.map((event, i) => (
        <TrailRow
          key={`${event.action}-${i}`}
          icon={event.action === "returned" ? "returned" : "done"}
          title={`${ACTION_LINE[event.action]} by ${event.by}`}
          meta={`${event.role} · ${event.at}`}
          comment={event.comment}
          last={i === item.trail.length - 1 && waiting.length === 0}
        />
      ))}
      {waiting.map((step, i) => (
        <TrailRow
          key={`waiting-${i}`}
          icon="waiting"
          title={
            i === 0
              ? step.kind === "review"
                ? "Waiting for a Reviewer"
                : "Waiting for an Authoriser"
              : step.kind === "review"
                ? "Then a Reviewer"
                : "Then an Authoriser"
          }
          meta={step.kind === "authorise" ? "Nothing leaves the account until this step" : undefined}
          last={i === waiting.length - 1}
        />
      ))}
    </ol>
  );
}

function TrailRow({
  icon,
  title,
  meta,
  comment,
  last,
}: {
  icon: "done" | "returned" | "waiting";
  title: string;
  meta?: string;
  comment?: string;
  last: boolean;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            icon === "done" && "bg-muted text-foreground",
            icon === "returned" && "bg-warning/15 text-warning-text",
            icon === "waiting" && "border border-dashed border-border text-muted-foreground",
          )}
        >
          {icon === "done" && <Check size={13} aria-hidden="true" />}
          {icon === "returned" && <Undo2 size={13} aria-hidden="true" />}
          {icon === "waiting" && <Circle size={6} aria-hidden="true" />}
        </span>
        {!last && <span className="w-px flex-1 bg-border" aria-hidden="true" />}
      </div>
      <div className={cn("flex min-w-0 flex-col gap-1", !last && "pb-4")}>
        <span className={cn("text-[14px]", icon === "waiting" ? "text-muted-foreground" : "text-foreground")}>{title}</span>
        {meta && <span className="tabular text-[12px] text-muted-foreground">{meta}</span>}
        {comment && <p className="text-[13px] leading-relaxed text-foreground">“{comment}”</p>}
      </div>
    </li>
  );
}
