"use client";

import React, { useEffect, useRef } from "react";

export interface RippleOptions {
  color?: string;
  maxOpacity?: number;
  duration?: number;
  fadeDuration?: number;
}

/**
 * Creates an authentic Android Material 3 ripple effect on a target container.
 * The ripple blooms from the pointer coordinates (or center if keyboard),
 * smoothly filling the container bounds before gracefully fading out.
 */
export function createAndroidRipple(
  container: HTMLElement,
  event?: MouseEvent | TouchEvent | PointerEvent | KeyboardEvent,
  options: RippleOptions = {}
) {
  if (typeof window === "undefined" || !container) return;

  // Respect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  // Determine pointer coordinates relative to container
  let x = rect.width / 2;
  let y = rect.height / 2;

  if (event) {
    if ("clientX" in event && typeof event.clientX === "number" && (event.clientX !== 0 || event.clientY !== 0)) {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    } else if ("touches" in event && (event as TouchEvent).touches && (event as TouchEvent).touches.length > 0) {
      const touch = (event as TouchEvent).touches[0];
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    }
  }

  // Account for container internal scroll and clamp within bounds
  const scrollLeft = container.scrollLeft || 0;
  const scrollTop = container.scrollTop || 0;
  x = Math.max(0, Math.min(rect.width, x)) + scrollLeft;
  y = Math.max(0, Math.min(rect.height, y)) + scrollTop;

  // Calculate distance to the furthest corner to ensure 100% container coverage
  const dX = Math.max(x - scrollLeft, rect.width - (x - scrollLeft));
  const dY = Math.max(y - scrollTop, rect.height - (y - scrollTop));
  const radius = Math.hypot(dX, dY);
  const diameter = radius * 2;

  // Ensure container has relative positioning for containment
  const computedStyle = window.getComputedStyle(container);
  if (computedStyle.position === "static") {
    container.style.position = "relative";
  }
  if (computedStyle.display === "inline") {
    container.style.display = "inline-block";
  }

  // Find or create the isolated ripple overlay container
  let overlay = container.querySelector<HTMLDivElement>(
    ":scope > .android-ripple-overlay"
  );
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "android-ripple-overlay";
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.borderRadius = "inherit";
    overlay.style.overflow = "hidden";
    overlay.style.zIndex = "20";
    container.appendChild(overlay);
  }

  const isDark = document.documentElement.classList.contains("dark");
  const defaultOpacity = isDark ? 0.06 : 0.04;
  const targetOpacity = options.maxOpacity ?? defaultOpacity;
  const fillDuration = prefersReducedMotion ? 80 : (options.duration ?? 280);
  const fadeDuration = prefersReducedMotion ? 100 : (options.fadeDuration ?? 180);
  const color = options.color || "var(--ripple-color, currentColor)";

  // Expanding radial ripple wave that fills the container bounds
  const wave = document.createElement("div");
  wave.style.position = "absolute";
  wave.style.left = `${x}px`;
  wave.style.top = `${y}px`;
  wave.style.width = `${diameter}px`;
  wave.style.height = `${diameter}px`;
  wave.style.marginLeft = `${-radius}px`;
  wave.style.marginTop = `${-radius}px`;
  wave.style.borderRadius = "50%";
  wave.style.backgroundColor = color;
  wave.style.pointerEvents = "none";
  wave.style.transformOrigin = "center center";
  overlay.appendChild(wave);

  // Initial touch disc opacity — delicate and restrained
  const startOpacity = Math.min(targetOpacity * 1.3, 0.08);
  const initialScale = 0.08;

  // Animate wave expansion with smooth ease-in and ease-out curve
  const waveAnim = wave.animate(
    [
      { transform: `scale(${initialScale})`, opacity: startOpacity },
      { transform: "scale(1)", opacity: targetOpacity },
    ],
    {
      duration: fillDuration,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    }
  );

  let isReleased = false;
  let isExpanded = false;
  let isFadingOut = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  const fadeOut = () => {
    if (isFadingOut || !isExpanded || !isReleased) return;
    isFadingOut = true;

    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    // Smooth ease-in ease-out fade
    const waveFade = wave.animate(
      [{ opacity: targetOpacity }, { opacity: 0 }],
      {
        duration: fadeDuration,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      }
    );

    waveFade.onfinish = () => {
      wave.remove();
      if (overlay && overlay.childElementCount === 0) {
        overlay.remove();
      }
    };
  };

  waveAnim.onfinish = () => {
    isExpanded = true;
    fadeOut();
  };

  const handleRelease = () => {
    isReleased = true;
    window.removeEventListener("pointerup", handleRelease);
    window.removeEventListener("pointercancel", handleRelease);
    window.removeEventListener("pointerleave", handleRelease);
    fadeOut();
  };

  // If initiated by pointer, wait for pointerup or release
  if (event && "pointerId" in event) {
    window.addEventListener("pointerup", handleRelease, { once: true });
    window.addEventListener("pointercancel", handleRelease, { once: true });
    window.addEventListener("pointerleave", handleRelease, { once: true });
  } else {
    // For synthetic or keyboard clicks, release immediately
    isReleased = true;
  }

  // Safety fallback: ensure cleanup if pointer events were cancelled or missed
  fallbackTimer = setTimeout(() => {
    isReleased = true;
    isExpanded = true;
    fadeOut();
  }, fillDuration + fadeDuration + 200);
}

/**
 * Reusable React Component for adding Android ripple to any container
 */
export function AndroidRipple({
  color,
  maxOpacity,
  duration,
  fadeDuration,
}: RippleOptions) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;

    const onPointerDown = (e: PointerEvent) => {
      createAndroidRipple(parent, e, {
        color,
        maxOpacity,
        duration,
        fadeDuration,
      });
    };

    parent.addEventListener("pointerdown", onPointerDown);
    return () => {
      parent.removeEventListener("pointerdown", onPointerDown);
    };
  }, [color, maxOpacity, duration, fadeDuration]);

  return <div ref={ref} className="hidden pointer-events-none" aria-hidden="true" />;
}
