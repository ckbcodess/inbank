"use client";

/**
 * First-load splash: a blank page with the GCB mark breathing in the middle,
 * covering the app while the session, fonts and key images get ready, then
 * fading out to reveal the screen whole. Timing lives in `lib/app-splash`.
 * The mark holds still for anyone who prefers reduced motion.
 */

import { GCBLogo } from "@/components/ui/GCBLogo";
import { cn } from "@/lib/utils";

export function AppSplash({ leaving }: { leaving: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!leaving}
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-300 ease-out",
        leaving ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      <GCBLogo className="splash-breathe size-16" />
      <span className="sr-only">Loading your dashboard</span>
    </div>
  );
}
