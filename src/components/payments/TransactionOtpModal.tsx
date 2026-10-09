"use client";

/**
 * Transaction authorisation, in one place for every flow that moves money (Send & Pay, standing orders, Add Money,
 * card requests). There is no transaction PIN: every transaction is approved with a 6-digit one-time code sent by
 * SMS, or read off the phone with a shortcode (see `OtpHelp`). There is no Confirm button: the code is submitted
 * as soon as the sixth digit lands (designer's call, 2026-10-07).

 */

import { AlertToast } from "@/components/ui/alert-toast";
import { InlineError } from "@/components/ui/inline-error";
import React, { useEffect, useId, useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OtpInput from "@/components/auth/OtpInput";
import { AppLoader } from "@/components/ui/loader";
import { useAuthorisation, REGISTERED_PHONE } from "./useAuthorisation";
import { OtpHelp, OtpPrompt } from "./OtpHelp";
import { maskMobile } from "@/lib/auth-shared";

export interface TransactionOtpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (code?: string) => void;
  title?: string;
  phone?: string;
  isUssd?: boolean;
  amount?: string | number;
  /** What is being approved (amount, who, from where), restated above the code boxes so a bare code prompt can't be phished. */
  summary?: React.ReactNode;
}

export default function TransactionOtpModal({
  open,
  onOpenChange,
  onSuccess,
  title = "Authorization",
  phone = REGISTERED_PHONE,
  isUssd = false,
  amount,
  summary,
}: TransactionOtpModalProps) {
  const displayPhone = maskMobile(phone);
  const auth = useAuthorisation();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [shortcodeOpen, setShortcodeOpen] = useState(false);

  // USSD Auto-Approval simulation
  useEffect(() => {
    if (!open || !isUssd) return;
    const timer = window.setTimeout(() => {
      onOpenChange(false);
      onSuccess("USSD_APPROVED");
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [open, isUssd, onOpenChange, onSuccess]);

  // A fresh code every time the modal opens.
  useEffect(() => {
    if (open) {
      auth.reset();
      setSubmitting(false);
      setShortcodeOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const code = auth.otp.join("");

  // No Confirm button: the sixth digit submits.
  useEffect(() => {
    if (open && auth.complete) handleConfirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

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

  if (isUssd) {
    const formattedAmount =
      typeof amount === "number"
        ? amount.toFixed(2)
        : amount
        ? parseFloat(String(amount).replace(/[^0-9.]/g, "") || "0").toFixed(2)
        : null;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Approve on phone</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center text-center gap-4 px-6 py-8">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-foreground shadow-2xs">
              <Smartphone size={24} strokeWidth={1.8} />
            </div>
            <div className="flex flex-col gap-1">
              {formattedAmount && (
                <span className="tabular-nums text-[22px] font-semibold tracking-tight text-foreground">
                  GHS {formattedAmount}
                </span>
              )}
              <p className="text-[14px] text-muted-foreground">
                Enter your Mobile Money PIN on your phone to approve.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 text-[13px] text-muted-foreground">
              <AppLoader size={15} />
              <span>Waiting for approval…</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form id={formId} onSubmit={handleConfirm} className="flex flex-col items-center justify-center px-6 py-10 text-center sm:py-12">
          {summary && <div className="mb-8 w-full text-left">{summary}</div>}
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
            <Smartphone size={22} strokeWidth={1.9} />
          </div>

          <OtpPrompt
            open={shortcodeOpen}
            title="Enter OTP Verification Code"
            description={
              <>
                A 6-digit one-time code was sent to{" "}
                <span className="tabular whitespace-nowrap font-medium text-foreground">{displayPhone}</span>
              </>
            }
            titleClass="mt-5 text-[22px] font-medium tracking-[-0.02em] text-foreground"
            descClass="mt-2 max-w-xs text-[13px] text-muted-foreground"
          />

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

          <AlertToast when={auth.state === "resent"} kind="success" message={`A new 6-digit code has been sent to ${displayPhone}.`} />

          <div className="mt-7 w-full">
            <OtpHelp resend={auth.resend} onResend={auth.requestResend} shortcodeOpen={shortcodeOpen} onShortcodeOpenChange={setShortcodeOpen} />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
