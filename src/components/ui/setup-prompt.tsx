"use client";

/**
 * What a customer sees at the top of an area they can look at but not yet use (Insure before the insurance profile,
 * Loans before pay arrives in a GCB account): what is needed, and one button. Three looks, switched from Dev Mode:
 *  - row:   one slim line and a button. The default.
 *  - card:  a heading, a sentence of why, the steps laid out so nothing is a surprise, and the button.
 *  - track: a short progress track, empty now, that fills as the steps are done.
 * When one is chosen, delete the others.
 */

import { ListCard, GLASS_TILE_CLASS } from "@/components/ui/list-card";
import { cn } from "@/lib/utils";

export interface SetupStep {
  title: string;
  detail: string;
}

export type SetupPromptStyle = "row" | "card" | "track";

export function SetupPrompt({
  look,
  rowHeading,
  rowText,
  heading,
  text,
  steps,
  progressLabel,
  progressNote,
  action,
}: {
  look: SetupPromptStyle;
  /** The row's first line, when it has one. */
  rowHeading?: string;
  rowText: string;
  /** The card's heading and the sentence of why under it. */
  heading: string;
  text: string;
  steps: SetupStep[];
  /** The track's title, and its line ("Not started · 0 of 4 steps"). */
  progressLabel: string;
  progressNote: string;
  action: React.ReactNode;
}) {
  if (look === "card") {
    return (
      <div className={cn(GLASS_TILE_CLASS, "flex flex-col gap-6 rounded-3xl p-5 sm:p-8")}>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[17px] font-medium tracking-[var(--ls-tight)] text-foreground">{heading}</h2>
          <p className="max-w-[520px] text-[13px] leading-relaxed text-muted-foreground">{text}</p>
        </div>
        <ol className="grid gap-5 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2.5">
              <span
                className={cn(
                  "tabular flex size-7 items-center justify-center rounded-full border text-[12px]",
                  i === 0 ? "border-transparent bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[14px] font-medium text-foreground">{step.title}</span>
                <span className="text-[13px] leading-snug text-muted-foreground">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <div>{action}</div>
      </div>
    );
  }

  if (look === "track") {
    return (
      <div className={cn(GLASS_TILE_CLASS, "flex flex-col gap-5 rounded-2xl p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-medium text-foreground">{progressLabel}</span>
            <span className="text-[13px] text-muted-foreground">{progressNote}</span>
          </div>
          {action}
        </div>
        <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2">
              <span className={cn("h-1 rounded-full", i === 0 ? "bg-primary/40" : "bg-border")} />
              <span className="text-[12px] text-muted-foreground">{step.title}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <ListCard as="div" className="flex-row flex-wrap items-center gap-x-4 gap-y-3 py-3 pl-5 pr-3">
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary" />
      <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1">
        {rowHeading && <p className="text-[14px] text-foreground">{rowHeading}</p>}
        <p className={cn("leading-snug", rowHeading ? "text-[13px] leading-relaxed text-muted-foreground" : "text-[14px] text-foreground")}>{rowText}</p>
      </div>
      {action}
    </ListCard>
  );
}
