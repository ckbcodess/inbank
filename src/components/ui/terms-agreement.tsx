"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * The tick every purchase asks for on its review step, before the code. "Terms & Conditions" is a link that opens
 * them in a dialog, so nobody agrees to something they cannot read. The flow keeps the checked state and disables
 * Confirm until it is true (and says why under the button, CONSTITUTION §9).
 */
export function TermsAgreement({
  checked,
  onCheckedChange,
  subject,
  terms,
  also,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** What the terms are for: "the HomeCall Plan", "treasury bills and bonds". */
  subject: string;
  terms: string[];
  /** Something else the same tick covers, said after the subject ("and to switching my account to a Salary Account"). */
  also?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <label className="flex cursor-pointer items-start gap-2 px-1 py-2 text-[13px] leading-relaxed text-foreground">
        <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(Boolean(v))} aria-label="Agree to the Terms and Conditions" className="mt-0.5" />
        <span>
          {"I have read and agree to the "}
          <button
            type="button"
            className="cursor-pointer text-foreground underline underline-offset-4"
            onClick={(e) => {
              // Inside a label, a click would also toggle the tick; opening the terms must not.
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
          >
            Terms &amp; Conditions
          </button>
          {` of ${subject}${also ? `, ${also}` : ""}.`}
        </span>
      </label>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <ul className="flex flex-col gap-3 text-[14px] leading-relaxed text-muted-foreground">
              {terms.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </DialogBody>
          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The reason Confirm is off, under the buttons. */
export function TermsHint({ agreed }: { agreed: boolean }) {
  if (agreed) return null;
  return <p className="px-1 text-center text-[12px] text-muted-foreground">Agree to the terms to confirm.</p>;
}
