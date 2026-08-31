"use client";

/**
 * Six-box one-time code input, lifted out of the MFA screen so activation and
 * step-up verification enter a code the same way rather than each inventing it.
 *
 * Two behaviours worth keeping: there is intentionally no `maxLength` (a capped
 * input silently drops characters typed before focus advances — the overflow is
 * spilled into the following boxes instead), and a paste of the whole code
 * fills every box at once.
 */

import { useRef } from "react";

export const OTP_LENGTH = 6;

interface OtpInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Fires once all six boxes are filled, so the customer never hunts for a button. */
  onComplete?: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

export default function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  function commit(next: string[], focusIndex: number) {
    onChange(next);
    inputsRef.current[focusIndex]?.focus();
    const code = next.join("");
    if (code.length === OTP_LENGTH && next.every(Boolean)) onComplete?.(code);
  }

  function setDigit(index: number, raw: string) {
    const incoming = raw.replace(/\D/g, "");
    const next = [...value];

    if (!incoming) {
      next[index] = "";
      onChange(next);
      return;
    }

    for (let i = 0; i < incoming.length && index + i < OTP_LENGTH; i++) {
      next[index + i] = incoming[i];
    }
    commit(next, Math.min(index + incoming.length, OTP_LENGTH - 1));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array<string>(OTP_LENGTH).fill("");
    pasted.split("").forEach((c, i) => (next[i] = c));
    commit(next, Math.min(pasted.length, OTP_LENGTH - 1));
  }

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value[i] ?? ""}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          className={`size-12 rounded-xl border bg-background text-center text-[18px] text-foreground outline-none transition-all tabular focus:border-ring focus:ring-3 focus:ring-ring/40 disabled:opacity-60 ${
            invalid ? "border-destructive" : "border-border"
          }`}
        />
      ))}
    </div>
  );
}
