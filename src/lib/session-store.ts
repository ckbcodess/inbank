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
import { MIGRATED_DATA } from "./migration";

interface SessionState {
  actor: Actor | null;
  /** Active banking relationship — null until Profile Selection resolves. */
  activeProfile: Profile | null;
  /** Set once MFA (S02) has been cleared. */
  mfaVerified: boolean;
  /** When this actor signed in before this session (ms epoch) — null on their first sign-in. */
  previousSignIn: number | null;
  /** Each actor's most recent sign-in on this browser, so "Last login" is theirs. Survives sign-out. */
  signIns: Record<string, number>;

  signIn: (actor: Actor) => void;
  verifyMfa: () => void;
  selectProfile: (profile: Profile) => void;
  signOut: () => void;
}

/**
 * Demo customers arrive with a plausible history so "Last login" has something
 * true-to-them to show on a first visit. Esi's is her last sign-in to the old
 * internet banking; a newly activated customer has none (the line hides).
 */
const SEEDED_SIGN_INS: Record<string, number> = {
  "u-retail": Date.parse("2026-09-24T08:43:00Z"),
  "u-joint": Date.parse("2026-09-22T19:05:00Z"),
  "u-joint-either": Date.parse("2026-09-20T12:31:00Z"),
  "u-abena": Date.parse("2026-09-25T07:58:00Z"),
  "u-yaw": Date.parse("2026-09-18T16:12:00Z"),
  "u-legacy": Date.parse(MIGRATED_DATA.lastLegacySignIn),
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      actor: null,
      activeProfile: null,
      mfaVerified: false,
      previousSignIn: null,
      signIns: SEEDED_SIGN_INS,

      signIn: (actor) =>
        set((s) => ({
          actor,
          mfaVerified: false,
          activeProfile: null,
          previousSignIn: s.signIns[actor.id] ?? null,
          signIns: { ...s.signIns, [actor.id]: Date.now() },
        })),
      verifyMfa: () =>
        set((s) => ({
          mfaVerified: true,
          activeProfile: s.activeProfile ?? s.actor?.profiles[0] ?? null,
        })),
      selectProfile: (profile) => set({ activeProfile: profile }),
      signOut: () => set({ actor: null, activeProfile: null, mfaVerified: false, previousSignIn: null }),
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
