"use client";

/**
 * The customer's own proxy ID registration (GhIPSS proxy pay).
 *
 * A proxy ID maps a memorable identifier — a phone number or Ghana Card — to an
 * account so others can pay them without an account number. This is the *own*
 * registration the customer manages (create / update / deregister), distinct
 * from paying *to* someone else's proxy ID in the transfer flow.
 *
 * Prototype-only: persisted per browser like the other client stores.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProxyType = "phone" | "ghana-card";

export interface MyProxy {
  id: string;
  type: ProxyType;
  /** Display value, e.g. "0244 123 821" or "GHA-0123456789-0". */
  value: string;
  /** Account the proxy resolves to. */
  linkedAccountId: string;
  createdAt: string;
}

interface ProxyState {
  myProxy: MyProxy | null;
  /** Create or replace the registration. */
  registerProxy: (input: { type: ProxyType; value: string; linkedAccountId: string }) => void;
  /** Merge changes into the existing registration. */
  updateProxy: (patch: Partial<Pick<MyProxy, "type" | "value" | "linkedAccountId">>) => void;
  /** Remove the registration entirely. */
  deregisterProxy: () => void;
}

export const useProxyStore = create<ProxyState>()(
  persist(
    (set) => ({
      // Seeded so Update / Deregister are demonstrable out of the box; deregister
      // it and the Create path appears.
      myProxy: {
        id: "myproxy-1",
        type: "phone",
        value: "0244 123 821",
        linkedAccountId: "",
        createdAt: "2026-01-01T00:00:00.000Z",
      },

      registerProxy: ({ type, value, linkedAccountId }) =>
        set({
          myProxy: {
            id: `myproxy-${Date.now()}`,
            type,
            value,
            linkedAccountId,
            createdAt: new Date().toISOString(),
          },
        }),

      updateProxy: (patch) =>
        set((s) => (s.myProxy ? { myProxy: { ...s.myProxy, ...patch } } : s)),

      deregisterProxy: () => set({ myProxy: null }),
    }),
    { name: "nibs-proxy" },
  ),
);

export const PROXY_TYPE_LABEL: Record<ProxyType, string> = {
  phone: "Phone number",
  "ghana-card": "Ghana Card",
};
