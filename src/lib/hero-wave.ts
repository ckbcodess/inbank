"use client";

/**
 * The dashboard hero's motion and shape: how the wave of light moves (cycle, drift, size, lift, second wave), its
 * grain, the size of the panel container's glow, and the dotted eagle (where it sits and how strong it is). A tiny shared store (so the Dev Mode tuner and
 * the hero stay in step) and the CSS variables it maps to.
 *
 * Colours are not here. The card, its text, the wave and the container glow are the tokens `--hero-surface`,
 * `--hero-foreground`, `--hero-wave-a`, `--hero-wave-b` and `--hero-glow` in globals.css (a wave's or glow's strength is the alpha in its
 * token), tuned in the Colour tuner. One place for each thing.
 *
 * Tweaks persist per browser — a reviewing convenience, like the layout pick.
 * "Copy values" hands them back as the defaults to bake in below.
 */

import { useSyncExternalStore } from "react";

export interface HeroWaveSettings {
  /** The second wave's strength relative to the first, 0–100 (%). */
  second: number;
  /** Seconds for one full cycle of the first wave; the second runs ~1.44× slower. */
  speed: number;
  /** How far the waves travel, 0–20 (% of their size). */
  drift: number;
  /** Dither grain against banding, 0–60 (% opacity of the noise). */
  grain: number;
  /** Width of each wave, % of the hero. */
  size: number;
  /** How far up the hero the waves reach, 0–80 (%). */
  lift: number;
    /** The glow's size, % of the design's ellipse. */
  glowSize: number;
  /** The dotted eagle in the hero's bottom right: its size, % of the artwork's own size. */
  eagleScale: number;
  /** How far it sits from the right edge, px (negative pushes it off the edge). */
  eagleRight: number;
  /** How far it sits from the bottom edge, px. */
  eagleBottom: number;
  /** Its opacity in light mode, 0–100 (%). */
  eagleOpacityLight: number;
  /** Its opacity in dark mode, 0–100 (%). */
  eagleOpacityDark: number;
  /** Motion on or paused. */
  moving: boolean;
}

export const HERO_WAVE_DEFAULTS: HeroWaveSettings = {
  // Tuned by the designer in the wave tuner, 2026-09-26.
  second: 91,
  speed: 16,
  drift: 18,
  grain: 36,
  size: 150,
  lift: 59,
  glowSize: 97,
  // The hero's own placement before it was tunable: 471px wide, 4px up, 110px off the right edge.
  eagleScale: 100,
  eagleRight: -110,
  eagleBottom: 4,
  eagleOpacityLight: 35,
  eagleOpacityDark: 100,
  moving: true,
};

const KEY = "nibs-hero-wave";
const TUNER_KEY = "nibs-hero-wave-tuner";

type Listener = () => void;
const listeners = new Set<Listener>();
let settings: HeroWaveSettings = HERO_WAVE_DEFAULTS;
let tunerOpen = false;
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      // Keep only keys that still exist, so a retired setting never lingers.
      const saved = JSON.parse(raw) as Partial<HeroWaveSettings>;
      const known = Object.keys(HERO_WAVE_DEFAULTS) as (keyof HeroWaveSettings)[];
      settings = { ...HERO_WAVE_DEFAULTS, ...Object.fromEntries(known.filter((k) => k in saved).map((k) => [k, saved[k]])) };
    }
    tunerOpen = localStorage.getItem(TUNER_KEY) === "1";
  } catch {
    // Storage blocked or bad JSON — the defaults stand.
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persist(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked — the tweak lasts for this visit only.
  }
}

export function setHeroWave(patch: Partial<HeroWaveSettings>) {
  load();
  settings = { ...settings, ...patch };
  persist(KEY, JSON.stringify(settings));
  emit();
}

export function resetHeroWave() {
  settings = HERO_WAVE_DEFAULTS;
  persist(KEY, null);
  emit();
}

export function setWaveTunerOpen(open: boolean) {
  load();
  tunerOpen = open;
  persist(TUNER_KEY, open ? "1" : null);
  emit();
}

/** Server and first client render use the defaults, so hydration always matches. */
export function useHeroWave(): HeroWaveSettings {
  return useSyncExternalStore(
    subscribe,
    () => (load(), settings),
    () => HERO_WAVE_DEFAULTS,
  );
}

export function useWaveTunerOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (load(), tunerOpen),
    () => false,
  );
}

/** The CSS variables `HeroArt`, `HeroSheet` and `.hero-wave-a/b` (globals.css) read. Motion and shape only; colours are tokens. */
export function heroWaveVars(s: HeroWaveSettings): React.CSSProperties {
  return {
    "--wave-second": s.second / 100,
    "--wave-speed-a": `${s.speed}s`,
    "--wave-speed-b": `${Math.round(s.speed * 1.44 * 10) / 10}s`,
    "--wave-drift": `${s.drift}%`,
    "--wave-grain": s.grain / 100,
    "--wave-size": `${s.size}%`,
    "--wave-lift": `${s.lift}%`,
    "--glow-size": s.glowSize / 100,
    "--eagle-scale": s.eagleScale / 100,
    "--eagle-right": `${s.eagleRight}px`,
    "--eagle-bottom": `${s.eagleBottom}px`,
    "--eagle-opacity-light": s.eagleOpacityLight / 100,
    "--eagle-opacity-dark": s.eagleOpacityDark / 100,
    "--wave-play": s.moving ? "running" : "paused",
  } as React.CSSProperties;
}

/** The current settings as a paste-ready block. */
export function heroWaveExport(s: HeroWaveSettings): string {
  return `Hero wave settings\n${JSON.stringify(s, null, 2)}`;
}
