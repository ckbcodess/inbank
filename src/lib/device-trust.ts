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
