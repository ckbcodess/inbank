"use client";

/**
 * Rejection interaction — section 4, classified "State / Component".
 *
 * A modal within the approval context that captures a mandatory reason. It is
 * deliberately not a screen of its own.
 *
 * Reused by both approval screens, but note it is NOT the same as the trade
 * "Return for Clarification" interaction (13.5) — returning is a recoverable
 * request for more information, rejecting is terminal. They are separate
 * components so the two outcomes can never be conflated.
 */

import { useState } from "react";
import { XCircle } from "lucide-react";
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

interface RejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  reference: string;
}

export default function RejectionDialog({
  open,
  onOpenChange,
  onConfirm,
  reference,
}: RejectionDialogProps) {
  const [reason, setReason] = useState("");
  const canSubmit = reason.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle size={18} strokeWidth={1.9} className="text-destructive" />
            Reject this transaction
          </DialogTitle>
          <DialogDescription>
            Rejecting is final — {reference} will not be sent, and the submitter will need to start a
            new request. Your reason is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-1">
          <Label htmlFor="reject-reason">Reason for rejection</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Explain why this is being rejected so the submitter understands what went wrong."
          />
          <p className="text-[12px] text-muted-foreground">
            {reason.trim().length < 10
              ? "A reason of at least 10 characters is required."
              : `${reason.trim().length} characters`}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canSubmit}
            onClick={() => {
              onConfirm(reason.trim());
              setReason("");
            }}
          >
            Reject transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
