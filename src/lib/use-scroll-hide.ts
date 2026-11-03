"use client";

import { useCallback, useEffect, useState } from "react";

/** The page's scroll container carries this attribute (CustomerShell's `main`); inner scrollers never move the nav. */
const ROOT = "[data-scroll-root]";

/** How far down (px), in one direction, before the bar clears away. */
const HIDE_AFTER = 120;

/**
 * True while the person is reading down the page, false the moment they scroll back up or reach the top. Reaching the end does not bring it back.
 * It listens once on the document (scroll does not bubble, so in the capture phase) and only counts the page container,
 * so a list or a sheet scrolling inside the page never hides anything. `resetKey` brings the bar back on a new screen.
 */
export function useHideOnScrollDown(resetKey: string) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
  }, [resetKey]);

  useEffect(() => {
    let lastY = 0;
    let travel = 0;
    const onScroll = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLElement) || !el.matches(ROOT)) return;
      const y = el.scrollTop;
      const delta = y - lastY;
      lastY = y;
      // Travel is how far it has gone in one direction; turning round starts it again, so a wobble never flips the bar.
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      const atTop = y < 24;
      if (atTop || travel < -8) setHidden(false);
      // Hiding takes some real reading: a flick or a nudge down leaves the bar where it is. Coming back stays quick.
      else if (travel > HIDE_AFTER && y > HIDE_AFTER) setHidden(true);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  const show = useCallback(() => setHidden(false), []);
  return { hidden, show };
}
