"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useKeyboardOpen } from "@/lib/use-keyboard-open";

/**
 * A screen's primary action, on its own above the phone keyboard.
 *
 * With the keyboard closed it simply stays where it is in the page. The moment a software keyboard opens, it moves into
 * its own bar pinned to the top edge of the keyboard (`--keyboard-inset`, kept by `lib/use-keyboard-open`), so the
 * person never has to put the keyboard away to find it. A gap of the same height stays behind, so nothing below it
 * jumps. A mouse or a hardware keyboard never counts as a keyboard, so on desktop this renders its children and nothing
 * more.
 *
 * The bar is drawn on `document.body`: a card with a blur or a transform would otherwise pin a "fixed" bar to the
 * card instead of the screen. A submit button moved out of its form still submits it, by tap and by the Return key.
 * With a dialog open over a page, only the action that belongs to the field being typed in is docked.
 */
export function KeyboardDock({ children, className }: { children: ReactNode; className?: string }) {
  const keyboardOpen = useKeyboardOpen();
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const [mine, setMine] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const stand = useRef<HTMLButtonElement>(null);

  // Only dock when the field being typed in is in the same place (the same dialog, or the page) as this action.
  useEffect(() => {
    if (!keyboardOpen) {
      setMine(false);
      return;
    }
    const check = () => {
      const scope = ref.current?.closest("[role=dialog]") ?? null;
      const typing = document.activeElement?.closest("[role=dialog]") ?? null;
      setMine(scope === typing);
    };
    check();
    document.addEventListener("focusin", check);
    return () => document.removeEventListener("focusin", check);
  }, [keyboardOpen]);

  const docked = keyboardOpen && mine;

  // Remember how tall the action is while it sits in the page, so the gap it leaves is the right size.
  useEffect(() => {
    const el = ref.current;
    if (!el || docked) return;
    const read = () => setHeight(el.offsetHeight);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [docked]);

  // The Return key submits a form through its submit button. With that button out on the bar, a hidden stand-in keeps the
  // form submittable, and it is disabled exactly when the real one is.
  useEffect(() => {
    if (!docked || !stand.current) return;
    const real = barRef.current?.querySelector<HTMLButtonElement>("button[type=submit]");
    stand.current.disabled = !real || real.disabled;
  });

  return (
    <>
      <div ref={ref} className={className} style={docked && height ? { height } : undefined}>
        {!docked && children}
        {docked && <button ref={stand} type="submit" hidden tabIndex={-1} aria-hidden="true" />}
      </div>
      {docked &&
        createPortal(
          <div
            ref={barRef}
            data-keyboard-dock=""
            className="fixed inset-x-0 z-[60] border-t border-border bg-background px-3 py-3"
            style={{ bottom: "var(--keyboard-inset, 0px)" }}
            onClick={(e) => {
              // Out of its form in the DOM, a submit button no longer submits it on its own.
              const button = (e.target as HTMLElement).closest("button");
              if (button && button.type === "submit" && !button.form) ref.current?.closest("form")?.requestSubmit();
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
