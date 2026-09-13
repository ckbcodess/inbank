"use client";

import { useEffect } from "react";
import { createAndroidRipple } from "@/components/ui/ripple";

/**
 * AndroidRippleProvider adds a delegated global interaction listener.
 * Whenever a user taps or clicks on any element with `data-ripple`, `.android-ripple`,
 * `.surface-interactive`, or interactive cards, this triggers the authentic
 * Android Material 3 fill & fade-out visual feedback.
 */
export function AndroidRippleProvider({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Comprehensive selectors for all clickable elements across the app
    const CLICKABLE_SELECTOR = [
      // Native interactive HTML elements
      "button:not([disabled])",
      "a[href]",
      "summary",
      // Standard ARIA interactive roles
      "[role='button']",
      "[role='link']",
      "[role='tab']",
      "[role='menuitem']",
      "[role='menuitemcheckbox']",
      "[role='menuitemradio']",
      "[role='option']",
      "[role='switch']",
      "[role='checkbox']",
      "[role='radio']",
      // Base UI & Design System data slots
      "[data-slot='button']",
      "[data-slot='tabs-trigger']",
      "[data-slot='tab']",
      "[data-slot='dropdown-menu-item']",
      "[data-slot='menu-item']",
      "[data-slot='select-trigger']",
      "[data-slot='select-item']",
      "[data-slot='dialog-trigger']",
      "[data-slot='popover-trigger']",
      "[data-slot='sheet-trigger']",
      "[data-slot='card'][data-interactive='true']",
      "[data-slot='card'][role='button']",
      // Custom classes & opt-in attributes
      "[data-ripple]",
      ".android-ripple",
      ".surface-interactive",
      ".clickable-card",
      ".cursor-pointer",
    ].join(", ");

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore secondary clicks (right-click)
      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Do not trigger inside text inputs or content editables
      if (
        target.closest(
          "input:not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio']), textarea, select, [contenteditable='true']"
        )
      ) {
        return;
      }

      // Find closest interactive element via selector
      let container = target.closest<HTMLElement>(CLICKABLE_SELECTOR);

      // Fallback: check if target or immediate ancestors have cursor: pointer or onclick
      if (!container) {
        let curr: HTMLElement | null = target;
        let depth = 0;
        while (curr && curr !== document.body && depth < 5) {
          if (
            curr.getAttribute("onclick") ||
            curr.dataset.interactive === "true" ||
            curr.dataset.ripple === "true"
          ) {
            container = curr;
            break;
          }
          const style = window.getComputedStyle(curr);
          if (style.cursor === "pointer" && curr.tagName !== "LABEL") {
            container = curr;
            break;
          }
          curr = curr.parentElement;
          depth++;
        }
      }

      if (!container) return;

      // Ignore explicitly disabled or opted-out elements
      if (
        container.hasAttribute("disabled") ||
        container.getAttribute("aria-disabled") === "true" ||
        container.classList.contains("disabled") ||
        container.dataset.ripple === "false" ||
        container.hasAttribute("data-no-ripple") ||
        container.classList.contains("no-ripple")
      ) {
        return;
      }

      createAndroidRipple(container, e);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Trigger center ripple on Enter or Space on focused interactive containers
      if (e.key !== "Enter" && e.key !== " ") return;

      const target = document.activeElement as HTMLElement | null;
      if (!target) return;

      if (
        target.closest(
          "input:not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio']), textarea, select, [contenteditable='true']"
        )
      ) {
        return;
      }

      let container = target.closest<HTMLElement>(CLICKABLE_SELECTOR);
      if (!container) {
        const style = window.getComputedStyle(target);
        if (style.cursor === "pointer") {
          container = target;
        }
      }

      if (!container) return;

      if (
        container.hasAttribute("disabled") ||
        container.getAttribute("aria-disabled") === "true" ||
        container.dataset.ripple === "false" ||
        container.hasAttribute("data-no-ripple")
      ) {
        return;
      }

      createAndroidRipple(container, e);
    };

    document.addEventListener("pointerdown", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleKeyDown, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return <>{children}</>;
}
