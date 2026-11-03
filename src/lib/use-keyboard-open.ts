"use client";

import { useSyncExternalStore } from "react";

/** Inputs that open no software keyboard. */
const NO_KEYBOARD = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "file", "color", "image", "hidden"]);

export function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) return !NO_KEYBOARD.has(el.type) && !el.readOnly;
  return el instanceof HTMLElement && el.isContentEditable;
}

interface KeyboardState {
  open: boolean;
  /** Pixels the keyboard covers at the bottom of the layout viewport. 0 where the browser already resizes the layout. */
  inset: number;
}

const CLOSED: KeyboardState = { open: false, inset: 0 };
let state = CLOSED;
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;

function publish(next: KeyboardState) {
  // Fixed bars and sheets read this so they can ride on top of the keyboard in plain CSS: `bottom: var(--keyboard-inset)`.
  document.documentElement.style.setProperty("--keyboard-inset", `${next.inset}px`);
  if (next.open === state.open && next.inset === state.inset) return;
  state = next;
  listeners.forEach((l) => l());
}

/**
 * One watcher for the whole app. The keyboard is up when both signs agree: a text field has focus, and the visual
 * viewport has shrunk by more than a browser toolbar would (Android's back gesture can hide the keyboard while the field
 * keeps focus, and iOS leaves the layout viewport alone, so neither sign is enough alone). A mouse or a hardware keyboard
 * never counts. Capability, not a device guess: `(pointer: coarse)` and `visualViewport`.
 */
function start(): () => void {
  if (!window.matchMedia("(pointer: coarse)").matches) return () => {};
  const vv = window.visualViewport;
  // The tallest the visual viewport has been: the height with no keyboard. Measured again when the screen turns.
  let rest = vv?.height ?? window.innerHeight;

  const update = () => {
    const focused = isTextEntry(document.activeElement);
    const height = vv?.height ?? window.innerHeight;
    rest = Math.max(rest, height);
    // A keyboard takes well over 150px; a collapsing URL bar takes about 60.
    const open = focused && rest - height > 150;
    const inset = open && vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
    publish(open ? { open, inset } : CLOSED);
  };
  const onFocusChange = () => window.setTimeout(update, 60);
  const onTurn = () => {
    rest = vv?.height ?? window.innerHeight;
    update();
  };

  document.addEventListener("focusin", onFocusChange);
  document.addEventListener("focusout", onFocusChange);
  vv?.addEventListener("resize", update);
  vv?.addEventListener("scroll", update);
  window.addEventListener("orientationchange", onTurn);
  update();
  return () => {
    document.removeEventListener("focusin", onFocusChange);
    document.removeEventListener("focusout", onFocusChange);
    vv?.removeEventListener("resize", update);
    vv?.removeEventListener("scroll", update);
    window.removeEventListener("orientationchange", onTurn);
    publish(CLOSED);
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) stop = start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stop?.();
      stop = undefined;
    }
  };
}

/** True while a phone's software keyboard is up, so fixed bars (the bottom nav) can step aside. */
export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.open,
    () => false,
  );
}
