"use client";

/**
 * The shared body of an authorisation gate: what you're approving, the code
 * boxes, the error and resend affordances.
 *
 * `summary` is not optional by accident. A code screen that only says "enter
 * your code" is what makes one-time codes phishable — someone reads a text out
 * to a caller without ever seeing what they are approving. Restating the
 * payment on the same screen as the boxes is the cheapest fraud control there
 * is, so every caller has to supply it.
 */

import { AlertCircle, ShieldCheck } from "lucide-react";
import OtpInput from "@/components/auth/OtpInput";
import { REGISTERED_PHONE, type AuthState } from "./useAuthorisation";

interface AuthorisePanelProps {
  /** What the customer is approving — amount, payee, and what leaves the account. */
  summary: React.ReactNode;
  otp: string[];
  onOtpChange: (next: string[]) => void;
  state: AuthState;
  resend: number;
  onResend: () => void;
  autoFocus?: boolean;
}

export function AuthorisePanel({
  summary,
  otp,
  onOtpChange,
  state,
  resend,
  onResend,
  autoFocus = true,
}: AuthorisePanelProps) {
  return (
    <div className="flex flex-col gap-5">
      {summary}

      <OtpInput value={otp} onChange={onOtpChange} invalid={state === "error"} autoFocus={autoFocus} />

      {state === "error" && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
        >
          <AlertCircle size={15} strokeWidth={1.9} className="mt-px shrink-0" aria-hidden="true" />
          That code isn&apos;t right or has expired. Nothing has been sent — request a new one below.
        </p>
      )}

      {state === "resent" && (
        <p className="rounded-lg bg-muted px-3 py-2.5 text-center text-[13px] text-muted-foreground">
          A new code is on its way to {REGISTERED_PHONE}.
        </p>
      )}

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          disabled={resend > 0}
          onClick={onResend}
          className="text-[13px] text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {resend > 0 ? (
            <>
              Resend code in <span className="tabular">{resend}s</span>
            </>
          ) : (
            "Resend code"
          )}
        </button>
        <p className="text-[12px] text-muted-foreground">
          Enter any 6 digits to continue · use 000000 to see the error state
        </p>
      </div>

      <p className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
        <ShieldCheck size={14} strokeWidth={1.8} className="mt-px shrink-0" aria-hidden="true" />
        Nothing has left your account yet. We will never call you to ask for this code — if someone
        does, it is not us.
      </p>
    </div>
  );
}
