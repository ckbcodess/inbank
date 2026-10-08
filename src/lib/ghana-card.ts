/**
 * Ghana Card number: "GHA-" + nine digits + "-" + one check digit, e.g. GHA-123456789-0.
 * The field takes digits only; the prefix and dashes are put in as the person types.
 */
export const GHANA_CARD_PLACEHOLDER = "GHA-000000000-0";
const BODY_DIGITS = 9;
const CHECK_DIGITS = 1;

/** Digits only, without the "GHA" prefix, capped at what a card has. */
function cardDigits(raw: string): string {
  return raw.replace(/^\s*GHA/i, "").replace(/\D/g, "").slice(0, BODY_DIGITS + CHECK_DIGITS);
}

/** "123456789012" is cut to ten digits and shown as "GHA-123456789-0". Empty stays empty. */
export function formatGhanaCard(raw: string): string {
  const d = cardDigits(raw);
  if (!d) return "";
  const body = d.slice(0, BODY_DIGITS);
  const check = d.slice(BODY_DIGITS);
  return check ? `GHA-${body}-${check}` : `GHA-${body}`;
}

export function isCompleteGhanaCard(raw: string): boolean {
  return cardDigits(raw).length === BODY_DIGITS + CHECK_DIGITS;
}
