"use client";

/**
 * Which look the Send & Pay hub icons use: Reicon outline or the glass treatment. A Dev Mode exploration,
 * persisted per browser. When one is chosen, delete the other and this store.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IconStyle = "outline" | "glass";

interface IconStyleState {
  style: IconStyle;
  setStyle: (style: IconStyle) => void;
}

export const useIconStyle = create<IconStyleState>()(
  persist(
    (set) => ({
      style: "outline",
      setStyle: (style) => set({ style }),
    }),
    { name: "nibs-icon-style" },
  ),
);
