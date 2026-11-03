"use client";

/**
 * "Where is this used?" for the sandbox's tweaks. A token has no trace in the DOM, so a match is read from what the
 * browser computed: radius by border radius, control height by the height of a control, tracking by letter spacing,
 * motion by transition duration, shadows by the box shadow the token resolves to. A match is therefore by value, so two
 * tokens that are set to the same number will light up the same elements. Matches get a pink outline.
 */

import type { Tweak } from "@/lib/sandbox-tweaks";

const ATTR = "data-sandbox-hit";
const STYLE_ID = "nibs-sandbox-hit-style";
const CONTROL = "button, input, select, textarea, [role='button'], [role='combobox'], [data-slot$='trigger']";

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `[${ATTR}] { outline: 2px solid #ff4fa3 !important; outline-offset: 2px !important; }`;
  document.head.appendChild(el);
}

export function clearHighlight() {
  document.querySelectorAll(`[${ATTR}]`).forEach((el) => el.removeAttribute(ATTR));
}

/** Outline every element and bring the first into view. */
export function highlight(elements: HTMLElement[]) {
  ensureStyle();
  clearHighlight();
  elements.forEach((el) => el.setAttribute(ATTR, ""));
  elements[0]?.scrollIntoView({ block: "center", behavior: "smooth" });
}

const near = (a: number, b: number, tolerance = 0.5) => Math.abs(a - b) <= tolerance;

function hasOwnText(el: HTMLElement): boolean {
  return Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "");
}

/** Whether a tweak can be found in the page at all (the root font size is everywhere, so it cannot). */
export function canLocate(tweak: Tweak): boolean {
  return tweak.id !== "root-font-size";
}

/** The elements inside `root` that use the tweak, at the value it has now. */
export function locateTweak(tweak: Tweak, value: number | string, root: HTMLElement): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>("*"));
  const visible = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  if (tweak.id.startsWith("radius-")) {
    const px = Number(value);
    return all.filter((el) => visible(el) && near(parseFloat(getComputedStyle(el).borderTopLeftRadius), px));
  }
  if (tweak.id.startsWith("control-")) {
    const px = Number(value);
    return Array.from(root.querySelectorAll<HTMLElement>(CONTROL)).filter((el) => visible(el) && near(el.getBoundingClientRect().height, px, 1));
  }
  if (tweak.id.startsWith("ls-")) {
    const target = Number(value);
    return all.filter((el) => {
      if (!visible(el) || !hasOwnText(el)) return false;
      const cs = getComputedStyle(el);
      const ls = parseFloat(cs.letterSpacing);
      return !Number.isNaN(ls) && near(ls, target * parseFloat(cs.fontSize), 0.05);
    });
  }
  if (tweak.id.startsWith("dur-")) {
    const seconds = Number(value) / 1000;
    if (seconds <= 0) return [];
    return all.filter(
      (el) =>
        visible(el) &&
        getComputedStyle(el)
          .transitionDuration.split(",")
          .some((d) => near(parseFloat(d), seconds, 0.0005)),
    );
  }
  if (tweak.id === "field-drop") return all.filter((el) => visible(el) && el.classList.contains("field-surface"));
  if (tweak.id.startsWith("shadow-")) {
    const probe = document.createElement("div");
    probe.style.boxShadow = `var(--${tweak.id})`;
    root.appendChild(probe);
    const resolved = getComputedStyle(probe).boxShadow;
    probe.remove();
    if (!resolved || resolved === "none") return [];
    return all.filter((el) => visible(el) && getComputedStyle(el).boxShadow === resolved);
  }
  return [];
}
