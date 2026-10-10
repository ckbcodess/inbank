"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OpenGcbAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataTourConfirm?: string;
}

export default function OpenGcbAccountDialog({
  open,
  onOpenChange,
  dataTourConfirm,
}: OpenGcbAccountDialogProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  function executeCoosRedirect() {
    setIsRedirecting(true);
    setTimeout(() => {
      window.open("https://accountopening.gcb.com.gh", "_blank");
      setIsRedirecting(false);
      onOpenChange(false);
    }, 1000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Open a GCB Account</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            You will be redirected to{" "}
            <span className="font-medium text-foreground">
              accountopening.gcb.com.gh
            </span>{" "}
            to complete your account application.
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
            data-tour={dataTourConfirm}
            onClick={executeCoosRedirect}
            loading={isRedirecting}
            className="gap-1.5"
          >
            Continue to portal
            <ExternalLink className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
