"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Info } from "@/components/ui/icons";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * The About entry on every product page (Insure plan, Loans advance, Invest products): a small info icon right after the
 * title that opens the explanation in a centred sheet, so there is no extra route and no Back. The page body stays only
 * what the customer holds. Pass it as the `badge` of `PageHeader`.
 */
export function AboutSheet({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {/* 32px, with the hit area stretched to 40px, like the back arrow on the other side of the title. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={title}
        title={title}
        className="relative text-muted-foreground hover:text-foreground after:absolute after:-inset-1 after:content-['']"
        onClick={() => setOpen(true)}
      >
        <Info size={18} aria-hidden="true" />
      </Button>
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
