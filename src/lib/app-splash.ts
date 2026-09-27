"use client";

/**
 * The first-load splash's gate.
 *
 * The splash shows once per page load — the first time the app shell mounts
 * after sign-in or a full refresh — never on in-app navigation (the top
 * progress bar covers those). While it's up, screens can hand it things worth
 * waiting for, so the dashboard is revealed whole instead of assembling itself:
 * the shell waits for fonts plus anything registered with `holdSplash`, but
 * never less than MIN_MS (no flash) or more than MAX_MS (never hold someone's
 * balance hostage to a slow image).
 */

export const SPLASH_MIN_MS = 400;
export const SPLASH_MAX_MS = 2500;

// Module state: survives client-side navigation, resets on a full reload.
let booted = false;
const holds: Promise<unknown>[] = [];

export function isAppBooted(): boolean {
  return booted;
}

export function markAppBooted() {
  booted = true;
  holds.length = 0;
}

/** Ask the first-load splash to wait for `work` (ignored once the app has booted). */
export function holdSplash(work: Promise<unknown>) {
  if (!booted) holds.push(work);
}

/** Waits for an image to download and decode, so it paints on the first frame it's shown. */
export function decodeImage(src: string): Promise<void> {
  const img = new Image();
  img.src = src;
  return img.decode().catch(() => {});
}

/**
 * Resolves when fonts and every registered hold have settled. Waits two frames
 * first so screens mounting under the splash get to register their holds.
 */
export async function splashWorkSettled(): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  await Promise.allSettled([document.fonts?.ready, ...holds]);
}
