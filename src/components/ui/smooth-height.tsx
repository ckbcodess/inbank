"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SmoothHeightProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

/**
 * Automatically and smoothly animates height when its dynamic child changes size.
 * Uses ResizeObserver to eliminate layout snapping.
 */
export function SmoothHeight({
  children,
  className,
  duration = 0.32,
}: SmoothHeightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      animate={{ height }}
      transition={{ type: "spring", duration, bounce: 0 }}
      className={cn("overflow-hidden", className)}
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
