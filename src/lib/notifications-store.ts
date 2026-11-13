"use client";

/**
 * What the customer has done to each notification: read it, archive it, or delete it. The feed itself is
 * `NOTIFICATIONS` in mock-data, and this store only holds the changes on top of it. The Notifications screen and the
 * header's unread count both read from here, so they always agree.
 */

import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NOTIFICATIONS, type AppNotification } from "@/lib/mock-data";

interface Change {
  read?: boolean;
  archived?: boolean;
  deleted?: boolean;
}

/**
 * Dev Mode presets: each one rewrites every notification's state at once, so the bell, the panel and the unread
 * count all show the same thing. "default" clears the customer's changes and goes back to the mock feed.
 */
export const NOTIFICATION_PRESETS = [
  { id: "default", label: "Default feed" },
  { id: "empty", label: "Empty" },
  { id: "all-read", label: "All read" },
  { id: "all-unread", label: "All unread" },
  { id: "all-archived", label: "All archived" },
] as const;

export type NotificationPreset = (typeof NOTIFICATION_PRESETS)[number]["id"];

function presetChanges(preset: NotificationPreset): Record<string, Change> {
  const out: Record<string, Change> = {};
  for (const n of NOTIFICATIONS) {
    if (preset === "empty") out[n.id] = { deleted: true };
    else if (preset === "all-read") out[n.id] = { read: true, archived: false };
    else if (preset === "all-unread") out[n.id] = { read: false, archived: false };
    else if (preset === "all-archived") out[n.id] = { read: true, archived: true };
  }
  return out;
}

interface NotificationsState {
  changes: Record<string, Change>;
  /** The Dev Mode preset last applied. Persisted with the changes, so it survives a reload. */
  preset: NotificationPreset;
  markRead: (ids: string[]) => void;
  setArchived: (id: string, archived: boolean) => void;
  remove: (id: string) => void;
  applyPreset: (preset: NotificationPreset) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      changes: {},
      preset: "default",
      markRead: (ids) =>
        set((s) => ({
          changes: ids.reduce((acc, id) => ({ ...acc, [id]: { ...acc[id], read: true } }), s.changes),
        })),
      setArchived: (id, archived) =>
        set((s) => ({ changes: { ...s.changes, [id]: { ...s.changes[id], archived } } })),
      remove: (id) =>
        set((s) => ({ changes: { ...s.changes, [id]: { ...s.changes[id], deleted: true } } })),
      applyPreset: (preset) => set({ preset, changes: presetChanges(preset) }),
    }),
    { name: "nibs-notifications" },
  ),
);

/** A notification with the customer's changes applied. */
export interface NotificationStatus extends AppNotification {
  read: boolean;
  archived: boolean;
}

/** Every notification the customer still has, with its read and archived state. Deleted ones are left out. */
export function resolveNotifications(
  feed: readonly AppNotification[],
  changes: Record<string, Change>,
): NotificationStatus[] {
  return feed
    .filter((n) => !changes[n.id]?.deleted)
    .map((n) => ({
      ...n,
      read: changes[n.id]?.read ?? n.read,
      archived: changes[n.id]?.archived ?? Boolean(n.archived),
    }));
}

/** The notifications the customer has, after their changes. */
export function useNotificationFeed(): NotificationStatus[] {
  const changes = useNotificationsStore((s) => s.changes);
  return useMemo(() => resolveNotifications(NOTIFICATIONS, changes), [changes]);
}

/** Unread notifications in Recent. Archived ones don't count. */
export function useUnreadNotificationCount(): number {
  const feed = useNotificationFeed();
  return useMemo(() => feed.filter((n) => !n.archived && !n.read).length, [feed]);
}
