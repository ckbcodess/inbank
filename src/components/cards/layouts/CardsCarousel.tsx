"use client";

/** B · Carousel — one card at a time, neighbours peeking; swipe or tap the dots. */

import { useRef, useState } from "react";
import { CardFace } from "@/components/cards/CardFace";
import { CardDetails, type CardsLayoutProps } from "@/components/cards/CardParts";
import { cn } from "@/lib/utils";

export function CardsCarousel({ cards }: CardsLayoutProps) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const slides = cards.length;
  const active = cards[Math.min(index, cards.length - 1)];

  const onScroll = () => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const step = first.offsetWidth + 16; // slide + gap-4
    setIndex(Math.max(0, Math.min(slides - 1, Math.round(el.scrollLeft / step))));
  };

  const goTo = (i: number) => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    el.scrollTo({ left: i * (first.offsetWidth + 16), behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-5">
      <div
        ref={track}
        onScroll={onScroll}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[9vw] py-3 sm:mx-0 sm:px-[calc(50%-220px)]"
      >
        {cards.map((card) => (
          <div key={card.id} className="w-[82vw] max-w-[440px] shrink-0 snap-center sm:w-[440px]">
            <CardFace card={card} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Cards">
        {Array.from({ length: slides }).map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={cards[i].name}
            onClick={() => goTo(i)}
            className={cn(
              "h-1.5 cursor-pointer rounded-full transition-all",
              i === index ? "w-5 bg-foreground" : "w-1.5 bg-border hover:bg-muted-foreground/50",
            )}
          />
        ))}
      </div>

      <div className="mx-auto w-full max-w-[460px]">
        <CardDetails card={active} />
      </div>
    </div>
  );
}
