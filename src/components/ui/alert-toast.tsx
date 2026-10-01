"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Shows a Sonner toast when `when` becomes truthy, and renders nothing. The app has no inline alert
 * banners: errors and confirmations go through the shared Toaster. It fires each time `when` flips
 * on (a state going idle → error, or an error string being set again after it was cleared).
 */
export function AlertToast({
  when,
  message,
  description,
  kind = "error",
}: {
  when: unknown;
  message: string;
  description?: string;
  kind?: "error" | "success" | "info";
}) {
  useEffect(() => {
    // A fixed id per message: the same alert replaces itself instead of stacking (and dev double-mounts don't duplicate it).
    if (when) toast[kind](message, { id: `${kind}:${message}`, ...(description ? { description } : {}) });
  }, [when, message, description, kind]);
  return null;
}
