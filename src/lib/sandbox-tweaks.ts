"use client";

/**
 * Dev tool store for the component sandbox (`/sandbox/components`): tune the design system's non-colour tokens live
 * (radius, control heights, type size and tracking, motion, shadows). Colours have their own tuner (`color-tuner.ts`).
 *
 * Overrides are written into one <style> element on :root, so every `var(--token)` and every `rounded-*` class
 * follows as a slider moves. They are applied only while the sandbox page is mounted (the rest of the app is never
 * touched) and kept in this browser. "Copy CSS" gives the changed tokens in the shape of globals.css to bake in.
 */

import { useSyncExternalStore } from "react";

export type TweakKind = "px" | "em" | "ms" | "css";

export interface Tweak {
  /** The CSS variable without its dashes, or `root-font-size` for the html font size. */
  id: string;
  label: string;
  kind: TweakKind;
  min?: number;
  max?: number;
  step?: number;
  /** What globals.css ships, as a number (px, em, ms) or the CSS text. Empty for text tweaks read from the page. */
  initial: number | string;
  /** A css tweak differs by theme, so it is stored and applied for the theme on screen. */
  perTheme?: boolean;
}

export interface TweakGroup {
  label: string;
  tweaks: Tweak[];
}

export const TWEAK_GROUPS: TweakGroup[] = [
  {
    label: "Radius",
    tweaks: [
      { id: "radius-sm", label: "Small (sm)", kind: "px", min: 0, max: 16, step: 1, initial: 4 },
      { id: "radius-lg", label: "Controls (lg)", kind: "px", min: 0, max: 24, step: 1, initial: 8 },
      { id: "radius-xl", label: "Insets (xl)", kind: "px", min: 0, max: 28, step: 1, initial: 12 },
      { id: "radius-2xl", label: "Panels (2xl)", kind: "px", min: 0, max: 32, step: 1, initial: 16 },
      { id: "radius-3xl", label: "Hero (3xl)", kind: "px", min: 0, max: 40, step: 1, initial: 20 },
    ],
  },
  {
    label: "Control heights",
    tweaks: [
      { id: "control-xs", label: "xs", kind: "px", min: 16, max: 40, step: 1, initial: 20 },
      { id: "control-sm", label: "sm", kind: "px", min: 20, max: 48, step: 1, initial: 28 },
      { id: "control-default", label: "default", kind: "px", min: 24, max: 56, step: 1, initial: 36 },
      { id: "control-md", label: "md", kind: "px", min: 28, max: 64, step: 1, initial: 40 },
      { id: "control-xl", label: "xl", kind: "px", min: 32, max: 72, step: 1, initial: 44 },
    ],
  },
  {
    label: "Type",
    tweaks: [
      { id: "root-font-size", label: "Root size", kind: "px", min: 12, max: 18, step: 0.5, initial: 14 },
      { id: "ls-tight", label: "Tracking, tight", kind: "em", min: -0.08, max: 0.08, step: 0.005, initial: -0.01 },
      { id: "ls-heading", label: "Tracking, heading", kind: "em", min: -0.08, max: 0.08, step: 0.005, initial: -0.02 },
      { id: "ls-display", label: "Tracking, display", kind: "em", min: -0.08, max: 0.08, step: 0.005, initial: -0.03 },
      { id: "ls-label", label: "Tracking, label", kind: "em", min: -0.08, max: 0.12, step: 0.005, initial: 0.02 },
    ],
  },
  {
    label: "Motion",
    tweaks: [
      { id: "dur-hover", label: "Hover", kind: "ms", min: 0, max: 600, step: 10, initial: 200 },
      { id: "dur-press", label: "Press", kind: "ms", min: 0, max: 600, step: 10, initial: 400 },
      { id: "dur-reveal", label: "Reveal", kind: "ms", min: 0, max: 800, step: 10, initial: 400 },
      { id: "dur-modal", label: "Dialog", kind: "ms", min: 0, max: 800, step: 10, initial: 200 },
      { id: "dur-toast", label: "Toast", kind: "ms", min: 0, max: 800, step: 10, initial: 200 },
    ],
  },
  {
    label: "Shadows",
    tweaks: [
      { id: "shadow-button", label: "Button", kind: "css", initial: "", perTheme: true },
      { id: "shadow-card", label: "Card", kind: "css", initial: "", perTheme: true },
      { id: "shadow-menu", label: "Menu", kind: "css", initial: "", perTheme: true },
      { id: "shadow-modal", label: "Dialog", kind: "css", initial: "", perTheme: true },
      { id: "field-drop", label: "Field drop colour", kind: "css", initial: "", perTheme: true },
    ],
  },
];

