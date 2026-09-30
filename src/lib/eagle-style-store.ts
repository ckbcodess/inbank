"use client";

/**
 * Placement and style of the dotted golden eagle behind the auth screens.
 * Edited live in the Eagle studio (src/components/brand/EagleStudio.tsx) and
 * persisted per browser. "Copy JSON" there produces the values to bake in as
 * DEFAULT_EAGLE below.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EAGLE_COLS, EAGLE_HEIGHT_CELLS, EAGLE_PITCH, EAGLE_ROWS } from "@/lib/eagle-matrix";

export type EagleShape = "plus" | "dot" | "square" | "diamond";

/** Settings that can differ between light and dark mode (the light looks different on white than in a dark room). */
export const LOOK_KEYS = [
  "color",
  "baseDim",
  "litColor",
  "hotColor",
  "brightness",
  "sparkle",
  "grain",
  "fill",
  "lightSize",
  "lightStretch",
] as const;
export type LookKey = (typeof LOOK_KEYS)[number];
export type Theme = "light" | "dark";

export interface EagleConfig {
  visible: boolean;
  // Placement
  right: number; // % of the eagle's own width; negative pushes it off-screen right
  bottom: number; // % of the eagle's own height
  width: number; // vw
  mWidth: number; // phone (under 768px): vw
  mRight: number; // phone: % of the eagle's own width
  mBottom: number; // phone: % of its own height
  rotate: number; // degrees
  flip: boolean;
  // Dots
  shape: EagleShape;
  spacing: number; // 1 = every cell; 2 = every other dot each way, and so on
  size: number; // 0.1–1: dot size as a fraction of the grid pitch
  thickness: number; // 0.1–0.6: plus arm thickness as a fraction of the dot size
  color: string;
  opacityLight: number;
  opacityDark: number;
  blur: number; // px
  // Fade
  fade: boolean;
  fadeAngle: number; // degrees, CSS linear-gradient angle
  fadeSolid: number; // % where the eagle is fully visible
  fadeClear: number; // % where it has faded out
  // Motion
  drift: boolean;
  // Light: a lamp sweeping across the eagle in a dark room
  sweep: boolean;
  sweepSeconds: number; // one pass including the darkness before the next
  sweepAngle: number; // direction of travel, degrees (the centre the random directions vary around)
  sweepVariety: number; // 0-1: how much each pass differs in direction, offset and size (0 = same every loop)
  lightSize: number; // lamp radius, % of the eagle's width
  lightStretch: number; // 1 = round pool of light; higher = a wider band across the travel direction
  brightness: number; // 0.4-2.5
  sparkle: number; // 0-1.5: how strongly individual dots glint as the lamp passes
  grain: number; // 0-1: dust drifting through the beam
  fill: number; // 0-1: dimmer, wider bounce light trailing the lamp (0 = off)
  baseDim: number; // 0-1: how visible the dots are outside the light
  litColor: string;
  hotColor: string;
  // Per-mode overrides of the LOOK_KEYS; anything not overridden uses the shared value above
  looks: Record<Theme, Partial<Pick<EagleConfig, LookKey>>>;
  // Cell edits: "col,row" keys toggled against the original matrix
  edits: string[];
}

export const DEFAULT_EAGLE: EagleConfig = {
  visible: true,
  right: -24,
  bottom: -33,
  width: 71,
  mWidth: 120,
  mRight: -32,
  mBottom: -8,
  rotate: 0,
  flip: false,
  shape: "plus",
  spacing: 2,
  size: 0.6,
  thickness: 0.18,
  color: "#ababab",
  opacityLight: 0.5,
  opacityDark: 0.42,
  blur: 0,
  fade: true,
  fadeAngle: 285,
  fadeSolid: 48,
  fadeClear: 83,
  drift: false,
  sweep: true,
  sweepSeconds: 12,
  sweepAngle: -78,
  sweepVariety: 0.6,
  lightSize: 24,
  lightStretch: 1.2,
  brightness: 1.65,
  sparkle: 0.2,
  grain: 0,
  fill: 0,
  baseDim: 0.26,
  litColor: "#ffc400",
  hotColor: "#ffbe0a",
  looks: { light: {}, dark: {} },
  edits: [],
};

interface EagleStore {
  config: EagleConfig;
  set: (patch: Partial<EagleConfig>) => void;
  setLook: (theme: Theme, patch: Partial<Pick<EagleConfig, LookKey>>) => void;
  toggleCell: (key: string) => void;
  reset: () => void;
}

