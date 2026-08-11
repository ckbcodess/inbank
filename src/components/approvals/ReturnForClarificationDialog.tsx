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
import { MessageSquareWarning } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TRADE_DOCUMENTS } from "@/lib/mock-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { note: string; documents: string[] }) => void;
  reference: string;
  nextVersion: number;
}

export default function ReturnForClarificationDialog({
  open,
  onOpenChange,
  onConfirm,
  reference,
  nextVersion,
}: Props) {
  const [note, setNote] = useState("");
  const [flagged, setFlagged] = useState<string[]>([]);

  const canSubmit = note.trim().length >= 10;

  function toggleDoc(id: string) {
    setFlagged((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareWarning size={18} strokeWidth={1.9} className="text-amber-600 dark:text-amber-400" />
            Return for clarification
          </DialogTitle>
          <DialogDescription>
            This keeps {reference} alive. The submitter answers your questions and resubmits as v
            {nextVersion}, and you&apos;ll be able to compare it against the current version.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="clarify-note">What needs clarifying?</Label>
            <Textarea
              id="clarify-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Be specific about what you need — the submitter sees this verbatim."
            />
            <p className="text-[12px] text-muted-foreground">
              {note.trim().length < 10
                ? "At least 10 characters required."
                : `${note.trim().length} characters`}
            </p>
          </div>

          {/* Document-level flagging — has no equivalent in rejection */}
          <div className="flex flex-col gap-2">
            <Label>Flag specific documents (optional)</Label>
            <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
              {TRADE_DOCUMENTS.map((doc) => (
                <label
                  key={doc.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-[13px] text-foreground hover:bg-muted/50"
                >
                  <Checkbox
                    checked={flagged.includes(doc.id)}
                    onCheckedChange={() => toggleDoc(doc.id)}
                  />
                  <span className="flex-1">{doc.name}</span>
                  {doc.status === "missing" && (
                    <span className="text-[12px] text-amber-600 dark:text-amber-400">Missing</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
