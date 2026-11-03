"use client";

import { useEffect } from "react";
import { isTextEntry } from "@/lib/use-keyboard-open";

/** Single-line fields the Return key can walk through. One-digit code boxes and pickers are left alone. */
function isWalkable(f: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (!isTextEntry(f) || f.disabled || f.tabIndex < 0 || f.getClientRects().length === 0) return false;
  if (f instanceof HTMLInputElement) {
    if (f.maxLength === 1 || f.type === "search") return false;
    if (f.getAttribute("role") === "combobox" || f.hasAttribute("aria-autocomplete")) return false;
  }
  return true;
}

function nextField(el: HTMLInputElement | HTMLTextAreaElement): HTMLInputElement | HTMLTextAreaElement | undefined {
  const scope = el.closest("form, [role=dialog], [data-scroll-root]") ?? document.body;
  const fields = Array.from(scope.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")).filter(isWalkable);
  return fields[fields.indexOf(el) + 1];
}

function scroller(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  // Pages that scroll the window itself (sign-in, onboarding) have no container of their own.
  const page = document.scrollingElement;
  return page instanceof HTMLElement && page.scrollHeight > page.clientHeight ? page : null;
}

/**
 * Lift the field being typed in clear of the keyboard, and of the docked action bar if there is one. The page container
 * (or a sheet's own scroller) is scrolled just far enough; nothing moves if the field is already in the clear part.
 */
function reveal(el: HTMLElement) {
  if (document.activeElement !== el) return;
  const box = scroller(el);
  if (!box) return;
  const vv = window.visualViewport;
  const onWindow = box === document.scrollingElement;
  const boxRect = onWindow ? { top: 0, bottom: window.innerHeight } : box.getBoundingClientRect();
  // Where the field may sit: below the sticky header (the page container pads its top for it) and above the keyboard.
  const top = Math.max(boxRect.top, vv?.offsetTop ?? 0) + (onWindow ? 0 : parseFloat(getComputedStyle(box).paddingTop)) + 12;
  let bottom = Math.min(boxRect.bottom, vv ? vv.offsetTop + vv.height : window.innerHeight);
  const bar = document.querySelector<HTMLElement>('[data-action-bar="docked"]');
  if (bar) bottom = Math.min(bottom, bar.getBoundingClientRect().top);
  // Take the label and the error line with the control.
  const rect = (el.closest<HTMLElement>("[data-slot=field]") ?? el).getBoundingClientRect();
  const hiddenBelow = rect.bottom + 16 - bottom;
  const hiddenAbove = top - rect.top;
  if (hiddenAbove > 0) box.scrollBy({ top: -hiddenAbove, behavior: "smooth" });
  else if (hiddenBelow > 0) box.scrollBy({ top: Math.min(hiddenBelow, rect.top - top), behavior: "smooth" });
}

/**
 * Phone behaviour for every text field in the app shell, in one place so new screens get it by existing:
 * - the Return key says what it does: Next when another field follows in the same form or sheet, Done on the last
 *   (a field that sets its own `enterKeyHint` keeps it);
 * - Next moves to that field, Done puts the keyboard away so the action beneath it is back in reach. Fields that handle
 *   Enter themselves, and forms with a submit button, are left to do so;
 * - the focused field scrolls clear of the keyboard once it has finished opening.
 * Touch screens only: on a desktop Enter does what it always did.
 */
export function useMobileFields() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const vv = window.visualViewport;
    let timer: number | undefined;
    let current: HTMLElement | null = null;
    const schedule = (ms: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => current && reveal(current), ms);
    };

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) || !isTextEntry(el)) return;
      if (el instanceof HTMLInputElement && !el.enterKeyHint) {
        el.enterKeyHint = el.type === "search" ? "search" : nextField(el) ? "next" : "done";
      }
      current = el;
      // The keyboard takes about a third of a second to arrive; the viewport listener below follows it if it is slower.
      schedule(350);
    };
    const onFocusOut = () => {
      current = null;
      window.clearTimeout(timer);
    };
    const onViewport = () => current && schedule(100);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.defaultPrevented || e.isComposing) return;
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || !isWalkable(el)) return;
      const next = nextField(el);
      if (next) {
        e.preventDefault();
        next.focus();
      } else if (!el.form?.querySelector('[type="submit"]')) {
        e.preventDefault();
        el.blur();
      }
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("keydown", onKeyDown);
    vv?.addEventListener("resize", onViewport);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("keydown", onKeyDown);
      vv?.removeEventListener("resize", onViewport);
    };
  }, []);
}
