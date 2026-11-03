"use client";

/**
 * Tell the bank something is wrong with a transaction, from its receipt. One reason and an optional note: the bank
 * already has the transaction, so nothing else is asked. The prototype has no backend, so sending raises a case
 * reference and says so; it does not file anything.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const REASONS = ["I Didn’t Make This", "The Amount Is Wrong", "I Was Charged Twice", "It Hasn’t Arrived", "Something Else"] as const;

export function ReportIssueDialog({
  open,
  onOpenChange,
  reference,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The transaction being reported, when there is one. */
  reference?: string;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setReason(null);
      setNote("");
      setMissing(false);
    }
  };

  const send = () => {
    if (!reason) {
      setMissing(true);
      return;
    }
    const caseRef = `CASE-${String(Date.now()).slice(-6)}`;
    close(false);
    toast.success(`Report sent. Your case reference is ${caseRef}.`);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-4">
          <Field label="What Went Wrong?" error={missing && !reason ? "Choose what went wrong." : null}>
            <Select
              value={reason}
              onValueChange={(v) => {
                setReason(v);
                setMissing(false);
              }}
            >
              <SelectTrigger className="w-full" aria-invalid={missing && !reason}>
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Details" optional>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={reference ? `Anything that helps us look into ${reference}` : "Anything that helps us look into it"} />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button size="md" type="button" className="w-full" onClick={send}>
            Send Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
