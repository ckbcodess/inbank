"use client";

/**
 * Arc geometry and motion shared by the spend charts (dashboard analytics
 * widget, My Spends donut): rounded annular wedges, and a tween that eases each
 * segment's start/end angle to its new target so a period change reads as the
 * same segments growing and shrinking in place. Snaps under reduced motion.
 */

import { useEffect, useRef, useState } from "react";

/**
 * Creates an exact annular wedge path with rounded corner caps for a true circular arc.
 * Mathematical coordinate system:
 * 180° = 9 o'clock (horizontal left baseline)
 * 270° = 12 o'clock (vertical apex)
 * 360° = 3 o'clock (horizontal right baseline)
 */
export function createAnnularWedgePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngleDeg: number,
  endAngleDeg: number,
  cornerR: number = 8
): string {
  const startRad = (startAngleDeg * Math.PI) / 180;
  const endRad = (endAngleDeg * Math.PI) / 180;
  const sweepAngle = endRad - startRad;

  const maxCornerThickness = (outerR - innerR) / 2;
  const maxCornerOuterArc = (outerR * sweepAngle) / 2;
  const maxCornerInnerArc = (innerR * sweepAngle) / 2;
  const cr = Math.max(0, Math.min(cornerR, maxCornerThickness, maxCornerOuterArc, maxCornerInnerArc));

  if (cr <= 0.5) {
    const x1 = cx + outerR * Math.cos(startRad);
    const y1 = cy + outerR * Math.sin(startRad);
    const x2 = cx + outerR * Math.cos(endRad);
    const y2 = cy + outerR * Math.sin(endRad);
    const x3 = cx + innerR * Math.cos(endRad);
    const y3 = cy + innerR * Math.sin(endRad);
    const x4 = cx + innerR * Math.cos(startRad);
    const y4 = cy + innerR * Math.sin(startRad);
    const largeArc = sweepAngle > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  }

  const outerAngleOffset = cr / outerR;
  const innerAngleOffset = cr / innerR;

  // Outer circular arc start and end points
  const oStartRad = startRad + outerAngleOffset;
  const oEndRad = endRad - outerAngleOffset;
  const oStartX = cx + outerR * Math.cos(oStartRad);
  const oStartY = cy + outerR * Math.sin(oStartRad);
  const oEndX = cx + outerR * Math.cos(oEndRad);
  const oEndY = cy + outerR * Math.sin(oEndRad);

  // Radial edges with corner offsets
  const rEndOuterX = cx + (outerR - cr) * Math.cos(endRad);
  const rEndOuterY = cy + (outerR - cr) * Math.sin(endRad);
  const rEndInnerX = cx + (innerR + cr) * Math.cos(endRad);
  const rEndInnerY = cy + (innerR + cr) * Math.sin(endRad);

  // Inner circular arc end and start points
  const iEndRad = endRad - innerAngleOffset;
  const iStartRad = startRad + innerAngleOffset;
  const iEndX = cx + innerR * Math.cos(iEndRad);
  const iEndY = cy + innerR * Math.sin(iEndRad);
  const iStartX = cx + innerR * Math.cos(iStartRad);
  const iStartY = cy + innerR * Math.sin(iStartRad);

  const rStartInnerX = cx + (innerR + cr) * Math.cos(startRad);
  const rStartInnerY = cy + (innerR + cr) * Math.sin(startRad);
  const rStartOuterX = cx + (outerR - cr) * Math.cos(startRad);
  const rStartOuterY = cy + (outerR - cr) * Math.sin(startRad);

  const largeOuterArc = oEndRad - oStartRad > Math.PI ? 1 : 0;
  const largeInnerArc = iEndRad - iStartRad > Math.PI ? 1 : 0;

  return [
    `M ${oStartX} ${oStartY}`,
    `A ${outerR} ${outerR} 0 ${largeOuterArc} 1 ${oEndX} ${oEndY}`,
    `A ${cr} ${cr} 0 0 1 ${rEndOuterX} ${rEndOuterY}`,
    `L ${rEndInnerX} ${rEndInnerY}`,
    `A ${cr} ${cr} 0 0 1 ${iEndX} ${iEndY}`,
    `A ${innerR} ${innerR} 0 ${largeInnerArc} 0 ${iStartX} ${iStartY}`,
    `A ${cr} ${cr} 0 0 1 ${rStartInnerX} ${rStartInnerY}`,
    `L ${rStartOuterX} ${rStartOuterY}`,
    `A ${cr} ${cr} 0 0 1 ${oStartX} ${oStartY}`,
    `Z`,
  ].join(" ");
}

export interface Arc {
  start: number;
  end: number;
}

export const TWEEN_MS = 420;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Ease each segment's start/end angle from where it is now to the new target,
 * so switching ranges reads as the same segments growing and shrinking.
 * Honours prefers-reduced-motion by snapping.
 */
export function useTweenedArcs(target: Record<string, Arc>): Record<string, Arc> {
  const [arcs, setArcs] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      current.current = target;
      setArcs(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = easeInOutCubic(Math.min(1, (now - t0) / TWEEN_MS));
      const frame: Record<string, Arc> = {};
      for (const [id, to] of Object.entries(target)) {
        const f = from[id] ?? to;
        frame[id] = { start: f.start + (to.start - f.start) * k, end: f.end + (to.end - f.end) * k };
      }
      current.current = frame;
      setArcs(frame);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return arcs;
}
