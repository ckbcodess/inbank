"use client";

/**
 * Dev tool store: tune the gradient stroke of the list box (`ListCard`). The angle, the middle stop and the width are
 * shared by both themes; the three stop colours are kept per theme. Values are written into one <style> element as
 * overrides of the `--edge-glass-*` tokens, so every list box on the page follows as you drag, and persist in this
 * browser. "Copy CSS" gives the changed tokens in the shape of globals.css to bake in.
 */

import { useSyncExternalStore } from "react";

export type ListCardTheme = "light" | "dark";

export const COLOR_TOKENS = ["edge-glass-start", "edge-glass-mid", "edge-glass-end"] as const;
export const SHARED_TOKENS = ["edge-glass-angle", "edge-glass-mid-at", "edge-glass-width"] as const;

interface State {
  shared: Record<string, string>;
  light: Record<string, string>;
  dark: Record<string, string>;
}

const KEY = "nibs-list-card-tuner";
const OPEN_KEY = "nibs-list-card-tuner-open";
const STYLE_ID = "nibs-list-card-tuner-style";

const EMPTY: State = { shared: {}, light: {}, dark: {} };
let state: State = EMPTY;
let open = false;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function rules(s: State): string {
  const block = (selector: string, map: Record<string, string>) => {
    const body = Object.entries(map)
      .map(([id, value]) => `--${id}:${value};`)
      .join("");
    return body ? `${selector}{${body}}` : "";
  };
  return block("html", s.shared) + block("html:not(.dark)", s.light) + block("html.dark", s.dark);
}

function apply() {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = rules(state);
}

function commit(next: State) {
  state = next;
  apply();
  try {
    const empty = !Object.values(next).some((m) => Object.keys(m).length > 0);
    if (empty) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the changes last for this visit only.
  }
  emit();
}

/** Reads the saved values once and puts them on the page. Safe to call more than once. */
export function hydrateListCardTuner() {
  if (process.env.NODE_ENV === "production" || hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      state = { shared: parsed.shared ?? {}, light: parsed.light ?? {}, dark: parsed.dark ?? {} };
    }
    open = localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    state = EMPTY;
  }
  apply();
  emit();
}

export function setListCardShared(id: string, value: string) {
  commit({ ...state, shared: { ...state.shared, [id]: value } });
}

export function setListCardColor(theme: ListCardTheme, id: string, value: string) {
  commit({ ...state, [theme]: { ...state[theme], [id]: value } });
}

export function resetListCardTuner() {
  commit({ shared: {}, light: {}, dark: {} });
}

export function setListCardTunerOpen(next: boolean) {
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
export function listCardTunerExport(): string {
  const block = (selector: string, map: Record<string, string>) => {
    const lines = Object.entries(map).map(([id, value]) => `  --${id}: ${value};`);
    return lines.length ? `${selector} {\n${lines.join("\n")}\n}` : "";
  };
  return [block(":root", { ...state.shared, ...state.light }), block(".dark", state.dark)].filter(Boolean).join("\n\n");
}

/** What the stylesheet says for these tokens right now, with the tuner's overrides switched off. */
export function readListCardDefaults(ids: readonly string[]): Record<string, string> {
  const el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (el) el.disabled = true;
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const id of ids) out[id] = cs.getPropertyValue(`--${id}`).trim();
  if (el) el.disabled = false;
  return out;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useListCardTuner(): State {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

export function useListCardTunerOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open, () => false);
}