const ALL_TWEAKS = TWEAK_GROUPS.flatMap((g) => g.tweaks);
const STORAGE_KEY = "nibs-sandbox-tweaks";
const STYLE_ID = "nibs-sandbox-tweaks-style";

export type TweakTheme = "light" | "dark";

/** Overrides by key: the token id, or `light:id` / `dark:id` for a themed one. Values are numbers or CSS text. */
type Overrides = Record<string, number | string>;

let overrides: Overrides = {};
let hydrated = false;
let applied = false;
const listeners = new Set<() => void>();

const keyFor = (tweak: Tweak, theme: TweakTheme) => (tweak.perTheme ? `${theme}:${tweak.id}` : tweak.id);

function unit(tweak: Tweak, value: number | string): string {
  if (tweak.kind === "css") return String(value);
  const n = Number(value);
  return tweak.kind === "px" ? `${n}px` : tweak.kind === "em" ? `${n}em` : `${n}ms`;
}

function render(): string {
  const global: string[] = [];
  const light: string[] = [];
  const dark: string[] = [];
  let root = "";
  for (const tweak of ALL_TWEAKS) {
    if (tweak.perTheme) {
      for (const theme of ["light", "dark"] as const) {
        const v = overrides[`${theme}:${tweak.id}`];
        if (v !== undefined && v !== "") (theme === "light" ? light : dark).push(`--${tweak.id}: ${v};`);
      }
      continue;
    }
    const v = overrides[tweak.id];
    if (v === undefined) continue;
    if (tweak.id === "root-font-size") root = `html { font-size: ${unit(tweak, v)}; }`;
    else global.push(`--${tweak.id}: ${unit(tweak, v)};`);
  }
  return [
    global.length ? `:root { ${global.join(" ")} }` : "",
    root,
    light.length ? `:root:not(.dark) { ${light.join(" ")} }` : "",
    dark.length ? `html.dark { ${dark.join(" ")} }` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function write() {
  if (typeof document === "undefined" || !applied) return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = render();
}

function emit() {
  write();
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) overrides = JSON.parse(raw) as Overrides;
  } catch {
    // Storage can be blocked or hold something old; start clean.
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Not being able to save is fine: the tweak still applies for this visit.
  }
}

/** Start applying the overrides (call when the sandbox mounts) and return the function that stops (when it unmounts). */
export function mountSandboxTweaks(): () => void {
  hydrate();
  applied = true;
  emit();
  return () => {
    applied = false;
    document.getElementById(STYLE_ID)?.remove();
  };
}

export function useSandboxTweaks(): Overrides {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      hydrate();
      return overrides;
    },
    () => overrides,
  );
}

export function setTweak(tweak: Tweak, theme: TweakTheme, value: number | string) {
  overrides = { ...overrides, [keyFor(tweak, theme)]: value };
  persist();
  emit();
}

export function resetTweak(tweak: Tweak, theme: TweakTheme) {
  const next = { ...overrides };
  delete next[keyFor(tweak, theme)];
  overrides = next;
  persist();
  emit();
}

export function resetAllTweaks() {
  overrides = {};
  persist();
  emit();
}

export function tweakValue(tweak: Tweak, theme: TweakTheme, current: Overrides): number | string | undefined {
  return current[keyFor(tweak, theme)];
}

/** The value the page has right now for a text tweak (a shadow), read from the cascade so the field starts filled. */
export function readLiveCss(tweak: Tweak): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(`--${tweak.id}`).trim();
}

/** The changed tokens in the shape of globals.css. */
export function tweaksExport(): string {
  const out: string[] = [];
  for (const tweak of ALL_TWEAKS) {
    if (tweak.perTheme) {
      for (const theme of ["light", "dark"] as const) {
        const v = overrides[`${theme}:${tweak.id}`];
        if (v !== undefined && v !== "") out.push(`/* ${theme} */ --${tweak.id}: ${v};`);
      }
    } else if (overrides[tweak.id] !== undefined) {
      out.push(tweak.id === "root-font-size" ? `html { font-size: ${unit(tweak, overrides[tweak.id])}; }` : `--${tweak.id}: ${unit(tweak, overrides[tweak.id])};`);
    }
  }
  return out.join("\n");
}

export function changedCount(current: Overrides): number {
  return Object.keys(current).length;
}