export const useEagleStore = create<EagleStore>()(
  persist(
    (set) => ({
      config: DEFAULT_EAGLE,
      set: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
      setLook: (theme, patch) =>
        set((s) => ({
          config: { ...s.config, looks: { ...s.config.looks, [theme]: { ...s.config.looks[theme], ...patch } } },
        })),
      toggleCell: (key) =>
        set((s) => {
          const has = s.config.edits.includes(key);
          const edits = has ? s.config.edits.filter((k) => k !== key) : [...s.config.edits, key];
          return { config: { ...s.config, edits } };
        }),
      reset: () => set({ config: DEFAULT_EAGLE }),
    }),
    {
      name: "nibs-eagle-style-v11",
      // New fields added later fall back to defaults instead of undefined.
      merge: (persisted, current) => ({
        ...current,
        config: { ...DEFAULT_EAGLE, ...((persisted as Partial<EagleStore> | undefined)?.config ?? {}) },
      }),
    },
  ),
);

/** Is cell (col,row) lit, after edits? */
export function isLit(col: number, row: number, edits: readonly string[]): boolean {
  const original = EAGLE_ROWS[row]?.[col] === "#";
  return edits.includes(`${col},${row}`) ? !original : original;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface EagleDot {
  x: number;
  y: number;
}

/** Centres of every dot. With spacing above 1, each spacing×spacing block becomes one dot. */
export function eagleDots(cfg: Pick<EagleConfig, "edits" | "spacing">): EagleDot[] {
  const step = Math.max(1, Math.round(cfg.spacing));
  const cell = EAGLE_PITCH * step;
  const out: EagleDot[] = [];
  for (let r = 0; r < EAGLE_HEIGHT_CELLS; r += step) {
    for (let c = 0; c < EAGLE_COLS; c += step) {
      // A block is lit when at least half of its cells are.
      let lit = 0;
      let total = 0;
      for (let dr = 0; dr < step && r + dr < EAGLE_HEIGHT_CELLS; dr++) {
        for (let dc = 0; dc < step && c + dc < EAGLE_COLS; dc++) {
          total++;
          if (isLit(c + dc, r + dr, cfg.edits)) lit++;
        }
      }
      if (lit === 0 || lit * 2 < total) continue;
      out.push({ x: c * EAGLE_PITCH + cell / 2, y: r * EAGLE_PITCH + cell / 2 });
    }
  }
  return out;
}

/** One SVG path drawing the given dots in the chosen shape. */
export function dotsPath(dots: readonly EagleDot[], cfg: Pick<EagleConfig, "shape" | "size" | "thickness" | "spacing">): string {
  const step = Math.max(1, Math.round(cfg.spacing));
  const s = EAGLE_PITCH * step * cfg.size;
  const h = s / 2;
  const t = Math.max(0.8, s * cfg.thickness);
  const ht = t / 2;
  const out: string[] = [];
  for (const { x, y } of dots) {
    switch (cfg.shape) {
      case "plus":
        out.push(
          `M${round(x - h)} ${round(y - ht)}h${round(s)}v${round(t)}h${round(-s)}zM${round(x - ht)} ${round(y - h)}h${round(t)}v${round(s)}h${round(-t)}z`,
        );
        break;
      case "dot":
        out.push(`M${round(x - h)} ${round(y)}a${round(h)} ${round(h)} 0 1 0 ${round(s)} 0a${round(h)} ${round(h)} 0 1 0 ${round(-s)} 0z`);
        break;
      case "square":
        out.push(`M${round(x - h)} ${round(y - h)}h${round(s)}v${round(s)}h${round(-s)}z`);
        break;
      case "diamond":
        out.push(`M${round(x)} ${round(y - h)}l${round(h)} ${round(h)}l${round(-h)} ${round(h)}l${round(-h)} ${round(-h)}z`);
        break;
    }
  }
  return out.join("");
}

/** Every lit dot as one path (used for download and as the base layer). */
export function eaglePath(cfg: Pick<EagleConfig, "shape" | "size" | "thickness" | "edits" | "spacing">): string {
  return dotsPath(eagleDots(cfg), cfg);
}

export const EAGLE_VIEWBOX = `0 0 ${EAGLE_COLS * EAGLE_PITCH} ${EAGLE_HEIGHT_CELLS * EAGLE_PITCH}`;
export const EAGLE_ASPECT = (EAGLE_COLS * EAGLE_PITCH) / (EAGLE_HEIGHT_CELLS * EAGLE_PITCH);

/** The config as it applies in one mode: shared values with that mode's overrides on top. */
export function lookFor(cfg: EagleConfig, theme: Theme): EagleConfig {
  return { ...cfg, ...(cfg.looks?.[theme] ?? {}) };
}
