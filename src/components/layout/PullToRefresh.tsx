"use client";

/**
 * Pull down at the top of the page to reload it. Touch screens only, and only on a screen that registered something to
 * reload (`useRefreshHandler`). The page content follows the finger with a rubber-band resistance, a small buzz marks the
 * point where letting go will refresh, and the indicator holds until the screen says it is done. A drag that starts
 * inside something already scrolled down, or that runs sideways, belongs to that thing and is left alone.
 */

import { useEffect, useState } from "react";
import { RefreshCw } from "@/components/ui/icons";
import { AppLoader } from "@/components/ui/loader";
import { haptic } from "@/lib/haptics";
import { currentRefreshHandler } from "@/lib/pull-refresh";

/** Finger travel (px) that arms the refresh, the most the content may follow, and where it rests while loading. */
const TRIGGER = 64;
const MAX = 112;
const HOLD = 48;
/** A reload that answers instantly would flash; keep the indicator up at least this long (ms). */
const MIN_SHOW = 600;

const SETTLE = ["transition-transform", "duration-reveal", "ease-settle"];

export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    let alive = true;
    let root: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let pulling = false;
    let armed = false;
    let busy = false;
    let px = 0;

    const move = (to: number, settle: boolean) => {
      px = to;
      const content = root?.firstElementChild;
      if (content instanceof HTMLElement) {
        content.classList.toggle("will-change-transform", !settle);
        SETTLE.forEach((c) => content.classList.toggle(c, settle));
        content.style.transform = to ? `translateY(${to}px)` : "";
      }
      setPull(to);
      setDragging(!settle);
    };

    const onStart = (e: TouchEvent) => {
      tracking = false;
      if (busy || e.touches.length !== 1 || !currentRefreshHandler()) return;
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const page = target.closest<HTMLElement>("[data-scroll-root]");
      if (!page || page.scrollTop > 0) return;
      // Something scrolled down inside the page owns this drag.
      for (let p: HTMLElement | null = target; p && p !== page; p = p.parentElement) if (p.scrollTop > 0) return;
      root = page;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
      pulling = false;
      armed = false;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking || !root) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      if (dy <= 0 || root.scrollTop > 0 || (!pulling && Math.abs(dx) > dy)) {
        if (pulling) move(0, true);
        tracking = false;
        pulling = false;
        return;
      }
      pulling = true;
      const next = Math.min(MAX, dy * 0.5);
      move(next, false);
      if (next >= TRIGGER && !armed) {
        armed = true;
        haptic("tap");
      } else if (next < TRIGGER) armed = false;
    };

    const onEnd = async () => {
      if (!tracking || !pulling) {
        tracking = false;
        return;
      }
      tracking = false;
      pulling = false;
      const handler = currentRefreshHandler();
      if (px < TRIGGER || !handler) {
        move(0, true);
        return;
      }
      busy = true;
      setRefreshing(true);
      move(HOLD, true);
      const started = Date.now();
      try {
        await handler();
      } finally {
        await new Promise((r) => window.setTimeout(r, Math.max(0, MIN_SHOW - (Date.now() - started))));
        if (alive) {
          move(0, true);
          setRefreshing(false);
        }
        busy = false;
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    return () => {
      alive = false;
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  return (
    <div
      aria-hidden={refreshing ? undefined : true}
      className={
        "pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center" +
        (dragging ? "" : " transition-[transform,opacity] duration-reveal ease-settle")
      }
      style={{ transform: `translateY(${pull - 36}px)`, opacity: refreshing ? 1 : Math.min(1, pull / TRIGGER) }}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-card shadow-[var(--shadow-menu)]">
        {refreshing ? (
          <AppLoader size={16} />
        ) : (
          <RefreshCw size={16} className="text-muted-foreground" style={{ transform: `rotate(${(pull / TRIGGER) * 180}deg)` }} />
        )}
      </span>
    </div>
  );
}
