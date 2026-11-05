"use client";

/**
 * The suggestions a customer has hidden from Pay again, per customer. Pay again is worked out from who they pay, so
 * this is the one way to correct it; the person is still in their history and can be shown again. Keyed by who and
 * which rail (`payeeKey`), never by the href, so a new amount doesn't bring a hidden person back.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PayAgainState {
  hidden: Record<string, string[]>;
  hide: (actorId: string, key: string) => void;
  show: (actorId: string, key: string) => void;
}

export const usePayAgainStore = create<PayAgainState>()(
  persist(
    (set) => ({
      hidden: {},
      hide: (actorId, key) =>
        set((s) => {
          const list = s.hidden[actorId] ?? [];
          return list.includes(key) ? s : { hidden: { ...s.hidden, [actorId]: [...list, key] } };
        }),
      show: (actorId, key) =>
        set((s) => ({ hidden: { ...s.hidden, [actorId]: (s.hidden[actorId] ?? []).filter((k) => k !== key) } })),
    }),
    { name: "nibs-pay-again" },
  ),
);
