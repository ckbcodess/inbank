"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "nibs-hide-dev-tools";

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  // Check URL override: ?dev=0 or ?hide-dev=1
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get("dev") === "0" || searchParams.get("hide-dev") === "1") {
    return true;
  }
  if (searchParams.get("dev") === "1" || searchParams.get("hide-dev") === "0") {
    return false;
  }
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function setDevToolsHidden(hidden: boolean) {
  if (typeof window === "undefined") return;
  if (hidden) {
    localStorage.setItem(STORAGE_KEY, "true");
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  emitChange();
}

export function toggleDevToolsHidden() {
  const current = getSnapshot();
  const next = !current;
  setDevToolsHidden(next);
}

let shortcutInitialized = false;

function initShortcut() {
  if (typeof window === "undefined" || shortcutInitialized) return;
  shortcutInitialized = true;
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    // Toggle with Ctrl+Shift+D or Cmd+Shift+D
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "D" || e.key === "d" || e.code === "KeyD")) {
      e.preventDefault();
      toggleDevToolsHidden();
    }
  });
}

if (typeof window !== "undefined") {
  initShortcut();
}

/**
 * Hook that returns whether floating dev mode tools should be hidden.
 * Supports localStorage persistence, URL parameters (?dev=0, ?hide-dev=1),
 * and keyboard shortcut Ctrl+Shift+D (or Cmd+Shift+D).
 */
export function useDevToolsHidden(): boolean {
  useEffect(() => {
    initShortcut();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
