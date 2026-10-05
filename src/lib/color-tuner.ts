"use client";

/**
 * Dev tool store: change the colour tokens live. Overrides are kept per theme, written into one <style> element
 * (so every `var(--token)` in the app follows as you drag), and persisted in this browser. "Copy CSS" gives the
 * changed tokens in the shape of globals.css to bake in.
 */

import { useSyncExternalStore } from "react";

export type TunerTheme = "light" | "dark";

export interface TunerToken {
  /** The CSS variable, without the leading dashes. */
  id: string;
  label: string;
}

export interface TunerGroup {
  label: string;
  tokens: TunerToken[];
}

/** Opaque tokens only: the picker has no alpha. Derived tokens (the active wash, hover mixes) follow these. */
export const TUNER_GROUPS: TunerGroup[] = [
  {
    label: "Brand",
    tokens: [
      { id: "primary", label: "Primary (amber)" },
      { id: "primary-hover", label: "Primary hover" },
      { id: "primary-foreground", label: "On primary" },
      { id: "action-icon", label: "Icon on round actions" },
      { id: "ring", label: "Focus ring" },
      { id: "active-border", label: "Selected border" },
      { id: "tile-accent", label: "Tile accent" },
    ],
  },
  {
    label: "Surfaces",
    tokens: [
      { id: "background", label: "Background" },
      { id: "surface", label: "Page surface" },
      { id: "card", label: "Card" },
      { id: "tile", label: "Tile" },
      { id: "tile-hover", label: "Tile hover" },
      { id: "popover", label: "Menus" },
      { id: "muted", label: "Muted fill" },
      { id: "border", label: "Border" },
      { id: "sidebar", label: "Sidebar" },
    ],
  },
  {
    label: "Text",
    tokens: [
      { id: "foreground", label: "Text" },
      { id: "muted-foreground", label: "Secondary text" },
    ],
  },
  {
    label: "Status",
    tokens: [
      { id: "success", label: "Success" },
      { id: "warning", label: "Warning" },
      { id: "destructive", label: "Destructive" },
    ],
  },
  {
    label: "Icons and marks",
    tokens: [
      { id: "duo-outline", label: "Two-tone icon outline" },
      { id: "mc-red", label: "Mastercard red" },
      { id: "mc-orange", label: "Mastercard orange" },
    ],
  },
  {
    label: "Charts",
    tokens: [
      { id: "cat-1", label: "Category 1" },
      { id: "cat-2", label: "Category 2" },
      { id: "cat-3", label: "Category 3" },
      { id: "cat-4", label: "Category 4" },
      { id: "cat-5", label: "Category 5" },
      { id: "spend-1", label: "Spend 1" },
      { id: "spend-2", label: "Spend 2" },
      { id: "spend-3", label: "Spend 3" },
      { id: "spend-4", label: "Spend 4" },
      { id: "spend-5", label: "Spend 5" },
    ],
  },
];

type Overrides = Record<TunerTheme, Record<string, string>>;

const KEY = "nibs-color-tuner";
const OPEN_KEY = "nibs-color-tuner-open";
const STYLE_ID = "nibs-color-tuner-style";

const EMPTY: Overrides = { light: {}, dark: {} };
let overrides: Overrides = EMPTY;
let open = false;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function styleElement(): HTMLStyleElement {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  return el;
}

function rules(o: Overrides): string {
  const block = (selector: string, map: Record<string, string>) => {
    const body = Object.entries(map)
      .map(([id, value]) => `--${id}:${value};`)
      .join("");
    return body ? `${selector}{${body}}` : "";
  };
  // Light is scoped to "not dark" so it can never beat the dark value of the same token in globals.css.
  return block("html:not(.dark)", o.light) + block("html.dark", o.dark);
}

function apply() {
  if (typeof document === "undefined") return;
  styleElement().textContent = rules(overrides);
}

function persist() {
  try {
    const empty = Object.keys(overrides.light).length === 0 && Object.keys(overrides.dark).length === 0;
    if (empty) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(overrides));
  } catch {
    // Storage blocked: the changes last for this visit only.
  }
}

/** Reads the saved overrides once and puts them on the page. Safe to call more than once. */
export function hydrateColorTuner() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Overrides>;
      overrides = { light: parsed.light ?? {}, dark: parsed.dark ?? {} };
    }
    open = localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    overrides = EMPTY;
  }
  apply();
  emit();
}

export function setTunerColor(theme: TunerTheme, id: string, hex: string) {
  overrides = { ...overrides, [theme]: { ...overrides[theme], [id]: hex } };
  apply();
  persist();
  emit();
}

export function resetTunerColor(theme: TunerTheme, id: string) {
  const next = { ...overrides[theme] };
  delete next[id];
  overrides = { ...overrides, [theme]: next };
  apply();
  persist();
  emit();
}

export function resetTunerAll() {
  overrides = { light: {}, dark: {} };
  apply();
  persist();
  emit();
}

export function setTunerOpen(next: boolean) {
  open = next;
  try {
    if (next) localStorage.setItem(OPEN_KEY, "1");
    else localStorage.removeItem(OPEN_KEY);
  } catch {
    // Nothing to remember.
  }
  emit();
}

/** The changed tokens in the shape of globals.css, ready to paste. */
export function tunerExport(): string {
  const block = (selector: string, map: Record<string, string>) => {
    const lines = Object.entries(map).map(([id, value]) => `  --${id}: ${value};`);
    return lines.length ? `${selector} {\n${lines.join("\n")}\n}` : "";
  };
  return [block(":root", overrides.light), block(".dark", overrides.dark)].filter(Boolean).join("\n\n");
}

/** Reads each token's value from the stylesheet itself, with the overrides switched off. */
export function readTunerDefaults(): Record<string, string> {
  const el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (el) el.disabled = true;
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const group of TUNER_GROUPS) {
    for (const t of group.tokens) out[t.id] = cssToHex(cs.getPropertyValue(`--${t.id}`).trim()) ?? "#000000";
  }
  if (el) el.disabled = false;
  return out;
}

/** Any CSS colour (hex, oklch, rgb) to #rrggbb, through a canvas. Null if the browser can't read it. */
export function cssToHex(css: string): string | null {
  if (!css) return null;
  if (/^#[0-9a-f]{6}$/i.test(css)) return css.toLowerCase();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const sentinel = "#010203";
  ctx.fillStyle = sentinel;
  ctx.fillStyle = css;
  if (ctx.fillStyle === sentinel && css.toLowerCase() !== sentinel) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useTunerOverrides(): Overrides {
  return useSyncExternalStore(subscribe, () => overrides, () => EMPTY);
}

export function useTunerOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open, () => false);
}
