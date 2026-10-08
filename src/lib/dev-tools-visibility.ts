"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

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
  toast.info(next ? "Floating dev tools hidden (Press Ctrl+Shift+D to show)" : "Floating dev tools visible", {
    duration: 2500,
  });
}

/**
 * Hook that returns whether floating dev mode tools should be hidden.
 * Supports localStorage persistence, URL parameters (?dev=0, ?hide-dev=1),
 * and keyboard shortcut Ctrl+Shift+D (or Cmd+Shift+D).
 */
export function useDevToolsHidden(): boolean {
  const isHidden = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Toggle with Ctrl+Shift+D or Cmd+Shift+D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        toggleDevToolsHidden();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return isHidden;
}
