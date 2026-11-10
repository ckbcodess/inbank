"use client";

/**
 * Capture mode — strips dev-only affordances so screens can be captured into
 * Figma cleanly. Amounts also render as one plain text instead of rolling digits
 * (AmountVisibilityProvider), so each comes in as a single text layer.
 *
 * Toggle it with Ctrl+Shift+X (Cmd+Shift+X on a Mac), the same way Ctrl+Shift+D
 * hides the dev tools. It's remembered on this device, so it stays on while you
 * move between screens and after a reload, until you press the shortcut again.
 * `?capture=1` turns it on and `?capture=0` turns it off, also remembered.
 *
 * One shared store (not per-component state), so every consumer flips together
 * and nothing re-reads storage on each page.
 */

import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";

const KEY = "nibs-capture-mode";
let listeners: Array<() => void> = [];

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return read();
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function setCaptureMode(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // localStorage may be unavailable
  }
  for (const listener of listeners) listener();
}

let initialized = false;

function init() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  // A URL parameter sets the remembered value once, so later pages without it keep the mode.
  const param = new URLSearchParams(window.location.search).get("capture");
  if (param === "1") setCaptureMode(true);
  if (param === "0") setCaptureMode(false);

  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "X" || e.key === "x" || e.code === "KeyX")) {
      e.preventDefault();
      const next = !read();
      setCaptureMode(next);
      toast(next ? "Capture mode on" : "Capture mode off", { duration: 1500 });
    }
  });

  // Another tab toggling it.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) for (const listener of listeners) listener();
  });
}

if (typeof window !== "undefined") init();

export function useCaptureMode(): boolean {
  useEffect(() => {
    init();
  }, []);
  // Server render and hydration see false; the stored value applies straight after.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
