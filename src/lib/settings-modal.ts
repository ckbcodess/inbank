"use client";

/**
 * Settings is a modal on desktop and a bottom sheet on phone, opened by a URL parameter on whatever page the
 * customer is on: `?settings=security`. That makes it deep-linkable (the account menu, a notification, a refresh)
 * and keeps it out of the Back stack, since it only ever replaces the URL. `menu` opens the section list.
 *
 * Opening and closing go through `window.history.replaceState`, which Next keeps in step with `useSearchParams`,
 * so nothing is fetched from the server to show a modal.
 */

import { useSearchParams } from "next/navigation";

export const SETTINGS_PARAM = "settings";
export const SETTINGS_SECTIONS = ["profile", "preferences", "security", "alerts"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

function setParam(value: string | null) {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(SETTINGS_PARAM);
  else url.searchParams.set(SETTINGS_PARAM, value);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

/** Open Settings, on a section or (with none) on the list. Safe to call from any client component. */
export function openSettings(section?: SettingsSection) {
  setParam(section ?? "menu");
}

export function closeSettings() {
  setParam(null);
}

/** Move to a section, or back to the list (`"menu"`), while Settings stays open. */
export function showSettingsSection(section: SettingsSection | "menu") {
  setParam(section);
}

export function useSettingsModal() {
  const raw = useSearchParams().get(SETTINGS_PARAM);
  const section = (SETTINGS_SECTIONS as readonly string[]).includes(raw ?? "") ? (raw as SettingsSection) : null;
  return { open: raw !== null, section };
}
