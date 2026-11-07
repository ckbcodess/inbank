"use client";

/**
 * The dashboard's product tour: one tooltip at a time, pointing at the real control.
 *
 * Built on the shared Popover, anchored to the element a step names (`data-product-tour`). The rest of the page is
 * dimmed so the eye lands on that element. The dim doesn't block the page: clicks go through, a click outside does nothing, Skip is on every step and Esc ends it, so leaving is never harder than starting.
 *
 * Steps are the ones whose control is on screen when the tour starts (see `lib/product-tour.ts`).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverDescription, PopoverTitle } from "@/components/ui/popover";
import {
  PRODUCT_TOUR_STEPS,
  findTourTarget,
  isFixed,
  markTourSeen,
  useProductTour,
  type TourContext,
  type TourStep,
} from "@/lib/product-tour";
import { useSession } from "@/lib/session-store";

/** Let the page settle before the first step (the welcome dialog is still closing when the tour is asked for). */
const SETTLE_MS = 250;
/** How long a step waits for its control to appear (the account menu animates open) before it is skipped. */
const RESOLVE_MS = 1500;
/** Where `sm` starts. Below it there is rarely room beside a control. */
const NARROW_PX = 640;
/** What a tooltip needs under the control it points at: its height, the arrow and the gap. */
const TOOLTIP_ROOM_PX = 300;
/** Steps whose control is page chrome rather than part of the dashboard body. */
const CHROME_STEPS = new Set<string>(["more", "profile"]);


function noop() {}

type TourAnchor = HTMLElement | { getBoundingClientRect: () => DOMRect };

/** A block taller than the screen, as far as it shows, so a tooltip can point at it without running off the screen. */
function visiblePart(el: HTMLElement): TourAnchor {
  return {
    getBoundingClientRect: () => {
      const r = el.getBoundingClientRect();
      const top = Math.max(r.top, 0);
      const bottom = Math.min(r.bottom, window.innerHeight);
      return new DOMRect(r.left, top, r.width, Math.max(0, bottom - top));
    },
  };
}

/**
 * Dims everything but the control a step is about: a transparent box laid over it whose huge shadow is the dim.
 * It follows the control every frame (the page is scrolling toward it), and lets clicks through, so the page stays live.
 */
function Spotlight({ target }: { target: HTMLElement }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pad = 4;
    const radius = getComputedStyle(target).borderRadius;
    let frame = 0;
    const follow = () => {
      const box = ref.current;
      if (box) {
        const r = target.getBoundingClientRect();
        box.style.top = `${r.top - pad}px`;
        box.style.left = `${r.left - pad}px`;
        box.style.width = `${r.width + pad * 2}px`;
        box.style.height = `${r.height + pad * 2}px`;
        box.style.borderRadius = radius;
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [target]);
  // In the body, so no transformed ancestor in the page can shrink the dim to part of the screen.
  return createPortal(<div ref={ref} aria-hidden className="tour-dim fixed z-[45]" />, document.body);
}

/** Back to the top of the dashboard: the page may scroll in the window or in an inner pane, so both go up. */
function scrollToTop() {
  const from = findTourTarget("account");
  for (let node = from?.parentElement ?? null; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      node.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function ProductTour(ctx: TourContext) {
  const active = useProductTour((s) => s.active);

  // Leaving the dashboard ends the tour, so coming back later doesn't resume it. The stop waits a tick: in development
  // React mounts, unmounts and remounts once, and that first unmount must not cancel a tour started from another page.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.setTimeout(() => {
        if (!mounted.current) useProductTour.getState().stop();
      }, 0);
    };
  }, []);

  return active ? <TourRun ctx={ctx} /> : null;
}

