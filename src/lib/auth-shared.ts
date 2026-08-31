/**
 * Primitives shared by every pre-authentication flow — sign in, activation,
 * and both signup paths. Pulled out of `activation.ts` once a second flow
 * needed the same masking and password rules, so a change to either can't
 * drift from the other by accident.
 */

/* ── Masking ───────────────────────────────────────────────────────────────── */

/** "+233241234567" → "+233 24 *** *567" — enough to recognise, not enough to reuse. */
export function maskMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return raw;
  const country = digits.slice(0, 3);
  const network = digits.slice(3, 5);
  const last = digits.slice(-3);
  return `+${country} ${network} *** *${last}`;
}

/** "ama.serwaa@example.com" → "am•••••@example.com" — mirrors the MFA screen. */
export function maskEmail(raw: string): string {
  return raw.replace(/(.{2}).*(@.*)/, "$1•••••$2");
}

/* ── Password rules ────────────────────────────────────────────────────────── */

export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

/** Mirrors the strength rules the Bank enforces server-side. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: "length", label: "At least 12 characters", test: (pw) => pw.length >= 12 },
  { id: "case", label: "Upper and lower case", test: (pw) => /[A-Z]/.test(pw) && /[a-z]/.test(pw) },
  { id: "number", label: "A number", test: (pw) => /\d/.test(pw) },
  { id: "symbol", label: "A symbol", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function passwordMeetsRules(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw));
}

/* ── Payment approval method ───────────────────────────────────────────────── */

export type ApprovalMethod = "sms" | "email" | "token";

export interface ApprovalOption {
  id: ApprovalMethod;
  label: (match: { maskedMobile: string; maskedEmail: string }) => string;
  description: string;
}

/**
 * The default is the channel the Bank already has on file and already just used
 * to verify them — the one that cannot fail for a reason they can't see. It is
 * pre-selected, and the escape is one tap away in Settings.
 */
export const APPROVAL_OPTIONS: readonly ApprovalOption[] = [
  {
    id: "sms",
    label: (m) => `Code by text to ${m.maskedMobile}`,
    description: "Recommended — the number we just verified.",
  },
  {
    id: "email",
    label: (m) => `Code by email to ${m.maskedEmail}`,
    description: "Useful if you travel without your Ghana SIM.",
  },
  {
    id: "token",
    label: () => "Soft token app",
    description: "Works with no signal. Takes about two minutes to set up.",
  },
];
