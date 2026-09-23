"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (trickleTimerRef.current) clearInterval(trickleTimerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    trickleTimerRef.current = null;
    safetyTimerRef.current = null;
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setVisible(true);
    setLoading(true);
    setProgress(18);

    // Trickle progress forward
    trickleTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return prev;
        const diff = (90 - prev) * 0.12;
        return Math.min(prev + diff, 88);
      });
    }, 180);

    // Safety timeout in case navigation is cancelled or identical route
    safetyTimerRef.current = setTimeout(() => {
      finish();
    }, 6000);
  }, [clearTimers]);

  const finish = useCallback(() => {
    clearTimers();
    setProgress(100);
    setLoading(false);

    // Gracefully fade out after reaching 100%
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setProgress(0);
      }, 200);
    }, 240);
  }, [clearTimers]);

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

      {/* Top Route Progress Bar */}
      {visible && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="Page loading"
          className="fixed top-0 left-0 right-0 z-[999999] h-[2.5px] pointer-events-none transition-opacity duration-200"
          style={{ opacity: loading ? 1 : 0 }}
        >
          <div
            className="h-full bg-primary shadow-[0_0_8px_rgba(253,195,7,0.7)] transition-all ease-out"
            style={{
              width: `${progress}%`,
              transitionDuration: progress === 100 ? "180ms" : "280ms",
            }}
          />
        </div>
      )}

      {children}
    </>
  );
}
