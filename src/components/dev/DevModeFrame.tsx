"use client";

/**
 * Lays the app beside the Dev Mode side panel. The page is one column and the panel
 * is its neighbour, so opening the panel shifts the page left instead of covering it.
 * On a phone the panel takes the whole screen instead (see `DevModePanel`).
 *
 * Screens with no app header (sign-in, onboarding) have no Dev Mode button, so a
 * small pill stands in for it there. Hidden in capture mode and when Dev Mode is
 * switched off, like the header button.
 */

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Layers } from "@/components/ui/icons";
import { useCaptureMode } from "@/lib/capture-mode";
import { useDevToolsHidden } from "@/lib/dev-tools-visibility";
import { isPreAuthPath } from "@/lib/demo-hub";
import { useDevModePanel } from "@/lib/dev-mode-panel";
import { DevModePanel } from "./DevModePanel";

export function DevModeFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const open = useDevModePanel((s) => s.open);
  const toggle = useDevModePanel((s) => s.toggle);
  const captureMode = useCaptureMode();
  const devToolsHidden = useDevToolsHidden();
  const devAllowed = !captureMode && !devToolsHidden;

  return (
    <div className="flex min-h-dvh">
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <AnimatePresence>{open && devAllowed && <DevModePanel />}</AnimatePresence>
      {devAllowed && isPreAuthPath(pathname) && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="dev-mode-panel"
          className="fixed bottom-4 left-1/2 z-40 flex h-8 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-dashed border-warning/50 bg-warning/10 px-3 text-[12px] font-medium text-warning-text shadow-lg transition-colors hover:bg-warning/20"
        >
          <Layers size={13} className="shrink-0" />
          Dev Mode
        </button>
      )}
    </div>
  );
}
