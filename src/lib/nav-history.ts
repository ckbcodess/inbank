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
 * `canGoBackInApp()` is then "is there an in-app entry below this one that belongs to the same app". Personal
 * banking, business banking and the admin portal are separate apps, so Back never crosses from one into another
 * (after switching app, or signing in from the log-in screen, the entry below is the other app's page). Each
 * index remembers which surface it was on; an entry we have no record of (a reload) counts as unknown, and Back
 * falls to the page's own parent.
 * Installed once, at module load, from `NavHistoryTracker`.
 */

const IDX_KEY = "__nibsIdx";

let currentIdx = 0;
let installed = false;

/** Which app a path belongs to. Sign-in, onboarding and recovery pages are "public": Back never returns to them. */
export function surfaceOf(pathname: string): "business" | "admin" | "retail" | "public" {
  if (pathname.startsWith("/business/signup")) return "public";
  if (pathname === "/business" || pathname.startsWith("/business/")) return "business";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (/^\/(login|mfa|signup|activate|migrate|get-started|forgot-password|forgot-pin|select-banking|card-verification)(\/|$)/.test(pathname) || pathname === "/") {
    return "public";
  }
  return "retail";
}

/** The surface of every index visited this page load. */
const surfaces: string[] = [];

function pathOf(url: string | URL | null | undefined): string {
  try {
    return new URL(url ?? window.location.href, window.location.href).pathname;
  } catch {
    return window.location.pathname;
  }
}

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
  surfaces[currentIdx] = surfaceOf(window.location.pathname);
  replace(stamp(history.state, currentIdx), "");

  history.pushState = function (data, unused, url) {
    currentIdx += 1;
    surfaces[currentIdx] = surfaceOf(pathOf(url));
    return push(stamp(data, currentIdx), unused, url);
  };
  history.replaceState = function (data, unused, url) {
    surfaces[currentIdx] = surfaceOf(pathOf(url));
    return replace(stamp(data, currentIdx), unused, url);
  };
  window.addEventListener("popstate", (e) => {
    currentIdx = readIdx(e.state) ?? 0;
  });
}

/** True when the previous browser entry is a page of this same app, seen this session. */
export function canGoBackInApp() {
  if (currentIdx <= 0) return false;
  const here = surfaces[currentIdx];
  const below = surfaces[currentIdx - 1];
  return Boolean(here) && here === below;
}
