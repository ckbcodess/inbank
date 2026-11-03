"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";

/**
 * Where a Personal, Business or SME loan application continues: the bank's Loan Origination Solution (LOS). The dialog
 * says the customer is leaving this app before they do (nothing is started until Proceed), and Cancel is as easy as
 * opening it was. There is no LOS behind the prototype, so Proceed only confirms and closes.
 */
export function LosRedirectDialog({ loan, onClose }: { loan: string | null; onClose: () => void }) {
  // The page clears `loan` as it closes the dialog; keep the last name so the title does not vanish mid fade-out.
  const [shown, setShown] = useState(loan);
  if (loan !== null && loan !== shown) setShown(loan);
  return (
    <Modal
      open={loan !== null}
      onOpenChange={(open) => !open && onClose()}
      title={loan ?? shown ?? ""}
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="md"
            onClick={() => {
              onClose();
              toast.success("Opening the Loan Origination Solution", { id: "los-redirect" });
            }}
          >
            Proceed
          </Button>
        </>
      }
    >
      <p className="text-[14px] leading-relaxed text-foreground">
        You will be redirected to our Loan Origination Solution (LOS) to continue your loan application.
      </p>
    </Modal>
  );
}
