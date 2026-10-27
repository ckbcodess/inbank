"use client";

/**
 * How the product cards on Insure, Invest and Loans look and how the "set up first" prompt is shown. (Named for Insure,
 * where it began; every shelf reads it, so one switch changes all three.) The look of a card (the status in the corner, a
 * watermark icon, a rising icon, narrowed from 28 in `prototype/product-card-prototypes.html`, or a picture on top) and how the cards are
 * laid out (two to a row, or one). Dev Mode switches them, persisted per browser. When one is chosen, delete the others
 * and this store.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PlanCardLook = "corner" | "watermark" | "rising" | "image";
export type PlanCardLayout = "grid" | "single";
/** What a customer who can't use the area yet sees: one slim row, a setup card with its steps, or a progress track. */
export type GatePromptStyle = "row" | "card" | "track";

interface InsureCardsState {
  look: PlanCardLook;
  layout: PlanCardLayout;
  gate: GatePromptStyle;
  setLook: (look: PlanCardLook) => void;
  setLayout: (layout: PlanCardLayout) => void;
  setGate: (gate: GatePromptStyle) => void;
}

export const useInsureCards = create<InsureCardsState>()(
  persist(
    (set) => ({
      look: "corner",
      layout: "grid",
      gate: "row",
      setLook: (look) => set({ look }),
      setLayout: (layout) => set({ layout }),
      setGate: (gate) => set({ gate }),
    }),
    { name: "nibs-insure-cards-v2" },
  ),
);
