"use client";

/**
 * Device trust — what makes a returning customer's sign-in fast.
 *
 * When someone ticks "Remember this device" after proving it's them (a one-time
 * code at sign-in, or finishing activation / migration), this browser remembers
 * who they are for TRUST_DAYS. Next time the login screen greets them by name,
 * offers passkey sign-in, and skips the one-time code. They can see and revoke
 * it in Settings, and "Not you?" on the login screen never signs anyone in.
 *
 * Prototype only: a real bank binds this to a device key held server-side.
 */

import { useSyncExternalStore } from "react";
import type { Actor } from "./roles";

export const TRUST_DAYS = 30;
const KEY = "nibs-trusted-device";

export interface TrustedDevice {
  actorId: string;
  name: string;
  email: string;
  /** ms epoch */
  trustedAt: number;
  /** ms epoch */
  until: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: TrustedDevice | null | undefined;

function read(): TrustedDevice | null {
  if (cache !== undefined) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as TrustedDevice) : null;
    cache = parsed && parsed.until > Date.now() ? parsed : null;
  } catch {
    cache = null;
  }
  return cache;
}

function write(value: TrustedDevice | null) {
  cache = value;
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked — trust lasts for this visit only.
  }
  listeners.forEach((l) => l());
}

export function trustThisDevice(actor: Actor) {
  const now = Date.now();
  write({ actorId: actor.id, name: actor.name, email: actor.email, trustedAt: now, until: now + TRUST_DAYS * 86_400_000 });
}

export function forgetThisDevice() {
  write(null);
}

export function getTrustedDevice(): TrustedDevice | null {
  return typeof window === "undefined" ? null : read();
}

/** The trusted identity on this device, or null. Null on the server and first client render. */
export function useTrustedDevice(): TrustedDevice | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => read(),
    () => null,
  );
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
const UNFUNDED_NUDGE_DISMISSED_KEY = "nibs-unfunded-nudge-dismissed";

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

export function setUnfundedNudgeDismissed(dismissed: boolean) {
  try {
    if (dismissed) localStorage.setItem(UNFUNDED_NUDGE_DISMISSED_KEY, "true");
    else localStorage.removeItem(UNFUNDED_NUDGE_DISMISSED_KEY);
  } catch {
    // Storage blocked.
  }
}

export function peekUnfundedNudgeDismissed(): boolean {
  try {
    return localStorage.getItem(UNFUNDED_NUDGE_DISMISSED_KEY) === "true";
  } catch {
    return false;
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
