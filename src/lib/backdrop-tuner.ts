"use client";

/**
 * Dev tool store: tune each dashboard backdrop (lib/dashboard-color.ts) per theme. Overrides are written into one
 * <style> element under the same selectors globals.css uses (`:root[data-hero="forest"]`, `.dark[data-hero="forest"]`;
 * Slate is the attribute-less default), so the hero, its buttons, waves, glow and rim follow as you drag. Persisted in
 * this browser. "Copy CSS" gives the changed rules to bake into globals.css.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DashboardColor } from "@/lib/dashboard-color";

export type BackdropTheme = "light" | "dark";

/** Everything on the dashboard hero that has a colour, in the order it reads. */
export const BACKDROP_TOKENS: { group: string; tokens: { id: string; label: string }[] }[] = [
  {
    group: "Panel",
    tokens: [
      { id: "hero-surface", label: "Background" },
      { id: "hero-border", label: "Edge" },
      { id: "hero-wave-a", label: "Wave (left)" },
      { id: "hero-wave-b", label: "Wave (right)" },
      { id: "hero-glow", label: "Glow above the sheet" },
      { id: "sheet-rim", label: "Sheet rim light" },
    ],
  },
  {
    group: "Text",
    tokens: [
      { id: "hero-foreground", label: "Text" },
      { id: "hero-balance-foreground", label: "Balance" },
    ],
  },
  {
    group: "Send Money button",
    tokens: [
      { id: "hero-primary", label: "Fill" },
      { id: "hero-primary-hover", label: "Hover" },
      { id: "hero-primary-foreground", label: "Text" },
      { id: "hero-primary-edge", label: "Edge" },
      { id: "hero-primary-inset-top", label: "Edge highlight (top)" },
      { id: "hero-primary-inset-bottom", label: "Edge shade (bottom)" },
    ],
  },
  {
    group: "Other buttons",
    tokens: [
      { id: "hero-glass-top", label: "Glass top" },
      { id: "hero-glass-bottom", label: "Glass bottom" },
      { id: "hero-glass-hover", label: "Hover" },
      { id: "hero-button-foreground", label: "Text" },
    ],
  },
];

export interface TunedColor {
  hex: string;
  /** 0–100 */
  alpha: number;
}

type Overrides = Partial<Record<DashboardColor, Partial<Record<BackdropTheme, Record<string, TunedColor>>>>>;

interface BackdropTunerState {
  open: boolean;
  overrides: Overrides;
  setOpen: (open: boolean) => void;
  set: (backdrop: DashboardColor, theme: BackdropTheme, id: string, value: TunedColor) => void;
  reset: (backdrop: DashboardColor, theme: BackdropTheme, id?: string) => void;
}

export const useBackdropTuner = create<BackdropTunerState>()(
  persist(
    (set) => ({
      open: false,
      overrides: {},
      setOpen: (open) => set({ open }),
      set: (backdrop, theme, id, value) =>
        set((s) => ({
          overrides: {
            ...s.overrides,
            [backdrop]: { ...s.overrides[backdrop], [theme]: { ...s.overrides[backdrop]?.[theme], [id]: value } },
          },
        })),
      reset: (backdrop, theme, id) =>
        set((s) => {
          const current = { ...s.overrides[backdrop]?.[theme] };
          if (id) delete current[id];
          return {
            overrides: { ...s.overrides, [backdrop]: { ...s.overrides[backdrop], [theme]: id ? current : {} } },
          };
        }),
    }),
    { name: "nibs-backdrop-tuner" },
  ),
);

export function selectorFor(backdrop: DashboardColor, theme: BackdropTheme): string {
  // Light rules exclude .dark, so a light tune can never leak into dark mode (the tuner's <style> comes after
  // globals.css, and :root[data-hero] and .dark[data-hero] weigh the same).
  if (backdrop === "slate") return theme === "dark" ? ".dark:not([data-hero])" : ":root:not(.dark):not([data-hero])";
  return theme === "dark" ? `.dark[data-hero="${backdrop}"]` : `:root:not(.dark)[data-hero="${backdrop}"]`;
}

export function cssValue({ hex, alpha }: TunedColor): string {
  return alpha >= 100 ? hex : `color-mix(in srgb, ${hex} ${alpha}%, transparent)`;
}

/** The overrides as CSS rules. Dark rules come after light ones so they win when both match. */
export function overridesCss(overrides: Overrides): string {
  const rules: string[] = [];
  for (const theme of ["light", "dark"] as const) {
    for (const [backdrop, byTheme] of Object.entries(overrides) as [DashboardColor, Partial<Record<BackdropTheme, Record<string, TunedColor>>>][]) {
      const tokens = byTheme?.[theme];
      if (!tokens || Object.keys(tokens).length === 0) continue;
      const body = Object.entries(tokens)
        .map(([id, v]) => `  --${id}: ${cssValue(v)};`)
        .join("\n");
      rules.push(`${selectorFor(backdrop, theme)} {\n${body}\n}`);
    }
  }
  return rules.join("\n");
}

/** Reads what a token resolves to right now, as a hex and an alpha, by painting it onto a hidden probe. */
export function readToken(id: string): TunedColor {
  const probe = document.createElement("span");
  probe.style.cssText = `position:absolute;visibility:hidden;color:var(--${id})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  const nums = (color.match(/[\d.]+/g) ?? ["0", "0", "0"]).map(Number);
  let [r, g, b] = nums;
  let a = nums.length > 3 ? nums[3] : 1;
  // `color(srgb r g b / a)` comes back in 0–1.
  if (color.startsWith("color(")) {
    r *= 255;
    g *= 255;
    b *= 255;
    a = nums.length > 3 ? nums[3] : 1;
  }
  const hex = `#${[r, g, b].map((n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0")).join("")}`;
  return { hex, alpha: Math.round(a * 100) };
}
