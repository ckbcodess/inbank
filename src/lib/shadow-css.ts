/**
 * Reading and writing `box-shadow` as layers, for the sandbox's shadow editor. A token's own text can be anything
 * (`color-mix(...)` over `var(--black)`), so the editor starts from what the browser computed for it (plain rgb colours)
 * and writes back plain `rgba()` layers.
 */

export interface ShadowLayer {
  inset: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  /** 0 to 255. */
  r: number;
  g: number;
  b: number;
  /** 0 to 1. */
  a: number;
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Split on commas that are not inside parentheses. */
function splitTop(css: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      parts.push(css.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(css.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

const COLOUR = /(rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]{3,8})/i;

/** `rgb(0, 0, 0)`, `rgba(0, 0, 0, 0.1)`, `color(srgb 0 0 0 / 0.1)` or a hex, as channels. Anything else reads as black. */
export function parseColour(text: string): Rgba {
  const t = text.trim();
  const srgb = /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i.exec(t);
  if (srgb) {
    const a = srgb[4] === undefined ? 1 : srgb[4].endsWith("%") ? parseFloat(srgb[4]) / 100 : parseFloat(srgb[4]);
    return { r: Math.round(+srgb[1] * 255), g: Math.round(+srgb[2] * 255), b: Math.round(+srgb[3] * 255), a };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(t);
  if (rgb) {
    const a = rgb[4] === undefined ? 1 : rgb[4].endsWith("%") ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
    return { r: Math.round(+rgb[1]), g: Math.round(+rgb[2]), b: Math.round(+rgb[3]), a };
  }
  const hex = /^#([0-9a-f]{3,8})$/i.exec(t);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

export function parseShadow(css: string): ShadowLayer[] {
  if (!css || css === "none") return [];
  return splitTop(css).map((layer) => {
    const colourText = COLOUR.exec(layer)?.[0] ?? "rgb(0, 0, 0)";
    const rest = layer.replace(colourText, " ");
    const inset = /\binset\b/.test(rest);
    const nums = rest
      .replace(/\binset\b/, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => parseFloat(n));
    const c = parseColour(colourText);
    return { inset, x: nums[0] ?? 0, y: nums[1] ?? 0, blur: nums[2] ?? 0, spread: nums[3] ?? 0, ...c };
  });
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function colourCss({ r, g, b, a }: Rgba): string {
  return `rgba(${r}, ${g}, ${b}, ${round(a)})`;
}

export function shadowCss(layers: ShadowLayer[]): string {
  if (layers.length === 0) return "none";
  return layers.map((l) => `${l.inset ? "inset " : ""}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${colourCss(l)}`).join(", ");
}

export function toHex({ r, g, b }: Rgba): string {
  return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("")}`;
}

export function fromHex(hex: string): Pick<Rgba, "r" | "g" | "b"> {
  const c = parseColour(hex);
  return { r: c.r, g: c.g, b: c.b };
}

/** What the browser resolves a custom property to when it is used as a box shadow (or a colour), read through a probe. */
export function readComputed(id: string, as: "shadow" | "colour"): string {
  if (typeof document === "undefined") return "";
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  if (as === "shadow") probe.style.boxShadow = `var(--${id})`;
  else probe.style.color = `var(--${id})`;
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const value = as === "shadow" ? cs.boxShadow : cs.color;
  probe.remove();
  return value;
}
