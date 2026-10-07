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

/** First match wins. */
const GROUP_RULES: [string, RegExp][] = [
  ["Chips and pills", /^(chip|pill-)/],
  ["Text", /(^foreground$|-foreground$)/],
  ["Brand", /^(primary|ring|active-|action-icon|tile-accent)/],
  ["Status", /^(success|warning|destructive|info)/],
  ["Fields and menus", /^(field|menu|input$)/],
  ["Borders", /(^border$|-border$|-border-focus$|^duo-outline$)/],
  ["Tints and banners", /^(tint-|banner-)/],
  ["Charts", /^(chart|cat-|spend-)/],
  ["Marks", /^(mc-|duo-)/],
  ["Dashboard hero", /^(hero|sheet|balance-card|account-card)/],
  ["Icons", /^(icon-|glass-)/],
  ["Surfaces", /^(background|surface|card|modal|popover|muted|secondary|accent|tile|sidebar|glass|device|skeleton|auth-card)/],
];
const SKIP = /^(color-|tw-|font|radius|shadow|dur-|breakpoint|animate|ease|sidebar-width|ripple)/;

function humanize(id: string): string {
  const words = id.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Every custom property the stylesheet defines on :root or .dark, whatever file it came from. */
function stylesheetVariableNames(): Set<string> {
  const names = new Set<string>();
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      const style = (rule as CSSStyleRule).style;
      const selector = (rule as CSSStyleRule).selectorText;
      if (style && selector && /(^|,\s*)(:root|html\.dark|\.dark|html:root)(\s*,|$)/.test(selector)) {
        for (let i = 0; i < style.length; i++) if (style[i].startsWith("--")) names.add(style[i].slice(2));
      }
      const inner = (rule as CSSGroupingRule).cssRules;
      if (inner) visit(inner);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    if ((sheet.ownerNode as HTMLElement | null)?.id === STYLE_ID) continue;
    try {
      visit(sheet.cssRules);
    } catch {
      // A sheet from another origin can't be read: nothing of ours.
    }
  }
  return names;
}

/** All the colour tokens, grouped. A variable counts when the browser can read its value as a colour. */
export function discoverTunerGroups(): TunerGroup[] {
  const el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (el) el.disabled = true;
  const cs = getComputedStyle(document.documentElement);
  const groups = new Map<string, TunerToken[]>();
  for (const id of Array.from(stylesheetVariableNames()).sort()) {
    if (SKIP.test(id)) continue;
    if (!parseColor(cs.getPropertyValue(`--${id}`).trim())) continue;
    const label = GROUP_RULES.find(([, re]) => re.test(id))?.[0] ?? "Other";
    groups.set(label, [...(groups.get(label) ?? []), { id, label: humanize(id) }]);
  }
  if (el) el.disabled = false;
  const order = [...GROUP_RULES.map(([l]) => l), "Other"];
  return order.filter((l) => groups.has(l)).map((l) => ({ label: l, tokens: groups.get(l)! }));
}

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
  if (process.env.NODE_ENV === "production" || hydrated || typeof window === "undefined") return;
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

/** Each token's value as #rrggbb or #rrggbbaa, read from the stylesheet with the overrides switched off. */
export function readTunerDefaults(ids: string[]): Record<string, string> {
  const el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (el) el.disabled = true;
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const id of ids) out[id] = parseColor(cs.getPropertyValue(`--${id}`).trim()) ?? "#000000";
  if (el) el.disabled = false;
  return out;
}

