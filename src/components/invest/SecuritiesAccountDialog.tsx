"use client";

/**
 * The one popup that says "to start investing you need a securities account" and offers to open it. It's what Invest on
 * an option's details opens, and what "Start Investing" opens on an empty Your Investments, so the two can never say
 * different things. Opening goes to the form, remembering what the customer was about to invest in, if anything.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function SecuritiesAccountDialog({
  open,
  onOpenChange,
  next,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The investment they chose, to pick up once the account is ready. */
  next?: { href: string; label: string };
}) {
  const href = next ? `/invest/profile?next=${encodeURIComponent(next.href)}&label=${encodeURIComponent(next.label)}` : "/invest/profile";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Open a securities account</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            To start investing, you need a securities account. It’s held with the Central Securities Depository, where what you own is recorded, and it’s ready within 7 working days.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Not Now
          </Button>
          <Button nativeButton={false} render={<Link href={href} />}>
            Open Securities Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
