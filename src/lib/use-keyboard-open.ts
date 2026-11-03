"use client";

import { useEffect, useState } from "react";

/** Inputs that open no software keyboard. */
const NO_KEYBOARD = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "file", "color", "image", "hidden"]);

function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) return !NO_KEYBOARD.has(el.type) && !el.readOnly;
  return el instanceof HTMLElement && el.isContentEditable;
}

/**
 * True while a phone's software keyboard is up, so fixed bars (the bottom nav) can step aside instead of sitting on top
 * of what the person is typing into. It needs both signs: a text field has focus, and the visual viewport has shrunk by
 * more than a browser toolbar would (Android's back gesture can hide the keyboard while the field keeps focus, and
 * iOS leaves the layout viewport alone, so neither sign is enough alone). A mouse or a hardware keyboard never counts.
 * Capability, not a device guess: `(pointer: coarse)` and `visualViewport`.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const vv = window.visualViewport;
    // The tallest the visual viewport has been: the height with no keyboard. Measured again when the screen turns.
    let rest = vv?.height ?? window.innerHeight;

    const update = () => {
      const focused = isTextEntry(document.activeElement);
      const height = vv?.height ?? window.innerHeight;
      rest = Math.max(rest, height);
      // A keyboard takes well over 150px; a collapsing URL bar takes about 60.
      setOpen(focused && rest - height > 150);
    };
    const onFocusChange = () => window.setTimeout(update, 60);
    const onTurn = () => {
      rest = vv?.height ?? window.innerHeight;
      update();
    };

    document.addEventListener("focusin", onFocusChange);
    document.addEventListener("focusout", onFocusChange);
    vv?.addEventListener("resize", update);
    window.addEventListener("orientationchange", onTurn);
    update();
    return () => {
      document.removeEventListener("focusin", onFocusChange);
      document.removeEventListener("focusout", onFocusChange);
      vv?.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", onTurn);
    };
  }, []);

  return open;
}
