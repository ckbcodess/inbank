"use client";

/**
 * In-app history depth, stamped onto every browser history entry.
 *
 * The browser can't tell us whether the entry before this one belongs to NIBS
 * (`history.length` also counts whatever tab history came before the app), so
 * we stamp an index onto each entry as Next pushes/replaces it:
 *
 *   push    → index + 1   (a real step: new page)
 *   replace → same index  (filters, tabs, redirects — never a step)
 *   popstate → read the index back off the entry we landed on
 *
 * `canGoBackInApp()` is then just "is there an in-app entry below this one".
 * Installed once, at module load, from `NavHistoryTracker`.
 */

const IDX_KEY = "__nibsIdx";

let currentIdx = 0;
let installed = false;

function readIdx(state: unknown): number | null {
  if (state && typeof state === "object" && IDX_KEY in state) {
    const v = (state as Record<string, unknown>)[IDX_KEY];
    return typeof v === "number" ? v : null;
  }
  return null;
}

function stamp(data: unknown, idx: number) {
  return { ...(data && typeof data === "object" ? data : {}), [IDX_KEY]: idx };
}

export function installNavHistory() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const { history } = window;
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);

  // An entry without our stamp is a fresh landing (typed URL, new tab, reload
  // of a pre-install entry) — it starts a new in-app stack at 0.
  currentIdx = readIdx(history.state) ?? 0;
  replace(stamp(history.state, currentIdx), "");

  history.pushState = function (data, unused, url) {
    currentIdx += 1;
    return push(stamp(data, currentIdx), unused, url);
  };
  history.replaceState = function (data, unused, url) {
    return replace(stamp(data, currentIdx), unused, url);
  };
  window.addEventListener("popstate", (e) => {
    currentIdx = readIdx(e.state) ?? 0;
  });
}

/** True when the previous browser entry is a NIBS page this session. */
export function canGoBackInApp() {
  return currentIdx > 0;
}
