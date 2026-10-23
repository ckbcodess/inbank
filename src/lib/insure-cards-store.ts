"use client";

/**
 * How the plan cards on Insure look: the style of a card (plain, coloured, with art, or led by its price) and how the
 * cards are laid out (two to a row, or one). The default is the plain two-column grid; Dev Mode switches the rest,
 * persisted per browser. When one is chosen, delete the others and this store.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PlanCardLook = "plain" | "colour" | "art" | "price";
export type PlanCardLayout = "grid" | "single";

interface InsureCardsState {
  look: PlanCardLook;
  layout: PlanCardLayout;
  setLook: (look: PlanCardLook) => void;
  setLayout: (layout: PlanCardLayout) => void;
}

export const useInsureCards = create<InsureCardsState>()(
  persist(
    (set) => ({
      look: "plain",
      layout: "grid",
      setLook: (look) => set({ look }),
      setLayout: (layout) => set({ layout }),
    }),
    { name: "nibs-insure-cards-v1" },
  ),
);
