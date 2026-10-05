"use client";

/**
 * Light ↔ dark switches that ease rather than cut.
 *
 * Where supported, the browser snapshots the page and cross-fades old → new as
 * a single GPU layer (a View Transition with its default fade, tuned in
 * globals.css) — smooth at any page size. Elsewhere, a short colour transition
 * on backgrounds, text and borders only. Every theme control goes through here.
 */

import { flushSync } from "react-dom";

export type ThemeName = "light" | "dark";

type ViewTransition = {
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  finished: Promise<void>;
  skipTransition?: () => void;
};
type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => ViewTransition };

let clearFade: number | undefined;
/** The theme a switch in flight is heading to. The class only flips a frame into a view transition. */
let pendingTarget: ThemeName | null = null;
let activeTransition: ViewTransition | null = null;

/**
 * The theme the page is showing, or about to show. The class on <html> is the
 * truth — a control's own React state can lag behind it (or never have heard of
 * it), and deciding "next" from that is what made a click do nothing.
 */
export function currentTheme(): ThemeName {
  return pendingTarget ?? (document.documentElement.classList.contains("dark") ? "dark" : "light");
}

/** Flips light ↔ dark from whatever the page is really showing. `persist` receives the new theme. */
export function toggleTheme(persist: (next: ThemeName) => void) {
  const next: ThemeName = currentTheme() === "dark" ? "light" : "dark";
  switchTheme(next, () => persist(next));
}

/** Applies `next` via `persist` (e.g. next-themes' setTheme) with a quick cross-fade. */
export function switchTheme(next: ThemeName, persist: () => void) {
  const root = document.documentElement;

  // Already showing it: no animation, but still sync the stored choice.
  if (currentTheme() === next) {
    persist();
    return;
  }

  // A second click mid-fade takes over: finish the first one at once.
  activeTransition?.skipTransition?.();
  pendingTarget = next;

  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    // Apply the class synchronously so the new theme is what gets captured;
    // next-themes then persists the choice and re-applies the same class.
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    persist();
  };
  const settle = () => {
    if (pendingTarget === next) pendingTarget = null;
  };

  const doc = document as ViewTransitionDocument;
  if (doc.startViewTransition) {
    // Elements' own colour transitions (e.g. `transition-colors` on the
    // analytics card) would keep animating inside the live new snapshot, out of
    // step with the page fade — freeze them so everything moves as one.
    root.classList.add("theme-switching");
    const transition = doc.startViewTransition(() => flushSync(commit));
    activeTransition = transition;
    const release = () => {
      if (activeTransition === transition) {
        activeTransition = null;
        root.classList.remove("theme-switching");
      }
      settle();
    };
    // If the transition is skipped or times out, still switch — quietly.
    transition.ready.catch(() => {});
    transition.updateCallbackDone.catch(commit);
    transition.finished.then(release, () => {
      commit();
      release();
    });
    return;
  }

  root.classList.add("theme-fade");
  commit();
  settle();
  window.clearTimeout(clearFade);
  clearFade = window.setTimeout(() => root.classList.remove("theme-fade"), 260);
}
