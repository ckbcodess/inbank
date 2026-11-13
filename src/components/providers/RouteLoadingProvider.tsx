"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { DURATION } from "@/lib/motion";

export function startRouteLoading() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:start-navigation"));
  }
}

export function stopRouteLoading() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:stop-navigation"));
  }
}

function RouteWatcher({ onComplete }: { onComplete: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onComplete();
  }, [pathname, searchParams, onComplete]);

  return null;
}

export function RouteLoadingProvider({ children }: { children?: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    safetyTimerRef.current = null;
    fadeTimerRef.current = null;
  }, []);

  // The streak has no progress to report, so finishing just stops the loop and fades it out.
  const finish = useCallback(() => {
    clearTimers();
    setLoading(false);
    fadeTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 240);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    setVisible(true);
    setLoading(true);

    // Safety timeout in case navigation is cancelled or identical route
    safetyTimerRef.current = setTimeout(finish, 6000);
  }, [clearTimers, finish]);

  useEffect(() => {
    const handleStart = () => start();
    const handleStop = () => finish();

    window.addEventListener("app:start-navigation", handleStart);
    window.addEventListener("app:stop-navigation", handleStop);

    // Global click listener to detect internal link navigations
    const handleLinkClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      // Check if internal navigation to a different URL
      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        if (targetUrl.origin !== window.location.origin) return;

        const currentUrl = window.location.pathname + window.location.search;
        const nextUrl = targetUrl.pathname + targetUrl.search;

        if (currentUrl === nextUrl) return;

        start();
      } catch {
        // Fallback: if relative path
        if (href.startsWith("/") && href !== window.location.pathname) {
          start();
        }
      }
    };

    document.addEventListener("click", handleLinkClick, true);

    return () => {
      window.removeEventListener("app:start-navigation", handleStart);
      window.removeEventListener("app:stop-navigation", handleStop);
      document.removeEventListener("click", handleLinkClick, true);
      clearTimers();
    };
  }, [start, finish, clearTimers]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteWatcher onComplete={finish} />
      </Suspense>

      {/* Top route loading streak: a short segment that loops across the top edge until the page is ready. */}
      {visible && (
        <div
          role="progressbar"
          aria-label="Page loading"
          className="pointer-events-none fixed top-0 left-0 right-0 z-[999999] h-[2.5px] overflow-hidden transition-opacity duration-hover"
          style={{ opacity: loading ? 1 : 0 }}
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-y-0 w-[45%] rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--primary) 50%, transparent)",
              boxShadow: "0 0 8px color-mix(in srgb, var(--primary) 70%, transparent)",
            }}
            initial={{ left: "-45%" }}
            animate={{ left: "100%" }}
            transition={{ duration: DURATION.streak, ease: "linear", repeat: Infinity }}
          />
        </div>
      )}

      {children}
    </>
  );
}
