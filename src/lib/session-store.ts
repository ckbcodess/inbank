"use client";

/**
 * Client-side session for the prototype.
 *
 * Holds the authenticated actor and the active banking relationship. Section
 * 12.1: shell is derived from the credential and cannot be switched in-session,
 * so nothing here lets an actor cross between shells.
 */

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Actor, Profile } from "./roles";

interface SessionState {
  actor: Actor | null;
  /** Active banking relationship — null until Profile Selection resolves. */
  activeProfile: Profile | null;
  /** Set once MFA (S02) has been cleared. */
  mfaVerified: boolean;

  signIn: (actor: Actor) => void;
  verifyMfa: () => void;
  selectProfile: (profile: Profile) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      actor: null,
      activeProfile: null,
      mfaVerified: false,

      signIn: (actor) => set({ actor, mfaVerified: false, activeProfile: null }),
      verifyMfa: () =>
        set((s) => ({
          mfaVerified: true,
          activeProfile: s.activeProfile ?? s.actor?.profiles[0] ?? null,
        })),
      selectProfile: (profile) => set({ activeProfile: profile }),
      signOut: () => set({ actor: null, activeProfile: null, mfaVerified: false }),
    }),
    { name: "nibs-session" },
  ),
);

/**
 * True once the persisted session has been read back from storage.
 *
 * Route guards must wait for this. A plain `useEffect(() => setMounted(true))`
 * races rehydration: the effect can fire while `actor` is still the initial
 * null, which would bounce an authenticated user back to /login.
 */
export function useSessionHydrated(): boolean {
  // Always starts false so server and first client render agree; the effect
  // below flips it once storage has actually been read. `persist` is absent
  // during SSR, hence the optional access.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const api = useSession.persist;
    if (!api) {
      // No persistence available (e.g. storage blocked) — nothing to wait for.
      setHydrated(true);
      return;
    }

    const unsub = api.onFinishHydration(() => setHydrated(true));
    // Rehydration may already have finished before this effect ran.
    if (api.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  return hydrated;
}
