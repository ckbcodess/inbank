"use client";

/**
 * Under the one-time-code boxes, one quiet line of help: wait for the SMS (resend when the timer ends) or get the
 * code by shortcode instead. The shortcode opens inline on tap, so the screen stays calm for everyone who got the
 * text. Opened, it is just the instruction: Dial, the shortcode, to see your code.
 *
 * Where the screen has a heading above the boxes, pass `shortcodeOpen` / `onShortcodeOpenChange` and render
 * `OtpPrompt` there: the shortcode then takes the heading's place instead of opening underneath it.
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { OTP_SHORTCODE } from "./useAuthorisation";

/**
 * The heading above the code boxes, which the shortcode replaces in the same spot. Both sit in one grid cell, so the
 * space never changes size, the title keeps its type size and the description keeps its line, and they cross-fade.
 */
export function OtpPrompt({
  open,
  title,
  description,
  titleClass,
  descClass,
  as: Title = "h2",
}: {
  open: boolean;
  title: React.ReactNode;
  description: React.ReactNode;
  titleClass: string;
  descClass: string;
  as?: "h2" | "span";
}) {
  const layer = "col-start-1 row-start-1 flex flex-col items-center transition-[opacity,transform,filter] duration-reveal ease-settle";
  const hidden = "pointer-events-none translate-y-1 opacity-0 blur-[2px]";
  return (
    <div className="grid w-full justify-items-center text-center">
      <div className={cn(layer, open && hidden)} aria-hidden={open} inert={open}>
        <Title className={titleClass}>{title}</Title>
        <p className={descClass}>{description}</p>
      </div>
      <div className={cn(layer, !open && hidden)} aria-hidden={!open} inert={!open}>
        <a href={`tel:${OTP_SHORTCODE.replace("#", "%23")}`} className={cn(titleClass, "tabular")}>
          {OTP_SHORTCODE}
        </a>
        <p className={descClass}>Dial it on your phone to see your code</p>
      </div>
    </div>
  );
}

export function OtpHelp({
  resend,
  onResend,
  className,
  shortcodeOpen,
  onShortcodeOpenChange,
}: {
  resend: number;
  onResend: () => void;
  className?: string;
  shortcodeOpen?: boolean;
  onShortcodeOpenChange?: (open: boolean) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const controlled = onShortcodeOpenChange !== undefined;
  const open = controlled ? !!shortcodeOpen : localOpen;
  const setOpen = (fn: (v: boolean) => boolean) => (controlled ? onShortcodeOpenChange(fn(open)) : setLocalOpen(fn(open)));

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

      {open && !controlled && (
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
