"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useKeyboardOpen } from "@/lib/use-keyboard-open";

/**
 * The primary action of a form step. On the page it is simply the button under the form. While a phone's keyboard is up
 * it docks to the keyboard's top edge, so Proceed is never one scroll away from the field being typed in; the page keeps
 * its place (a slot of the same height is left behind) and the same button stays mounted, so nothing resets.
 *
 * The bar holds one action. If a step ever needs two, the primary one is the wide one and the other is a text link
 * beneath it, never a pair of equal buttons a thumb can swap.
 */
export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  const docked = useKeyboardOpen();
  const slot = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  // Remember how tall the slot is in the page, so docking the button does not pull the content up.
  useLayoutEffect(() => {
    const el = slot.current;
    if (docked || !el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [docked]);

  return (
    <div ref={slot} className={cn("pt-2", className)} style={docked ? { minHeight: height } : undefined}>
      <div
        data-action-bar={docked ? "docked" : undefined}
        style={docked ? { bottom: "var(--keyboard-inset, 0px)" } : undefined}
        className={cn(
          docked && "fixed inset-x-0 z-40 animate-in border-t border-border/70 bg-background px-3 pt-3 pb-3 duration-reveal fade-in",
        )}
      >
        <div className={cn(docked && "mx-auto w-full max-w-lg")}>{children}</div>
      </div>
    </div>
  );
}
