"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { takeNewDeviceSignIn } from "@/lib/device-trust";
import { openSettings } from "@/lib/settings-modal";

/**
 * Tells the customer once that this login came from a browser that isn't trusted, and gives them the one thing to
 * do if it wasn't them. Mounted in the customer shell, so it shows on whatever page they land on. A toast, not a
 * block: nothing sits between the customer and their balance.
 */
export default function NewDeviceNotice() {
  useEffect(() => {
    const device = takeNewDeviceSignIn();
    if (!device) return;
    toast("We recognise you’re signing in from a new device", {
      description: `${device}. If this wasn’t you, change your password straight away.`,
      duration: 15_000,
      action: { label: "Change password", onClick: () => openSettings("security") },
    });
  }, []);

  return null;
}
