"use client";

/**
 * Confirm dialog before redirecting the customer to the public GCB website to find a branch.
 * Used in business onboarding and activation when in-branch assistance is needed.
 */

import { useState } from "react";
import { ExternalLink } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FIND_BRANCH_URL } from "@/lib/corporate/onboarding";

interface FindBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FindBranchDialog({ open, onOpenChange }: FindBranchDialogProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  function executeRedirect() {
    setIsRedirecting(true);
    setTimeout(() => {
      window.open(FIND_BRANCH_URL, "_blank");
      setIsRedirecting(false);
      onOpenChange(false);
    }, 600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Find a GCB Branch</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            You will be redirected to gcbbank.com.gh to find your nearest branch.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRedirecting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={executeRedirect}
            loading={isRedirecting}
            className="gap-2"
          >
            Continue to website
            <ExternalLink size={15} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
