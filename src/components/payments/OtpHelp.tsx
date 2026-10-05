"use client";

/**
 * Under the one-time-code boxes, one quiet line of help: wait for the SMS
 * (resend when the timer ends) or get the code by shortcode instead. The
 * shortcode opens inline on tap, so the screen stays calm for everyone who
 * got the text.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { OTP_SHORTCODE, REGISTERED_PHONE } from "./useAuthorisation";

export function OtpHelp({
  resend,
  onResend,
  className,
}: {
  resend: number;
  onResend: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("flex w-full flex-col items-center gap-3", className)}>
      <div className="flex flex-wrap items-center justify-center gap-x-2 text-[13px]">
        <button
          type="button"
          disabled={resend > 0}
          onClick={onResend}
          className="cursor-pointer text-foreground hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
        >
          {resend > 0 ? (
            <>
              Resend in <span className="tabular">{resend}s</span>
            </>
          ) : (
            "Resend code"
          )}
        </button>
        <span className="text-muted-foreground/60" aria-hidden="true">·</span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
        >
          Use a shortcode
        </button>
      </div>

      {open && (
        <div className="flex w-full max-w-xs flex-col gap-1.5 rounded-xl bg-muted/50 px-4 py-3.5 text-left">
          <span className="text-[13px] text-muted-foreground">
            From <span className="tabular whitespace-nowrap text-foreground">{REGISTERED_PHONE}</span>, dial
          </span>
          <a
            href={`tel:${OTP_SHORTCODE.replace("#", "%23")}`}
            className="tabular w-fit text-[20px] tracking-[-0.01em] text-foreground"
          >
            {OTP_SHORTCODE}
          </a>
          <span className="text-[12.5px] text-muted-foreground">
            Your code shows on your phone. Enter it above. No data needed.
          </span>
        </div>
      )}
    </div>
  );
}
