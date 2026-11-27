"use client";

import { useSyncExternalStore } from "react";

/**
 * True on a screen at least Tailwind's `lg` wide (1024px). The business request (/business/signup/enrol) uses it to
 * put its steps down the left on a desktop and keep the onboarding card on phones and narrow windows. False while
 * rendering on the server, so the card renders first.
 */
const WIDE = "(min-width: 1024px)";

function subscribe(listener: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

export function useWideScreen(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => false);
}
