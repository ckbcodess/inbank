"use client";

/**
 * Reusable compliance interaction — Screen Consolidation v2, section 8.
 *
 *   Sensitive status change → Confirmation → Mandatory reason →
 *   Step-up MFA if required → Immediate change → Immutable audit log
 *
 * Section 8 asks that this pattern be applied wherever the BRD confirms a
 * high-risk status change. Confirmed applications so far:
 *   - User suspension / deactivation  (FR-19, section 7)  → SuspensionDialog
 *   - Card block / unblock            (FR-34)             → Cards
 *
 * Both go through this one component so the reason capture, the step-up gate
 * and the audit-log promise cannot drift apart between screens.
 */

import { useState } from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";
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
import { Input } from "@/components/ui/input";

type Stage = "confirm" | "step-up";

export interface ComplianceActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { reason: string }) => void;
  /** Dialog title, e.g. "Block Payroll Prepaid ••••6654?" */
  title: string;
  /** What will happen, and the audit consequence. */
  description?: string;
  /** Label on the committing button, e.g. "Block card". */
  confirmLabel: string;
  /** Placeholder for the mandatory reason field. */
  reasonPlaceholder?: string;
  /** Reversible actions (unblock) read as neutral, not destructive. */
  destructive?: boolean;
  /** Step-up MFA gate — section 8, "if required". */
  requiresStepUp?: boolean;
  /** Minimum characters before the reason counts as given. */
  minReason?: number;
}

const AUDIT_PROMISE =
  "This takes effect immediately and is written to the immutable audit log with your name, the time, and the reason you give below.";

export default function ComplianceActionDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description = AUDIT_PROMISE,
  confirmLabel,
  reasonPlaceholder = "Why is this change being made?",
  destructive = true,
  requiresStepUp = true,
  minReason = 10,
}: ComplianceActionDialogProps) {
  const [stage, setStage] = useState<Stage>("confirm");
  const [reason, setReason] = useState("");
  const [code, setCode] = useState("");

  const canProceed = reason.trim().length >= minReason;
  const canComplete = code.replace(/\D/g, "").length === 6;
  const commitVariant = destructive ? "destructive" : "default";

  function reset() {
    setStage("confirm");
    setReason("");
    setCode("");
  }

  function commit() {
    onConfirm({ reason: reason.trim() });
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        {stage === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert
                  size={18}
                  strokeWidth={1.9}
                  className={destructive ? "text-destructive" : "text-muted-foreground"}
                />
                {title}
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2 py-1">
              <Label htmlFor="compliance-reason">Reason (required)</Label>
              <Textarea
                id="compliance-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={reasonPlaceholder}
              />
              <p className="text-[12px] text-muted-foreground">
                {reason.trim().length < minReason
                  ? `At least ${minReason} characters required.`
                  : `${reason.trim().length} characters`}
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant={commitVariant}
                disabled={!canProceed}
                onClick={() => (requiresStepUp ? setStage("step-up") : commit())}
              >
                {requiresStepUp ? "Continue" : confirmLabel}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle
                  size={18}
                  strokeWidth={1.9}
                  className={destructive ? "text-destructive" : "text-muted-foreground"}
                />
                Confirm with your authenticator
              </DialogTitle>
              <DialogDescription>
                High-risk changes need a second factor. Enter the 6-digit code from your
                authenticator to apply this change.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2 py-1">
              <Label htmlFor="compliance-stepup">Verification code</Label>
              <Input
                id="compliance-stepup"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="tabular"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStage("confirm")}>
                Back
              </Button>
              <Button variant={commitVariant} disabled={!canComplete} onClick={commit}>
                {confirmLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