/** Any CSS colour (hex, oklch, rgb, color-mix) to #rrggbb, or #rrggbbaa when it is see-through. Null if unreadable. */
export function parseColor(css: string): string | null {
  if (!css) return null;
  if (/^#[0-9a-f]{6}$/i.test(css)) return css.toLowerCase();
  if (/^#[0-9a-f]{8}$/i.test(css)) return css.toLowerCase().endsWith("ff") ? css.slice(0, 7).toLowerCase() : css.toLowerCase();
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
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  const hex = [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  return "#" + hex + (a < 255 ? a.toString(16).padStart(2, "0") : "");
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

/* ── Where is a token used? ────────────────────────────────────────────────────
   Tap a token in the panel and the page scrolls to an element that uses it, with an outline around it. Tap again for the
   next one. "Uses" is read from the stylesheet itself: every rule that sets a property from `var(--token)` gives a selector,
   and tokens defined from another token (a pill from a status colour) count too. */

const OUTLINE_ID = "nibs-token-locator";
const lastLocated = new Map<string, number>();
let outlineTimer: number | undefined;

/** A selector without its states and pseudo-elements, so `.hover\:bg-x:hover` finds the elements that carry the class. */
function plainSelector(selector: string): string {
  return selector.replace(/(?<!\\)::?[a-zA-Z-]+(\([^)]*\))?/g, "").trim();
}

function buildUsage(names: Set<string>) {
  const usage = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, key: string, value: string) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(value);
  };
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      const style = (rule as CSSStyleRule).style;
      const selector = (rule as CSSStyleRule).selectorText;
      if (style && selector) {
        const isTokenBlock = /(^|,\s*)(:root|html\.dark|\.dark|html:root)(\s*,|$)/.test(selector);
        for (let i = 0; i < style.length; i++) {
          const prop = style[i];
          const refs = style.getPropertyValue(prop).match(/var\(--[a-z0-9-]+/g);
          if (!refs) continue;
          for (const ref of refs) {
            const name = ref.slice(6);
            if (!names.has(name)) continue;
            if (prop.startsWith("--")) {
              if (isTokenBlock) add(dependents, name, prop.slice(2));
            } else {
              add(usage, name, selector);
            }
          }
        }
      }
      const inner = (rule as CSSGroupingRule).cssRules;
      if (inner) visit(inner);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    if ((sheet.ownerNode as HTMLElement | null)?.id === STYLE_ID) continue;
    try {
      visit(sheet.cssRules);
    } catch {
      // Another origin's sheet: not ours.
    }
  }
  return { usage, dependents };
}

function isShown(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
}

function outline(el: Element, label: string) {
  document.getElementById(OUTLINE_ID)?.remove();
  window.clearTimeout(outlineTimer);
  const rect = el.getBoundingClientRect();
  const box = document.createElement("div");
  box.id = OUTLINE_ID;
  Object.assign(box.style, {
    position: "fixed",
    left: `${rect.left - 4}px`,
    top: `${rect.top - 4}px`,
    width: `${rect.width + 8}px`,
    height: `${rect.height + 8}px`,
    border: "2px solid #ff2d95",
    borderRadius: "10px",
    boxShadow: "0 0 0 4px rgba(255,45,149,0.25)",
    pointerEvents: "none",
    zIndex: "2147483000",
    transition: "opacity 300ms",
  } as Partial<CSSStyleDeclaration>);
  const tag = document.createElement("div");
  tag.textContent = label;
  Object.assign(tag.style, {
    position: "absolute",
    left: "-2px",
    top: "-26px",
    background: "#ff2d95",
    color: "#fff",
    font: "12px/1 system-ui, sans-serif",
    padding: "5px 8px",
    borderRadius: "6px",
    whiteSpace: "nowrap",
  } as Partial<CSSStyleDeclaration>);
  box.appendChild(tag);
  document.body.appendChild(box);
  outlineTimer = window.setTimeout(() => {
    box.style.opacity = "0";
    window.setTimeout(() => box.remove(), 320);
  }, 3000);
}

/** Scrolls to an element that uses the token and outlines it. Repeat taps move on to the next one. Null if none is on screen. */
export function locateToken(id: string, allTokenIds: string[]): { index: number; total: number } | null {
  const names = new Set(allTokenIds);
  const { usage, dependents } = buildUsage(names);

  // The token and every token built from it, however many steps away.
  const family = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    for (const child of dependents.get(queue.shift()!) ?? []) {
      if (!family.has(child)) {
        family.add(child);
        queue.push(child);
      }
    }
  }

  const found = new Set<Element>();
  const collect = (selector: string) => {
    try {
      document.querySelectorAll(selector).forEach((el) => found.add(el));
    } catch {
      // A selector this browser can't take once its states are stripped: skip it.
    }
  };
  for (const token of family) {
    for (const selector of usage.get(token) ?? []) {
      for (const part of selector.split(",")) {
        const plain = plainSelector(part);
        if (plain) collect(plain);
      }
    }
    collect(`[style*="var(--${token})"]`);
  }

  const shown = Array.from(found).filter(
    (el) => !el.closest("[data-color-tuner]") && el !== document.body && el !== document.documentElement && isShown(el),
  );
  if (shown.length === 0) return null;

  // What is on screen now comes first, then the rest, each in page order.
  const inView = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  };
  shown.sort((a, b) => Number(inView(b)) - Number(inView(a)));

  const next = ((lastLocated.get(id) ?? -1) + 1) % shown.length;
  lastLocated.set(id, next);
  const target = shown[next];
  target.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  // Outline after the scroll has settled, so the box lands on the element.
  window.setTimeout(() => outline(target, `--${id} · ${next + 1} of ${shown.length}`), 450);
  return { index: next + 1, total: shown.length };
}
