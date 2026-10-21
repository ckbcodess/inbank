"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * The heading of a section on a page: a 16px medium title with, at the far end, an optional action (a ghost button
 * or link). Give it a `hint` and an info icon appears beside the title that explains the section in a sentence:
 * a tooltip for a mouse, a bottom sheet for a finger (a tooltip can't be opened by touch).
 */
export function SectionHeading({
  id,
  title,
  hint,
  action,
  className,
}: {
  /** Put on the `h2` so the section can name itself with `aria-labelledby`. */
  id?: string;
  title: React.ReactNode;
  /** A short explanation of the section, shown from an info icon beside the title. */
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const label = typeof title === "string" ? `About ${title}` : "About this section";
  const iconButton =
    "-m-3 inline-flex cursor-pointer items-center justify-center rounded-full p-3 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground";

  return (
    <div className={cn("flex min-h-7 items-center justify-between gap-3 px-1", className)}>
      <div className="flex items-center gap-2">
        <h2 id={id} className="text-[16px] font-medium tracking-[var(--ls-tight)] text-foreground">
          {title}
        </h2>
        {hint && (
          <>
            {/* A mouse hovers for a tooltip; a finger can't, so on a phone the same icon opens a bottom sheet. */}
            <Tooltip>
              <TooltipTrigger
                delay={0}
                render={<button type="button" aria-label={label} className={cn(iconButton, "max-sm:hidden")} />}
              >
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="w-64 whitespace-normal text-[12px] font-normal leading-relaxed">
                {hint}
              </TooltipContent>
            </Tooltip>
            <button type="button" aria-label={label} onClick={() => setHintOpen(true)} className={cn(iconButton, "sm:hidden")}>
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <Dialog open={hintOpen} onOpenChange={setHintOpen}>
              <DialogContent size="sm" showCloseButton>
                <DialogHeader showCloseButton={false}>
                  <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <DialogBody>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">{hint}</p>
                </DialogBody>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
      {action}
    </div>
  );
}
