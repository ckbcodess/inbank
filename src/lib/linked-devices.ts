"use client";

/**
 * Linked devices: every device that can get into a customer's account. One list, so a device that skips the
 * one-time code ("trusted") and a device that is signed in are the same row, not two lists to reconcile.
 *
 * Prototype only: the other devices are a seeded list per customer, dated relative to when the app loads so
 * "Last active" is always a real timestamp, never a canned "2 hours ago". This device is not in the seed. It is
 * built from the live session (sign-in time) and the real device-trust state. A real bank reads all of this from
 * server-side sessions and device keys.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DeviceKind = "laptop" | "phone" | "desktop";

export interface LinkedDevice {
  id: string;
  kind: DeviceKind;
  name: string;
  place: string;
  /** ms epoch */
  signedIn: number;
  /** ms epoch */
  lastActive: number;
  /** Skips the one-time code at sign-in. */
  trusted: boolean;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const LOADED_AT = Date.now();

function ago(ms: number) {
  return LOADED_AT - ms;
}

const SEEDED: Record<string, LinkedDevice[]> = {
  default: [
    { id: "phone", kind: "phone", name: "GCB Mobile on iPhone", place: "Accra, Greater Accra", signedIn: ago(40 * DAY), lastActive: ago(2 * HOUR), trusted: true },
    { id: "mac", kind: "desktop", name: "Safari on Mac", place: "Kumasi, Ashanti", signedIn: ago(12 * DAY), lastActive: ago(3 * DAY), trusted: false },
  ],
  // A new device, a new activation and a migration start with only the device they're on.
  "u-yaw": [],
  "u-clean": [],
  "u-legacy": [],
};

/** The devices other than this one, minus any the customer has signed out. */
export function otherDevicesFor(actorId: string, signedOut: string[]): LinkedDevice[] {
  const seed = SEEDED[actorId] ?? SEEDED.default;
  return seed.filter((d) => !signedOut.includes(d.id)).sort((a, b) => b.lastActive - a.lastActive);
}

interface LinkedDevicesState {
  /** Device ids signed out, per customer. */
  signedOut: Record<string, string[]>;
  signOutDevice: (actorId: string, deviceId: string) => void;
  signOutOthers: (actorId: string) => void;
}

export const useLinkedDevices = create<LinkedDevicesState>()(
  persist(
    (set) => ({
      signedOut: {},
      signOutDevice: (actorId, deviceId) =>
        set((s) => ({ signedOut: { ...s.signedOut, [actorId]: [...(s.signedOut[actorId] ?? []), deviceId] } })),
      signOutOthers: (actorId) =>
        set((s) => ({
          signedOut: { ...s.signedOut, [actorId]: (SEEDED[actorId] ?? SEEDED.default).map((d) => d.id) },
        })),
    }),
    { name: "nibs-linked-devices" },
  ),
);
