/**
 * Primitives shared by every pre-authentication flow — sign in, activation,
 * and both signup paths. Pulled out of `activation.ts` once a second flow
 * needed the same masking and password rules, so a change to either can't
 * drift from the other by accident.
 */

/* ── Masking ───────────────────────────────────────────────────────────────── */

/**
 * Standardized Phone Number Masking:
 * Format: {country code} {identifier} {mask} {last 4 digits}
 * Examples:
 *   "0244123821"     → "+233 24 ∗∗∗ 3821"
 *   "+233571234564"  → "+233 57 ∗∗∗ 4564"
 *   "0241234567"     → "+233 24 ∗∗∗ 4567"
 *   "+447911123456"  → "+44 79 ∗∗∗ 3456"
 *
 * Uses the centered asterisk (∗, U+2217) so the mask stays vertically aligned
 * on the font midline, preventing the high-floating ASCII asterisk baseline issue.
 */
export function maskMobile(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.trim();
  const digits = cleaned.replace(/\D/g, "");

  if (digits.length < 7) return cleaned;

  // Ghana number with country code: 233XXXXXXXXX (12 digits)
  if (digits.startsWith("233") && digits.length >= 11) {
    const identifier = digits.slice(3, 5);
    const last4 = digits.slice(-4);
    return `+233 ${identifier} ∗∗∗ ${last4}`;
  }

  // Ghana 10-digit local format: 0XXXXXXXXX (e.g. 0244123821)
  if (digits.length === 10 && digits.startsWith("0")) {
    const identifier = digits.slice(1, 3);
    const last4 = digits.slice(-4);
    return `+233 ${identifier} ∗∗∗ ${last4}`;
  }

  // Ghana 9-digit local without leading 0: XXXXXXXXX (e.g. 244123821)
  if (digits.length === 9) {
    const identifier = digits.slice(0, 2);
    const last4 = digits.slice(-4);
    return `+233 ${identifier} ∗∗∗ ${last4}`;
  }

  // International foreign numbers (e.g. +44 79... or +1 415...)
  if (cleaned.startsWith("+")) {
    const last4 = digits.slice(-4);
    const countryPrefix = cleaned.match(/^\+(\d{1,3})/)?.[1] ?? digits.slice(0, 2);
    const rest = digits.slice(countryPrefix.length);
    const identifier = rest.slice(0, 2);
    return `+${countryPrefix} ${identifier} ∗∗∗ ${last4}`;
  }

  // Default fallback for any other number
  const last4 = digits.slice(-4);
  const identifier = digits.slice(0, 2);
  return `+233 ${identifier} ∗∗∗ ${last4}`;
}

/** "ransford.gyasi@example.com" → "am•••••@example.com" — mirrors the MFA screen. */
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
  { id: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
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
