"use client";

/**
 * Transaction Authorisation Panel.
 * Matches Figma Node 1255:30721 / 1255:30842:
 * - Centered 48x48 Lock SVG
 * - "Enter PIN" heading
 * - 4 circular 56px indicator dots (56x56 px, 32px gap)
 * - Automatic confirmation on 4th digit
 * - "Request OTP via SMS instead" secondary action
 * - Fallback / secondary 6-digit OTP view with resend timer and a shortcode option
 * - Backward-compatible compact variant for inline forms
 */

import { AlertToast } from "@/components/ui/alert-toast";
import { InlineError } from "@/components/ui/inline-error";
import React, { useRef, useEffect, useState } from "react";
import { ShieldCheck, KeyRound, Smartphone } from "lucide-react";
import OtpInput from "@/components/auth/OtpInput";
import { REGISTERED_PHONE, type AuthMethod, type AuthState, PIN_LENGTH } from "./useAuthorisation";
import { OtpHelp, OtpPrompt } from "./OtpHelp";
import { cn } from "@/lib/utils";

export interface AuthorisePanelProps {
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
  onComplete?: (code?: string | string[]) => void;
  variant?: "fullscreen" | "compact";
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
  onComplete,
  variant = "fullscreen",
}: AuthorisePanelProps) {
  const isPin = method === "pin";
  const [shortcodeOpen, setShortcodeOpen] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the invisible PIN input when in PIN mode
  useEffect(() => {
    if (autoFocus && isPin && variant === "fullscreen") {
      pinInputRef.current?.focus();
    }
  }, [autoFocus, isPin, variant, method]);

  // When error state occurs, clear the input value and refocus
  useEffect(() => {
    if (state === "error") {
      if (pinInputRef.current) {
        pinInputRef.current.value = "";
        pinInputRef.current.focus();
      }
    }
  }, [state]);

  const handleContainerClick = () => {
    pinInputRef.current?.focus();
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    const nextPin = Array(PIN_LENGTH).fill("");
    for (let i = 0; i < raw.length; i++) {
      nextPin[i] = raw[i];
    }
    if (onPinChange) {
      onPinChange(nextPin);
    } else {
      onOtpChange(nextPin);
    }

    if (raw.length === PIN_LENGTH) {
      window.setTimeout(() => {
        onComplete?.(raw);
      }, 150);
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && pin.join("").length === PIN_LENGTH) {
      onComplete?.(pin.join(""));
    }
  };

  // =========================================================================
  // Compact Variant (used by inline multi-step views like Standing Orders)
  // =========================================================================
  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-5">
        {summary}

        {isPin ? (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-[15.5px] font-medium text-foreground">Enter Transaction PIN</span>
            <span className="text-[13px] text-muted-foreground">Enter your 4-digit transaction PIN created during onboarding</span>
          </div>
        ) : (
          <OtpPrompt
            as="span"
            open={shortcodeOpen}
            title="Enter OTP Verification Code"
            description={`A 6-digit one-time code was sent to ${REGISTERED_PHONE}`}
            titleClass="text-[15.5px] font-medium text-foreground"
            descClass="mt-1.5 text-[13px] text-muted-foreground"
          />
        )}

        {isPin ? (
          <OtpInput
            key="pin-input-compact"
            value={pin}
            onChange={onPinChange || onOtpChange}
            length={PIN_LENGTH}
            mask={true}
            invalid={state === "error"}
            autoFocus={autoFocus}
            onComplete={() => {
              window.setTimeout(() => {
                onComplete?.();
              }, 150);
            }}
          />
        ) : (
          <OtpInput
            key="otp-input-compact"
            value={otp}
            onChange={onOtpChange}
            length={6}
            mask={false}
            invalid={state === "error"}
            autoFocus={autoFocus}
            onComplete={() => {
              window.setTimeout(() => {
                onComplete?.();
              }, 150);
            }}
          />
        )}

        <InlineError message={state === "error" && (isPin ? "That PIN is incorrect. Please try again." : "That code isn’t right or has expired. Request a new one below.")} />

        <AlertToast when={state === "resent"} kind="success" message={`A new 6-digit code has been sent to ${REGISTERED_PHONE}.`} />

        {/* Alternative authentication option & resend affordance */}
        <div className="flex flex-col items-center gap-2.5 pt-1">
          {!isPin && <OtpHelp resend={resend} onResend={onResend} shortcodeOpen={shortcodeOpen} onShortcodeOpenChange={setShortcodeOpen} />}

          {onMethodChange && (
            <button
              type="button"
              onClick={() => onMethodChange(isPin ? "otp" : "pin")}
              className="flex items-center gap-1.5 text-[13px] text-foreground hover:underline font-medium cursor-pointer"
            >
              {isPin ? (
                <>
                  <Smartphone size={14} strokeWidth={1.8} />
                  <span>Request OTP via SMS instead</span>
                </>
              ) : (
                <>
                  <KeyRound size={14} strokeWidth={1.8} />
                  <span>Use 6-digit Transaction PIN instead</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 pt-1 text-[12px] text-muted-foreground">
          <ShieldCheck size={14} strokeWidth={1.8} className="shrink-0 text-success-text" />
          <span>Secured by End-to-End Encryption · Never share your PIN or OTP</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Fullscreen Figma Node 1255:30721 / 1255:30842 Variant
  // =========================================================================
  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center text-center">
      {isPin ? (
        <>
          {/* Lock Icon matching Figma Vector */}
          <div className="flex items-center justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-foreground dark:text-white"
              aria-hidden="true"
            >
              <path
                d="M36 17H34V13C34 7.48 29.52 3 24 3C18.48 3 14 7.48 14 13V17H12C9.8 17 8 18.8 8 21V41C8 43.2 9.8 45 12 45H36C38.2 45 40 43.2 40 41V21C40 18.8 38.2 17 36 17ZM24 35C21.8 35 20 33.2 20 31C20 28.8 21.8 27 24 27C26.2 27 28 28.8 28 31C28 33.2 26.2 35 24 35ZM30.2 17H17.8V13C17.8 9.58 20.58 6.8 24 6.8C27.42 6.8 30.2 9.58 30.2 13V17Z"
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Heading */}
          <h2 className="mt-6 text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
            Enter your 4-digit PIN to authorise
          </h2>

          {/* 4 Circular PIN Indicators */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleContainerClick}
            className={cn(
              "relative mt-16 flex items-center justify-center gap-8 cursor-pointer select-none py-2 focus:outline-none",
              state === "error" && "animate-pin-shake"
            )}
            aria-label="Enter 4-digit PIN indicator"
          >
            {/* Invisible real numeric input positioned for mobile & keyboard input */}
            <input
              ref={pinInputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PIN_LENGTH}
              value={pin.join("")}
              onChange={handlePinChange}
              onKeyDown={handlePinKeyDown}
              autoFocus={autoFocus}
              autoComplete="one-time-code"
              className="numorainput absolute inset-0 size-full opacity-0 cursor-pointer pointer-events-auto"
              aria-label="Enter 4-digit transaction PIN"
            />

            {Array.from({ length: PIN_LENGTH }, (_, i) => {
              const isFilled = Boolean(pin[i]);
              return (
                <div
                  key={i}
                  className={cn(
                    "size-14 rounded-full transition duration-150 flex items-center justify-center",
                    state === "error"
                      ? "border-2 border-destructive/70 bg-destructive/10 dark:bg-destructive/15"
                      : isFilled
                      ? "bg-foreground dark:bg-white scale-100 shadow-xs"
                      : "bg-tile border border-border dark:bg-[var(--tile)] dark:border-transparent"
                  )}
                />
              );
            })}
          </div>

          {/* Error Message */}
          <InlineError message={state === "error" && "That PIN is incorrect. Please try again."} />

          {/* Bottom Switch to OTP Action */}
          {onMethodChange && (
            <div className="mt-20 flex items-center justify-center">
              <button
                type="button"
                onClick={() => onMethodChange("otp")}
                className="group flex items-center justify-center gap-2 text-[13.5px] font-normal sm:font-medium text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors cursor-pointer"
              >
                {/* 14x14 Phone Icon matching Figma Vector */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0 text-muted-foreground group-hover:text-foreground dark:group-hover:text-white transition-colors"
                  aria-hidden="true"
                >
                  <path
                    d="M9.91667 1.16667H4.08333C3.439 1.16667 2.91667 1.689 2.91667 2.33333V11.6667C2.91667 12.311 3.439 12.8333 4.08333 12.8333H9.91667C10.561 12.8333 11.0833 12.311 11.0833 11.6667V2.33333C11.0833 1.689 10.561 1.16667 9.91667 1.16667Z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 10.5H7.00583"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Request OTP via SMS instead</span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* OTP View */
        <>
          <div className="flex items-center justify-center text-foreground dark:text-white">
            <Smartphone size={44} strokeWidth={1.8} />
          </div>

          <OtpPrompt
            open={shortcodeOpen}
            title="Enter OTP Verification Code"
            description={
              <>
                A 6-digit one-time code was sent to{" "}
                <span className="font-medium text-foreground tabular whitespace-nowrap">{REGISTERED_PHONE}</span>
              </>
            }
            titleClass="mt-6 text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground"
            descClass="mt-2 text-[13.5px] text-muted-foreground max-w-xs"
          />

          <div className="mt-10 flex justify-center w-full">
            <OtpInput
              key="otp-fullscreen"
              value={otp}
              onChange={onOtpChange}
              length={6}
              mask={false}
              invalid={state === "error"}
              autoFocus={autoFocus}
              onComplete={() => {
                window.setTimeout(() => {
                  onComplete?.();
                }, 150);
              }}
            />
          </div>

          <InlineError message={state === "error" && "That code isn’t right or has expired. Request a new one below."} />

          <AlertToast when={state === "resent"} kind="success" message={`A new 6-digit code has been sent to ${REGISTERED_PHONE}.`} />

          <div className="mt-8 flex flex-col items-center gap-3">
            <OtpHelp resend={resend} onResend={onResend} shortcodeOpen={shortcodeOpen} onShortcodeOpenChange={setShortcodeOpen} />

            {onMethodChange && (
              <button
                type="button"
                onClick={() => onMethodChange("pin")}
                className="mt-2 flex items-center justify-center gap-2 text-[13.5px] text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors cursor-pointer"
              >
                <KeyRound size={14} strokeWidth={1.8} />
                <span>Use 4-digit Transaction PIN instead</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

