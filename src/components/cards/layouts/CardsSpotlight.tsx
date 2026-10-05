"use client";

/** D · Spotlight — one big tilting card on the left, a quiet selector rail on the right. */

import { useState } from "react";
import { CardFace } from "@/components/cards/CardFace";
import { TiltCard3D } from "@/components/cards/TiltCard3D";
import { CardDetails, StatusPill, type CardsLayoutProps } from "@/components/cards/CardParts";
import { cn } from "@/lib/utils";

export function CardsSpotlight({ cards }: CardsLayoutProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = cards.find((c) => c.id === activeId) ?? cards[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-center rounded-2xl bg-muted/50 px-4 py-10 sm:px-10 sm:py-14">
          <TiltCard3D className="w-full max-w-[480px]">
            <CardFace card={active} className="rounded-[20px]" />
          </TiltCard3D>
        </div>
        <CardDetails card={active} />
      </div>

      <div className="flex flex-row gap-3 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible" role="tablist" aria-label="Cards">
        {cards.map((card) => {
          const selected = card.id === active.id;
          return (
            <button
              key={card.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(card.id)}
              className={cn(
                "flex min-w-[240px] shrink-0 cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors lg:min-w-0",
                selected ? "border-[var(--active-border)] bg-[var(--active-bg)]" : "border-border bg-card hover:bg-muted/50",
              )}
            >
              <div className="w-[76px] shrink-0">
                <CardFace card={card} className="rounded-lg" />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[13.5px] font-medium text-foreground">{card.name}</span>
                <span className="tabular text-[12px] text-muted-foreground">{card.maskedNumber}</span>
                <StatusPill card={card} className="w-fit" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
