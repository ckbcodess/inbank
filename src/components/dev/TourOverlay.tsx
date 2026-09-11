"use client";

/**
 * Guided-tour hint layer.
 *
 * No dimming, no takeover — just a highlighted focus ring around the control to
 * click next and a small tooltip that says what it is. The whole page stays
 * live: the tester clicks the real control, the flow advances, and the tour
 * advances with it (see the capture-phase click handler). Back / Skip / Esc
 * keep the tester in control.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, MousePointerClick, X } from "lucide-react";
import { useTour } from "@/lib/tour-store";
import { findTour } from "@/lib/tours";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TIP_WIDTH = 284;
const RING_PAD = 6;
const GAP = 12;

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

export default function TourOverlay() {
  const { activeTourId, stepIndex, next, prev, stop } = useTour();
  const pathname = usePathname();

  const tour = activeTourId ? findTour(activeTourId) : null;
  const total = tour?.steps.length ?? 0;
  const step = tour && stepIndex < total ? tour.steps[stepIndex] : null;
  const isLast = tour ? stepIndex >= total - 1 : false;

  const [rect, setRect] = useState<Rect | null>(null);
  const elRef = useRef<Element | null>(null);
  const rectRef = useRef<Rect | null>(null);

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    if (!tour) return;
    if (isLast) {
      stop();
      toast.success(`Tour complete — ${tour.title}`);
    } else {
      next();
    }
  };

  // Track the anchor's rect every frame so the ring stays glued through route
  // changes and screen animations, and re-appears once a step mounts its target.
  const target = step?.target;
  useEffect(() => {
    if (!target) {
      elRef.current = null;
      rectRef.current = null;
      setRect(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      const el = document.querySelector(`[data-tour="${target}"]`);
      elRef.current = el;
      if (el) {
        const r = el.getBoundingClientRect();
        const nr: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
        if (!sameRect(nr, rectRef.current)) {
          rectRef.current = nr;
          setRect(nr);
        }
      } else if (rectRef.current !== null) {
        rectRef.current = null;
        setRect(null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, stepIndex, activeTourId, pathname]);

  // Clicking the real highlighted control advances the tour in lockstep.
  useEffect(() => {
    if (!activeTourId) return;
    function onClick(e: MouseEvent) {
      const el = elRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) {
        advanceRef.current();
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [activeTourId]);

  // Esc exits.
  useEffect(() => {
    if (!activeTourId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") stop();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTourId, stop]);

  // Nothing to show until the current step's target is on screen. Hiding while
  // it's missing (e.g. mid page-transition after a click) keeps the tooltip
  // from parking at the top of the screen and travelling back.
  if (!tour || !step || !rect) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;

  // Tooltip sits to the RIGHT of the ring, vertically centred; flips to the
  // left only when the right edge would clip off-screen.
  const placeRight = vw - rect.left - rect.width >= TIP_WIDTH + GAP + 8;
  const centerY = rect.top + rect.height / 2;
  const tipStyle: CSSProperties = placeRight
    ? { top: centerY, left: rect.left + rect.width + GAP, transform: "translateY(-50%)" }
    : { top: centerY, left: Math.max(8, rect.left - GAP - TIP_WIDTH), transform: "translateY(-50%)" };

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {/* Focus ring around the control to click */}
      {rect && (
        <div
          className="pointer-events-none fixed rounded-lg border-2 border-[#F2B200] transition-all duration-150 ease-out"
          style={{
            top: rect.top - RING_PAD,
            left: rect.left - RING_PAD,
            width: rect.width + RING_PAD * 2,
            height: rect.height + RING_PAD * 2,
            boxShadow: "0 0 0 4px rgba(242,178,0,0.22), 0 2px 12px rgba(242,178,0,0.28)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="pointer-events-auto fixed w-[284px] max-w-[calc(100vw-16px)] rounded-xl border border-border bg-popover p-3 shadow-xl animate-in fade-in zoom-in-95 duration-150"
        style={tipStyle}
      >
        {/* arrow — points sideways at the ring */}
        {rect && (
          <span
            className="absolute top-1/2 size-2.5 -translate-y-1/2 rotate-45 border-border bg-popover"
            style={
              placeRight
                ? { left: -5, borderLeftWidth: 1, borderBottomWidth: 1 }
                : { right: -5, borderRightWidth: 1, borderTopWidth: 1 }
            }
          />
        )}

        <div className="flex items-start justify-between gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#B27B00] dark:text-[#F2B200]">
            <span className="tabular">Step {stepIndex + 1} of {total}</span> · {tour.title}
          </span>
          <button
            type="button"
            onClick={stop}
            aria-label="Exit tour"
            className="-mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>

        {/* On the first step, orient the tester to the whole journey */}
        {stepIndex === 0 && (
          <p className="mt-1.5 rounded-lg bg-[#FFFBF0] px-2 py-1.5 text-[11.5px] leading-snug text-muted-foreground dark:bg-[#F2B200]/10">
            {tour.summary}
          </p>
        )}

        <h4 className="mt-1.5 text-[13.5px] text-foreground tracking-[-0.01em]">{step.title}</h4>

        {/* Purpose — what this step does and why it's part of the flow */}
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{step.body}</p>

        {/* The concrete next click */}
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/50 px-2 py-1.5 text-[12px] text-foreground">
          <MousePointerClick size={13} className="mt-0.5 shrink-0 text-[#B27B00] dark:text-[#F2B200]" />
          <span>{step.action}</span>
        </div>

        {stepIndex > 0 && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={prev}
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ArrowLeft size={12} />
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
