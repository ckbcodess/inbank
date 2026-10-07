"use client";

/**
 * Transaction authorisation, in one place for every flow that moves money (Send & Pay, standing orders, Add Money,
 * card requests). There is no transaction PIN: every transaction is approved with a 6-digit one-time code sent by
 * SMS, or read off the phone with a shortcode (see `OtpHelp`). The code never approves on its own: it waits for a
 * tap on Confirm (or Enter), as a payment is not recoverable.

 */

import { AlertToast } from "@/components/ui/alert-toast";
import { InlineError } from "@/components/ui/inline-error";
import React, { useEffect, useId, useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OtpInput from "@/components/auth/OtpInput";
import { useAuthorisation, REGISTERED_PHONE } from "./useAuthorisation";
import { OtpHelp } from "./OtpHelp";

export interface TransactionOtpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (code?: string) => void;
  title?: string;
  phone?: string;
}

export default function TransactionOtpModal({
  open,
  onOpenChange,
  onSuccess,
  title = "Authorization",
  phone = REGISTERED_PHONE,
}: TransactionOtpModalProps) {
  const auth = useAuthorisation();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);

  // A fresh code every time the modal opens.
  useEffect(() => {
    if (open) {
      auth.reset();
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!auth.complete || submitting) return;
    const raw = auth.otp.join("");
    if (raw === "000000") {
      auth.verify(raw);
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      onOpenChange(false);
      onSuccess(raw);
      setSubmitting(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form id={formId} onSubmit={handleConfirm} className="flex flex-col items-center justify-center px-6 py-10 text-center sm:py-12">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
            <Smartphone size={22} strokeWidth={1.9} />
          </div>

          <h2 className="mt-5 text-[22px] font-medium tracking-[-0.02em] text-foreground">Enter OTP Verification Code</h2>

          <p className="mt-2 max-w-xs text-[13px] text-muted-foreground">
            A 6-digit one-time code was sent to <span className="tabular whitespace-nowrap font-medium text-foreground">{phone}</span>
          </p>

          <div className="mt-8 flex w-full justify-center">
            <OtpInput
              key="otp-modal-input"
              value={auth.otp}
              onChange={auth.setOtp}
              length={6}
              mask={false}
              invalid={auth.state === "error"}
              autoFocus={true}
            />
          </div>

          <InlineError message={auth.state === "error" && "That code isn’t right or has expired. Request a new one below."} className="mt-4" />

          <AlertToast when={auth.state === "resent"} kind="success" message={`A new 6-digit code has been sent to ${phone}.`} />

          <div className="mt-7 w-full">
            <OtpHelp resend={auth.resend} onResend={auth.requestResend} />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!auth.complete} loading={submitting}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
