"use client";

/**
 * The cash-out ticket arriving: a ticket hanging from its top edge and dropping into place.
 *
 * It is one continuous swing, not a straight slide with a flap added at the end. The ticket starts leaning
 * forward (its bottom toward you) and, as it falls, that lean unwinds, passes through upright while it is
 * still travelling, swings back past vertical (its bottom away from you) as it lands, then comes home
 * with a small overshoot and settles. A slight, out-of-step twist keeps it from looking mechanical. So the
 * entry already has the motion that becomes the flap, and nothing hands over from one to the other.
 *
 * It runs as a single Web Animation on the element (sampled from the physics below), so it is
 * hardware-accelerated and stays smooth even while the page is busy loading, which the JavaScript spring
 * helpers don't. One element, so nothing to swap or seam. People who ask for less motion get a short
 * fade and no movement.
 */

import { useEffect, useRef } from "react";
import { CashoutTicket } from "./CashoutTicket";

/** How far above its place it starts (px), and how much smaller (a ticket never appears from nothing). */
const DROP = 56;
const START_SCALE = 0.97;

/** Seconds: the pause before it appears (the eagle intro before it already gave the page its beat), the slide, and the fade. */
const LEAD_S = 0.15;
const SLIDE_S = 0.7;
const FADE_S = 0.35;

/**
 * The swing about the top edge (rotateX): positive leans the bottom toward you, negative sends it back. A damped
 * oscillation that starts leaning forward. With these numbers it is upright about 0.3s in (mid-fall), reaches its
 * furthest back (about 4 degrees) as the slide lands, then overshoots forward a little and settles.
 */
const LEAN_DEG = 10;
const OMEGA = 5.5; // natural frequency, rad/s
const ZETA = 0.33; // damping ratio: below 1 it overshoots, then settles

/** A small twist about the vertical (rotateZ), at its own pace so the two never line up and look mechanical. */
const TWIST_DEG = 1.6;
const OMEGA_Z = 4.6;
const ZETA_Z = 0.35;

const TOTAL_S = 2.0;

/** Strong ease-out (starts fast, lands softly), so it feels responsive and then arrives gently. */
const easeOut = (p: number) => 1 - Math.pow(1 - Math.min(Math.max(p, 0), 1), 5);

function frames(): Keyframe[] {
  const wd = OMEGA * Math.sqrt(1 - ZETA * ZETA);
  const wdz = OMEGA_Z * Math.sqrt(1 - ZETA_Z * ZETA_Z);
  const n = Math.round(TOTAL_S * 60);
  const out: Keyframe[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * TOTAL_S;
    const slide = easeOut(t / SLIDE_S);
    const fade = 1 - Math.pow(1 - Math.min(t / FADE_S, 1), 2);
    const swing = LEAN_DEG * Math.exp(-ZETA * OMEGA * t) * Math.cos(wd * t);
    const twist = TWIST_DEG * Math.exp(-ZETA_Z * OMEGA_Z * t) * Math.sin(wdz * t + 0.6);
    const y = -DROP * (1 - slide);
    const s = START_SCALE + (1 - START_SCALE) * slide;
    out.push({
      offset: i / n,
      opacity: fade,
      transform: `translate3d(0, ${y.toFixed(3)}px, 0) scale(${s.toFixed(4)}) rotateX(${swing.toFixed(4)}deg) rotateZ(${twist.toFixed(4)}deg)`,
    });
  }
  return out;
}

export function CashoutTicketArrival(props: { code: string; amount: string; recipientPhone: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const anim = reduce
      ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out", fill: "both" })
      : el.animate(frames(), { duration: TOTAL_S * 1000, delay: LEAD_S * 1000, easing: "linear", fill: "both" });
    return () => anim.cancel();
  }, []);

  return (
    <div className="relative h-[396px] w-[278px] max-w-full" style={{ perspective: 900 }}>
      {/* Hangs from its top edge and swings as it drops. Hidden until the animation's first frame. */}
      <div ref={ref} className="absolute inset-0" style={{ transformOrigin: "50% 0%", opacity: 0, willChange: "transform, opacity" }}>
        <CashoutTicket {...props} />
      </div>
    </div>
  );
}
