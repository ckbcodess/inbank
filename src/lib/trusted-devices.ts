"use client";

/**
 * Trusted devices: the devices where a customer's login skips the one-time code. There is one session at a time
 * (no concurrent sessions), so nothing here is "logged in now". A device is listed only while it is trusted, and
 * removing it only ends that trust: the next login there asks for a code again.
 *
 * Prototype only: the other trusted devices are a seeded list per customer, dated relative to when the app loads so
 * "Last used" is always a real timestamp. This browser is not in the seed; it is read from the live trust state in
 * `device-trust.ts`. A real bank holds trust as server-side device keys.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DeviceKind = "laptop" | "phone" | "desktop";

export interface TrustedDeviceRow {
  id: string;
  kind: DeviceKind;
  name: string;
  /** ms epoch */
  lastUsed: number;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const LOADED_AT = Date.now();

function ago(ms: number) {
  return LOADED_AT - ms;
}

const SEEDED: Record<string, TrustedDeviceRow[]> = {
  default: [{ id: "phone", kind: "phone", name: "iPhone", lastUsed: ago(2 * HOUR) }],
  // A new device, a new activation and a migration start with no other trusted device.
  "u-yaw": [],
  "u-clean": [],
  "u-legacy": [],
};

/** The trusted devices other than this browser, minus any the customer has removed trust from. */
export function otherTrustedDevicesFor(actorId: string, removed: string[]): TrustedDeviceRow[] {
  const seed = SEEDED[actorId] ?? SEEDED.default;
  return seed.filter((d) => !removed.includes(d.id)).sort((a, b) => b.lastUsed - a.lastUsed);
}

interface TrustedDevicesState {
  /** Device ids whose trust was removed, per customer. */
  removed: Record<string, string[]>;
  removeDevice: (actorId: string, deviceId: string) => void;
}

export const useTrustedDevices = create<TrustedDevicesState>()(
  persist(
    (set) => ({
      removed: {},
      removeDevice: (actorId, deviceId) =>
        set((s) => ({ removed: { ...s.removed, [actorId]: [...(s.removed[actorId] ?? []), deviceId] } })),
    }),
    { name: "nibs-trusted-devices" },
  ),
);
