"use client";

/**
 * The dashboard hero's look — card, text, wave of light, pill shadow and the
 * panel container's glow: its settings, a tiny shared store (so the
 * Dev Mode tuner and the hero stay in step), and the CSS variables it maps to.
 *
 * Tweaks persist per browser — a reviewing convenience, like the layout pick.
 * "Copy values" hands them back as the defaults to bake in below.
 */

import { useSyncExternalStore } from "react";

export interface HeroWaveSettings {
  /** The card's own fill in dark mode (defaults mirror --hero-surface in globals.css). */
  cardDark: string;
  /** The card's own fill in light mode. */
  cardLight: string;
  /** Text and glass-control colour on the card in dark mode (mirrors --hero-foreground). */
  textDark: string;
  /** Text and glass-control colour on the card in light mode. */
  textLight: string;
  /** Wave colour in dark mode. */
  color: string;
  /** How strongly it shows in dark mode, 0–100 (%). */
  strength: number;
  /** Wave colour in light mode. */
  colorLight: string;
  /** How strongly it shows in light mode, 0–100 (%). */
  strengthLight: number;
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
  /** The account pill's multiply shadow, 0–100 (%). */
  pillShadow: number;
  /** The soft glow along the top of the panel container, dark mode. */
  glowDark: string;
  /** Its strength in dark mode, 0–100 (%). */
  glowStrengthDark: number;
  /** The container glow in light mode. */
  glowLight: string;
  /** Its strength in light mode, 0–100 (%) — off by default, as designed. */
  glowStrengthLight: number;
  /** The glow's size, % of the design's ellipse. */
  glowSize: number;
  /** Motion on or paused. */
  moving: boolean;
}

export const HERO_WAVE_DEFAULTS: HeroWaveSettings = {
  // Tuned by the designer in the wave tuner, 2026-09-26.
  cardDark: "#13181b",
  cardLight: "#36434e",
  textDark: "#ffffff",
  textLight: "#ffffff",
  color: "#455e68",
  strength: 77,
  colorLight: "#b1c3d2",
  strengthLight: 59,
  second: 91,
  speed: 16,
  drift: 18,
  grain: 36,
  size: 150,
  lift: 59,
  pillShadow: 2,
  glowDark: "#374951",
  glowStrengthDark: 23,
  glowLight: "#ffffff",
  glowStrengthLight: 0,
  glowSize: 97,
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

/** The CSS variables `HeroSurface`, `HeroArt` and `.hero-wave-a/b` (globals.css) read. */
export function heroWaveVars(s: HeroWaveSettings): React.CSSProperties {
  return {
    // The hero picks one of each pair per theme into --hero-card / --hero-wave / --hero-foreground.
    "--wave-card-dark": s.cardDark,
    "--wave-card-light": s.cardLight,
    "--wave-text-dark": s.textDark,
    "--wave-text-light": s.textLight,
    "--wave-color-dark": `color-mix(in srgb, ${s.color} ${s.strength}%, transparent)`,
    "--wave-color-light": `color-mix(in srgb, ${s.colorLight} ${s.strengthLight}%, transparent)`,
    "--wave-second": s.second / 100,
    "--wave-speed-a": `${s.speed}s`,
    "--wave-speed-b": `${Math.round(s.speed * 1.44 * 10) / 10}s`,
    "--wave-drift": `${s.drift}%`,
    "--wave-grain": s.grain / 100,
    "--wave-size": `${s.size}%`,
    "--wave-lift": `${s.lift}%`,
    "--pill-shadow": s.pillShadow / 100,
    "--glow-color-dark": `color-mix(in srgb, ${s.glowDark} ${s.glowStrengthDark}%, transparent)`,
    "--glow-color-light": `color-mix(in srgb, ${s.glowLight} ${s.glowStrengthLight}%, transparent)`,
    "--glow-size": s.glowSize / 100,
    "--wave-play": s.moving ? "running" : "paused",
  } as React.CSSProperties;
}

/** The current settings as a paste-ready block. */
export function heroWaveExport(s: HeroWaveSettings): string {
  return `Hero wave settings\n${JSON.stringify(s, null, 2)}`;
}
