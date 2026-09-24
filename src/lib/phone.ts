/**
 * Ghana mobile numbers — one normaliser for every phone field in the app.
 *
 * Whatever arrives (typed, pasted, autofilled or seeded) — "024 123 4567",
 * "0241234567", "+233 24 123 4567", "233241234567" — reduces to the nine
 * national digits after the trunk 0. Fields store the local form
 * ("0241234567") because network detection and name resolution key off it.
 */

export const GH_MOBILE_DIGITS = 9;

/** The nine national digits (or fewer while typing), never more. */
export function toNationalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  // Only strip the country code when it's unambiguous: an explicit "+233", or a
  // full international number. Otherwise a 10th typed digit would be misread.
  if (raw.trim().startsWith("+233") || (digits.startsWith("233") && digits.length >= 12)) {
    digits = digits.slice(3);
  }
  return digits.replace(/^0/, "").slice(0, GH_MOBILE_DIGITS);
}

/** Stored form: "0241234567", or "" when empty. */
export function toLocalMobile(raw: string): string {
  const national = toNationalDigits(raw);
  return national ? `0${national}` : "";
}

/** "241234567" → "24 123 4567", grouped progressively as it's typed. */
export function formatNationalMobile(raw: string): string {
  const d = toNationalDigits(raw);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5)].filter(Boolean).join(" ");
}

/** For read-only display: "+233 24 123 4567". */
export function displayGhanaMobile(raw: string): string {
  const formatted = formatNationalMobile(raw);
  return formatted ? `+233 ${formatted}` : "";
}

export function isCompleteGhanaMobile(raw: string): boolean {
  return toNationalDigits(raw).length === GH_MOBILE_DIGITS;
}
