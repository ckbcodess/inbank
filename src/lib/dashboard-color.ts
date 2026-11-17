"use client";

/**
 * The colour of the dashboard's hero panel, chosen in Settings → Preferences. Personal banking only. It's saved on this
 * device and applied as `<html data-hero="…">`, which swaps the `--hero-*` tokens in globals.css (both themes).
 * Smoke (id "slate") is the house default and sets no attribute.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DASHBOARD_COLORS = [
  // The id stays "slate" so saved choices keep working; customers see it as Smoke.
  { id: "slate", label: "Smoke" },
  { id: "amber", label: "Amber" },
  { id: "forest", label: "Forest" },
  { id: "ocean", label: "Sea" },
  { id: "clay", label: "Savanna" },
] as const;

export type DashboardColor = (typeof DASHBOARD_COLORS)[number]["id"];

export const useDashboardColor = create<{ color: DashboardColor; setColor: (c: DashboardColor) => void }>()(
  persist((set) => ({ color: "slate", setColor: (color) => set({ color }) }), {
    name: "nibs-dashboard-color",
    // A colour that's since been removed (Plum) falls back to Slate.
    merge: (saved, current) => {
      const color = (saved as { color?: string } | undefined)?.color;
      return { ...current, color: DASHBOARD_COLORS.some((c) => c.id === color) ? (color as DashboardColor) : "slate" };
    },
  }),
);
