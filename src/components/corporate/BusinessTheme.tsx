"use client";

import { useBusinessTheme } from "@/lib/business-theme";

/**
 * Marks <html data-app="business"> while a /business page is open, which switches the brand tokens to smoke ash
 * (globals.css, "Business banking theme"). It sits on <html> rather than a wrapper so dialogs, menus and toasts,
 * which render in portals outside the page, take the theme too. Leaving business removes it, so personal banking
 * is amber again.
 */
export default function BusinessTheme() {
  useBusinessTheme(true);
  return null;
}

/**
 * The same mark, set before the first paint of a page loaded straight into /business, so it never flashes amber.
 * Client-side navigation from personal banking doesn't run it; `BusinessTheme` covers that.
 */
export const BUSINESS_THEME_SCRIPT = `document.documentElement.dataset.app="business"`;
