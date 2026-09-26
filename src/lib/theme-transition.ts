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

type ViewTransition = { ready: Promise<void>; updateCallbackDone: Promise<void>; finished: Promise<void> };
type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => ViewTransition };

let clearFade: number | undefined;

/** Applies `next` via `persist` (e.g. next-themes' setTheme) with a quick cross-fade. */
export function switchTheme(next: ThemeName, persist: () => void) {
  const root = document.documentElement;
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

  const doc = document as ViewTransitionDocument;
  if (doc.startViewTransition) {
    // Elements' own colour transitions (e.g. `transition-colors` on the
    // analytics card) would keep animating inside the live new snapshot, out of
    // step with the page fade — freeze them so everything moves as one.
    root.classList.add("theme-switching");
    const transition = doc.startViewTransition(() => flushSync(commit));
    const release = () => root.classList.remove("theme-switching");
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
  window.clearTimeout(clearFade);
  clearFade = window.setTimeout(() => root.classList.remove("theme-fade"), 260);
}
