"use client";

import { installNavHistory } from "@/lib/nav-history";

// Runs at module load so the stamp is in place before the first navigation.
installNavHistory();

export function NavHistoryTracker() {
  return null;
}
