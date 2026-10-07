"use client";

/**
 * Get a receipt out two ways: with everything on it, or with every money figure hidden (a "masked" receipt that
 * still proves the payment happened: who, when, reference). The page opens it from two quick actions: Share (text)
 * and Save as PDF. The caller builds the text and the PDF.
 */

import { EyeOff, FileDown, Share } from "lucide-react";
import { ActionTile } from "@/components/ui/action-tile";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ReceiptFormat = "text" | "pdf";

interface ShareReceiptDialogProps {
  /** Which quick action opened it; null is closed. */
  format: ReceiptFormat | null;
  onClose: () => void;
  /** `masked: true` is the version with amounts, fees and totals hidden. */
  onShare: (masked: boolean, format: ReceiptFormat) => void;
}

export function ShareReceiptDialog({ format, onClose, onShare }: ShareReceiptDialogProps) {
  const choose = (masked: boolean) => {
    if (!format) return;
    onClose();
    onShare(masked, format);
  };
  return (
    <Dialog open={format !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{format === "pdf" ? "Save as PDF" : "Share Receipt"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-3">
          <ActionTile icon={format === "pdf" ? FileDown : Share} title="With Transaction Details" onClick={() => choose(false)} />
          <ActionTile icon={EyeOff} title="Hide Transaction Details" description="Amounts, fees and totals are left out" onClick={() => choose(true)} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
