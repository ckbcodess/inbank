"use client";

/**
 * Transaction authorisation, in one place for every flow that moves money (Send & Pay, standing orders, Add Money,
 * card requests). There is no transaction PIN: every transaction is approved with a 6-digit one-time code sent by
 * SMS, or read off the phone with a shortcode (see `OtpHelp`).

 */

import { AlertToast } from "@/components/ui/alert-toast";
import { InlineError } from "@/components/ui/inline-error";
import React, { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [, setSubmitting] = useState(false);

  // A fresh code every time the modal opens.
  useEffect(() => {
    if (open) {
      auth.reset();
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Goes through as soon as the last digit lands. CONSTITUTION §2 says a payment code should wait for a tap: see WORKING_LOG.
  const handleOtpComplete = (code?: string | string[]) => {
    const raw = Array.isArray(code) ? code.join("") : code || auth.otp.join("");
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

        <div className="flex flex-col items-center justify-center px-6 py-10 text-center sm:py-12">
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
              onComplete={handleOtpComplete}
            />
          </div>

          <InlineError message={auth.state === "error" && "That code isn’t right or has expired. Request a new one below."} className="mt-4" />

          <AlertToast when={auth.state === "resent"} kind="success" message={`A new 6-digit code has been sent to ${phone}.`} />

          <div className="mt-7 w-full">
            <OtpHelp resend={auth.resend} onResend={auth.requestResend} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
