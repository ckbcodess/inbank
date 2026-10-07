"use client";

/**
 * How the Send & Pay hub icons look: the style (Reicon outline, glass, duotone or duotone glass) and the palette (all GCB amber, or
 * a tone per function). The default is duotone glass in GCB amber; Dev Mode switches the rest, persisted per browser. When one is chosen, delete the others and this store.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IconStyle = "outline" | "glass" | "duotone" | "duotone-glass";
export type IconPalette = "brand" | "function";

interface IconStyleState {
  style: IconStyle;
  palette: IconPalette;
  setStyle: (style: IconStyle) => void;
  setPalette: (palette: IconPalette) => void;
}

export const useIconStyle = create<IconStyleState>()(
  persist(
    (set) => ({
      style: "duotone-glass",
      palette: "brand",
      setStyle: (style) => set({ style }),
      setPalette: (palette) => set({ palette }),
    }),
    { name: "nibs-icon-style-v2" },
  ),
);
