"use client";

/**
 * What the customer has done with notifications: archived them, deleted them, and when they last closed the panel.
 * The feed itself is `NOTIFICATIONS` in mock-data. There is no read state. A notification is "new" if it arrived
 * after the panel was last closed, and the bell's dot shows while the inbox has anything new.
 */

import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NOTIFICATIONS, type AppNotification } from "@/lib/mock-data";

interface Change {
  archived?: boolean;
  deleted?: boolean;
}

/**
 * Dev Mode presets. Each one rewrites the customer's changes and the last-opened time, so the bell, the tabs and the
 * list all agree.
 */
export const NOTIFICATION_PRESETS = [
  { id: "new", label: "Something new" },
  { id: "caught-up", label: "Nothing new" },
  { id: "empty", label: "Empty" },
  { id: "all-archived", label: "All archived" },
] as const;

export type NotificationPreset = (typeof NOTIFICATION_PRESETS)[number]["id"];

function presetChanges(preset: NotificationPreset): Record<string, Change> {
  const out: Record<string, Change> = {};
  for (const n of NOTIFICATIONS) {
    if (preset === "empty") out[n.id] = { deleted: true };
    else if (preset === "all-archived") out[n.id] = { archived: true };
  }
  return out;
}

/** "Something new" and "Empty" clear the last-opened time, so everything counts as new. The rest count as seen. */
function presetLastOpened(preset: NotificationPreset): string | null {
  return preset === "new" || preset === "empty" ? null : new Date().toISOString();
}

interface NotificationsState {
  changes: Record<string, Change>;
  /** When the panel was last closed. null means it never has been, so everything counts as new. */
  lastOpenedAt: string | null;
  /** The Dev Mode preset last applied. Persisted, so it survives a reload. */
  preset: NotificationPreset;
  setArchived: (id: string, archived: boolean) => void;
  remove: (id: string) => void;
  markPanelOpened: () => void;
  applyPreset: (preset: NotificationPreset) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      changes: {},
      lastOpenedAt: null,
      preset: "new",
      setArchived: (id, archived) =>
        set((s) => ({ changes: { ...s.changes, [id]: { ...s.changes[id], archived } } })),
      remove: (id) => set((s) => ({ changes: { ...s.changes, [id]: { ...s.changes[id], deleted: true } } })),
      markPanelOpened: () => set({ lastOpenedAt: new Date().toISOString() }),
      applyPreset: (preset) =>
        set({ preset, changes: presetChanges(preset), lastOpenedAt: presetLastOpened(preset) }),
    }),
    { name: "nibs-notifications" },
  ),
);

/** A notification with the customer's changes applied. */
export interface NotificationStatus extends AppNotification {
  archived: boolean;
  /** Arrived after the panel was last closed. */
  isNew: boolean;
}

/** Every notification the customer still has, with its archived and new state. Deleted ones are left out. */
export function resolveNotifications(
  feed: readonly AppNotification[],
  changes: Record<string, Change>,
  lastOpenedAt: string | null,
): NotificationStatus[] {
  const opened = lastOpenedAt === null ? null : new Date(lastOpenedAt).getTime();
  return feed
    .filter((n) => !changes[n.id]?.deleted)
    .map((n) => ({
      ...n,
      archived: changes[n.id]?.archived ?? Boolean(n.archived),
      isNew: opened === null || new Date(n.date).getTime() > opened,
    }));
}

/** The notifications the customer has, after their changes. */
export function useNotificationFeed(): NotificationStatus[] {
  const changes = useNotificationsStore((s) => s.changes);
  const lastOpenedAt = useNotificationsStore((s) => s.lastOpenedAt);
  return useMemo(() => resolveNotifications(NOTIFICATIONS, changes, lastOpenedAt), [changes, lastOpenedAt]);
}

/** Whether the bell's dot shows: something in the inbox has arrived since the panel was last closed. */
export function useHasNewNotifications(): boolean {
  const feed = useNotificationFeed();
  return useMemo(() => feed.some((n) => !n.archived && n.isNew), [feed]);
}
