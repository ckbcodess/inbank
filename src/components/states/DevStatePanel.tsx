"use client";

/**
 * Dev Mode switcher for screens that sit outside both shells.
 *
 * The in-app switcher lives in the top header, which the pre-authentication
 * screens don't have. Rather than give those screens a second state model, this
 * reads the same registration `StateSwitcher` already makes — so a screen still
 * declares its states once, and this only decides where the control is drawn.
 *
 * Hidden in capture mode, exactly like the header control, so it stays out of
 * Figma captures.
 */

import { Layers } from "lucide-react";
import { useDevState } from "@/components/providers/DevStateProvider";
import { useCaptureMode } from "@/lib/capture-mode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DevStateMenuItems } from "./DevStateMenuItems";

export default function DevStatePanel() {
  const { devState } = useDevState();
  const captureMode = useCaptureMode();

  if (!devState || captureMode) return null;

  const active = devState.states.find((s) => s.id === devState.value);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 px-2.5 text-[12px] font-medium text-amber-700 outline-none transition-colors hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
          <Layers size={13} strokeWidth={2} />
          <span>Dev Mode</span>
          {active && (
            <span className="hidden max-w-[180px] truncate sm:inline">· {active.label}</span>
          )}
          {devState.section && (
            <span className="rounded bg-amber-500/20 px-1 py-0.5 font-mono text-[10px]">
              {devState.section}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-64">
          <DevStateMenuItems devState={devState} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
