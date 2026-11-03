/**
 * A short buzz for the few moments that deserve one. Android Chrome only: iOS Safari has no web vibration API, so
 * iPhones simply feel nothing (no fallback, no error). Touch screens only, so a laptop never tries.
 *
 * Money stays quiet: one small pulse when a payment lands, a double pulse for a wrong code, a hair of feedback for a
 * switch. Never on a button press, never for a balance, never repeating.
 */
const PATTERNS = {
  tap: 8,
  success: 18,
  error: [28, 48, 28],
} as const;

export type Haptic = keyof typeof PATTERNS;

export function haptic(kind: Haptic): void {
  if (typeof window === "undefined" || typeof navigator.vibrate !== "function") return;
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  try {
    navigator.vibrate(PATTERNS[kind] as number | number[]);
  } catch {
    // Some browsers refuse until the page has had a tap; nothing to do.
  }
}
