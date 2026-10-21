"use client";

/**
 * Dev tool store for trying the transaction detail sheet the way a real backend would behave: an instant, slow or
 * failing "get one transaction" call. Persisted in this browser. Only the dev strip in `TransactionList` and the
 * detail hook read it (`SHOW_DEMO_TOOLS` gates the strip and the hook's delay).
 */

import { useSyncExternalStore } from "react";

export type DetailMode = "instant" | "slow" | "fail";

interface DevState {
  detail: DetailMode;
}

const KEY = "nibs-transaction-dev";
const EMPTY: DevState = { detail: "instant" };
let state: DevState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function hydrateTransactionDev() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as Partial<DevState>) };
  } catch {
    state = EMPTY;
  }
  emit();
}

export function setTransactionDev(patch: Partial<DevState>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: the setting lasts for this visit only.
  }
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTransactionDev(): DevState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}
