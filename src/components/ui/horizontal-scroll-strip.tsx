"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A row that scrolls sideways when it doesn't fit, with a round chevron at whichever end has more to show. The
 * cards fade out under the chevrons with a mask, so the fade is transparency rather than a colour to match.
 */
export function HorizontalScrollStrip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => checkScroll());
    observer.observe(el);

    window.addEventListener("resize", checkScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(180, el.clientWidth * 0.65);
    el.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  // Fade the cards out under the chevrons with a mask, so the fade is transparency, not a colour to match.
  const fade = `linear-gradient(to right, transparent 0, #000 ${canScrollLeft ? 56 : 0}px, #000 calc(100% - ${canScrollRight ? 56 : 0}px), transparent 100%)`;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Contextual left chevron */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-0 pointer-events-none animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="pointer-events-auto flex size-7 items-center justify-center rounded-full border border-border/80 bg-card/90 text-foreground shadow-sm backdrop-blur-md transition active:scale-95 cursor-pointer -ml-1"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* Horizontally scrollable track */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {children}
      </div>

      {/* Contextual right chevron */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pr-0 pointer-events-none animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => scroll("right")}
            className="pointer-events-auto flex size-7 items-center justify-center rounded-full border border-border/80 bg-card/90 text-foreground shadow-sm backdrop-blur-md transition active:scale-95 cursor-pointer -mr-1"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>
  );
}
