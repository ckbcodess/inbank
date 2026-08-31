"use client";

/**
 * One-time-code authorisation, shared by every surface that issues a payment.
 *
 * The rule this exists to enforce: nothing that moves money — now or on a
 * schedule — commits without a code. Keeping the state machine in one hook is
 * deliberate. The send flow and the standing-instruction dialog present it
 * differently (a wizard step vs. a modal gate), but they must not drift on the
 * things that matter: what counts as a valid code, how long the resend cooldown
 * is, and the fact that a wrong code clears the boxes without sending anything.
 */

import { useEffect, useState } from "react";
import { OTP_LENGTH } from "@/components/auth/OtpInput";

/** Cooldown before a new one-time code can be requested — matches the MFA screen. */
export const RESEND_SECONDS = 30;

/**
 * The number the payment code is sent to. A real build reads the customer's
 * registered mobile from their profile and masks it server-side; changing it is
 * deliberately a Settings journey with its own step-up, never part of a payment.
 */
export const REGISTERED_PHONE = "0244 ••• 821";

export type AuthState = "entry" | "error" | "resent";

const blank = () => Array<string>(OTP_LENGTH).fill("");

export function useAuthorisation() {
  const [otp, setOtpState] = useState<string[]>(blank);
  const [state, setState] = useState<AuthState>("entry");
  const [resend, setResend] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resend <= 0) return;
    const t = window.setTimeout(() => setResend((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resend]);

  const complete = otp.join("").length === OTP_LENGTH && otp.every(Boolean);

  /** Typing clears a previous error so the message never contradicts the boxes. */
  const setOtp = (next: string[]) => {
    setOtpState(next);
    setState((s) => (s === "entry" ? s : "entry"));
  };

  const reset = () => {
    setOtpState(blank());
    setState("entry");
    setResend(RESEND_SECONDS);
  };

  const requestResend = () => {
    setResend(RESEND_SECONDS);
    setState("resent");
  };

  /**
   * Returns true only when the code is accepted — the caller commits on true and
   * does nothing on false. 000000 demonstrates the wrong-code path, matching the
   * sign-in MFA screen's contract.
   */
  const verify = (): boolean => {
    if (!complete) return false;
    if (otp.join("") === "000000") {
      setState("error");
      setOtpState(blank());
      return false;
    }
    return true;
  };

  return { otp, setOtp, state, resend, complete, reset, requestResend, verify };
}
