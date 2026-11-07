"use client";

/**
 * Dev tool store for the skeleton tuner (`/sandbox/skeleton`): the look of every loading skeleton in the app, which
 * skullet draws from `--skullet-*` custom properties. The tuner puts the values on its own preview wrapper, so nothing
 * else in the app moves; "Copy CSS" gives the lines to bake into globals.css and layout.tsx. Kept in this browser.
 */

import { useSyncExternalStore } from "react";

export type SkeletonAnimation = "shimmer" | "group-shimmer" | "pulse" | "none";
export type SkeletonSpeed = "slow" | "fast";
export type TextTop = "ascender" | "cap-height" | "x-height";
export type TextBottom = "baseline" | "descender";
export type SkeletonTheme = "light" | "dark";

export interface SkeletonTune {
  /** How much of `--muted` the bone is, in percent. */
  base: number;
  /** How much white the moving highlight is, in percent, per theme (globals.css ships 60 and 4). */
  shine: Record<SkeletonTheme, number>;
  animation: SkeletonAnimation;
  speed: SkeletonSpeed;
  /** Corner radius of text bars and boxes, in px. */
  radius: number;
  textTop: TextTop;
  textBottom: TextBottom;
}

/** What globals.css and layout.tsx ship today. */
export const SKELETON_DEFAULTS: SkeletonTune = {
  base: 20,
  shine: { light: 60, dark: 4 },
  animation: "shimmer",
  speed: "slow",
  radius: 8,
  textTop: "ascender",
  textBottom: "descender",
};

const KEY = "nibs-skeleton-tuner";

let state: SkeletonTune = SKELETON_DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function persist() {
  try {
    if (isDefault(state)) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: the changes last for this visit only.
  }
}

/** Reads the saved values once. Safe to call more than once. */
export function hydrateSkeletonTuner() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<SkeletonTune>;
    state = { ...SKELETON_DEFAULTS, ...saved, shine: { ...SKELETON_DEFAULTS.shine, ...saved.shine } };
    emit();
  } catch {
    state = SKELETON_DEFAULTS;
  }
}

export function setSkeletonTune(patch: Partial<SkeletonTune>) {
  state = { ...state, ...patch };
  persist();
  emit();
}

export function setSkeletonShine(theme: SkeletonTheme, value: number) {
  state = { ...state, shine: { ...state.shine, [theme]: value } };
  persist();
  emit();
}

export function resetSkeletonTuner() {
  state = SKELETON_DEFAULTS;
  persist();
  emit();
}

export function useSkeletonTune(): SkeletonTune {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => SKELETON_DEFAULTS,
  );
}

function isDefault(t: SkeletonTune): boolean {
  const d = SKELETON_DEFAULTS;
  return (
    t.base === d.base &&
    t.shine.light === d.shine.light &&
    t.shine.dark === d.shine.dark &&
    t.animation === d.animation &&
    t.speed === d.speed &&
    t.radius === d.radius &&
    t.textTop === d.textTop &&
    t.textBottom === d.textBottom
  );
}

export const skeletonIsDefault = isDefault;

/** The custom properties skullet reads, for the theme on screen. Put them on a wrapper's `style`. */
export function skeletonVariables(t: SkeletonTune, theme: SkeletonTheme): Record<string, string> {
  return {
    "--skullet-base": `color-mix(in srgb, var(--muted) ${t.base}%, transparent)`,
    "--skullet-highlight": `color-mix(in srgb, var(--white) ${t.shine[theme]}%, transparent)`,
    "--skullet-radius": `${t.radius}px`,
    "--skullet-animation": t.animation,
    "--skullet-speed": t.speed,
    "--skullet-text-top": t.textTop,
    "--skullet-text-bottom": t.textBottom,
  };
}

/** The changed values, in the shape of globals.css and layout.tsx. Empty when nothing differs from what ships. */
export function skeletonExport(t: SkeletonTune): string {
  const d = SKELETON_DEFAULTS;
  const css: string[] = [];
  const root: string[] = [];
  const dark: string[] = [];
  if (t.base !== d.base) root.push(`  --skullet-base: color-mix(in srgb, var(--muted) ${t.base}%, transparent);`);
  if (t.shine.light !== d.shine.light) root.push(`  --skeleton-shine: color-mix(in srgb, var(--white) ${t.shine.light}%, transparent);`);
  if (t.radius !== d.radius) root.push(`  --skullet-radius: ${t.radius}px;`);
  if (t.textTop !== d.textTop) root.push(`  --skullet-text-top: ${t.textTop};`);
  if (t.textBottom !== d.textBottom) root.push(`  --skullet-text-bottom: ${t.textBottom};`);
  if (t.shine.dark !== d.shine.dark) dark.push(`  --skeleton-shine: color-mix(in srgb, var(--white) ${t.shine.dark}%, transparent);`);
  if (root.length) css.push(`/* globals.css, in the light block (:root) */\n${root.join("\n")}`);
  if (dark.length) css.push(`/* globals.css, in the dark block (.dark) */\n${dark.join("\n")}`);
  // The base is shared by both themes, so the dark block repeats it.
  if (t.base !== d.base) css.push(`/* globals.css, the dark block repeats the base */\n  --skullet-base: color-mix(in srgb, var(--muted) ${t.base}%, transparent);`);
  if (t.animation !== d.animation || t.speed !== d.speed) {
    css.push(`/* layout.tsx */\n<SkulletProvider theme={{ animation: "${t.animation}", speed: "${t.speed}" }}>`);
  }
  return css.join("\n\n");
}
