"use client";

/**
 * Transaction Authorisation State Machine.
 * Default: 4-digit Transaction PIN created during customer onboarding.
 * Secondary / Alternative: 6-digit SMS / Email OTP.
 */

import { useEffect, useState } from "react";
import { OTP_LENGTH } from "@/components/auth/OtpInput";

export const PIN_LENGTH = 4;
export const RESEND_SECONDS = 30;
export const REGISTERED_PHONE = "0244 ••• 821";

export type AuthMethod = "pin" | "otp";
export type AuthState = "entry" | "error" | "resent";

const blankPin = () => Array<string>(PIN_LENGTH).fill("");
const blankOtp = () => Array<string>(OTP_LENGTH).fill("");

export function useAuthorisation() {
  const [method, setMethod] = useState<AuthMethod>("pin");
  const [pin, setPinState] = useState<string[]>(blankPin);
  const [otp, setOtpState] = useState<string[]>(blankOtp);
  const [state, setState] = useState<AuthState>("entry");
  const [resend, setResend] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resend <= 0) return;
    const t = window.setTimeout(() => setResend((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resend]);

  const complete =
    method === "pin"
      ? pin.join("").length === PIN_LENGTH && pin.every(Boolean)
      : otp.join("").length === OTP_LENGTH && otp.every(Boolean);

  const setPin = (next: string[]) => {
    setPinState(next);
    setState((s) => (s === "entry" ? s : "entry"));
  };

  const setOtp = (next: string[]) => {
    setOtpState(next);
    setState((s) => (s === "entry" ? s : "entry"));
  };

  const switchMethod = (newMethod: AuthMethod) => {
    setMethod(newMethod);
    setState("entry");
    if (newMethod === "otp" && resend === 0) {
      setResend(RESEND_SECONDS);
      setState("resent");
    }
  };

  const reset = () => {
    setPinState(blankPin());
    setOtpState(blankOtp());
    setMethod("pin");
    setState("entry");
    setResend(RESEND_SECONDS);
  };

  const requestResend = () => {
    setResend(RESEND_SECONDS);
    setState("resent");
  };

  const verify = (): boolean => {
    if (!complete) return false;
    if (method === "pin" && pin.join("") === "0000") {
      setState("error");
      setPinState(blankPin());
      return false;
    }
    if (method === "otp" && otp.join("") === "000000") {
      setState("error");
      setOtpState(blankOtp());
      return false;
    }
    return true;
  };

  return {
    method,
    setMethod: switchMethod,
    pin,
    setPin,
    otp,
    setOtp,
    state,
    resend,
    complete,
    reset,
    requestResend,
    verify,
  };
}