function TourRun({ ctx }: { ctx: TourContext }) {
  const stop = useProductTour((s) => s.stop);
  const actorId = useSession((s) => s.actor?.id ?? "");

  const [queue, setQueue] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [narrow, setNarrow] = useState(false);
  const [anchored, setAnchored] = useState<{ id: string; el: TourAnchor; target: HTMLElement } | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const finish = useCallback(() => stop(), [stop]);

  // Whoever sees the tour start, however it ends (done, skipped, or they clicked away), has seen it.
  useEffect(() => () => markTourSeen(actorId), [actorId]);

  // Take the steps whose control is on screen right now.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const available = PRODUCT_TOUR_STEPS.filter((s) => findTourTarget(s.probe ?? s.id));
      if (available.length === 0) {
        finish();
        return;
      }
      setNarrow(window.innerWidth < NARROW_PX);
      setQueue(available);
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [finish]);

  const step = queue?.[index];
  const total = queue?.length ?? 0;
  // After the last pointer the tour closes on a screen of its own, not a tooltip.
  const closing = queue !== null && index >= total;

  const forward = useCallback(() => {
    setIndex((i) => i + 1);
  }, []);

  // Find the step's control (waiting a moment for it to appear), bring it into view and dim the rest.
  useEffect(() => {
    if (!step) return;
    let frame = 0;
    const startedAt = performance.now();

    const look = () => {
      const target = findTourTarget(step.id);
      if (target) {
        // A control pinned to the screen (the phone tab bar) can't be scrolled to; going to the top brings the bar back.
        // The steps after the panels (the sidebar, the header) live in the page chrome, so the page goes back to the top for them.
        const pinned = isFixed(target) || CHROME_STEPS.has(step.id);
        // A block taller than the screen (the panels under the balance) is brought in from its top.
        const tall = target.getBoundingClientRect().height > window.innerHeight * 0.7;
        if (pinned) scrollToTop();
        else if (step.id === "glance" && narrow) {
          // On a phone the tooltip hangs below the section, so scroll until its bottom edge has room under it.
          target.style.scrollMarginBottom = `${TOOLTIP_ROOM_PX}px`;
          target.scrollIntoView({ block: "end", behavior: "smooth", inline: "nearest" });
        } else target.scrollIntoView({ block: tall ? "start" : "center", behavior: "smooth", inline: "nearest" });
        // The tooltip points at the whole block, as much of it as is on screen.
        const anchorEl = step.id === "glance" ? visiblePart(target) : target;
        setAnchored({ id: step.id, el: anchorEl, target });
        return;
      }
      if (performance.now() - startedAt > RESOLVE_MS) {
        forward();
        return;
      }
      frame = requestAnimationFrame(look);
    };
    frame = requestAnimationFrame(look);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [step, forward, narrow]);

  // The closing screen starts from the top of the dashboard too.
  useEffect(() => {
    if (closing) scrollToTop();
  }, [closing]);

  // Esc ends the tour from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  if (closing) {
    return (
      <Dialog open onOpenChange={(open) => !open && finish()}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{"You're all set"}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-[13px] leading-relaxed text-foreground">
              That is the whole tour. You know your way around now, so you can start using your account. Help is always
              in the top bar if you need it.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIndex((i) => i - 1)}>
              Back
            </Button>
            <Button type="button" onClick={finish}>
              Finish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!step) return null;
  // The dim stays up between steps (it follows the next control once it is found); only the tooltip waits for its step.
  const ready = anchored?.id === step.id;

  return (
    <>
      {anchored && <Spotlight target={anchored.target} />}
    {/* Controlled and always open. A click outside or focus moving away must not end it; only Skip, Done and Esc do. */}
    {ready && anchored && (
    <Popover key={step.id} open onOpenChange={noop}>
      <PopoverContent
        anchor={anchored.el}
        side={narrow ? step.sideNarrow : step.side}
        align="center"
        sideOffset={14}
        arrow
        collisionPadding={12}
        initialFocus={nextRef}
        className="w-[300px] max-w-[calc(100vw-24px)] rounded-2xl p-4"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div role="img" aria-label={`Step ${index + 1} of ${total}`} className="flex items-center gap-1">
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-hover ease-settle",
                    i === index ? "w-4 bg-foreground" : "w-1 bg-muted-foreground/40",
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={finish}
              className="-my-2 cursor-pointer py-2 text-[12px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Skip tour
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <PopoverTitle className="text-[16px] font-medium tracking-[var(--ls-tight)] text-foreground">
              {step.title}
            </PopoverTitle>
            <PopoverDescription className="text-[13px] leading-relaxed text-foreground">
              {step.body(ctx)}
            </PopoverDescription>
          </div>

          <div className="flex items-center justify-end gap-2">
            {index > 0 && (
              <Button type="button" variant="ghost" onClick={() => setIndex((i) => i - 1)}>
                Back
              </Button>
            )}
            <Button ref={nextRef} type="button" onClick={forward}>
              Next
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
    )}
    </>
  );
}
