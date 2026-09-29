"use client";

/** C · Gallery — every card at once, full size, each captioned with the one number that matters. */

import Link from "next/link";
import { CardFace } from "@/components/cards/CardFace";
import { RequestTile, StatusPill, cardFigure, type CardsLayoutProps } from "@/components/cards/CardParts";

export function CardsGallery({ cards }: CardsLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const figure = cardFigure(card);
        return (
          <Link key={card.id} href={`/cards/${card.id}`} className="group flex flex-col gap-3">
            <div className="transition-transform duration-300 ease-out group-hover:-translate-y-1">
              <CardFace card={card} className="shadow-lg" />
            </div>
            <div className="flex items-start justify-between gap-3 px-1">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[14px] text-foreground">{card.name}</span>
                <StatusPill card={card} className="w-fit" />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-[11px] text-muted-foreground">{figure.label}</span>
                <span className="tabular max-w-[160px] truncate text-[14px] text-foreground">{figure.value}</span>
              </div>
            </div>
          </Link>
        );
      })}
      <div className="flex flex-col gap-3">
        <RequestTile />
      </div>
    </div>
  );
}
