"use client";

import * as React from "react";
import { Info } from "@/components/ui/icons";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * The About entry on every product page (Insure plan, Loans advance, Invest products): a small chip beside the title
 * that opens the explanation in a centred sheet, so there is no extra route and no Back. The page body stays only
 * what the customer holds. Pass it as the `actions` of `PageHeader`.
 */
export function AboutSheet({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1 rounded-full bg-muted px-3 text-[13px] text-foreground transition-colors duration-hover hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info size={14} aria-hidden="true" />
        About
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="center" className="flex flex-col">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <SheetBody className="gap-8 pb-6 sm:pb-8">{children}</SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
