"use client";

/**
 * Under the one-time-code boxes, one quiet line of help: wait for the SMS (resend when the timer ends) or get the
 * code by shortcode instead. The shortcode opens inline on tap, so the screen stays calm for everyone who got the
 * text. Opened, it is just the instruction: Dial, the shortcode, to see your code.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { OTP_SHORTCODE } from "./useAuthorisation";

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
    <div className={cn("flex w-full flex-col items-center gap-4", className)}>
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
          {open ? "Hide shortcode" : "Use a shortcode"}
        </button>
      </div>

      {open && (
        <div className="flex w-full flex-col items-center gap-2.5 py-3 text-center animate-in fade-in duration-150">
          <span className="text-[18px] text-foreground">Dial</span>
          <a
            href={`tel:${OTP_SHORTCODE.replace("#", "%23")}`}
            className="tabular text-[36px] leading-none tracking-[-0.02em] text-foreground"
          >
            {OTP_SHORTCODE}
          </a>
          <span className="text-[16px] text-foreground">to see your code</span>
          <span aria-hidden="true" className="mt-1.5 h-0.5 w-5 rounded-full bg-primary" />
        </div>
      )}
    </div>
  );
}
