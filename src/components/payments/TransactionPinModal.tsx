"use client";

/**
 * Universal Transaction PIN & Authorization Modal.
 * Matches Figma Node 1277:23601 / 1277:23781:
 * - Rendered as a Modal Dialog across all transaction and payment flows.
 * - Header: "Authorization" with top-right close button.
 * - Body:
 *   • Centered Lock Icon
 *   • Heading: "Enter your 4-digit PIN to authorise"
 *   • 4 Circular PIN dot indicators (gap-7, size-6, filled vs empty)
 *   • Real keyboard & mobile numeric input support with auto-submit on 4th digit
 *   • Error shake animation and friendly warning
 *   • Secondary action: "Request OTP via SMS instead"
 *   • Seamless fallback to 6-digit SMS OTP with resend timer
 */

import React, { useRef, useEffect, useState } from "react";
import { Lock, Smartphone, KeyRound, AlertCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import OtpInput from "@/components/auth/OtpInput";
import {
  useAuthorisation,
  PIN_LENGTH,
  REGISTERED_PHONE,
} from "./useAuthorisation";
import { cn } from "@/lib/utils";

export interface TransactionPinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (code?: string) => void;
  title?: string;
  phone?: string;
}

export default function TransactionPinModal({
  open,
  onOpenChange,
  onSuccess,
  title = "Authorization",
  phone = REGISTERED_PHONE,
}: TransactionPinModalProps) {
  const auth = useAuthorisation();
  const pinInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  // Focus invisible PIN input when modal opens in PIN mode
  useEffect(() => {
    if (open) {
      auth.reset();
      setSubmitting(false);
      const timer = setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Refocus on error
  useEffect(() => {
    if (auth.state === "error" && pinInputRef.current) {
      pinInputRef.current.value = "";
      pinInputRef.current.focus();
    }
  }, [auth.state]);

  const handleContainerClick = () => {
    pinInputRef.current?.focus();
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    const nextPin = Array(PIN_LENGTH).fill("");
    for (let i = 0; i < raw.length; i++) {
      nextPin[i] = raw[i];
    }
    auth.setPin(nextPin);

    if (raw.length === PIN_LENGTH) {
      if (raw === "000000" || raw === "0000") {
        auth.verify(raw);
        return;
      }
      setSubmitting(true);
      window.setTimeout(() => {
        onOpenChange(false);
        onSuccess(raw);
        setSubmitting(false);
      }, 200);
    }
  };

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
      <DialogContent
        className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border border-border bg-card"
        showCloseButton={false}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <DialogTitle className="text-[17px] font-medium text-foreground tracking-[-0.01em]">
            {title}
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex flex-col items-center justify-center px-6 py-10 sm:py-12 text-center">
          {auth.method === "pin" ? (
            <>
              {/* Centered Lock Icon */}
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
                <Lock size={22} strokeWidth={1.9} />
              </div>

              {/* Heading */}
              <h2 className="mt-5 text-[22px] font-medium tracking-[-0.02em] text-foreground">
                Enter your 4-digit PIN to authorise
              </h2>

              {/* 4 Circular PIN Dot Indicators */}
              <div
                role="button"
                tabIndex={0}
                onClick={handleContainerClick}
                className={cn(
                  "relative mt-8 sm:mt-10 flex items-center justify-center gap-6 sm:gap-8 cursor-pointer select-none py-2 focus:outline-none",
                  auth.state === "error" && "animate-pin-shake"
                )}
                aria-label="Enter 4-digit PIN indicator"
              >
                {/* Hidden numeric input */}
                <input
                  ref={pinInputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={PIN_LENGTH}
                  value={auth.pin.join("")}
                  onChange={handlePinChange}
                  autoComplete="one-time-code"
                  disabled={submitting}
                  className="absolute inset-0 size-full opacity-0 cursor-pointer pointer-events-auto"
                  aria-label="Enter 4-digit transaction PIN"
                />

                {Array.from({ length: PIN_LENGTH }, (_, i) => {
                  const isFilled = Boolean(auth.pin[i]);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "size-5 sm:size-6 rounded-full transition-all duration-150 flex items-center justify-center",
                        auth.state === "error"
                          ? "border-2 border-destructive/70 bg-destructive/10"
                          : isFilled
                          ? "bg-foreground dark:bg-white scale-105 shadow-xs"
                          : "bg-muted/70 border border-border"
                      )}
                    />
                  );
                })}
              </div>

              {/* Error Message */}
              {auth.state === "error" && (
                <div
                  role="alert"
                  className="mt-4 flex flex-col items-center justify-center gap-1 text-center animate-in fade-in duration-150"
                >
                  <p className="flex items-center justify-center gap-1.5 text-[13px] text-destructive font-medium">
                    <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
                    <span>The PIN entered is incorrect. Please try again.</span>
                  </p>
                </div>
              )}

              {/* Secondary Switch to SMS OTP */}
              <div className="mt-10 sm:mt-12 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => auth.setMethod("otp")}
                  className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Smartphone size={14} strokeWidth={1.8} className="shrink-0" />
                  <span>Request OTP via SMS instead</span>
                </button>
              </div>
            </>
          ) : (
            /* OTP View */
            <>
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
                <Smartphone size={22} strokeWidth={1.9} />
              </div>

              <h2 className="mt-5 text-[22px] font-medium tracking-[-0.02em] text-foreground">
                Enter OTP Verification Code
              </h2>

              <p className="mt-2 text-[13px] text-muted-foreground max-w-xs">
                A 6-digit one-time code was sent to{" "}
                <span className="font-medium text-foreground tabular">{phone}</span>
              </p>

              <div className="mt-8 flex justify-center w-full">
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

              {auth.state === "error" && (
                <p
                  role="alert"
                  className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-destructive animate-in fade-in duration-150"
                >
                  <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
                  <span>That code isn&apos;t right or has expired. Request a new one below.</span>
                </p>
              )}

              {auth.state === "resent" && (
                <p className="mt-3 rounded-lg bg-muted px-3 py-1.5 text-center text-[12px] text-muted-foreground animate-in fade-in duration-150">
                  A new 6-digit code has been sent to {phone}.
                </p>
              )}

              <div className="mt-7 flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  disabled={auth.resend > 0}
                  onClick={auth.requestResend}
                  className="text-[13px] text-foreground hover:underline disabled:text-muted-foreground disabled:no-underline cursor-pointer"
                >
                  {auth.resend > 0 ? (
                    <>
                      Resend code in <span className="tabular font-medium">{auth.resend}s</span>
                    </>
                  ) : (
                    "Resend SMS Code"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => auth.setMethod("pin")}
                  className="mt-1 flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <KeyRound size={13} strokeWidth={1.8} />
                  <span>Use 4-digit Transaction PIN instead</span>
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
