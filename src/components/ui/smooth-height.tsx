"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Room around the clip box so focus rings / shadows on edge-to-edge children
 * (e.g. a full-width input's 3px ring) aren't cut off by `overflow: hidden`.
 * Offset by an equal negative margin, so layout is unchanged.
 */
const BLEED = 6;

interface SmoothHeightProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  /**
   * What happens to content that spills outside the box once the height has settled. The box always clips while
   * it is resizing. Pass "visible" when a child opens a menu or list that must not be cut off (a combobox).
   */
  overflowWhenIdle?: "hidden" | "visible";
}

/**
 * Automatically and smoothly animates height when its dynamic child changes size.
 * Uses ResizeObserver to eliminate layout snapping.
 */
export function SmoothHeight({
  children,
  className,
  duration = 0.32,
  overflowWhenIdle = "hidden",
}: SmoothHeightProps) {
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const isFirstMeasurement = useRef(true);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setHeight(entry.contentRect.height + BLEED * 2);
        if (isFirstMeasurement.current) {
          isFirstMeasurement.current = false;
        } else {
          setShouldAnimate(true);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      animate={{ height }}
      transition={shouldAnimate ? { type: "spring", duration, bounce: 0 } : { duration: 0 }}
      onAnimationStart={() => setAnimating(true)}
      onAnimationComplete={() => setAnimating(false)}
      style={{
        margin: -BLEED,
        padding: BLEED,
        overflow: overflowWhenIdle === "visible" && !animating ? "visible" : "hidden",
      }}
      className={className}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
}

interface SmoothCollapseProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

/**
 * Smoothly reveals or hides content when a boolean condition changes.
 * Eliminates layout snapping for expanding panels, accordions, and alert strips.
 */
export function SmoothCollapse({
  open,
  children,
  className,
  duration = 0.32,
}: SmoothCollapseProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transitionEnd: { overflow: "visible" },
          }}
          exit={{ height: 0, opacity: 0, overflow: "hidden" }}
          transition={{ type: "spring", duration, bounce: 0 }}
          style={{ overflow: "hidden" }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
