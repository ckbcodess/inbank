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
  length?: number;
  mask?: boolean;
  /** Fires once all boxes are filled, so the customer never hunts for a button. */
  onComplete?: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

export default function OtpInput({
  value,
  onChange,
  length = OTP_LENGTH,
  mask = false,
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
    if (code.length === length && next.every(Boolean)) onComplete?.(code);
  }

  function setDigit(index: number, raw: string) {
    const incoming = raw.replace(/\D/g, "");
    const next = [...value];

    if (!incoming) {
      next[index] = "";
      onChange(next);
      return;
    }

    for (let i = 0; i < incoming.length && index + i < length; i++) {
      next[index + i] = incoming[i];
    }
    commit(next, Math.min(index + incoming.length, length - 1));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    const next = Array<string>(length).fill("");
    pasted.split("").forEach((c, i) => (next[i] = c));
    commit(next, Math.min(pasted.length, length - 1));
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => {
        const showSeparator = length === 6 && i === 3;
        return (
          <div key={i} className="flex items-center">
            {showSeparator && (
              <span className="mx-1 sm:mx-1.5 text-muted-foreground/40 font-light select-none text-[16px]">
                –
              </span>
            )}
            <input
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type={mask ? "password" : "text"}
              inputMode="numeric"
              maxLength={1}
              autoComplete={mask ? "current-password" : "one-time-code"}
              value={value[i] ?? ""}
              autoFocus={autoFocus && i === 0}
              disabled={disabled}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={mask ? `PIN Digit ${i + 1} of ${length}` : `Digit ${i + 1} of ${length}`}
              aria-invalid={invalid || undefined}
              className={`numorainput size-11 sm:size-12 rounded-xl border bg-background text-center text-[19px] sm:text-[20px] font-medium tracking-tight text-foreground outline-none transition-all tabular focus:border-ring focus:ring-3 focus:ring-ring/40 disabled:opacity-60 dark:bg-white/[0.07] dark:border-white/[0.12] ${
                invalid ? "border-destructive bg-destructive/5 dark:border-destructive/50" : "border-input"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
