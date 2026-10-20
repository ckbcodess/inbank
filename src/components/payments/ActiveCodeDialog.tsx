"use client";

/**
 * One unused cash-out code, opened from the Active codes list: the same ticket as the success page, and
 * the two things you can do with it: share it, or delete it. Deleting is a danger action, kept apart, and
 * asks first: the confirmation says exactly what will happen before anything is removed.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { REGISTERED_WALLET } from "./flows/OwnWalletPicker";
import { CashoutTicket } from "./CashoutTicket";

export interface ActiveCashoutCode {
  code: string;
  who: string;
  amount: number;
  expires: string;
  /** Where it was sent; the registered number when it was for the customer. */
  phone?: string;
}

export function ActiveCodeDialog({
  code,
  open,
  onOpenChange,
  onCancelCode,
}: {
  code: ActiveCashoutCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the customer deletes the code; the parent removes it from the list. */
  onCancelCode: (code: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!code) return null;

  const amount = code.amount.toFixed(2);
  const message = `GCB ATM cash-out code ${code.code} for GHS ${amount}. Enter it at any GCB ATM. ${code.expires}.`;

  function close(next: boolean) {
    if (!next) setConfirming(false);
    onOpenChange(next);
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "GCB ATM code", text: message });
      } else {
        await navigator.clipboard?.writeText(message);
        toast.success("Copied. Paste it into a message.");
      }
    } catch {
      // Closing the share sheet isn't an error.
    }
  }

  return (
    <>
      <Modal
        open={open && !confirming}
        onOpenChange={close}
        size="sm"
        title="ATM code"
        footer={
          // One row on a phone too (the footer stacks its direct children there), primary last
          <div className="flex w-full gap-2 sm:justify-between">
            <Button type="button" variant="destructive" onClick={() => setConfirming(true)} className="flex-1 sm:flex-none">
              Delete code
            </Button>
            <Button type="button" onClick={share} className="flex-1 sm:flex-none">
              Share Code
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-2 pb-2 pt-3 text-center">
          <CashoutTicket code={code.code} amount={amount} recipientPhone={code.phone ?? REGISTERED_WALLET.phone} />
          <p className="max-w-[300px] text-balance text-[13px] text-muted-foreground">
            {code.expires}. Anyone with this code can take the cash.
          </p>
        </div>
      </Modal>

      {/* Asks before deleting, and says what it means */}
      <Modal
        open={open && confirming}
        onOpenChange={close}
        size="sm"
        title="Delete this code?"
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setConfirming(false)} className="flex-1 sm:flex-none">
              Keep code
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 sm:flex-none"
              onClick={() => {
                onCancelCode(code.code);
                setConfirming(false);
                onOpenChange(false);
                toast.success("Code deleted. The money stays in your account.");
              }}
            >
              Delete code
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 py-2">
          <p className="text-[14px] leading-relaxed text-foreground">
            The code <span className="tabular">{code.code}</span> for <span className="tabular">GHS {amount}</span> will stop
            working. It can&apos;t be used at an ATM afterwards, and this can&apos;t be undone.
          </p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            The money stays in your account. You can generate a new code any time.
          </p>
        </div>
      </Modal>
    </>
  );
}
