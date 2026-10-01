"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** new = quiet layout + eagle, hybrid = new layout on the classic card + banner, classic = older boxed card. */
export type AuthLook = "new" | "hybrid" | "classic";

export const AUTH_LOOKS: AuthLook[] = ["new", "hybrid", "classic"];

export const AUTH_LOOK_LABEL: Record<AuthLook, string> = {
  new: "New look",
  hybrid: "Hybrid",
  classic: "Classic",
};

interface AuthLayoutState {
  look: AuthLook;
  setLook: (look: AuthLook) => void;
  cycle: () => void;
}

export const useAuthLayoutStore = create<AuthLayoutState>()(
  persist(
    (set, get) => ({
      look: "hybrid",
      setLook: (look) => set({ look }),
      cycle: () => {
        const i = AUTH_LOOKS.indexOf(get().look);
        set({ look: AUTH_LOOKS[(i + 1) % AUTH_LOOKS.length] });
      },
    }),
    { name: "nibs-auth-look", skipHydration: true },
  ),
);
