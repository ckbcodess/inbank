"use client";

/**
 * Return for Clarification — trade-only, per 13.5 and FR-13.
 *
 * Deliberately a SEPARATE component from RejectionDialog. The doc requires this
 * outcome to be visually and functionally distinct from a hard rejection:
 *
 *   Rejected  — terminal, destructive tone, the request is dead.
 *   Returned  — recoverable, warning tone, the submitter answers and resubmits
 *               as a new version, carrying the request forward.
 *
 * The affordances differ too: returning lets the approver name the specific
 * documents or fields that need attention, which rejection has no concept of.
 */

import { useState } from "react";
import { MessageSquareWarning } from "@/components/ui/icons";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TRADE_DOCUMENTS } from "@/lib/corporate/approvals";

import { Field } from "@/components/ui/field";
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { note: string; documents: string[] }) => void;
  reference: string;
  nextVersion?: number;
  items?: Array<{ id: string; name: string; status?: string }>;
  itemLabel?: string;
  subheading?: string;
}

export default function ReturnForClarificationDialog({
  open,
  onOpenChange,
  onConfirm,
  reference,
  items,
  itemLabel = "Flag Specific Documents",
  subheading,
}: Props) {
  const [note, setNote] = useState("");
  const [flagged, setFlagged] = useState<string[]>([]);

  const canSubmit = note.trim().length >= 10;

  function toggleDoc(id: string) {
    setFlagged((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareWarning size={18} className="text-warning-text" />
            <span>Return for Clarification</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {subheading || `This keeps ${reference} alive. The submitter answers your questions and resubmits, and the rest of the application is kept.`}
          </p>

          <div className="flex flex-col gap-3 pt-1">
            <Field label="What needs clarifying?" htmlFor="clarify-note">
              <Textarea
                id="clarify-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="What exactly do you need?"
              />
              <p className="text-[12px] text-muted-foreground">
                {note.trim().length < 10
                  ? "At least 10 characters required."
                  : `${note.trim().length} characters`}
              </p>
            </Field>

            {/* Item-level flagging */}
            <Field label={itemLabel} optional>
              <div className="flex flex-col gap-2 rounded-xl border border-border p-2">
                {(items || TRADE_DOCUMENTS).map((doc) => (
                  <label
                    key={doc.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[13px] text-foreground hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={flagged.includes(doc.id)}
                      onCheckedChange={() => toggleDoc(doc.id)}
                    />
                    <span className="flex-1">{doc.name}</span>
                    {doc.status === "missing" && (
                      <span className="text-[12px] text-warning-text">Missing</span>
                    )}
                  </label>
                ))}
              </div>
</Field>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              onConfirm({ note: note.trim(), documents: flagged });
              setNote("");
              setFlagged([]);
            }}
          >
            Return to submitter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
