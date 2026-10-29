"use client";

import { useLayoutEffect } from "react";

/**
 * Marks <html data-app="business"> while `active`, which switches the brand tokens to smoke ash (globals.css,
 * "Business banking theme"). It runs in a layout effect so it lands before the browser paints, on first load and on
 * client navigation alike, and it sits on <html> so dialogs, menus and toasts in portals take the theme too.
 * Business banking's own pages get it from `components/corporate/BusinessTheme`; this is for the shared sign-in
 * screens (`/login`, `/mfa`), which live outside `/business`.
 */
export function useBusinessTheme(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.dataset.app = "business";
    return () => {
      if (root.dataset.app === "business") delete root.dataset.app;
    };
  }, [active]);
}
