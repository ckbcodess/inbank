"use client";

/**
 * Device checks at sign-in. There is no "remember this device" any more: every log-in from a browser that isn't the
 * customer's usual one goes through the verification step (a selfie, then a one-time code, `/mfa`). Nothing here is
 * stored as trust, so there is no trusted browser to skip that step.
 *
 * Prototype only: a real bank decides "new device" from a device key held server-side.
 */

/** What this browser is, read from the browser itself. */
export function thisDeviceName(): string {
  if (typeof navigator === "undefined") return "This browser";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone" : /Linux/.test(ua) ? "Linux" : "this computer";
  return `${browser} on ${os}`;
}

/* ── New-device sign-in notice ─────────────────────────────────────────────────
   Set when a login completes on a browser that isn't trusted; the customer shell shows it once on arrival. */

const NEW_DEVICE_KEY = "nibs-new-device-signin";

export function setNewDeviceSignIn(device: string) {
  try {
    localStorage.setItem(NEW_DEVICE_KEY, device);
  } catch {
    // Storage blocked — the notice is skipped, nothing else changes.
  }
}

/** Returns the pending notice's device and clears it, so it shows once. */
export function takeNewDeviceSignIn(): string | null {
  try {
    const device = localStorage.getItem(NEW_DEVICE_KEY);
    localStorage.removeItem(NEW_DEVICE_KEY);
    return device;
  } catch {
    return null;
  }
}

/* ── First-run welcome ──────────────────────────────────────────────────────
   Set when onboarding finishes; the dashboard shows the matching welcome once. */

export type FirstRunKind = "new" | "migrated";
const FIRST_RUN_KEY = "nibs-first-run";

export function setFirstRun(kind: FirstRunKind) {
  try {
    localStorage.setItem(FIRST_RUN_KEY, kind);
  } catch {
    // Storage blocked — no welcome, nothing lost.
  }
}

/** The pending welcome, if any. It stays pending until `clearFirstRun` (i.e. until it's dismissed). */
export function peekFirstRun(): FirstRunKind | null {
  try {
    const kind = localStorage.getItem(FIRST_RUN_KEY);
    return kind === "new" || kind === "migrated" ? kind : null;
  } catch {
    return null;
  }
}

export function clearFirstRun() {
  try {
    localStorage.removeItem(FIRST_RUN_KEY);
  } catch {
    // Storage blocked — nothing to clear.
  }
}

/* ── Post-onboarding pending modals (over blurred dashboard) ─────────────── */

export interface PendingFundingSource {
  type: "momo" | "card";
  operator?: string;
  momoNumber?: string;
  cardNumber?: string;
}

const PENDING_SOURCE_KEY = "nibs-pending-source";
const PENDING_REFERRAL_KEY = "nibs-pending-referral";
const PENDING_FUND_KEY = "nibs-pending-fund";

export function setPendingFundingSource(source: PendingFundingSource | null) {
  try {
    if (source) localStorage.setItem(PENDING_SOURCE_KEY, JSON.stringify(source));
    else localStorage.removeItem(PENDING_SOURCE_KEY);
  } catch {
    // Storage blocked.
  }
}

export function peekPendingFundingSource(): PendingFundingSource | null {
  try {
    const raw = localStorage.getItem(PENDING_SOURCE_KEY);
    return raw ? (JSON.parse(raw) as PendingFundingSource) : null;
  } catch {
    return null;
  }
}

export function clearPendingFundingSource() {
  try {
    localStorage.removeItem(PENDING_SOURCE_KEY);
  } catch {
    // Storage blocked.
  }
}

export function setPendingReferral(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(PENDING_REFERRAL_KEY, "true");
    else localStorage.removeItem(PENDING_REFERRAL_KEY);
  } catch {
    // Storage blocked.
  }
}

export function peekPendingReferral(): boolean {
  try {
    return localStorage.getItem(PENDING_REFERRAL_KEY) === "true";
  } catch {
    return false;
  }
}

export function clearPendingReferral() {
  try {
    localStorage.removeItem(PENDING_REFERRAL_KEY);
  } catch {
    // Storage blocked.
  }
}

/* ── Post-onboarding unfunded state & nudge ───────────────────────────────── */

const SKIPPED_FUNDING_KEY = "nibs-skipped-funding";

export function setHasSkippedFunding(skipped: boolean) {
  try {
    if (skipped) localStorage.setItem(SKIPPED_FUNDING_KEY, "true");
    else localStorage.removeItem(SKIPPED_FUNDING_KEY);
  } catch {
    // Storage blocked.
  }
}

export function peekHasSkippedFunding(): boolean {
  try {
    return localStorage.getItem(SKIPPED_FUNDING_KEY) === "true";
  } catch {
    return false;
  }
}

export function clearHasSkippedFunding() {
  try {
    localStorage.removeItem(SKIPPED_FUNDING_KEY);
  } catch {
    // Storage blocked.
  }
}

/* ── First deposit, offered right after the referral code (new-to-GCB only) ── */

export function setPendingFundPrompt(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(PENDING_FUND_KEY, "true");
    else localStorage.removeItem(PENDING_FUND_KEY);
  } catch {
    // Storage blocked.
  }
}

export function peekPendingFundPrompt(): boolean {
  try {
    return localStorage.getItem(PENDING_FUND_KEY) === "true";
  } catch {
    return false;
  }
}

export function clearPendingFundPrompt() {
  setPendingFundPrompt(false);
}

/* ── The mobile number confirmed during sign-up ─────────────────────────────
   Used as the pre-filled wallet number when funding: using it needs no new code,
   anything else has to be confirmed by SMS first. Local form, e.g. "0241234567". */

const VERIFIED_MOBILE_KEY = "nibs-verified-mobile";

export function setVerifiedMobile(local: string) {
  try {
    localStorage.setItem(VERIFIED_MOBILE_KEY, local);
  } catch {
    // Storage blocked.
  }
}

export function peekVerifiedMobile(): string | undefined {
  try {
    return localStorage.getItem(VERIFIED_MOBILE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
