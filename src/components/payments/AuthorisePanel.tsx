"use client";

/**
 * Transaction Authorisation Panel.
 * Default: 4-digit Transaction PIN created during onboarding.
 * Secondary Option: 6-digit SMS / Email OTP request.
 */

import { AlertCircle, ShieldCheck, KeyRound, Smartphone } from "lucide-react";
import OtpInput from "@/components/auth/OtpInput";
import { REGISTERED_PHONE, type AuthMethod, type AuthState, PIN_LENGTH } from "./useAuthorisation";

interface AuthorisePanelProps {
  /** What the customer is approving (optional if rendered in parent review card) */
  summary?: React.ReactNode;
  method?: AuthMethod;
  onMethodChange?: (method: AuthMethod) => void;
  pin?: string[];
  onPinChange?: (next: string[]) => void;
  otp: string[];
  onOtpChange: (next: string[]) => void;
  state: AuthState;
  resend: number;
  onResend: () => void;
  autoFocus?: boolean;
}

export function AuthorisePanel({
  summary,
  method = "pin",
  onMethodChange,
  pin = Array(PIN_LENGTH).fill(""),
  onPinChange,
  otp,
  onOtpChange,
  state,
  resend,
  onResend,
  autoFocus = true,
}: AuthorisePanelProps) {
  const isPin = method === "pin";

  return (
    <div className="flex flex-col gap-5">
      {summary}

      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="text-[15.5px] font-medium text-foreground">
          {isPin ? "Enter Transaction PIN" : "Enter OTP Verification Code"}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {isPin
            ? "Enter your 4-digit transaction PIN created during onboarding"
            : `A 6-digit one-time code was sent to ${REGISTERED_PHONE}`}
        </span>
      </div>

      {isPin ? (
        <OtpInput
          key="pin-input"
          value={pin}
          onChange={onPinChange || onOtpChange}
          length={4}
          mask={true}
          invalid={state === "error"}
          autoFocus={autoFocus}
        />
      ) : (
        <OtpInput
          key="otp-input"
          value={otp}
          onChange={onOtpChange}
          length={6}
          mask={false}
          invalid={state === "error"}
          autoFocus={autoFocus}
        />
      )}

      {state === "error" && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-[13px] text-destructive animate-in fade-in duration-150"
        >
          <AlertCircle size={15} strokeWidth={1.9} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {isPin
              ? "The PIN entered is incorrect. Please try again."
              : "That code isn't right or has expired. Request a new one below."}
          </span>
        </p>
      )}

      {state === "resent" && (
        <p className="rounded-xl bg-muted p-2.5 text-center text-[13px] text-muted-foreground animate-in fade-in duration-150">
          A new 6-digit code has been sent to {REGISTERED_PHONE}.
        </p>
      )}

      {/* Alternative authentication option & resend affordance */}
      <div className="flex flex-col items-center gap-2.5 pt-1">
        {!isPin && (
          <button
            type="button"
            disabled={resend > 0}
            onClick={onResend}
            className="text-[13px] text-primary font-medium hover:underline disabled:text-muted-foreground disabled:no-underline cursor-pointer"
          >
            {resend > 0 ? (
              <>
                Resend code in <span className="tabular font-medium">{resend}s</span>
              </>
            ) : (
              "Resend SMS Code"
            )}
          </button>
        )}

        {onMethodChange && (
          <button
            type="button"
            onClick={() => onMethodChange(isPin ? "otp" : "pin")}
            className="flex items-center gap-1.5 text-[13px] text-primary hover:underline font-medium cursor-pointer"
          >
            {isPin ? (
              <>
                <Smartphone size={14} strokeWidth={1.8} />
                <span>Request OTP via SMS instead</span>
              </>
            ) : (
              <>
                <KeyRound size={14} strokeWidth={1.8} />
                <span>Use 4-digit Transaction PIN instead</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 pt-1 text-[12px] text-muted-foreground">
        <ShieldCheck size={14} strokeWidth={1.8} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>Secured by End-to-End Encryption · Never share your PIN or OTP</span>
      </div>
    </div>
  );
}
